## v2.9.0 / 2025-03-03

- Add `noWarning` option to turn console warning off
- Gracefully handle unclosed function argument
- Export library version
- Fix: ignore repeated warning
- Fix: avoid function to be coerced as key in `as` and `let`
- Fix: evaluate property name in first segment with double $ sign

## v2.8.3 / 2025-02-08

- Fix: handling of handling and consecutive double quotes
- Fix: avoid evaluation error when iterating non-object

## v2.8.2 / 2025-02-03

- Update source code to ES module

## v2.8.1 / 2025-01-17

- Fix: `:json` pipe should consume no arguments

## v2.8.0 / 2024-02-27

- Add `eval` pipe
- Fix: handle tag with namespace

## v2.7.4 / 2024-01-26

- Fix: parse error with "]" literal
- Fix: collapse whitespace around script and style tags and their attributes
- Fix: extra whitespace before tag after pipe

## v2.7.3 / 2023-03-20

- Fix: script and style content being dropped when `html` option is set to `false`
- Fix: should output malformed html as is when `html` option is set to `false`

## v2.7.2 / 2023-03-02

- Fix: incorrect output when attribute value ended with =
- Fix: newlines between attributes should be collapsed
- Fix: preserve whitespaces between attributes when `html` option is set to `false`
- Fix: skip escaping special characters for attribute value

## v2.7.1 / 2022-09-20

- Fix: `sortby` not taking up argument if input is undefined
- Fix: call site formatting in pipe error

## v2.7.0 / 2022-08-14

- Add `html` options
- Fix: escaped backslash dropped in parsed string value

## v2.6.1 / 2022-07-21

- Fix: `between` pipe should sort its two arguments before comparing with input value
- Fix: cache parsing of time interval in `addtime`

## v2.6.0 / 2022-07-18

- Add case-insensitive and reversed version of `sort` and `sortby`
- Add date-related pipe function `asdate` and `addtime`

## v2.5.3 / 2022-06-07

- Fix: evaluate path starting with single $ sign followed by parenthesis as nested object path

## v2.5.2 / 2022-06-01

- Fix: `:date` format pipe should return empty string for invalid date

## v2.5.1 / 2022-02-18

- Fix: `noEncode` should apply to pipe evaluation result

## v2.5.0 / 2022-02-17

- Add `noEncode` option
- Fix: spaces around tags are not preserved

## v2.4.2 / 2022-01-17

- Move all format pipes to main script
- `waterpipe.with` is now no-op

## v2.4.1 / 2021-07-02

- Fix: `to` (`..`) pipe should handle zero-padding and minus sign
- Fix: `where` and `sortby` should return `undefined` or `null` when given such values

## v2.4.0 / 2020-06-29

- Add reverse indexing accessor (`^0` gets last element, `^1` gets second-last, etc)
- Add new special variables `@now`, `@today`, `@random`
- New pipe functions `!!` and new alias `?:` and `&`
- `to` (`..`) pipe now enumerates through numbers embedded in strings (`a0 .. a2` yields 'a0', 'a1' and 'a2')
- Fix: `waterpipe.eval()` when input template starts with `&` or `!`
- Fix: parse issue with trailing closing curly bracket (`}}}`)
- Fix: exception from pipe function `in`
- Fix: `sum` returns incorrect values
- Fix: whitespace stripped in HTML comments

## v2.3.1 / 2019-12-16

- Fix: HTML comment marker `<!-- -->` erroreously escaped

## v2.3.0 / 2019-12-14

- Introduce `indent` and `indentPadding` options
- Fix: Unexpected escaped character for `<!doctype>` and text inside `<script>` and `<style>`

## v2.2.3 / 2019-11-15

- Fix: whitespace characters stripped in HTML attributes

## v2.2.2 / 2019-09-12

- Fix: whitespace characters stripped in non-HTML content

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

- Changes to pipe argument interpretation (details in [Pipe Argument](https://github.com/misonou/waterpipe/wiki/Pipe#pipe-argument))
- New special variables: `#key`, `#index`, `@root`, `@0`, `@1`, ...
- New capabilities for variadic pipes
- New built-in pipe functions: `pow`, `to`, `slice`, `unique`, `groupby`
- `&&`, `||` and `|` constructs are now pipe functions, leveraging new variadic pipe capabilities
- Fix incorrect output from `:date` pipe with `h`, `hh`, `t` or `tt` specifier

## v1.0.1 / 2017-01-12

- Fix `Array.isArray` missing in IE8

## v1.0.0 / 2016-04-26

Initial release
