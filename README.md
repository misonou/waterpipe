## waterpipe(str, data, [options])

```javascript
waterpipe('The value is {{value}}.', { value: 1 }); // The value is 1.
```

### Options

```javascript
{
    // true to output DOM objects instead of a string
    // see the section "Contextified DOM Output"
    html: false,

    // global variables that are available anywhere in the template
    // variables declared here will override those in waterpipe.globals
    globals: {}
}
```

## Constructs

### Object Path

The basic construct consist of an object path in a double-braced expression.

```
{{object_path}}
```

This is basically the same as Javascript's `.` or `[]` operator, except that it is short-circuited if at any step it evaluates to `undefined` or `null`.

In addition, any part of the object path can be sub-evaluated by a preceding dollar sign (`$`).

```javascript
Input:
    [ "A", "B", "C", zero: 0, string: "foo", array: [1, 2, 3, 4] ]

{{0}} -> "A"
{{string}} -> "foo"
{{string.0}} -> "f"
{{string.length}} -> "3"
{{array}} -> "[1,2,3,4]"
{{array.0}} -> "1"
{{array.$zero}} -> "1"
{{array.$(array.0)}} -> "2"
{{array.foo.bar}} -> ""
```

If the first segment of an object path does not appear as a key on the input object, it will be evaluated against the current globals, and then the ultimate globals (`waterpipe.globals`).

```javascript
waterpipe.globals:
    { foo: "foo", baz: "baz", array: "array", inexist: "inexist" }

Globals:
    { foo: "bar" }

Input:
    { array: [] }

{{foo}} -> "bar"
{{baz}} -> "baz"
{{array.inexist}} -> ""
```

By default all outputs are HTML-encoded. To avoid encoded outputs, prepend an ampersand character (`&`) before the object path.

```javascript
Input:
    { string: "<b>This is HTML.</b>" }

{{string}} -> "&lt;b&gt;This is HTML.&lt;/b&gt;"
{{&string}} -> "<b>This is HTML.</b>"
```

### Pipe

Advanced manipulations can be done through pipes. A pipe consists of an object path with pipe functions and their arguments separated in spaces:

```
{{[object_path] fn1 [args ...] [fn2 [args ...] ...]}}
```

Pipe function accepts the previous evaluated value (a.k.a. piped value) and reads arguments from the pipe and then returns a new value.

```javascript
Input:
    { string: "foo", array: [1, 2, 3, 4] }

{{array length}} -> "4"
{{array.0 * 10}} -> "10"
{{string upper padstart /}} -> "/FOO"
```

If the object path does not exist neither on the input object nor the globals, it will be recognized as a pipe function. Therefore, object paths can be omitted for shorthand if there is no collision with pipe function names.

```javascript
Input:
    "foobar"

{{upper}} -> "FOOBAR"
```

### Pipe Arguments

Arguments are evaluated by the following rules in order:

1. If it is preceded by a dollar sign (`$`), treat as an object path and evaluates it
1. Keyword `true`, `false`, `undefined` and `null` which evaluates to JavaScript equivalents
1. A floating point number if valid
1. A string

```javascript
Input:
    { value: 3 }

{{value * 2}} -> "6"
{{value * $value}} -> "9"
{{$value * $value}} -> "9"
```

