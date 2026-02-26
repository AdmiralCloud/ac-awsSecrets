const { expect } = require('chai')
const { mockClient } = require('aws-sdk-client-mock')
const { SSMClient, GetParametersCommand, GetParameterCommand, GetParametersByPathCommand } = require('@aws-sdk/client-ssm')
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager')

const awsSecrets = require('../index')
const fixture = require('./config')

const ssmMock = mockClient(SSMClient)
const secretsMock = mockClient(SecretsManagerClient)

// Helper to capture stderr output
const captureStream = (stream) => {
  const oldWrite = stream.write
  let buf = ''
  stream.write = (chunk) => {
    buf += chunk.toString()
    oldWrite.apply(stream, arguments)
  }
  return {
    unhook: () => { stream.write = oldWrite },
    captured: () => buf
  }
}

// Build SSM mock responses from fixture parameterStore
const buildSsmMocks = () => {
  // GetParametersCommand returns batches by name - matches any environment prefix
  ssmMock.on(GetParametersCommand).callsFake((input) => {
    const Parameters = input.Names
      .map(name => {
        // Match by exact name or by stripping the environment prefix
        const found = fixture.parameterStore.find(p => p.name === name) ||
          fixture.parameterStore.find(p => name.endsWith(p.name.replace(/^\/test/, '')))
        if (!found) return null
        return { Name: name, Value: found.value, Type: 'SecureString' }
      })
      .filter(Boolean)

    const InvalidParameters = input.Names.filter(name => {
      const found = fixture.parameterStore.find(p => p.name === name) ||
        fixture.parameterStore.find(p => name.endsWith(p.name.replace(/^\/test/, '')))
      return !found
    })

    return { Parameters, InvalidParameters }
  })

  // GetParametersByPathCommand supports pagination via NextToken
  ssmMock.on(GetParametersByPathCommand).callsFake((input) => {
    const Parameters = fixture.parameterStore
      .filter(p => p.name.startsWith(input.Path))
      .map(p => ({ Name: p.name, Value: p.value, Type: 'SecureString' }))

    return { Parameters, NextToken: undefined }
  })

  // GetParameterCommand (fallback for individual fetches)
  ssmMock.on(GetParameterCommand).callsFake((input) => {
    const found = fixture.parameterStore.find(p => p.name === input.Name)
    if (!found) throw new Error(`ParameterNotFound: ${input.Name}`)
    return { Parameter: { Name: found.name, Value: found.value, Type: 'SecureString' } }
  })
}

// Build Secrets Manager mock responses from fixture availableSecrets
const buildSecretsMocks = () => {
  secretsMock.on(GetSecretValueCommand).callsFake((input) => {
    // Strip 'test.' prefix to find the fixture entry
    const name = input.SecretId.replace(/^test\./, '')
    const found = fixture.availableSecrets.find(s => s.name === name)
    if (!found) throw new Error(`ResourceNotFoundException: ${input.SecretId}`)
    return { SecretString: JSON.stringify(found.value) }
  })
}

// ─── secretParameters (SSM) ─────────────────────────────────────────────────

