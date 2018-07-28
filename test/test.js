const _ = require('lodash')
const expect = require('expect')
const byteConverter = require('../index')

const formatTests = [
  { name: '10 bytes', value: 10, expected: '10B' },
  { name: '1.000 bytes to kb', value: 1000, expected: '1kB' },
  { name: '1.000.000 bytes to MB', value: 1e6, expected: '1MB' },
  { name: '1.000.000.000 bytes to GB', value: 1e9, expected: '1GB' },
  { name: '1.000.000.000.000 bytes to TB', value: 1e12, expected: '1TB' },
  { name: '1024 bytes to KiB', value: 1024, expected: '1KiB', options: { system: 'iec' } },
  { name: '2^20 bytes to 1 MiB', value: Math.pow(2, 20), expected: '1MiB', options: { system: 'iec' } },
  { name: '2^30 bytes to 1 GiB', value: Math.pow(2, 30), expected: '1GiB', options: { system: 'iec' } },
  { name: '2^40 bytes to 1 TiB', value: Math.pow(2, 40), expected: '1TiB', options: { system: 'iec' } },
  { name: '1GB as 1000MB', value: 1e9, expected: '1000MB', unit: 'MB' },
  { name: '1GB as 0.001TB', value: 1e9, expected: '0.001TB', unit: 'TB', options: { decimals: 3 } },
  { name: '1GB as 0TB with default decimals', value: 1e9, expected: '0TB', unit: 'TB' },
  { name: '2.5e6 as 2.5MB', value: 2.5e6, expected: '2.5MB' },
  { name: '53.687.091.200 as 50GiB', value: 53687091200, expected: '50GiB', options: { system: 'iec' } }

]

const parseTests = [
  { name: '1MB to 1e6 bytes', value: '1MB', expected: 1e6 },
  { name: '1MB to 1e6 bytes with space', value: '1 MB', expected: 1e6 },
  { name: '100MB to 1e8 bytes with space', value: '100 MB', expected: 1e8 },
  { name: '1GB to 1e9 bytes', value: '1GB', expected: 1e9 },
  { name: '1TB to 1e12 bytes', value: '1TB', expected: 1e12 },
  { name: '50GiB to 53.687.091.200 bytes', value: '50GiB', expected: 53687091200 },
  { name: 'Parse float value 1.5MB to 1.5e6', value: '1.5MB', expected: 1.5e6 }
]

const errorFormatTests = [
  { name: 'no value - error that value is required', value: null, expected: { message: 'valueRequired' } },
  { name: 'invalid value', value: '1ABB', expected: { message: 'valueMustBeANumber' } },
  { name: 'non existing unit - try 1000 in ABB', value: 1000, unit: 'ABB', expected: { message: 'unitInvalid' } },
  { name: 'value as array', value: [1000, '1AABB'], expected: { message: 'valueMustBeANumber' } }
]

const errorParseTests = [
  { name: 'no value - error that value is required', value: null, expected: { message: 'valueRequired' } },
  { name: 'invalid value 1ABB', value: '1ABB', expected: { message: 'unitInvalid' } },
  { name: 'invalid value 1KB', value: '1KB', expected: { message: 'unitInvalid' } },
  { name: 'invalid value FAIL', value: 'FAIL', expected: { message: 'unitInvalid' } },
  { name: 'value without unit', value: 1000, expected: 1000 },
  { name: 'value as array', value: [1000, '1AABB'], expected: { message: 'valueMustBeAString' } }
]

describe('TESTING byteConversion', function () {
  describe('FORMAT Tests', function() {
    _.forEach(formatTests, (test) => {
      it(test.name, function(done) {
        let options = _.get(test, 'options', {})
        let unit = _.get(test, 'unit')
        let r = byteConverter.format(test.value, unit, options)
        expect(r).toEqual(test.expected)
        return done()
      })
    })
  })

  describe('PARSE Tests', function() {
    _.forEach(parseTests, (test) => {
      it(test.name, function(done) {
        let options = _.get(test, 'options', {})
        let r = byteConverter.parse(test.value, options)
        expect(r).toEqual(test.expected)
        return done()
      })
    })
  })

  describe('ERROR FORMAT Tests', function() {
    _.forEach(errorFormatTests, (test) => {
      it(test.name, function(done) {
        let options = _.get(test, 'options', {})
        let unit = _.get(test, 'unit')
        let r = byteConverter.format(test.value, unit, options)
        expect(r).toEqual(test.expected)
        return done()
      })
    })
  })

  describe('ERROR PARSE Tests', function() {
    _.forEach(errorParseTests, (test) => {
      it(test.name, function(done) {
        let options = _.get(test, 'options', {})
        let r = byteConverter.parse(test.value, options)
        expect(r).toEqual(test.expected)
        return done()
      })
    })
  })
})
