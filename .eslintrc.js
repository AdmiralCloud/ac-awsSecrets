const config = {
  root: true,
  'env': {
    'commonjs': true,
    'es6': true,
    'node': true
  },
  'extends': 'eslint:recommended',
  "rules": {
    "space-before-function-paren": 0,
    "no-extra-semi": 0,
    "object-curly-spacing": ["error", "always"],
    "brace-style": ["error", "stroustrup", { "allowSingleLine": true }],
    "no-useless-escape": 0,
    "standard/no-callback-literal": 0,
    "new-cap": 0
  },
  globals: {
    describe: true,
    it: true,
    beforeEach: true,
    afterEach: true
  },
  'parserOptions': {
    'ecmaVersion': 2022
},
}

module.exports = config
