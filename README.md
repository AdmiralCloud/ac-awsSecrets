# AC AWS Secrets
Reads secrets from AWS secrets manager and adds them to the configuration of the embedding app.

## Usage

### Simple example
Lets assume we have the following configuration and secret

```
let existingConfig = {
  redis: {
    host: 'localhost'
  }
}

// Stored under name "redis.cacheServer" in AWS
let secret = {
  host: 'my-secret-server'
}
```

The following setup will replace the existing configuration and redis.host will be "my-secret-server"
```
const secretParams = {
  aws: {
    accessKeyId: 'accessKeyId',
    secretAccessKey: 'secretAccessKey',
    region: 'eu-central-1'
  },
  secrets: [
    { key: 'redis', name: 'redis.cacheServer', ignoreInTestMode: true }
  ],
  config: existingConfig,
  environment: 'development'
}

awsSecrets.loadSecrets(secretParams, (err, result) => {
  if (err) return cb(err)
  _.forEach(result, (item) => {
    console.log('Setting secret for', _.padEnd(_.get(item, 'key'), 25), '->', _.get(item, 'name'))
  })
  return cb()
})
```

### Example with array of objects

```
let existingConfig = {
  redis: {
    databases: [
      { db: 0, name: 'cache' },
      { db: 1, name: 'auth' }
    ]
  }
}

// secret stored under "redis.cacheServer"
let secret = {
  host: 'my-secret-server'

// secert storend under "redis.authServer"
let secret = {
  host: 'my-auth-server
}

// now use the function
const secretParams = {
  aws: {
    accessKeyId: 'accessKeyId',
    secretAccessKey: 'secretAccessKey',
    region: 'eu-central-1'
  },
  secrets: [
    { key: 'redis.databases', name: 'redis.cacheServer', servers: { identifier: 'name', value: 'cache' } }
    { key: 'redis.databases', name: 'redis.authServer', servers: { identifier: 'name', value: 'auth' } }
  ],
  config: existingConfig,
  environment: 'development'
}

awsSecrets.loadSecrets(secretParams, (err, result) => {
  // now 
  redis.databases: [
    { db: 0, name: 'cache', host: 'my-secret-server' },
    { db: 1, name: 'auth', host: 'my-auth-server' }
  ]
})

```

## Parameters
+ aws - object with accessKeyId, secretAccessKey and region (IAM user must have permission to read the secrets)
+ secrets - array of secrets to fetch
+ config - the current config (secrets will be merged into it)
+ environment - the current node environment (e.g. test, production, ... defaults to development)

## Links
- [Website](https://www.admiralcloud.com/)
- [Twitter (@admiralcloud)](https://twitter.com/admiralcloud)
- [Facebook](https://www.facebook.com/MediaAssetManagement/)

## License
[MIT License](https://opensource.org/licenses/MIT) Copyright © 2009-present, AdmiralCloud, Mark Poepping