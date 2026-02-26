const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager')
const { SSMClient, GetParameterCommand, GetParametersCommand, GetParametersByPathCommand } = require("@aws-sdk/client-ssm")

const functionName = 'ac-awsSecrets'.padEnd(15)

/**
* Replaces configuration variables with secrets
*
* KEY is the variable name
* NAME is the name of the secret
*
* MULTISECRETS
* Multisecrets -> the secret contains a list of secrets that should be fetched
*/

const awsSecrets = () => {

  // Helper function to check for unsafe key segments
  const isUnsafeKeySegment = (segment) => (
    segment === '__proto__' ||
    segment === 'constructor' ||
    segment === 'prototype'
  )

  const getKey = (obj, key) => {
    if (!obj || typeof key !== 'string') {
      return undefined
    }

    return key.split('.').reduce((acc, cur) => {
      if (isUnsafeKeySegment(cur)) {
        return undefined
      }
      if (acc === undefined || acc === null) {
        return undefined
      }
      return acc[cur]
    }, obj)
  }

  const setKey = (obj, key, value) => {
    if (!obj || typeof key !== 'string') {
      return
    }

    const [head, ...rest] = key.split('.')

    if (isUnsafeKeySegment(head)) {
      throw new Error('Refusing to set unsafe key segment: ' + head)
    }

    if (!rest.length) {
      obj[head] = value
    }
    else {
      if (obj[head] === undefined || obj[head] === null || typeof obj[head] !== 'object') {
        obj[head] = {}
      }
      setKey(obj[head], rest.join('.'), value)
    }
  }

  const deepMerge = (target, source) => {
    if (Array.isArray(target) && Array.isArray(source)) {
      return [...new Set([...target, ...source])]
    }

    if (typeof source === 'object' && source !== null && typeof target === 'object' && target !== null) {
      const result = { ...target }
      for (const key in source) {
        if (isUnsafeKeySegment(key)) {
          continue
        }
        if (key in result) {
          result[key] = deepMerge(result[key], source[key])
        }
        else {
          result[key] = source[key]
        }
      }
      return result
    }

    return source
  }

  const setValue = (config, { path, value, array = false, property, merge = false }) => {
    // path can be from AWS parameter store (/a/b/c) or a real JSON path (a.b.c)
    const keys = path.includes('/') ? path.split('/').filter(Boolean) : path.split('.')
    const lastKey = keys.pop()

    if (isUnsafeKeySegment(lastKey)) {
      throw new Error('Refusing to set unsafe key segment: ' + lastKey)
    }

    let pointer = config

    for (const key of keys) {
      if (isUnsafeKeySegment(key)) {
        throw new Error('Refusing to traverse unsafe key segment: ' + key)
      }
      if (!pointer[key]) {
        pointer[key] = {}
      }
      pointer = pointer[key]
    }

    if (array) {
      if (!Array.isArray(pointer[lastKey])) {
        pointer[lastKey] = []
      }
      if (property) {
        const [propKey, propValue] = Object.entries(property)[0]
        const index = pointer[lastKey].findIndex(item => item[propKey] === propValue)

        if (index !== -1) {
          if (typeof value !== 'object' || Array.isArray(value)) {
            throw new Error("Value must be an object when replacing an entry in the array.")
          }
          // Merge existing properties with new ones
          pointer[lastKey][index] = { ...pointer[lastKey][index], ...value }
        }
        else {
          pointer[lastKey].push(value)
        }
      }
      else {
        pointer[lastKey].push(value)
      }
    }
    else {
      if (merge && typeof pointer[lastKey] === 'object' && !Array.isArray(pointer[lastKey]) && typeof value === 'object' && !Array.isArray(value)) {
        pointer[lastKey] = deepMerge(pointer[lastKey], value)
      }
      else {
        pointer[lastKey] = value
      }
    }
  }


  const loadSecretParameters = async({ secretParameters = [], config = {}, debug = false, throwError = false, region = 'eu-central-1' } = {}) => {
    const environment = config?.environment || process.env.NODE_ENV || 'development'

    const ssmClient = new SSMClient({ region })

    // Process parameters in batches of 10 (AWS limit for GetParametersCommand)
    const processBatchedParameters = async(paramList) => {
      if (paramList.length === 0) return

      const batchSize = 10
      const batches = []

      for (let i = 0; i < paramList.length; i += batchSize) {
        batches.push(paramList.slice(i, i + batchSize))
      }

      for (const batch of batches) {
        try {
          const parameterNames = batch.map(param => `/${environment}/${param.name}`)

          const command = new GetParametersCommand({
            Names: parameterNames,
            WithDecryption: true
          })

          const response = await ssmClient.send(command)
          const parameters = response?.Parameters || []

          await Promise.all(parameters.map(async parameter => {
            const parameterName = parameter.Name
            const paramConfig = batch.find(p => `/${environment}/${p.name}` === parameterName)

            if (!paramConfig) return

            let value = parameter.Value

            if (paramConfig.json && value) {
              try {
                value = JSON.parse(value)
              }
              catch (e) {
                console.error('%s | %s | %s', functionName, parameterName, e?.message)
                if (throwError) throw e
                return
              }
            }

            if (debug) {
              console.warn('P %s | T %s | V %j', parameterName, typeof value, value)
            }

            setValue(config, {
              path: (paramConfig.path || paramConfig.name),
              value,
              array: paramConfig.array || false,
              property: paramConfig.property,
              merge: paramConfig.merge || false
            })
          }))

          if (response?.InvalidParameters?.length > 0) {
            console.error('%s | Invalid parameters: %j', functionName, response.InvalidParameters)
            if (throwError) {
              throw new Error(`Invalid parameters: ${response.InvalidParameters.join(', ')}`)
            }
          }
        }
        catch (e) {
          // Security errors must always propagate, regardless of throwError flag
          if (e?.message?.includes('unsafe key segment')) throw e

          console.error('%s | Batch parameter fetch error: %s', functionName, e?.message)
          if (throwError) throw e

          // Fallback: process parameters individually if batch fails
          await Promise.all(batch.map(param => getSecretParameter(param)))
        }
      }
    }

    // Fallback for individual parameter fetching
    const getSecretParameter = async(param) => {
      const parameterName = `/${environment}/${param.name}`
      try {
        const command = new GetParameterCommand({
          Name: parameterName,
          WithDecryption: true,
        })

        const response = await ssmClient.send(command)
        let value = response?.Parameter?.Value

        if (param.json) {
          value = JSON.parse(value)
        }

        if (debug) {
          console.warn('P %s | T %s | V %j', parameterName, typeof value, value)
        }
        setValue(config, { path: (param.path || param.name), value, array: param.array, property: param.property, merge: param.merge })
      }
      catch (e) {
        console.error('%s | %s | %s', functionName, parameterName, e?.message)
        if (throwError) throw e
      }
    }

    // Fetch all parameters under a path (wildcard support)
    const getSecretParametersByPath = async({ path, name, json = false, array, property, merge }) => {
      if (!path) throw new Error('pathMustBeSet')
      const parameterName = `/${environment}/${name}`
      try {
        let valueArray = []
        let nextToken = undefined
        do {
          const command = new GetParametersByPathCommand({
            Path: parameterName.replaceAll('*', ''),
            Recursive: true,
            WithDecryption: true,
            NextToken: nextToken,
          })
          const response = await ssmClient.send(command)
          valueArray.push(...response.Parameters)
          nextToken = response.NextToken
        }
        while (nextToken)

        for (const item of valueArray) {
          let value = item?.Value

          if (json) {
            value = JSON.parse(value)
          }

          if (debug) {
            console.warn('P %s | T %s | V %j', item?.Name, typeof value, value)
          }
          setValue(config, { path, value, array, property, merge })
        }
      }
      catch (e) {
        console.error('%s | %s | %s', functionName, parameterName, e?.message)
        if (throwError) throw e
      }
    }

    // Filter out parameters with ignoreInTestMode = true in test environment
    let filteredParams = secretParameters
    if (environment === 'test') {
      filteredParams = secretParameters.filter(param => !param.ignoreInTestMode)
    }

    if (debug) {
      filteredParams.forEach(param => param.debug = true)
    }

    // Split parameters into regular and wildcard ones
    const wildcardParams = filteredParams.filter(param => param.name.endsWith('*'))
    const regularParams = filteredParams.filter(param => !param.name.endsWith('*'))

    await Promise.all([
      processBatchedParameters(regularParams),
      ...wildcardParams.map(param => getSecretParametersByPath(param))
    ])
  }


  const loadSecrets = async({ secrets = [], multisecrets = [], config = {}, debug = false, region = 'eu-central-1' } = {}) => {
    const environment = config?.environment || 'development'

    const client = new SecretsManagerClient({ region })

    const getSecret = async({ secret }) => {
      const secretName = (environment === 'test' ? 'test.' : '') + secret?.name + (secret?.suffix ? '.' + secret?.suffix : '')

      const command = new GetSecretValueCommand({
        SecretId: secretName
      })
      try {
        const response = await client.send(command)
        if (response?.SecretString) {
          secret.value = JSON.parse(response?.SecretString)
        }
      }
      catch(e) {
        console.error('%s | %s | %s', functionName, secretName, e?.message)
      }
      return secret
    }

    const fetchSecrets = async({ secrets }) => {
      // Filter out secrets with ignoreInTestMode = true in test environment
      if (environment === 'test') {
        secrets = secrets.filter(secret => !secret.ignoreInTestMode)
      }
      return Promise.all(secrets.map(secret => getSecret({ secret })))
    }

    // Fetch multisecrets first and expand them into the secrets list
    if (multisecrets.length > 0) {
      const secretsToAdd = await fetchSecrets({ secrets: multisecrets })
      secretsToAdd.forEach(secadd => {
        const items = JSON.parse(secadd?.value?.values) || []
        if (typeof items !== 'object' || items.length < 1) {
          console.error('%s | %s | MultiSecret has no valid property values', functionName, secadd.name)
          throw new Error('MultiSecret has no valid property values')
        }
        items.forEach(item => {
          secrets.push({
            key: secadd.key,
            name: item,
            type: 'arrayObject'
          })
        })
      })
    }

    if (secrets.length > 0) {
      await fetchSecrets({ secrets })
      for (const secret of secrets) {
        let existingValue = getKey(config, secret.key) || {}
        const value = secret?.value
        if (value) {
          // Convert string booleans and JSON values
          if (typeof value === 'object') {
            for (const key of Object.keys(value)) {
              if (isUnsafeKeySegment(key)) {
                continue
              }
              let val = value[key]
              if (val === 'true') val = true
              else if (val === 'false') val = false
              else if (typeof val === 'string' && val.startsWith('JSON:')) {
                try {
                  val = JSON.parse(val.substring(5))
                }
                catch {
                  console.error('%s | %s | JSON could not be parsed %j', functionName, secret.name, val)
                  throw new Error('invalidJSON')
                }
              }
              value[key] = val
            }
          }

          if (secret.servers) {
            if (typeof secret.servers === 'boolean') {
              const servers = existingValue?.servers || []
              const updatedServers = servers.map(server => {
                if (server.server === secret.serverName) {
                  server = { ...server, ...value }
                }
                return server
              })
              if (!isUnsafeKeySegment('servers')) {
                config[secret.key].servers = updatedServers
              }
            }
          }
          else if (secret?.type === 'arrayObject') {
            existingValue.push(value)
            setKey(config, secret.key, existingValue)
          }
          else {
            if (Object.keys(existingValue).length === 0) {
              setKey(config, secret.key, {})
            }
            existingValue = { ...existingValue, ...value }
            setKey(config, secret.key, existingValue)
          }
        }

        if (secret?.log || debug) {
          console.warn('%s | %s | %j', functionName, secret?.name, existingValue)
        }
      }
    }
  }

  return {
    loadSecretParameters,
    loadSecrets
  }
}

module.exports = awsSecrets()