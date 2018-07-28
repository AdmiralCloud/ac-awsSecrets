# AC AWS Secrets
Reads secrets from AWS secrets manager and adds them to the configuration of the embedding app.

## Usage

```
const secretParams = {
  aws: {
    accessKeyId: 'accessKeyId',
    secretAccessKey: 'secretAccessKey',
    region: 'eu-central-1'
  },
  secrets: [
    { key: 'redis', name: 'redis.cacheServer', servers: true, serverName: 'cacheServer', ignoreInTestMode: true }
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

## Parameters
+ aws - object with accessKeyId, secretAccessKey and region (IAM user must have permission to read the secrets)
+ secrets - array of secrets to fetch
+ config - the current config (secrets will be merged into it)
+ environment - the current node environment (e.g. test, production, ... defaults to development)

## License

MIT