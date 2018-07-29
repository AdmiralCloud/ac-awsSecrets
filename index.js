const _ = require('lodash')
const async = require('async')
const AWS = require('aws-sdk')

/**
 * @param aws OBJ object with aws configuration data
 */

const awsSecrets = () => {
  const loadSecrets = (params, cb) => {
    const multiSecrets = _.get(params, 'multisecrets', [])
    const secrets = _.get(params, 'secrets', [])
    let config = _.get(params, 'config', {}) // the config object -> will be changed by reference
    const environment = _.get(config, 'environment', 'development')

    const region = _.get(params, 'aws.region', 'eu-central-1')
    const endpoint = _.find(awsEndpoints, { region })
    const client = new AWS.SecretsManager({
      accessKeyId: _.get(params, 'aws.accessKeyId'),
      secretAccessKey: _.get(params, 'aws.secretAccessKey'),
      region: region,
      endpoint: _.get(endpoint, 'endpoint')
    })

    let result = []
    async.series({
      fetchPlacholders: function(done) {
        if (!_.size(multiSecrets)) return done()
        // some keys can have multiple entries (e.g. cloudfrontCOnfigs can have 1 - n entries)
        // we have to fetch them first from a secret and add them to the secrets to fetch

        async.each(multiSecrets, (secret, itDone) => {
          let secretName = (config.environment === 'test' ? 'test.' : '') + _.get(secret, 'name')

          client.getSecretValue({ SecretId: secretName }, function(err, data) {
            if (err) {
              if (_.get(secret, 'ignoreInTestMode')) return itDone()
              if (_.get(secret, 'ignoreIfMissing')) return itDone() // this is an optional key

              console.error('Fetching secret %s failed', secretName, err)
              return itDone({ message: err, additionalInfo: { key: secretName } })
            }
            if (!_.get(data, 'SecretString')) {
              console.warn('Secret %s NOT avaialble', secretName, _.get(data, 'SecretString'))
              return itDone()
            }

            let value
            try {
              value = JSON.parse(_.get(data, 'SecretString'))
            }
            catch (e) {
              value = _.get(data, 'SecretString.values')
            }

            try {
              value = JSON.parse(_.get(value, 'values'))
            }
            catch (e) {
              return done({ message: 'placeHolderSecrets_valuesInvalid', additionalInfo: { key: secret.key } })
            }

            // value should be an array of keys
            _.forEach(value, (item) => {
              secrets.push({
                key: secret.key,
                name: item,
                type: 'arrayObject'
              })
            })
            return itDone()
          })
        }, done)
      },
      fetchSecrets: function(done) {
        if (!_.size(secrets)) return done()
        async.each(secrets, (secret, itDone) => {
          if (environment === 'test' && _.get(secret, 'ignoreInTestMode')) return itDone()
          // key is the local configuration path
          let key = _.get(secret, 'key')
          // secret name is the name used to fetch the secret
          let secretName = (config.environment === 'test' ? 'test.' : '') + _.get(secret, 'name') + (_.get(secret, 'suffix') ? '.' + _.get(secret, 'suffix') : '')

          client.getSecretValue({ SecretId: secretName }, function(err, data) {
            if (err) {
              if (_.get(secret, 'ignoreIfMissing')) return itDone() // this is an optional key

              console.error('Fetching secret %s failed', secretName, _.get(err, 'message', err))
              return itDone({ message: _.get(err, 'message', err), additionalInfo: { key: secretName } })
            }
            if (!_.get(data, 'SecretString')) {
              console.warn('Secret %s NOT avaialble', secretName, _.get(data, 'SecretString'))
              return itDone()
            }

            let value
            try {
              value = JSON.parse(_.get(data, 'SecretString'))

              // if value is prefixed with JSON -> parse the value
              if (_.get(value, 'valueHasJSON')) {
                _.forEach(value, (val, key) => {
                  if (_.startsWith(val, 'JSON:')) {
                    try {
                      _.set(value, key, JSON.parse(val.substr(5)))
                    }
                    catch (e) {
                    }
                  }
                })
                // remove that entry
                _.unset(value, 'valueHasJSON')
              }
            }
            catch (e) {
              value = _.get(data, 'SecretString')
            }

            // make sure boolean values are converted (from string)
            value = _.mapValues(value, (val) => {
              if (val === 'true') return true
              else if (val === 'false') return false
              else return val
            })
            let existingValue = _.get(config, key, {})

            if (secret.servers) {
              existingValue = _.find(_.get(config, key + '.servers', []), { server: secret.serverName })
            }
            if (_.get(secret, 'type') === 'array') {
              let array = []
              _.forEach(value, (val) => {
                array.push(val)
              })
              value = _.concat(existingValue, array)
            }

            if (_.get(secret, 'type') === 'arrayObject') {
              existingValue.push(value)
            }
            else {
              let setFresh
              if (_.isEmpty(existingValue)) setFresh = true
              _.merge(existingValue, value)
              // setFresh -> this property/path has never existed
              if (setFresh) _.set(config, key, existingValue)
            }

            if (_.get(secret, 'log')) {
              console.log(_.repeat('.', 90))
              console.warn(key, existingValue)
              console.warn(_.get(config, key))
              console.warn(_.repeat('.', 90))
            }

            result.push({ key, name: _.get(secret, 'name', '-') })
            return itDone()
          })
        }, done)
      }
    }, (err) => {
      return cb(err, _.orderBy(result, 'key'))
    })
  }

  const awsEndpoints = [
    { region: 'eu-central-1', endpoint: 'https://secretsmanager.eu-central-1.amazonaws.com' }
  ]

  return {
    loadSecrets
  }
}

module.exports = awsSecrets()
