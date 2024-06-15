const { expect } = require('chai')


 const awsSecrets = require('../index')

const testConfig = require('./config')

const multisecrets = testConfig?.multisecrets
const config = testConfig.config
let secrets = testConfig.secrets

const parameterStore = testConfig.parameterStore
let secretParameters = testConfig.secretParameters

// HELPER for console.log checks
const captureStream = (stream) => {
  let oldWrite = stream.write
  var buf = ''
  stream.write = (chunk) => {
    buf += chunk.toString()
    oldWrite.apply(stream, arguments)
  }

  return {
    unhook: () => {
     stream.write = oldWrite
    },
    captured: () => {
      return buf
    }
  }
}

describe('Reading secretParameters', () => {
  it('Read secretParameters', async() => {
    await awsSecrets.loadSecretParameters({ secretParameters, config, testMode: 3 })
  })

  it('Check configVar1', async() => {
    const expected = parameterStore.find(item => item.name === '/test/configVar1')
    expected.value = JSON.parse(expected.value)
    expect(config.configVar1).to.have.property('c1', true)
    expect(config.configVar1).to.have.property('c2', expected.value.c2)
    expect(config.configVar1).to.have.property('c3', expected.value.c3)

  })

  it('Check server', async() => {
    const expected = testConfig.parameterStore.find(item => item.name === '/test/configVar2');
    expected.value = JSON.parse(expected.value);
    expect(config.configVar2.servers[0]).to.have.property('port', expected.value.port);
  })

  it('Check JSON', async() => {
    expect(config.configVar4.api).to.have.property('url', 'https://api.admiralcloud.com')
  })

  it('Check path', async() => {
    expect(config.configVar5.path).to.have.property('cookie', true)
  })

  it('Check non existing local config', async() => {
    expect(config.configVar6).to.have.property('prop1', 123)
    expect(config.configVar6).to.have.property('prop2', 'abc')
  })

  it('Check non existing key - should fallback to existing value without error', async() => {
    expect(config.configVar7).to.have.property('level', 'info')
  })
})


describe('Reading secrets', () => {
  it('Read secrets', async() => {
    await awsSecrets.loadSecrets({ secrets, config, multisecrets, testMode: 3 })
    //console.log(18, config)
  })

  it('Check configVar1', async() => {
    const expected = secrets.find(item => item.key === 'configVar1')
    expect(config.configVar1).to.have.property('c1', true)
    expect(config.configVar1).to.have.property('c2', expected.value.c2)
    expect(config.configVar1).to.have.property('c3', expected.value.c3)

  })

  it('Check server', async() => {
    const expected = secrets.find(item => item.key === 'configVar2')
    expect(config.configVar2.servers[0]).to.have.property('port', expected.value.port)
  })

  it('Check JSON', async() => {
    expect(config.configVar4.api).to.have.property('url', 'https://api.admiralcloud.com')
  })

  it('Check path', async() => {
    expect(config.configVar5.path).to.have.property('cookie', true)
  })

  it('Check non existing local config', async() => {
    expect(config.configVar6).to.have.property('prop1', 123)
    expect(config.configVar6).to.have.property('prop2', 'abc')
  })

  it('Check non existing key - should fallback to existing value without error', async() => {
    expect(config.configVar7).to.have.property('level', 'info')
  })

  it('Check multisecrets', async() => {
    //console.log(50, config.aws.accessKeys)
    expect(config.aws.accessKeys).to.have.length(2)
    expect(config.aws.accessKeys[0]).to.have.property('accessKeyId', 'awsKey1')
    expect(config.aws.accessKeys[1]).to.have.property('accessKeyId', 'awsKey2')
  })
})

describe('Check errors', () => {
  it('Check invalid JSON', async() => {
    let errorSecrets = [
      { name: 'invalidJSON', key: 'errorVar1' }
    ]
    try { 
      await awsSecrets.loadSecrets({ secrets: errorSecrets, config, testMode: 3 })
    }
    catch(e) {
      expect(e).to.be.an('error')
      expect(e).to.have.property('message', 'invalidJSON')
    }
  })
})


describe('Misc', () => {
  var hook
  beforeEach(function(){
    hook = captureStream(process.stderr)
  })
  afterEach(function(){
    hook.unhook()
  })

  it('Read secrets with debug mode', async() => {
    await awsSecrets.loadSecrets({ secrets, config, multisecrets, testMode: 3, debug: true })
    expect(hook.captured()).to.include('ac-awsSecrets')
  })
})
