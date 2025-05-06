const config = {
  configVar1: {
    c1: false
  },
  configVar2: {
    servers: [
      { server: 'cacheRead', host: 'localhost', port: 6379 },
    ]
  },
  configVar4: {
    api: {
      port: 90
    }
  },
  configVar5: {
    path: {
      cookie: false
    }
  },
  aws: {
    account: '123',
    accessKeys: []
  },
  configVar7: {
    level: 'info'
  },
  db: []
}


// AWS PARAMETER STORE
const secretParameters = [
  { name: 'configVar1', json: true },
  { name: 'configVar2', json: true, array: true, path: 'configVar2.servers', property: { server: 'cacheRead' } },
  { name: 'configVar4/api', json: true },
  { name: 'configVar5.path', json: true },
  { name: 'configVar6', json: true },
  { name: 'aws', json: true, merge: true },
  { name: 'db/*', json: true, merge: true, path: 'db', array: true }
]

const parameterStore = [
  { name: '/test/configVar1', value: JSON.stringify({ c1: true, c2: 123, c3: 'abc' }) },
  {
    name: '/test/configVar2',
    value: JSON.stringify({
      port: 6360,
      host: 'myRedisHost'
    })
  },
  {
    name: '/test/configVar3',
  }, 
  {
    name: '/test/configVar4/api',
    value: JSON.stringify({ "url":"https://api.admiralcloud.com" })
  },
  {
    name: '/test/errorVar1',
    value: 'JSON:abc',
  },
  {
    name: '/test/configVar5.path',
    value: JSON.stringify({ cookie: true })
  },
  {
    name: '/test/configVar6',
    value: JSON.stringify({
      prop1: 123,
      prop2: 'abc'
    })
  },
  {
    name: '/test/aws',
    value: JSON.stringify({
      account: '456'
    })
  },
  {
    name: '/test/db/1',
    value: JSON.stringify({ url: 'https://db1.admiralcloud.com' }),
  },
  {
    name: '/test/db/2',
    value: JSON.stringify({ url: 'https://db2.admiralcloud.com' }),
  },
]


// AWS SECRETS 
const secrets = [
  { key: 'configVar1', name: 'simple' },
  { key: 'configVar2', name: 'server', servers: true, serverName: 'cacheRead' },
  { key: 'configVar4', name: 'json' },
  { key: 'configVar5.path', name: 'path' },
  { key: 'configVar6', name: 'notExistingLocally' },
  { key: 'configVar7', name: 'notExistingKey' },
]



const availableSecrets = [{
  key: 'configVar1',
  name: 'simple',
  value: {
    c1: 'true',
    c2: 123,
    c3: 'abc'
  },
  log: true
}, {
  key: 'configVar2',
  name: 'server',
  value: {
    port: 6360,
    host: 'myRedisHost'
  }
},
{
  key: 'configVar3',
  name: 'noSecret'
}, 
{
  key: 'configVar4',
  name: 'json',
  value: {
    api: 'JSON:{"url":"https://api.admiralcloud.com"}',
    valueHasJSON: true
  }
},
{
  key: 'errorVar1',
  name: 'invalidJSON',
  value: {
    api: 'JSON:abc',
    valueHasJSON: true
  }
},
{
  key: 'configVar5.path',
  name: 'path',
  value: {
    cookie: true
  }
},
{
  key: 'configVar6',
  name: 'notExistingLocally',
  value: {
    prop1: 123,
    prop2: 'abc'
  }
},
{ 
  key: 'aws.accessKeys', 
  name: 'aws.accessKeyConfigs',
  value: {
    values: '["aws.key1", "aws.key2"]'
  }
},
{ 
  key: 'aws.failedKeys', 
  name: 'aws.failedKeysConfig',
  value: {
    values: 123
  }
},
{
  key: 'aws.key1',
  name: 'aws.key1',
  value: {
    accessKeyId: 'awsKey1',
    secretAccessKey: 'awsSecret1'
  }
},{
  key: 'aws.key2',
  name: 'aws.key2',
  value: {
    accessKeyId: 'awsKey2',
    secretAccessKey: 'awsSecret2'
  }
}]

const multisecrets = [
  { key: 'aws.accessKeys', name: 'aws.accessKeyConfigs' }
]

const multisecretsFail = [
  { key: 'aws.failedKeys', name: 'aws.failedKeysConfig' } 
]

module.exports = {
  config,
  parameterStore,
  secretParameters,
  availableSecrets,
  multisecretsFail,
  secrets,
  multisecrets
}

