// Test fixture data - only used in tests, never imported by production code

const config = {
  environment: 'test',
  configVar1: { c1: true },
  configVar2: {
    servers: [{ server: 'main', port: 3000 }]
  },
  configVar5: { path: {} },
  configVar7: { level: 'info' },
  aws: {
    account: '123',
    accessKeys: []
  }
}

// Simulates SSM Parameter Store entries
const parameterStore = [
  { name: '/test/configVar1', value: JSON.stringify({ c1: true, c2: 'value2', c3: 42 }) },
  { name: '/test/configVar2', value: JSON.stringify({ port: 5432 }) },
  { name: '/test/configVar4/api/url', value: 'https://api.admiralcloud.com' },
  { name: '/test/configVar5/path/cookie', value: 'true' },
  { name: '/test/configVar6/prop1', value: '123' },
  { name: '/test/configVar6/prop2', value: 'abc' },
  { name: '/test/db/1', value: JSON.stringify({ url: 'https://db1.admiralcloud.com' }) },
  { name: '/test/db/2', value: JSON.stringify({ url: 'https://db2.admiralcloud.com' }) },
  // Merged aws config
  { name: '/test/aws', value: JSON.stringify({ account: '456', accessKeys: [] }) },
]

// Parameters to load via SSM
const secretParameters = [
  { name: 'configVar1', json: true },
  { name: 'configVar2', json: true, path: 'configVar2.servers.0', merge: true },
  { name: 'configVar4/api/url', path: 'configVar4.api.url' },
  { name: 'configVar5/path/cookie', path: 'configVar5.path.cookie' },
  { name: 'configVar6/prop1', path: 'configVar6.prop1' },
  { name: 'configVar6/prop2', path: 'configVar6.prop2' },
  { name: 'configVar7/nonExisting', path: 'configVar7.level' },
  { name: 'aws', json: true, merge: true },
  { name: 'db/*', path: 'db', array: true, json: true },
]

// Simulates Secrets Manager entries
const availableSecrets = [
  {
    name: 'configVar1',
    value: { c2: 'secretValue2', c3: 99 }
  },
  {
    name: 'configVar2',
    value: { port: 9999 }
  },
  {
    name: 'configVar4',
    value: { api: 'JSON:{"url":"https://api.admiralcloud.com"}' }
  },
  {
    name: 'configVar5',
    value: { cookie: 'true' }
  },
  {
    name: 'configVar6',
    value: { prop1: 123, prop2: 'abc' }
  },
  {
    name: 'awsAccessKey1',
    value: { accessKeyId: 'awsKey1', secretAccessKey: 'secret1' }
  },
  {
    name: 'awsAccessKey2',
    value: { accessKeyId: 'awsKey2', secretAccessKey: 'secret2' }
  },
  {
    name: 'awsAccessKeys',
    value: { values: JSON.stringify(['awsAccessKey1', 'awsAccessKey2']) }
  },
  {
    name: 'invalidJSON',
    value: 'not-valid-json'
  }
]

const secrets = [
  { name: 'configVar1', key: 'configVar1' },
  { name: 'configVar2', key: 'configVar2', servers: true, serverName: 'main' },
  { name: 'configVar4', key: 'configVar4' },
  { name: 'configVar5', key: 'configVar5' },
  { name: 'configVar6', key: 'configVar6' },
]

const multisecrets = [
  { name: 'awsAccessKeys', key: 'aws.accessKeys' }
]

module.exports = {
  config,
  parameterStore,
  secretParameters,
  availableSecrets,
  secrets,
  multisecrets
}