> **Note:** To express characters which are used as control characters as an argument, use the backslash character (`\`). The baskslash character itself needs to be escaped in JavaScript string literals.

```javascript
Input:
    { string: "This is a string." }

{{string indexOf \\ }} -> "4"
```

> **Note:** Since putting an empty string as an argument is intrinsically impossible, it can be achieved by a declaring it on the globals by `$.template.globals` or by the `let` or `as` pipe function:

```javascript
{{# substr 0 0 as EMPTY_STR}}
{{let EMPTY_STR [ substr ]}}
```

### Conditionals

The `{{if pipe}}...{{elseif pipe}}...{{else}}` construct is available for branching logics.

```javascript
Input:
    { value: 1, array: [3, 4, 5] }

{{if value odd}}
    Value is odd.
{{elseif array any [ odd ]}}
    Some numbers in the array is odd.
{{else}}
    There is no odd numbers.
{{/if}}
```

For complex logic, the logical pipe functions can be used. See [Control Functions](#control-functions).

### Iterables

All objects in JavaScript is iterable by the ``{{foreach [pipe]}}`` construct.

Object paths are evaluated against the current iterated object. The special object path `#` returns the current iterated key or index; `##` returns the current iterated index (regardless of array or object); and `#count` returns the total count.

```javascript
Input:
    { values: { foo: "a", bar: "b" }, array: [1, 2, 3] }

{{foreach values}}
    {{##}}. {{#}}={{.}}
{{/foreach}}       -> "0. foo=a
                       1. bar=b"

{{foreach array}}
    {{#}}={{.}}
{{/foreach}}       -> "0=1
                       1=2
                       2=3"

{{foreach}}
    {{#}}={{.}}
{{/foreach}}       -> "values={"foo":"a","bar":"b"}
                       array=[1,2,3]"

{{foreach array where [ odd ]}}
    {{#}} out of {{#count}}={{.}}
{{/foreach}}       -> "0 out of 2=1
                       1 out of 2=3"
```

### Function Arguments

Some pipe functions accept functions as arguments. In such case, it will read, if it is followed by an open bracket (`[`) argument, through coming segments until a balanced close bracket (`]`) argument.

```javascript
Input:
    { simple: [1, 2, 3, 4], complex: [
        { value: 1 },
        { value: 2 },
        { value: 3 },
        { value: 4 }
    ] }

{{simple where [ even ]}} -> "[2,4]"
{{complex map [ $value + 1 ]}} -> "[2,3,4,5]"
```

Function arguments can be nested.

```javascript
Input:
    [1, 2, 3, 4]

{{? [ any [ even ] ] yes no}} -> "yes"
```

### Comments

Comments can be included in the template by the `{{!}}` construct.

```javascript
{{!This is a comment.}}
```

## Pipe Functions

The library ships with a bunch of pipe functions for basic manipulations.

### Testing Functions

#### `equals`(`==`), `notequals`(`!=`)

Checks if the piped value is equal, or not equal, to the supplied argument.
The comparison is done by its string representation.

```javascript
Input:
    { bool: true, string: "true" }

{{bool == $string}} -> "true"
```

#### `more`(`>`), `less`(`<`), `ormore`(`>=`), `orless`(`<=`), `between`

Checks if the piped value is more than, less than, more than or equal to, less than or equal to,
or between the supplied argument(s).

> **Note:** In constrast to the native comparison operator, `undefined` and `null` are always less than any other values; and arrays are compared element by element recursively.

```javascript
Input:
    { foo: [1, 3, 5], bar: [1, 3], baz: [2, 4] }

{{foo.1 < 3}} -> "true"
{{foo.3 > 3}} -> "true"
{{foo > $bar}} -> "true"
{{baz > $foo}} -> "true"
{{foo.0 between 0 2}} -> "true"
```

#### `contains`, `like`

Checks if the string contains a substring or matches the given pattern.

> **Note:** Any escape character (`\`) in regular expression needs to be escaped itself. For example a valid regular expression `/\w/g` needs to be written as `/\\w/g`.

```javascript
Input:
    { string: "foobar" }

{{string contains foo}} -> "true"
{{string like /^foo/i}} -> "true"
```

### Conditional Functions

#### `or`

Outputs the given argument instead of the piped value if it evaluates to false.

```javascript
Input:
    { zero: 0, falsy: false, nil: null, undef: undefined, empty: "" }

{{zero or 1}} -> "1"
{{falsy or 1}} -> "1"
{{nil or 1}} -> "1"
{{undef or 1}} -> "1"
{{empty or 1}} -> "1"
```

#### `choose`, `test`(`?`)

Returns either one of the two arguments depends on the piped value.

```javascript
Input:
    { isTrue: true, isFalse: false, strYes: "oui", strNo: "non" }

{{isTrue choose yes no}} -> "yes"
{{isTrue choose $strYes $strNo}} -> "oui"
{{? [ $isTrue ] yes no}} -> "yes"
{{? [ $isFalse ] [ $strYes upper ] [ $strNo upper ]}} -> "NON"
```


### String Functions

#### `concat`

Concatenates the piped value with the given string.

```javascript
Input:
    { string: "foo" }

{{string concat bar}} -> "foobar"
```

#### `replace`

Replaces the matched substring.

If a regular expression and a pipe is supplied as its arguments, the pipe will have access to the following: `0` the matched substring, `1`...`n` matched substrings of parenthesized sub-patterns in order, `index` the position of the matched substring, and `input` of the input string.

> **Note:** Any escape character (`\`) in regular expression needs to be escaped itself. For example a valid regular expression `/\w/g` needs to be written as `/\\w/g`.

```javascript
Input:
    { string: "foo/bar/baz" }

{{string replace / -}} -> "foo-bar/baz"
{{string replace /(\\w)(\\w*)/g [ $0 upper concat $1 ]}} -> "Foo/Bar/Baz"
```
#### `substr`

Extracts a substring of the piped value.

```javascript
Input:
    { string: "foo/bar/baz" }

{{string substr 0 3}} -> "foo"
```

#### `trim`, `trimstart`, `trimend`

Trims spaces from both start and end, or either end of a string.

```javascript
Input:
    { string: " foobar " }

{{string trim}} -> "foobar"
{{string trimstart}} -> "foobar "
{{string trimend}} -> " foobar"
```

#### `padstart`, `padend`, `removestart`, `removeend`

Pads or removes the given substring to or from either end of a string.

```javascript
Input:
    { foo: "baz", bar: "/baz" }

{{foo padstart /}} -> "/baz"
{{bar padstart /}} -> "/baz"
{{foo removestart /}} -> "baz"
{{bar removestart /}} -> "baz"
```

#### `cutbefore`, `cutbeforelast`, `cutafter`, `cutafterlast`

Extracts a substring before or after the first or last occurrence of a given substring.

```javascript
Input:
    { string: "foo/bar/baz" }

{{string cutbefore /}} -> "foo"
{{string cutbeforelast /}} -> "foo/bar"
{{string cutafter /}} -> "bar/baz"
{{string cutafterlast /}} -> "baz"
```

#### `split`

Splits the string by the separater and removes empty entries.

```javascript
Input:
    { string: "fooBAZfooBAZ" }

{{string split BAZ join ,}} -> "foo,foo"
```

#### `repeat`

Repeats the string with the given number of times.

```javascript
Input:
    { length: 3 }

{{length repeat foo}} -> "foofoofoo"
```

#### `upper`, `lower`, `ucfirst`

Converts the string to an uppercased or lowercased string.

```javascript
Input:
    { string: "fooBAZ" }

{{string upper}} -> "FOOBAZ"
{{string lower}} -> "foobaz"
{{string ucfirst}} -> "FooBAZ"
```

### Math Functions

#### `max`, `min`

```javascript
Input:
    { value: 100 }

{{value max 10}} -> "10"
{{value max 1000}} -> "100"
{{value min 10}} -> "100"
{{value min 1000}} -> "1000"
```

#### `round`, `floor`, `ceil`

```javascript
Input:
    { value: 10.4 }

{{value round}} -> "10"
{{value floor}} -> "10"
{{value ceil}} -> "11"
```

#### `plus`(`+`), `minus`(`-`), `multiply`(`*`), `divide`(`/`), `mod`(`%`)

```javascript
Input:
    { value: 1 }

{{value + 1}} -> "2"
{{value - 1}} -> "0"
{{value * 2}} -> "2"
{{value / 2}} -> "0.5"
{{value % 1}} -> "1"
```

### Iterable Functions

#### `join`

Concatenates each element in an array by the given separator.

```javascript
Input:
    [1, 2, 3, 4]

{{join ,}} -> "1,2,3,4"
```

#### `keys`

Gets all keys on an array or object.

```javascript
Input:
    { values: { foo: 1, bar: 2 }, array: [1, 2, 3, 4] }

{{values keys}} -> "["foo","bar"]"
{{array keys}} -> "[0,1,2,3]"
```

#### `map`

Maps each element of an array or an object to another value. The original array or object is untouched.

If the piped value is an object, the key of each mapped element is preserved.

```javascript
Input:
    { array: [
        { key: 1, value: 5 },
        { key: 2, value: 6 },
        { key: 3, value: 7 },
        { key: 4, value: 8 }
    ] }

{{array map value}} -> "[5,6,7,8]"
{{array map [ $value + 1 ]}} -> "[6,7,8,9]"
{{array map [ $key | $value ]}} -> "[[1,5],[2,6],[3,7],[4,8]]"
```

#### `sort`, `sortby`

Sorts the array. The original array is untouched.

```javascript
Input:
    { simple: [4, 2, 3, 1], complex: [
        { key: 3, value: 2, id: "(3,2)" },
        { key: 3, value: 1, id: "(3,1)" },
        { key: 1, value: 4, id: "(1,4)" },
        { key: 2, value: 3, id: "(2,3)" }
    ] }

{{simple sort}} -> "[1,2,3,4]"
{{complex sortby key map id}} -> "["(1,4)","(2,3)","(3,2)","(3,1)"]"
{{complex sortby [ $key | $value ] map id}} -> "["(1,4)","(2,3)","(3,1)","(3,2)"]"
```

#### `reverse`

Reverses the array. The original array is untouched.

```javascript
Input:
    [1, 2, 3, 4]

{{reverse}} -> "[4,3,2,1]"
```

#### `where`, `first`, `any`, `all`

Performs operation over an array or object. The original array or object is untouched.

For the `where` pipe function, if the piped value is an object, the key of each mapped element is preserved.

```javascript
Input:
    [1, 2, 3, 4]

{{where [ odd ]}} -> "[1,3]"
{{first [ even ]}} -> "2"
{{any [ even ]}} -> "true"
{{all [ even ]}} -> "false"
```

#### `sum`

Reduces the array or object into a scalar value, optionally with a seed value.

```javascript
Input:
    { simple: [4, 2, 3, 1], complex: [
        { key: 3, value: 2, id: "(3,2)" },
        { key: 3, value: 1, id: "(3,1)" },
        { key: 1, value: 4, id: "(1,4)" },
        { key: 2, value: 3, id: "(2,3)" }
    ] }

{{simple sum}} -> "10"
{{simple sum 5}} -> "15"
{{complex sum [ $id ]}} -> "(3,2)(3,1)(1,4)(2,3)"
{{complex sum [ $value ]}} -> "10"
{{complex sum foobar [ $value ]}} -> "foobar2143"
```

### Control Functions

#### `|`

When used in function arguments, concatenates the piped value and the following evaluated values into an array. Array elements are flatten down.

```javascript
Input:
    { array: [1, 2, 3, 4] }

{{array map [ $. | + 1 ]}} -> "[[1,2],[2,3],[3,4],[4,5]]"
```

#### `&&`, `||`

Performs short-circuited logical *AND* and *OR* operation. The two logical pipe functions, like any other pipe functions, no precedence over the other and are evaluated from left to right.

Nested logical operations can be done by function arguments.

```javascript
Input:
    { value: 1, array: [3, 4, 5] }

{{value odd && $array length == 3}} -> "true"
{{value odd && [ $array length == 0 || $array any [ odd ] ]}} -> "true"

```

### Formatting Functions

Formatting functions are provided in a separate JavaScript file `jquery.template.format.js`.

#### `:printf`

Formats the piped value by the specified format.
The function uses [sprintf.js](https://github.com/alexei/sprintf.js).

A shorthand syntax is also supported where the pipe function name itself is the formatting expression starting with the percent character (`%`).

```javascript
Input:
    { foo: 65530, bar: 0.5 }

{{foo :printf %x}} -> "65530"
{{bar :printf %.2f}} -> "0.50"
{{foo %x}} -> "65530"
{{bar %.2f}} -> "0.50"
```

#### `:query`

Converts key-value pairs from an object to a query string, or to be specific an `application/x-www-form-urlencoded` encoded string.

```javascript
Input:
    { foo: "baz", bar: 1 }

{{:query}} -> "foo=baz&bar=1"
```


#### `:date`

Converts the timestamp or string to the equivalent date in the specified format. The function uses the [standard](https://msdn.microsoft.com/en-us/library/az4se3k1.aspx) and [custom](https://msdn.microsoft.com/en-us/library/8kb3ddd4.aspx) date and time format strings of Microsoft .NET Framework.

It is also useful to extract date and time components from the given timestamp or date string.

```javascript
Input:
    { timestamp: 1370000000000, string: "2013-05-31" }

{{timestamp :date yyyy-MM-dd}} -> "2013-05-31"
{{timestamp :date f}} -> "Friday, 31 May 2013 19:33"
{{string :date f}} -> "Friday, 31 May 2013 08:00"
{{string :date M}} -> "5"
```

### Other Functions

#### `as`

Stores the piped value to the current globals, and outputs the piped value.

```javascript
Input:
    { value: "foo" }

{{value as tmpvar}} -> "foo"
{{value as tmpvar}}{{tmpvar}} -> "foofoo"
```

#### `let`

Stores the evaluated values to the current globals.

```javascript
Input:
    { value: "foo" }

{{let foo value}}{{foo}} -> "value"
{{let foo $value}}{{foo}} -> "foo"
{{let foo [ $value ] bar [ $value upper ]}}{{foo concat $bar}} -> "fooFOO"
{{let foo [ $value.length ] foo [ $foo repeat $value ] }}{{foo}} -> "foofoofoo"
```

#### `length`

Gets the length of the array or string.

```javascript
Input:
    { array: [1, 2, 3], string: "foobar" }

{{array length}} -> "3"
{{string length}} -> "6"
```

## Contextified DOM Output

Contextified DOM Output can be turned on with the `html` option. Instead of returning a string, a DOM element or a DOM fragment is returned.

```javascript
Input:
    { text: "foo", link: "http://google.com" }

<a href="{{link}}">{{value}}</a>
    -> [object HTMLAnchorElement] <a href="http://www.google.com">foo</b>
```

## Writing Pipe Function

A pipe function is simply a normal function declared on `waterpipe.pipes`. The first argument is the piped value; while the remaining arguments are taken from the pipe.

```javascript
waterpipe.pipes.bark = function (name, pet) {
	return name + '\'s ' + pet + ' barks!';
};

Input:
	{ name: "John", pet: "dog" }

{{name bark $pet}} -> "John's dog barks!"
```

### Variadic Pipe Function

A variadic pipe function can take any number of arguments from the pipe. It is signatured by setting `varargs` to `true` on a pipe function.

```javascript
waterpipe.pipes.printargs = function (value, varargs) {
	var output = [];
	var count = varargs.next();
	for (var i = 0; i < count; i++) {
		if (varargs.hasArgs()) {
			output.push(varargs.next());
		}
	}
	return output.join(' ');
};
waterpipe.pipes.printargs.varargs = true;

{{printargs 3 foo bar baz}} -> "foo bar baz"
{{printargs 3 foo bar baz upper}} -> "FOO BAR BAZ"
```

A variadic pipe function can also take a function argument by `varargs.fn()`. If there is no proper set of pipe arguments to form a function argument, it will return `undefined`.

```javascript
waterpipe.pipes.dosomething = function (value, varargs) {
	var fn = varargs.fn();
	return fn(value);
};
waterpipe.pipes.dosomething.varargs = true;

Input:
	{ value: 1 }

{{value dosomething [ + 1 ]}} -> "2"
```

### Wildcard Pipe Function

If generic shorthand for a pipe function is desired, it can be registered through `waterpipe.pipes.__default__`.

It catches any unresolved pipe function names and returns a pipe function on the fly.

```javascript
waterpipe.pipes.__default__ = (function (previous) {
	return function (name) {
		if (name.charAt(0) === ':') {
			return function (value) {
				// do your stuff
			};
		}
		// pass the name to previous wildcard pipe function
		// as we only accept name with a colon at the beginning
		return previous(name);
	};
}(waterpipe.pipes.__default__));
```