describe('loadSecretParameters', () => {
  let config

  before(() => {
    ssmMock.reset()
    buildSsmMocks()
  })

  beforeEach(() => {
    // Fresh config for each test
    config = {
      environment: 'test',
      configVar1: { c1: true },
      configVar2: { servers: [{ server: 'main', port: 3000 }] },
      configVar5: { path: {} },
      configVar7: { level: 'info' },
      aws: { account: '123', accessKeys: [] }
    }
  })

  it('loads and parses JSON parameters', async() => {
    await awsSecrets.loadSecretParameters({
      secretParameters: [{ name: 'configVar1', json: true }],
      config
    })
    const expected = JSON.parse(fixture.parameterStore.find(p => p.name === '/test/configVar1').value)
    expect(config.configVar1).to.deep.equal(expected)
  })

  it('merges nested object parameters', async() => {
    await awsSecrets.loadSecretParameters({
      secretParameters: [{ name: 'configVar1', json: true, merge: true }],
      config
    })
    expect(config.configVar1).to.have.property('c1', true) // original value preserved
    expect(config.configVar1).to.have.property('c2')
  })

  it('sets a parameter at a specific path', async() => {
    await awsSecrets.loadSecretParameters({
      secretParameters: [{ name: 'configVar4/api/url', path: 'configVar4.api.url' }],
      config
    })
    expect(config.configVar4.api).to.have.property('url', 'https://api.admiralcloud.com')
  })

  it('sets a nested path parameter', async() => {
    await awsSecrets.loadSecretParameters({
      secretParameters: [{ name: 'configVar5/path/cookie', path: 'configVar5.path.cookie' }],
      config
    })
    expect(config.configVar5.path).to.have.property('cookie', 'true')
  })

  it('creates missing config keys on the fly', async() => {
    await awsSecrets.loadSecretParameters({
      secretParameters: [
        { name: 'configVar6/prop1', path: 'configVar6.prop1' },
        { name: 'configVar6/prop2', path: 'configVar6.prop2' }
      ],
      config
    })
    expect(config.configVar6).to.have.property('prop1', '123')
    expect(config.configVar6).to.have.property('prop2', 'abc')
  })

  it('silently skips non-existing parameters without error', async() => {
    await awsSecrets.loadSecretParameters({
      secretParameters: [{ name: 'configVar7/nonExisting', path: 'configVar7.level' }],
      config
    })
    // Value was not found in SSM, so original value should be untouched
    expect(config.configVar7).to.have.property('level', 'info')
  })

  it('merges top-level JSON parameter', async() => {
    await awsSecrets.loadSecretParameters({
      secretParameters: [{ name: 'aws', json: true, merge: true }],
      config
    })
    expect(config.aws).to.have.property('account', '456')
    expect(config.aws).to.have.property('accessKeys').with.length(0)
  })

  it('loads wildcard path parameters as array', async() => {
    await awsSecrets.loadSecretParameters({
      secretParameters: [{ name: 'db/*', path: 'db', array: true, json: true }],
      config
    })
    expect(config.db).to.have.length(2)
    expect(config.db[0]).to.have.property('url', 'https://db1.admiralcloud.com')
    expect(config.db[1]).to.have.property('url', 'https://db2.admiralcloud.com')
  })

  it('handles batches of more than 10 parameters', async() => {
    // Create 12 parameters to force batching
    const manyParams = Array.from({ length: 12 }, (_, i) => ({
      name: `configVar6/prop${i + 1}`,
      path: `batchTest.prop${i + 1}`
    }))
    // Should not throw even though most params won't exist
    await awsSecrets.loadSecretParameters({ secretParameters: manyParams, config })
    expect(config).to.exist
  })

  it('throws on invalid parameters when throwError is set', async() => {
    ssmMock.reset()
    // Mock a batch where all params are invalid
    ssmMock.on(GetParametersCommand).resolves({
      Parameters: [],
      InvalidParameters: ['/test/nonExistent']
    })

    try {
      await awsSecrets.loadSecretParameters({
        secretParameters: [{ name: 'nonExistent' }],
        config,
        throwError: true
      })
      expect.fail('Should have thrown')
    }
    catch(e) {
      expect(e.message).to.include('Invalid parameters')
    }
    finally {
      ssmMock.reset()
      buildSsmMocks()
    }
  })

  it('falls back to GetParameterCommand when batch fails', async() => {
    ssmMock.reset()
    // Make batch command fail
    ssmMock.on(GetParametersCommand).rejects(new Error('BatchFailed'))
    // Individual fallback succeeds
    ssmMock.on(GetParameterCommand).callsFake((input) => {
      const found = fixture.parameterStore.find(p => p.name === input.Name)
      if (!found) throw new Error(`ParameterNotFound: ${input.Name}`)
      return { Parameter: { Name: found.name, Value: found.value, Type: 'SecureString' } }
    })

    await awsSecrets.loadSecretParameters({
      secretParameters: [{ name: 'configVar1', json: true }],
      config
    })
    const expected = JSON.parse(fixture.parameterStore.find(p => p.name === '/test/configVar1').value)
    expect(config.configVar1).to.deep.equal(expected)

    ssmMock.reset()
    buildSsmMocks()
  })

  it('skips parameters with ignoreInTestMode in test environment', async() => {
    await awsSecrets.loadSecretParameters({
      secretParameters: [
        { name: 'configVar1', json: true },
        { name: 'configVar6/prop1', path: 'configVar6.prop1', ignoreInTestMode: true }
      ],
      config
    })
    expect(config.configVar6).to.be.undefined
    expect(config.configVar1).to.have.property('c2')
  })

  it('outputs debug logs when debug is true', async() => {
    const hook = captureStream(process.stderr)
    await awsSecrets.loadSecretParameters({
      secretParameters: [{ name: 'configVar1', json: true }],
      config,
      debug: true
    })
    hook.unhook()
    expect(hook.captured()).to.include('/test/configVar1')
  })

  it('handles multiple wildcards in parameter name via replaceAll', async() => {
    // Should not throw and should strip all * correctly
    await awsSecrets.loadSecretParameters({
      secretParameters: [{ name: 'db/**', path: 'db', array: true, json: true }],
      config
    })
    expect(config).to.exist
  })

  it('throws when path is missing on wildcard parameter', async() => {
    try {
      await awsSecrets.loadSecretParameters({
        secretParameters: [{ name: 'db/*' }], // no path!
        config
      })
      expect.fail('Should have thrown')
    }
    catch(e) {
      expect(e.message).to.equal('pathMustBeSet')
    }
  })
})

