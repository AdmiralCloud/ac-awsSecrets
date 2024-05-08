<a name="2.1.1"></a>

## [2.1.1](https://github.com/admiralcloud/ac-awssecrets/compare/v2.1.0..v2.1.1) (2024-05-08 13:44:22)


### Bug Fix

* **App:** Only set value from secret, if secret exists | MP | [ab1b8e87bd1e35c7eb4428c1aa90ad9a93597d9e](https://github.com/admiralcloud/ac-awssecrets/commit/ab1b8e87bd1e35c7eb4428c1aa90ad9a93597d9e)    
Only set value from secret, if secret exists  
Related issues: [undefined/undefined#master](undefined/browse/master)
### Chores

* **App:** Updated packages | MP | [57d506749cbcad5372c84952a8e7929dd62dca37](https://github.com/admiralcloud/ac-awssecrets/commit/57d506749cbcad5372c84952a8e7929dd62dca37)    
Updated packages  
Related issues: [undefined/undefined#master](undefined/browse/master)
<a name="2.1.0"></a>
 
# [2.1.0](https://github.com/admiralcloud/ac-awssecrets/compare/v2.0.5..v2.1.0) (2023-12-31 14:46:52)


### Feature

* **App:** Do not use custom credentialprovider | MP | [9556a0fb87e15c8d1242585373a706853384d796](https://github.com/admiralcloud/ac-awssecrets/commit/9556a0fb87e15c8d1242585373a706853384d796)    
It does not seem to speed up the process to use custom credential provider. It can also create compatibility issues  
Related issues: [undefined/undefined#develop](undefined/browse/develop)
### Chores

* **App:** Updated packages | MP | [cd5c172c2ed8169f5927c4a7e6562b7a5a9b5899](https://github.com/admiralcloud/ac-awssecrets/commit/cd5c172c2ed8169f5927c4a7e6562b7a5a9b5899)    
Updated packages  
Related issues: [undefined/undefined#develop](undefined/browse/develop)
<a name="2.0.5"></a>

## [2.0.5](https://github.com/admiralcloud/ac-awssecrets/compare/v2.0.4..v2.0.5) (2023-06-24 09:11:54)


### Bug Fix

* **App:** Package updates | MP | [f9797922cc5d0d82391197c3f26ef6ba4fedd74b](https://github.com/admiralcloud/ac-awssecrets/commit/f9797922cc5d0d82391197c3f26ef6ba4fedd74b)    
Package updates and replaced nyc with c8.  
Related issues: [undefined/undefined#develop](undefined/browse/develop)
<a name="2.0.4"></a>

## [2.0.4](https://github.com/admiralcloud/ac-awssecrets/compare/v2.0.3..v2.0.4) (2023-05-14 17:20:29)


### Bug Fix

* **App:** Updated packages | MP | [08793a00613df9b02db393cc41a83f02bf9d39d9](https://github.com/admiralcloud/ac-awssecrets/commit/08793a00613df9b02db393cc41a83f02bf9d39d9)    
Updated packages  
Related issues: [undefined/undefined#develop](undefined/browse/develop)
<a name="2.0.3"></a>

## [2.0.3](https://github.com/admiralcloud/ac-awssecrets/compare/v2.0.2..v2.0.3) (2023-05-14 14:29:50)


### Bug Fix

* **App:** Typo fix | MP | [c370bd159b05051d81ba267f4b327e5a34560ef8](https://github.com/admiralcloud/ac-awssecrets/commit/c370bd159b05051d81ba267f4b327e5a34560ef8)    
Typo fix  
Related issues: [/issues#undefined](https://github.com//issues/undefined)
<a name="2.0.2"></a>

## [2.0.2](https://github.com/admiralcloud/ac-awssecrets/compare/v2.0.1..v2.0.2) (2023-05-14 14:26:17)


### Bug Fix

* **App:** Improved speed using only 2 credential providers | MP | [26c4c6ac703b9125fb72fcc14d4495f1bc4ac378](https://github.com/admiralcloud/ac-awssecrets/commit/26c4c6ac703b9125fb72fcc14d4495f1bc4ac378)    
Use only 2 credential providers as defined in ac-aws-customcredentialprovider. This way starting apps is much faster  
Related issues: [/issues#undefined](https://github.com//issues/undefined)
<a name="2.0.1"></a>

## [2.0.1](https://github.com/admiralcloud/ac-awssecrets/compare/v2.0.0..v2.0.1) (2023-05-12 16:00:19)


### Bug Fix

* **App:** Use AWS_PROFILE instead of profile | MP | [5b0c1ce8413d22a88de870ff46c080019c2d795e](https://github.com/admiralcloud/ac-awssecrets/commit/5b0c1ce8413d22a88de870ff46c080019c2d795e)    
Use AWS_PROFILE and the built-in session management from AWS SDK  
Related issues: [/issues#undefined](https://github.com//issues/undefined)
<a name="2.0.0"></a>
 
# [2.0.0](https://github.com/admiralcloud/ac-awssecrets/compare/v1.1.6..v2.0.0) (2023-02-26 11:45:48)


### Feature

* **App:** Complete rewrite | MP | [782aeddf4f9f6d815a19762c1c92dc138b369478](https://github.com/admiralcloud/ac-awssecrets/commit/782aeddf4f9f6d815a19762c1c92dc138b369478)    
Using AWS IAM roles/profiles, use async/await  
Related issues: [undefined/undefined#develop](undefined/browse/develop)
### Bug Fix

* **App:** Minor fixes | MP | [bc6c7cc832f98c939cf703e1b967bb7fdaa05c1f](https://github.com/admiralcloud/ac-awssecrets/commit/bc6c7cc832f98c939cf703e1b967bb7fdaa05c1f)    
Improved error messages, make sure to get and set path based variables  
Related issues: [undefined/undefined#develop](undefined/browse/develop)
* **App:** Improved AWS profile handling | MP | [28fddd68778b7ad52b7a6dff3468d09655dde43e](https://github.com/admiralcloud/ac-awssecrets/commit/28fddd68778b7ad52b7a6dff3468d09655dde43e)    
Allow profile as parameter for function call (instead of just env variable)  
Related issues: [undefined/undefined#develop](undefined/browse/develop)
### Tests

* **App:** Added more tests | MP | [907289ea6e0b0406e5e82a2b7e7c84f0c8c9386f](https://github.com/admiralcloud/ac-awssecrets/commit/907289ea6e0b0406e5e82a2b7e7c84f0c8c9386f)    
Added more tests  
Related issues: [undefined/undefined#develop](undefined/browse/develop)
* **App:** Add config for test | MP | [8d21f27a15a49bc9544d7ba387d2eca99c336af2](https://github.com/admiralcloud/ac-awssecrets/commit/8d21f27a15a49bc9544d7ba387d2eca99c336af2)    
Add config for test  
Related issues: [undefined/undefined#develop](undefined/browse/develop)
### Documentation

* **App:** Add badge for tests | MP | [93df1ae14f1daa77793010c0e24423ac13f64a89](https://github.com/admiralcloud/ac-awssecrets/commit/93df1ae14f1daa77793010c0e24423ac13f64a89)    
Add badge for tests  
Related issues: [undefined/undefined#develop](undefined/browse/develop)
### Chores

* **App:** Add coverage test with nyc | MP | [1cdc7330d4be1abcbcd728ab4bc4c772b5489468](https://github.com/admiralcloud/ac-awssecrets/commit/1cdc7330d4be1abcbcd728ab4bc4c772b5489468)    
Use yarn coverage  
Related issues: [undefined/undefined#develop](undefined/browse/develop)
### Chores

* **App:** Updated packages | MP | [c7e9f7965ac2e93b93282549dc86c7fc01b8f85c](https://github.com/admiralcloud/ac-awssecrets/commit/c7e9f7965ac2e93b93282549dc86c7fc01b8f85c)    
Updated packages  
Related issues: [undefined/undefined#develop](undefined/browse/develop)
## BREAKING CHANGES
* **App:** Not compatible with version 1 - please see README
<a name="1.1.6"></a>

## [1.1.6](https://github.com/mmpro/ac-awssecrets/compare/v1.1.5..v1.1.6) (2022-04-20 11:48:54)


### Bug Fix

* **App:** Updated packages | MP | [1ad4baa1414604b20b6b702a40527ba5930b7cfd](https://github.com/admiralcloud/ac-awssecrets/commit/1ad4baa1414604b20b6b702a40527ba5930b7cfd)    
Updated packages  
Related issues: [undefined/undefined#master](undefined/browse/master)
<a name="1.1.5"></a>

## [1.1.5](https://github.com/mmpro/ac-awssecrets/compare/v1.1.4..v1.1.5) (2022-03-27 17:29:49)


### Bug Fix

* **App:** Package updates | MP | [926d148478906d89f66210d44fb72e6dcc23c8ac](https://github.com/mmpro/ac-awssecrets/commit/926d148478906d89f66210d44fb72e6dcc23c8ac)    
Package updates
<a name="1.1.4"></a>

## [1.1.4](https://github.com/mmpro/ac-awssecrets/compare/v1.1.3..v1.1.4) (2021-10-09 10:18:52)


### Bug Fix

* **App:** Package updates | MP | [ede713128ed7a62b9659f737c4469db389854af9](https://github.com/mmpro/ac-awssecrets/commit/ede713128ed7a62b9659f737c4469db389854af9)    
Package updates
<a name="1.1.3"></a>

## [1.1.3](https://github.com/mmpro/ac-awssecrets/compare/v1.1.2..v1.1.3) (2021-09-22 11:13:39)


### Bug Fix

* **App:** Package updates | MP | [82f4a90c24c4c94279bf23621dd92805e01ca4d7](https://github.com/mmpro/ac-awssecrets/commit/82f4a90c24c4c94279bf23621dd92805e01ca4d7)    
Package updates
<a name="1.1.2"></a>

## [1.1.2](https://github.com/mmpro/ac-awssecrets/compare/v1.1.1..v1.1.2) (2021-05-31 06:17:24)


### Bug Fix

* **App:** Package updates | MP | [466bc49d1d270b784cc35c0ab3e476b3fd6e3587](https://github.com/mmpro/ac-awssecrets/commit/466bc49d1d270b784cc35c0ab3e476b3fd6e3587)    
Package updates
<a name="1.1.1"></a>

## [1.1.1](https://github.com/mmpro/ac-awssecrets/compare/v1.1.0..v1.1.1) (2020-03-29 14:10:49)


### Bug Fix

* **App:** Prepare repository for AC semantic release | MP | [f8f652bc09e1581e2ec35b3be6d51045bb905576](https://github.com/mmpro/ac-awssecrets/commit/f8f652bc09e1581e2ec35b3be6d51045bb905576)    
Cleaned up repository and use ac-semantic-release
### Chores

* **Misc:** Updated packages | MP | [83244d834fd80f34fbaf450fdefcdfa5b78f91f2](https://github.com/mmpro/ac-awssecrets/commit/83244d834fd80f34fbaf450fdefcdfa5b78f91f2)    
Updated packages
<a name="1.1.0"></a>
# [1.1.0](https://github.com/mmpro/ac-awssecrets/compare/v1.0.1...v1.1.0) (2020-02-16 18:42)


### Features

* **Misc:** The servers parameter now support more flexibility | mp ([01f0a798f543108ecef72771de5705764f7db82f](https://github.com/mmpro/ac-awssecrets/commit/01f0a798f543108ecef72771de5705764f7db82f))    
  You can set custom identifiers for array of objects - see README



<a name="1.0.1"></a>
## [1.0.1](https://github.com/mmpro/ac-awssecrets/compare/v1.0.0...v1.0.1) (2019-07-24 19:43)


### Bug Fixes

* **Misc:** Force version bump | MP ([fbfb1ae](https://github.com/mmpro/ac-awssecrets/commit/fbfb1ae))    
  Force version bump



<a name="1.0.0"></a>
# 1.0.0 (2019-07-24 19:42)


### Bug Fixes

* **Misc:** Package update | MP ([dbb4c23](https://github.com/mmpro/ac-awssecrets/commit/dbb4c23))    
  Package update and some minor adjustments for corp-release/semver
* **Misc:** Package update | MP ([8224bf7](https://github.com/mmpro/ac-awssecrets/commit/8224bf7))    
  Package update and some minor adjustments for corp-release/semver
* **Misc:** Package update | MP ([14e79bc](https://github.com/mmpro/ac-awssecrets/commit/14e79bc))    
  Package update and some minor adjustments for corp-release/semver



