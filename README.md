# Documentation

See documentation on our [wiki](https://github.com/misonou/waterpipe/wiki).

# Installation

The library is a UMD-module that support browsers, AMD and Node.js.

For simplest case in HTML, include using `<script>` tags:

```html
<script type="text/javascript" src="waterpipe.js"></script>
<script type="text/javascript" src="waterpipe.format.js"></script><!-- Register additional pipe function -->
```

For Node.js, use `require()` and optionally `with` additional pipe functions:

```javascript
var waterpipe = require('waterpipe');
var waterpipe = require('waterpipe').with('format'); // Register additional pipe function
```

# Usage

## waterpipe(str, data, [options])

```javascript
waterpipe('The value is {{value}}.', { value: 1 }); // The value is 1.
```

### Options

```javascript
{
    // global variables that are available anywhere in the template
    // variables declared here will override those in waterpipe.globals
    globals: {}
}
```
