const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager')
const customCredentialProvider = require('ac-aws-customcredentialprovider')

const testConfig = require('./test/config');

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


  const functionName = 'ac-awsSecrets'.padEnd(15)
  const loadSecrets = async({ secrets = [], multisecrets = [], config = {}, testMode = 0, debug = false } = {}) => {
    const environment = config?.environment || 'development'

    const awsConfig = {
      region: 'eu-central-1',
      credentials: customCredentialProvider({ localDevelopment: config.localDevelopment, debug: true })
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

        if (secret?.log || debug) {
          console.log('%s | %s | %j', functionName, secret?.name, existingValue)
        }
      }
    }  
  }

  return {
    loadSecrets
  }
}

module.exports = awsSecrets()
