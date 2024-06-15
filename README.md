# AC AWS Secrets
Reads secrets from AWS secrets manager and adds them to the configuration of the embedding app.

Instead of AWS secrets, you can now also use AWS parameter store (which is not as expensive as AWS secrets)

![example workflow](https://github.com/admiralcloud/ac-awssecrets/actions/workflows/node.js.yml/badge.svg)


# Version 2 - BREAKING CHANGES
+ works with Node16 or higher
+ async/await - no callback!
+ uses AWS IAM roles or AWS IAM profiles instead of IAM credentials

# AWS Parameter Store
Using parameter store is a less expensive and gives you more flexibility in handling password and other configurations that should not be hardcoded.

## Usage of AWS parmeters
When you create your parameters in AW parameter store, use the following structure:
```
/ENVIRONMENT/CONFIG_PATH[/...]
```

The script will replace configuration properties based on the path. See example for more information:
```
// your app's example configuration
const config = {
  http: {
    port: 8080
  },
  database: {
    servers: [
      { server: 'mainDB' } 
    ]
  }
}

// AWS parameters (values must be stored as strigified JSON)
/development/http -> { port: 8090 }
/development/database -> { host: 'awsAurora', port: 3306 }:

// function payload
const payload = {
  secretParameters: [ 
    { name: 'http', json: true },
    { name: 'database', json: true, array: true, property: { server: 'mainDB' }}
  ],
  config
}
await awsSecrets.loadSecretParameters(payload)

// result
const config = {
  http: {
    port: 8090
  },
  database: {
    servers: [
      { server: 'mainDB', host: 'awsAurora', port: 3306 } 
    ]
  }
}

```

## Options
|Parameter|Type|Required|Description|
|---|---|---|---|
|name|string|yes|name of the parameter (without environment) (and property in config)
|path|string|-|If your config property does not match name, you can specify the path
|json|boolean|-|If true, the parameter value will be parsed as JSON
|array|boolean|-|If true, the the value will be pushed to the array at name or path
|property|object|-|If set, instead of pushing the value to an array it will inserted at the object which matches the property 


# AWS Secrets
## Parameters
|Parameter|Type|Required|Description|
|---|---|---|---|
|key|string|yes|the local variable name|
|name|string|yes|the name of the AWS secret|
|servers|bool|-|See below
|valueHasJSON|bool|-|If true, some properties have JSON content (prefixed with JSON:)

## Usage
AWS secret is a JSON object. Those properties will be merged with local config properties based on the secret's name.

### Secret

#### Store secret in AWS
```
Example secret
// name: mySecret1
{
  prop1: 'abc',
  prop2: 123,
  prop3: 'JSON:{"jprop1": "abc}'
}
```

#### Configure a local variable, that should be enhanced with the secret
```
const config = {
  key1: {},
  otherKey: {
    prop10: 'https://www.admiralcloud.com'
  }
}
```

#### Fetch secrets
```
const secrets = [
  { key: 'key1', name: 'mySecret1' } // key is the config var, name is the AWS secret name
]
await awsSecrets.loadSecrets({ secrets, config })

// config will change  - key1 will be enhanced with AWS secret
const config = {
  key1: {
    prop1: 'abc',
    prop2: 123,
    prop3: 'JSON:{"jprop1": "abc}'
  },
  otherKey: {
    prop10: 'https://www.admiralcloud.com'
  }
}

```

### Multisecrets
Use multisecrets if you want to add a number of additional secrets to be fetched. Usually it is used to fetch multiple objects for an array of objects:

#### Store multisecret in AWS
```
Example secret
// name: mySecret2
{
  values: '["aws.key1", "aws.key2"]'
}
```

#### Store secrets in AWS 
```
// name: aws.key1
{
  accessKeyId: 'awsKey1',
  secretAccessKey: 'awsSecret1'
}

// name: aws.key2
{
  accessKeyId: 'awsKey2',
  secretAccessKey: 'awsSecret2'
}
```

#### Configure a local variable, that should be enhanced with the secret
```
const config = {
  mySecret2: [],
  otherKey: {
    prop10: 'https://www.admiralcloud.com'
  }
}
```

#### Fetch secrets
```
const multisecrets = [
  { key: 'mySecret2', name: 'mySecret2' } // key is the config var, name is the AWS secret name
]
const secrets = []
await awsSecrets.loadSecrets({ secrets, multisecrets, config })

// config will change  - key1 will be enhanced with AWS secret
const config = {
  mySecret2: [
    {
      accessKeyId: 'awsKey1',
      secretAccessKey: 'awsSecret1'
    },
    {
      accessKeyId: 'awsKey2',
      secretAccessKey: 'awsSecret2'
    }
  ]
}

```




# VERSION 1 - OUTDATED
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

# Links
- [Website](https://www.admiralcloud.com/)

# License
[MIT License](https://opensource.org/licenses/MIT) Copyright © 2009-present, AdmiralCloud AG, Mark Poepping