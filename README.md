# Documentation

See documentation on our [wiki](https://github.com/misonou/waterpipe/wiki).

# Installation

The library is a UMD-module that support browsers, AMD and Node.js.

For simplest case in HTML, include using `<script>` tags:

```html
<script type="text/javascript" src="waterpipe.js"></script>
```

# Usage

## waterpipe(str, data, [options])

```javascript
waterpipe('The value is {{value}}.', { value: 1 }); // The value is 1.
```

### Options

#### `globals`

Defines global variables readable in this evaluation.
Variables declared here will override those in `waterpipe.globals`.

#### `indent`

Sets indentation of resulting HTML markup.

Each level of nested elements will be indented by the specfied number of spaces or the specific sequence of characters.
If either `0` or an empty string is specified, indentation is turned off as if this option is absent.

#### `indentPadding`

Number of spaces or the specific sequence of characters that will be left padded to each line.
This option is only effective if the indent option is present and not equal to `0` or an empty string.

#### `noEncode`

Suppress encoding reserved HTML characters, including `'`, `"`, `&`, `<` and `>`.
Useful for templated text that contains no HTML and could be escaped later on.
