const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager')
const { SSMClient, GetParameterCommand, GetParametersCommand, GetParametersByPathCommand } = require("@aws-sdk/client-ssm")

const testConfig = require('./test/config')
const functionName = 'ac-awsSecrets'.padEnd(15)

/**
* Replaces configuration variables with secrets

KEY is the variable name
NAME is the name of the secret 

OPT
serverName

MULTISECRETS
Multisecrets -> the secret contains a list of secrets that should be fetched
*
* TESTMODES
* 3 -> use secrets from testConfig
*/

const awsSecrets = () => {

  const getKey = (obj, key) => key.split('.').reduce((acc, cur) => acc[cur], obj)

  const setKey = (obj, key, value ) => {
    const [head, ...rest] = key.split('.')
    !rest.length
        ? obj[head] = value
        : setKey(obj[head], rest.join('.'), value)
  }

  const deepMerge = (target, source) => {
    if (Array.isArray(target) && Array.isArray(source)) {
      return [...new Set([...target, ...source])]
    }
    
    if (typeof source === 'object' && source !== null && typeof target === 'object' && target !== null) {
      const result = { ...target }
      for (const key in source) {
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
    // path can be from AWS parametes store (/a/b/c) or a real JSON path (a.b.c)    
    const keys = path.includes('/') ? path.split('/').filter(Boolean) : path.split('.')
    const lastKey = keys.pop()
    let pointer = config
  
    for (const key of keys) {
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
        pointer[lastKey] = deepMerge(pointer[lastKey], value)  // Use deepMerge instead of spread
      }
      else {
        pointer[lastKey] = value
      }
    }
  }
  

  const loadSecretParameters = async({ secretParameters = [], config = {}, testMode = 0, debug = false, throwError = false, region = 'eu-central-1' } = {}) => {
    const environment = config?.environment || process.env.NODE_ENV || 'development'
  
    const awsConfig = {
      region
    }
    const ssmClient = new SSMClient(awsConfig)
  
    // Process parameters in batches of 10 (AWS limit for GetParametersCommand)
    const processBatchedParameters = async(paramList) => {
      // Skip if no parameters
      if (paramList.length === 0) return
      
      // Split parameters into batches of 10
      const batchSize = 10
      const batches = []
      
      for (let i = 0; i < paramList.length; i += batchSize) {
        batches.push(paramList.slice(i, i + batchSize))
      }
      
      // Process each batch
      for (const batch of batches) {
        if (testMode === 3) {
          // For test mode, process individually as before
          await Promise.all(batch.map(async param => {
            const parameterName = `/${environment}/${param.name}`
            const found = testConfig.parameterStore.find(item => item.name === parameterName)
            let value = found?.value
            
            if (param.json && value) {
              try {
                value = JSON.parse(value)
              } 
              catch (e) {
                console.error('%s | %s | %s', functionName, parameterName, e?.message)
                if (throwError) throw e
              }
            }
            
            if (debug) {
              console.warn('P %s | T %s | V %j', parameterName, typeof value, value)
            }
            setValue(config, { 
              path: (param.path || param.name), 
              value, 
              array: param.array || false, 
              property: param.property, 
              merge: param.merge || false 
            })
          }))
        } 
        else {
          // For production mode, use GetParametersCommand to fetch multiple parameters at once
          try {
            // Get parameter names for this batch
            const parameterNames = batch.map(param => `/${environment}/${param.name}`)
            
            // Fetch all parameters in this batch with a single API call
            const command = new GetParametersCommand({
              Names: parameterNames,
              WithDecryption: true
            })
            
            const response = await ssmClient.send(command)
            const parameters = response?.Parameters || []
            
            // Process each parameter
            await Promise.all(parameters.map(async parameter => {
              // Find corresponding parameter config
              const paramName = parameter.Name
              const paramConfig = batch.find(p => `/${environment}/${p.name}` === paramName)
              
              if (!paramConfig) return // Skip if no matching config found
              
              let value = parameter.Value
              
              if (paramConfig.json && value) {
                try {
                  value = JSON.parse(value)
                } 
                catch (e) {
                  console.error('%s | %s | %s', functionName, paramName, e?.message)
                  if (throwError) throw e
                  return // Skip this parameter if JSON parsing fails
                }
              }
              
              if (debug) {
                console.warn('P %s | T %s | V %j', paramName, typeof value, value)
              }
              
              setValue(config, { 
                path: (paramConfig.path || paramConfig.name), 
                value, 
                array: paramConfig.array || false, 
                property: paramConfig.property, 
                merge: paramConfig.merge || false 
              })
            }))
            
            // Handle invalid parameters
            if (response?.InvalidParameters?.length > 0) {
              console.error('%s | Invalid parameters: %j', functionName, response.InvalidParameters)
              if (throwError) {
                throw new Error(`Invalid parameters: ${response.InvalidParameters.join(', ')}`)
              }
            }
          } 
          catch (e) {
            console.error('%s | Batch parameter fetch error: %s', functionName, e?.message)
            if (throwError) throw e
            
            // Fallback: process parameters individually if batch fails
            await Promise.all(batch.map(param => getSecretParameter(param)))
          }
        }
      }
    }
  
    // Keep the original getSecretParameter as fallback
    const getSecretParameter = async(param) => {
      const parameterName = `/${environment}/${param.name}`
      try {
        let value
        if (testMode === 3) {
          // fetch from availableSecrets
          let found = testConfig.parameterStore.find(item => item.name === parameterName)
          value = found?.value         
        }
        else {
          const command = new GetParameterCommand({
            Name: parameterName,
            WithDecryption: true,
          })
      
          // Send the command to retrieve the parameter
          const response = await ssmClient.send(command)
          value = response?.Parameter?.Value
        }
  
        // Extract and return the parameter value
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
  
    // Keep the original getSecretParametersByPath for wildcard parameters
    const getSecretParametersByPath = async({ path, name, json = false, array, property, merge }) => {
      if (!path) throw new Error('pathMustBeSet')
      const parameterName = `/${environment}/${name}`
      try {
        let valueArray
        if (testMode === 3) {
          // fetch from availableSecrets
          valueArray = testConfig.parameterStore.filter(item => {
            return item.name.startsWith(parameterName.replace('*', ''))
          })
          valueArray = valueArray.map(item => {
            return {
              Name: item?.name,
              Type: 'SecureString',
              Value: item?.value,
              Version: 1,
              LastModifiedDate: new Date(),
              ARN: `arn:aws:ssm:region:account-id:parameter/${item?.name}`,
              DataType: 'text'
            }
          })
        }        
        else {
          // fetch all paramters with the path
          const command = new GetParametersByPathCommand({
            Path: parameterName.replace('*', ''),
            Recursive: true,
            WithDecryption: true,
          })
          const response = await ssmClient.send(command)
          valueArray = response?.Parameters
        }
  
        for (const item of valueArray) {
          let value = item?.Value
          // Extract and return the parameter value
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
    
    // Add debug if needed
    if (debug) {
      filteredParams.forEach(param => param.debug = true)
    }
  
    // Split parameters into regular and wildcard ones
    const wildcardParams = filteredParams.filter(param => param.name.endsWith('*'))
    const regularParams = filteredParams.filter(param => !param.name.endsWith('*'))
    
    // Process parameters in parallel
    await Promise.all([
      // Process regular parameters in batches
      processBatchedParameters(regularParams),
      
      // Process wildcard parameters individually (using original method)
      ...wildcardParams.map(param => getSecretParametersByPath(param))
    ])
  }


  const loadSecrets = async({ secrets = [], multisecrets = [], config = {}, testMode = 0, debug = false, region = 'eu-central-1' } = {}) => {
    const environment = config?.environment || 'development'

    const awsConfig = {
      region
    }
    const client = new SecretsManagerClient(awsConfig)

  
    const getSecret = async({ secret }) => {
      const secretName = (environment === 'test' ? 'test.' : '') + secret?.name + (secret?.suffix ? '.' + secret?.suffix : '')

      // TESTMODE
      if (testMode === 3) {
        // fetch from availableSecrets
        let found = testConfig.availableSecrets.find(item => item.name === secret.name)
        secret.value = found?.value
      }
      else {
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
      }
      return secret
    }

    const fetchSecrets = async({ secrets }) => {
      // filter out secrets with ignoreInTestMode = true
      if (environment === 'test') {
        secrets = secrets.filter(secret => !secret.ignoreInTestMode)
      }
      return Promise.all(secrets.map(secret => getSecret({ secret })))
    }

    // fetch placeholder
    if (multisecrets.length > 0) {
      // some keys can have multiple entries (e.g. cloudfrontCOnfigs can have 1 - n entries)
      // we have to fetch them first from a secret and add them to the secrets to fetch 
      let secretsToAdd = await fetchSecrets({ secrets: multisecrets })
      // iterate each multisecret and add the values as new secrets
      secretsToAdd.forEach(secadd => {
        let items = JSON.parse(secadd?.value?.values) || []
        if (typeof items !== 'object' || items.length < 1) {
          console.error('%s | %s | MultiSecret has no valid property values', functionName, secadd.name)
          throw new Error('MultiSecret has no valid property values')
        }
        items.forEach(item => {
          let p = {
            key: secadd.key,
            name: item,
            type: 'arrayObject' // multisecrets contain multiple secrets that belong to the same config property (which is an array of objects)
          }
          secrets.push(p)
        })
      })
    }

    if (secrets.length > 0) {
      await fetchSecrets({ secrets })
      for (const secret of secrets) {
        let existingValue = getKey(config, secret.key) || {}
        let value = secret?.value
        if (value) {
          // convert values
          if (typeof value === 'object') {
            Object.keys(value).forEach((key) => {
              let val = value[key]
              if (val === 'true') val = true
              else if (val === 'false') val = false
              else if (typeof val === 'string' && val.startsWith('JSON:')) {
                try {
                  val = JSON.parse(val.substring(5))
                }
                catch(e) {
                  console.error('%s | %s | JSON could not be parsed %j', functionName, secret.name, val)
                  throw new Error('invalidJSON')
                }
              }
              value[key] = val
            })
          }

          if (secret.servers) {
            if (typeof secret.servers === 'boolean') {
              let servers = existingValue?.servers || []
              config[secret.key].servers = servers.map(server => {
                if (server.server === secret.serverName) {
                  server = { ...server, ...value }
                }
                return server
              })
            }
            else {
              // NEW NOTATION AS OBJECT
              /* TODO: Probably not used anywhere, so legacy is ok
              let match = {}
              _.set(match, _.get(secret.servers, 'identifier'), _.get(secret.servers, 'value'))
              existingValue = _.find(_.get(config, key, []), match)   
              */
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