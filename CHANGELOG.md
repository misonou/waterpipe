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