// ─── Prototype Pollution ────────────────────────────────────────────────────

describe('Prototype Pollution Protection', () => {
  let testConfig

  before(() => {
    ssmMock.reset()
    buildSsmMocks()
  })

  beforeEach(() => {
    // Include environment so the SSM mock can match fixture parameters
    testConfig = { environment: 'test' }
  })

  it('rejects __proto__ in secretParameters path', async() => {
    try {
      await awsSecrets.loadSecretParameters({
        secretParameters: [{ name: 'configVar1', path: '__proto__.polluted', json: false }],
        config: testConfig
      })
      expect.fail('Should have thrown')
    }
    catch(e) {
      expect(e.message).to.include('unsafe key segment')
    }
    expect(({}).polluted).to.be.undefined
  })

  it('rejects constructor in secretParameters path', async() => {
    try {
      await awsSecrets.loadSecretParameters({
        secretParameters: [{ name: 'configVar1', path: 'constructor.polluted' }],
        config: testConfig
      })
      expect.fail('Should have thrown')
    }
    catch(e) {
      expect(e.message).to.include('unsafe key segment')
    }
  })

  it('rejects prototype in secretParameters path', async() => {
    try {
      await awsSecrets.loadSecretParameters({
        secretParameters: [{ name: 'configVar1', path: 'prototype.polluted' }],
        config: testConfig
      })
      expect.fail('Should have thrown')
    }
    catch(e) {
      expect(e.message).to.include('unsafe key segment')
    }
  })

  it('rejects __proto__ in nested path', async() => {
    try {
      await awsSecrets.loadSecretParameters({
        secretParameters: [{ name: 'configVar1', path: 'safe.__proto__.polluted' }],
        config: testConfig
      })
      expect.fail('Should have thrown')
    }
    catch(e) {
      expect(e.message).to.include('unsafe key segment')
    }
  })

  it('allows paths that contain "proto" as substring', async() => {
    await awsSecrets.loadSecretParameters({
      secretParameters: [{ name: 'configVar4/api/url', path: 'protocol.settings' }],
      config: testConfig
    })
    // protocol is a safe key and should be set
    expect(testConfig.protocol).to.exist
    expect(testConfig.protocol.settings).to.equal('https://api.admiralcloud.com')
  })
})

// ─── loadSecrets (Secrets Manager) ─────────────────────────────────────────

