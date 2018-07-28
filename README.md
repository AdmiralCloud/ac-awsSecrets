# AC AWS Secrets
Reads secrets from AWS secrets manager and adds them to the configuration of the embedding app.

## Usage

***byteConverter.format(value, [unit], [options])***

Converts a value in bytes to a human-readable value.

+ value -> bytes (NUMBER) to converts
+ unit -> optional unit (STRING) to convert bytes to (e.g. MB, MiB). If not set, will be auto-detected based on the value (e.g. 10000 will be converted to 10kB)
+ options -> optional object with options
  + system -> can be "si" or "iec", defaults to si
  + decimals -> number of decimals to show, defaults to 2


***byteConverter.parse(value, [options])***

Converts a human readable value into bytes.

+ value -> human readable value (STRING) to convert to bytes
+ options -> optional object with options
  + system -> can be "si" or "iec", will be auto-detected
  + decimals -> number of decimals to show, defaults to 2


## Examples

```
const byteConverter = require('ac-byteConverter')

// convert 1000 to 1kb
byteConverter.format(1000)

// convert 1 MB to 1000000 bytes
byteConverter.parse('1MB')
// 1000000

// convert 1 Mebibyte to 1048576 bytes
byteConverter.parse('1MiB')
// 1048576

```
## License

MIT