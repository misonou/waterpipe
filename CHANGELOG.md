## v2.2.0 / 2018-10-23

- Allow options in `waterpipe.eval()`
- New built-in pipe functions: `??`
- Template expressions evaluated to `undefined` or `null` now do not prevent "single-valued" mode
- Fix: whitespace character handling and double-encoded entity in parsing HTML
- Fix: catch errors from `JSON.stringify`

## v2.1.0 / 2017-09-04

- Introduce single-valued template
- Introduce whitespace normalization
- New built-in pipe functions: `~=`, `!~=`, `^=`, `$=`, `none`, `lcfirst`, `hyphenate`, `in`
- Improved key detection in array/object pipe functions

## v2.0.0 / 2017-03-20

Introduce new feature

## v1.0.1 / 2017-01-12

- Fix `Array.isArray` missing in IE8

## v1.0.0 / 2016-04-26

Initial release