describe('loadSecrets', () => {
  let config

  before(() => {
    secretsMock.reset()
    buildSecretsMocks()
  })

  beforeEach(() => {
    config = {
      environment: 'test',
      configVar1: { c1: true },
      configVar2: { servers: [{ server: 'main', port: 3000 }] },
      configVar5: { path: {} },
      configVar7: { level: 'info' },
      aws: { account: '123', accessKeys: [] }
    }
  })

  it('loads and merges a secret into config', async() => {
    await awsSecrets.loadSecrets({
      secrets: [{ name: 'configVar1', key: 'configVar1' }],
      config
    })
    expect(config.configVar1).to.have.property('c1', true)
    expect(config.configVar1).to.have.property('c2', 'secretValue2')
  })

  it('updates server config via servers flag', async() => {
    await awsSecrets.loadSecrets({
      secrets: [{ name: 'configVar2', key: 'configVar2', servers: true, serverName: 'main' }],
      config
    })
    expect(config.configVar2.servers[0]).to.have.property('port', 9999)
  })

  it('parses JSON: prefixed values', async() => {
    await awsSecrets.loadSecrets({
      secrets: [{ name: 'configVar4', key: 'configVar4' }],
      config
    })
    expect(config.configVar4.api).to.have.property('url', 'https://api.admiralcloud.com')
  })

  it('converts string "true"/"false" to booleans', async() => {
    await awsSecrets.loadSecretParameters({
      secretParameters: [{ name: 'configVar5/path/cookie', path: 'configVar5.path.cookie' }],
      config
    })
    // Value from SSM is the string 'true', not a boolean
    expect(config.configVar5.path.cookie).to.equal('true')
  })

  it('creates non-existing config keys', async() => {
    await awsSecrets.loadSecrets({
      secrets: [{ name: 'configVar6', key: 'configVar6' }],
      config
    })
    expect(config.configVar6).to.have.property('prop1', 123)
    expect(config.configVar6).to.have.property('prop2', 'abc')
  })

  it('expands multisecrets and loads each as array entry', async() => {
    await awsSecrets.loadSecrets({
      secrets: [],
      multisecrets: [{ name: 'awsAccessKeys', key: 'aws.accessKeys' }],
      config
    })
    expect(config.aws.accessKeys).to.have.length(2)
    expect(config.aws.accessKeys[0]).to.have.property('accessKeyId', 'awsKey1')
    expect(config.aws.accessKeys[1]).to.have.property('accessKeyId', 'awsKey2')
  })

  it('throws on invalid JSON: value', async() => {
    // Mock a secret that returns a broken JSON: value
    secretsMock.reset()
    secretsMock.on(GetSecretValueCommand).resolves({
      SecretString: JSON.stringify({ data: 'JSON:{invalid' })
    })

    try {
      await awsSecrets.loadSecrets({
        secrets: [{ name: 'badJson', key: 'errorVar' }],
        config
      })
      expect.fail('Should have thrown')
    }
    catch(e) {
      expect(e.message).to.equal('invalidJSON')
    }
    finally {
      secretsMock.reset()
      buildSecretsMocks()
    }
  })

  it('skips secrets with ignoreInTestMode in test environment', async() => {
    await awsSecrets.loadSecrets({
      secrets: [
        { name: 'configVar1', key: 'configVar1' },
        { name: 'configVar6', key: 'configVar6', ignoreInTestMode: true }
      ],
      config
    })
    expect(config.configVar6).to.be.undefined
    expect(config.configVar1).to.have.property('c2')
  })

  it('outputs debug logs when debug is true', async() => {
    const hook = captureStream(process.stderr)
    await awsSecrets.loadSecrets({
      secrets: [{ name: 'configVar1', key: 'configVar1' }],
      config,
      debug: true
    })
    hook.unhook()
    expect(hook.captured()).to.include('ac-awsSecrets')
  })

  it('rejects __proto__ in secret key', async() => {
    try {
      await awsSecrets.loadSecrets({
        secrets: [{ name: 'configVar1', key: '__proto__.polluted' }],
        config
      })
      expect.fail('Should have thrown')
    }
    catch(e) {
      expect(e.message).to.include('unsafe key segment')
      expect(({}).polluted).to.be.undefined
    }
  })
})