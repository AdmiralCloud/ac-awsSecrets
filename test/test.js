const { expect } = require('chai')


 const awsSecrets = require('../index')

const testConfig = require('./config')

const multisecrets = testConfig?.multisecrets
const config = testConfig.config
let secrets = testConfig.secrets



describe('Tests', () => {
  it('Read secrets', async() => {
    await awsSecrets.loadSecrets({ secrets, config, multisecrets, testMode: 3 })
  })

  it('Check configVar1', async() => {
//    expect(config.configVar1).to.have.property('c1', false)
    const expected = secrets.find(item => item.key === 'configVar1')
    expect(config.configVar1).to.have.property('c1', true)
    expect(config.configVar1).to.have.property('c2', expected.value.c2)
    expect(config.configVar1).to.have.property('c3', expected.value.c3)

  })

  it('Check server', async() => {
    //console.log(23, config)
    const expected = secrets.find(item => item.key === 'configVar2')
    expect(config.configVar2.servers[0]).to.have.property('port', expected.value.port)
  })

  it('Check JSON', async() => {
    expect(config.configVar4.api).to.have.property('url', 'https://api.admiralcloud.com')
  })

  it('Check multisecrets', async() => {
    //console.log(50, config.aws.accessKeys)
    expect(config.aws.accessKeys).to.have.length(2)
    expect(config.aws.accessKeys[0]).to.have.property('accessKeyId', 'awsKey1')
    expect(config.aws.accessKeys[1]).to.have.property('accessKeyId', 'awsKey2')
  })
})
