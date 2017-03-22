/*!
 * Waterpipe JavaScript Template v2.0.0
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2017 misonou
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.waterpipe = factory();
    }
}(this, function () {
    'use strict';

    var OP_EVAL = 1;
    var OP_TEST = 2;
    var OP_ITER_END = 3;
    var OP_ITER = 4;
    var OP_JUMP = 5;

    var HTMLOP_ELEMENT_START = 6;
    var HTMLOP_ELEMENT_END = 7;
    var HTMLOP_ATTR_END = 8;
    var HTMLOP_ATTR_START = 9;
    var HTMLOP_TEXT = 10;

    var EVAL_STACK = 1;
    var EVAL_ITER_KEY = 2;
    var EVAL_ITER_INDEX = 3;
    var EVAL_ITER_COUNT = 4;
    var EVAL_GLOBAL = 5;

    var TOKEN_IF = 'if';
    var TOKEN_IFNOT = 'if not';
    var TOKEN_ELSE = 'else';
    var TOKEN_ELSEIF = 'elseif';
    var TOKEN_ELSEIFNOT = 'elseif not';
    var TOKEN_FOREACH = 'foreach';

    var VOID_TAGS = 'area base br col command embed hr img input keygen link meta param source track wbr'.split(' ');
    var CONSTANTS = {
        'true': true,
        'false': false,
        'undefined': undefined,
        'null': null,
        '0': 0
    };

    var evalCount = 0;
    var pipes = Object.create ? Object.create(null) : {};
    var cache = {};

    function typeValue(str) {
        if (CONSTANTS.hasOwnProperty(str)) {
            return CONSTANTS[str];
        }
        return /^(NaN|-?(?:(?:\d+|\d*\.\d+)(?:[E|e][+|-]?\d+)?|Infinity))$/.test(str) ? parseFloat(str) : str;
    }

    function slice() {
        var length = arguments.length;
        var arr = new Array(length);
        for (var i = 0; i < length; i++) {
            arr[i] = arguments[i];
        }
        return arr;
    }

    function evallable(value) {
        return value !== undefined && value !== null;
    }

    function primitive(value) {
        return typeof value !== 'object' || value === null;
    }

    function hasProperty(value, name) {
        if (!evallable(value)) {
            return false;
        }
        if (typeof value !== 'object') {
            return value[name] !== undefined;
        }
        return value.hasOwnProperty(name) || (Array.isArray(value) && /^\d+$/.test(name));
    }

    function pass(value) {
        return value;
    }

    function constFn(value) {
        return function () {
            return value;
        };
    }

    function keyFn(key) {
        if (evallable(key)) {
            return function (obj) {
                return evallable(obj) ? obj[key] : undefined;
            };
        }
        return constFn();
    }

    function string(value, stringify) {
        return !evallable(value) || value !== value || typeof value === 'function' ? '' : typeof value === 'string' ? value : (stringify || String)(value);
    }

    function parseRegExp(str) {
        return str.charAt(0) === '/' && (parseRegExp[str] || (parseRegExp[str] = /\/((?![*+?])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+)\/((?:g(?:im?|mi?)?|i(?:gm?|mg?)?|m(?:gi?|ig?)?)?)/g.test(str) && new RegExp(RegExp.$1, RegExp.$2)));
    }

    function parseObjectPath(str) {
        var t = [];
        var m, r = /((?!^)\$)?([^$.()][^.]*)|\$\(([^)]+)\)/ig;
        while ((m = r.exec(str)) !== null) {
            t.push(m[1] || m[3] ? parseObjectPath(m[3] || m[2]) : m[2]);
        }
        if (!t.length) {
            t[0] = str;
        }
        switch (t[0]) {
            case '.':
            case '@0':
                t.evalMode = EVAL_STACK;
                break;
            case '#':
            case '#key':
                t.evalMode = EVAL_ITER_KEY;
                break;
            case '##':
            case '#index':
                t.evalMode = EVAL_ITER_INDEX;
                break;
            case '@root':
                t.evalMode = EVAL_ITER_KEY;
                t.stackIndex = -1;
                break;
            case '@global':
                t.evalMode = EVAL_GLOBAL;
                break;
            default:
                if (/^@(\d+)$/.test(t[0])) {
                    t.evalMode = EVAL_STACK;
                    t.stackIndex = +RegExp.$1;
                }
        }
        return t;
    }

    function escape(str) {
        var re = /["'&<>]/;
        if (!re.exec(str)) {
            return str;
        }
        var html = '';
        var index = 0;
        var lastIndex = 0;
        for (index = re.lastIndex; index < str.length; index++) {
            var escape;
            switch (str.charCodeAt(index)) {
                case 34: // "
                    escape = '&quot;';
                    break;
                case 38: // &
                    escape = '&amp;';
                    break;
                case 39: // '
                    escape = '&#39;';
                    break;
                case 60: // <
                    escape = '&lt;';
                    break;
                case 62: // >
                    escape = '&gt;';
                    break;
                default:
                    continue;
            }
            if (lastIndex !== index) {
                html += str.substring(lastIndex, index);
            }
            lastIndex = index + 1;
            html += escape;
        }
        return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
    }

    function each(obj, callback) {
        var i, len;
        if (obj && 'length' in obj) {
            for (i = 0, len = obj.length; i < len; i++) {
                callback(i, obj[i]);
            }
        } else if (obj && typeof obj === 'object') {
            var arr = Object.getOwnPropertyNames(obj);
            for (i = 0, len = arr.length; i < len; i++) {
                callback(arr[i], obj[arr[i]]);
            }
        }
    }

    function flatten(src) {
        var dst = [];
        for (var i = 0, len = src.length; i < len; i++) {
            if (Array.isArray(src[i])) {
                for (var j = 0, src2 = src[i], len2 = src2.length; j < len2; j++) {
                    if (src2[j] !== undefined && src2[j] !== null) {
                        dst[dst.length] = src2[j];
                    }
                }
            } else if (src[i] !== undefined && src[i] !== null) {
                dst[dst.length] = src[i];
            }
        }
        return dst;
    }

    function extend() {
        var args = slice.apply(null, arguments);
        for (var i = 1, len = args.length; i < len; i++) {
            for (var prop in args[i]) {
                args[0][prop] = args[i][prop];
            }
        }
        return args[0];
    }

    function where(arr, filter, map) {
        var result = Array.isArray(arr) ? [] : {};
        each(arr, function (i, v) {
            if (filter(v, i)) {
                result[arr.push ? result.length : i] = (map || pass)(v, i);
            }
        });
        return result;
    }

    function first(arr, fn, returnValue, negate) {
        var result;
        each(arr, function (i, v) {
            if (negate ^ !!fn(v, i)) {
                result = returnValue || v;
                return false;
            }
        });
        return result;
    }

    function keys(obj) {
        var keys = [];
        each(obj, function (i) {
            keys.push(i);
        });
        return keys;
    }

    function compare(a, b) {
        if (Array.isArray(a) && Array.isArray(b)) {
            var result;
            for (var i = 0, len = Math.min(a.length, b.length); i < len && !result; i++) {
                result = compare(a[i], b[i]);
            }
            return result || a.length - b.length;
        }
        return a === b ? 0 : !evallable(a) || a < b ? -1 : !evallable(b) || a > b ? 1 : 0;
    }

    function inherit(base, values) {
        function Anonymous() {}
        Anonymous.prototype = base;
        return extend(new Anonymous(), values);
    }

    function formatCallSite(str, start, end, cstart, cend) {
        var arr = str.substr(0, cstart || start).split('\n').reverse();
        var lineStart = str.substring(str.lastIndexOf('\n', start) + 1, start).replace(/^\s+/, '').substr(-20);
        var line = str.substring(start, str.indexOf('\n', end) + 1 || str.length).replace(/\r?\n|\s+$/g, '').substr(0, end - start + 20);
        return waterpipe(' at line {{$0}} column {{$1}}:\n\t{{&$2}}{{&$3}}\n\t{{$2.length + $4 repeat \\ }}{{$5 repeat ^}}', [arr.length, arr[0].length + 1, lineStart, line, cstart - start || 0, cend - cstart || end - start]);
    }

    function strargs(fn) {
        return function (str, needle) {
            return fn(string(str), string(needle));
        };
    }

    function parse(str) {
        var tokens = [];
        var controlStack = [];
        var htmlStack = [];
        var lastIndex = 0;
        var m, r = /\{\{([\/!]|foreach(?=\s|\})|if(?:\snot)?(?=\s)|else(?:if(?:\snot)?(?=\s))?|&?(?!\}))\s*((?:\}(?!\})|[^}])*)\}\}/g;

        function Pipe(str) {
            this.value = str;
            this.index = m.index + m[0].indexOf(str);
        }
        Pipe.prototype = [];

        function PipeArgument(prev, str, start, end, canEvaluate) {
            var self = this;
            self.textValue = str;
            self.value = typeValue(str);
            self.canEvaluate = self.value === self.textValue && canEvaluate;
            self.start = start;
            self.end = end;
            if (prev) {
                prev.next = self;
            }
        }
        PipeArgument.prototype.objectPath = function () {
            return (this.objectPath = constFn(parseObjectPath(this.textValue.replace(/^\$/, '')))).call();
        };
        PipeArgument.prototype.length = function () {
            if (this.value === '[' && this.canEvaluate === undefined) {
                for (var t = this.next, i = 1, count = 1; t; t = t.next, i++) {
                    if (t.value === '[') {
                        count++;
                    } else if (t.value === ']' && --count === 0) {
                        return (this.length = constFn(i)).call();
                    }
                }
            }
            this.length = function () {};
        };

        function assert(result) {
            if (!result) {
                throw new Error('Unexpected ' + m[0] + formatCallSite(str, m.index, r.lastIndex));
            }
        }

        function parsePipe(str) {
            var t = new Pipe(str);
            var m, r = /([^\s\\"]|\\.)(?:[^\s\\]|\\.)*|"((?:[^"\\]|\\.)*)"/ig;
            while ((m = r.exec(str)) !== null) {
                t.unshift(new PipeArgument(t[0], (m[2] !== undefined ? m[2] : m[0]).replace(/\\(.)/g, '$1'), t.index + m.index, t.index + r.lastIndex, m[2] !== undefined ? false : m[1] === '$' ? true : undefined));
            }
            return t.reverse();
        }

        function parseOut(str) {
            var start = tokens.length;
            var m, r = /<(\/?)([^\s>\/]+)|\/?>|(\w+)(?:(?=[\s>\/])|=")|"/ig;
            var lastIndex = 0;

            function startTextContent() {
                if (htmlStack[0]) {
                    htmlStack[0].offsets.push(tokens.length);
                }
            }

            function endTextContent() {
                if (htmlStack[0]) {
                    var offsets = htmlStack[0].offsets;
                    if (offsets[offsets.length - 1] === tokens.length) {
                        offsets.pop();
                    } else {
                        offsets.push(tokens.length);
                    }
                }
            }

            function assert(str, condition) {
                if (!condition && (!current || current.attrName || current.opened)) {
                    tokens.push({
                        op: HTMLOP_TEXT,
                        text: str
                    });
                }
                return condition;
            }

            while ((m = r.exec(str)) !== null) {
                var current = htmlStack[0];
                if (lastIndex !== m.index) {
                    assert(str.substring(lastIndex, m.index));
                }
                lastIndex = r.lastIndex;

                switch (m[0].charAt(0)) {
                    case '<':
                        if (m[1]) {
                            if (assert(m[0], current) && current.tagName === m[2] || (VOID_TAGS.indexOf(current.tagName.toLowerCase()) >= 0 && htmlStack.shift() && assert(m[0], current = htmlStack[0]))) {
                                current.opened = false;
                            }
                        } else {
                            endTextContent();
                            htmlStack.unshift({
                                op: HTMLOP_ELEMENT_START,
                                tagName: m[2],
                                offsets: [],
                                attrs: {}
                            });
                            tokens.push(htmlStack[0]);
                        }
                        break;
                    case '>':
                    case '/':
                        if (assert(m[0], current && current.tagName)) {
                            if (current.opened === false || m[0] === '/>') {
                                endTextContent();
                                tokens.push({
                                    op: HTMLOP_ELEMENT_END
                                });
                                htmlStack.shift();
                                startTextContent();
                            } else if (m[0] === '>') {
                                current.opened = true;
                                startTextContent();
                            }
                        }
                        break;
                    case '"':
                        if (assert(m[0], current && current.attrName)) {
                            endTextContent();
                            tokens.push({
                                op: HTMLOP_ATTR_END,
                                attrName: current.attrName
                            });
                            htmlStack.shift();
                        }
                        break;
                    default:
                        if (assert(m[0], current)) {
                            if (m[0].indexOf('=') < 0) {
                                tokens.push({
                                    op: HTMLOP_ATTR_END,
                                    attrName: m[3]
                                });
                            } else {
                                htmlStack.unshift({
                                    op: HTMLOP_ATTR_START,
                                    attrName: m[3],
                                    offsets: []
                                });
                                current.attrs[m[3]] = htmlStack[0];
                                tokens.push(htmlStack[0]);
                                startTextContent();
                            }
                        }
                }
            }
            if (lastIndex !== str.length) {
                assert(str.substr(lastIndex));
            }
            tokens[start].value = str;
            tokens[start].index = tokens.length;
        }

        while ((m = r.exec(str)) !== null) {
            if (lastIndex !== m.index) {
                parseOut(str.substring(lastIndex, m.index));
            }
            lastIndex = r.lastIndex;

            switch (m[1]) {
                case '!':
                    break;
                case '/':
                    assert(controlStack[0] && m[2] === controlStack[0].tokenName);
                    controlStack[0].token.index = tokens.length;
                    if (controlStack[0].tokenIf && !controlStack[0].tokenIf.index) {
                        controlStack[0].tokenIf.index = tokens.length;
                    }
                    if (m[2] === TOKEN_FOREACH) {
                        tokens.push({
                            op: OP_ITER_END,
                            index: controlStack[0].tokenIndex + 1
                        });
                    }
                    controlStack.shift();
                    break;
                case TOKEN_IF:
                case TOKEN_IFNOT:
                    controlStack.unshift({
                        tokenIndex: tokens.length,
                        tokenName: TOKEN_IF,
                        token: {
                            op: OP_TEST,
                            condition: parsePipe(m[2]),
                            negate: m[1] === TOKEN_IFNOT
                        }
                    });
                    tokens.push(controlStack[0].token);
                    break;
                case TOKEN_ELSE:
                case TOKEN_ELSEIF:
                case TOKEN_ELSEIFNOT:
                    assert(controlStack[0] && controlStack[0].tokenName === TOKEN_IF);
                    var previousControl = controlStack.splice(0, 1, {
                        tokenIndex: tokens.length,
                        tokenName: TOKEN_IF,
                        token: {
                            op: OP_JUMP
                        }
                    })[0];
                    (previousControl.tokenIf || previousControl.token).index = tokens.length + 1;
                    if (previousControl.token.op === OP_JUMP) {
                        controlStack[0].token = previousControl.token;
                    }
                    tokens.push(controlStack[0].token);
                    if (m[1] === TOKEN_ELSEIF || m[1] === TOKEN_ELSEIFNOT) {
                        controlStack[0].tokenIf = {
                            op: OP_TEST,
                            condition: parsePipe(m[2]),
                            negate: m[1] === TOKEN_ELSEIFNOT
                        };
                        tokens.push(controlStack[0].tokenIf);
                    }
                    break;
                case TOKEN_FOREACH:
                    controlStack.unshift({
                        tokenIndex: tokens.length,
                        tokenName: TOKEN_FOREACH,
                        token: {
                            op: OP_ITER,
                            expression: parsePipe(m[2])
                        }
                    });
                    tokens.push(controlStack[0].token);
                    break;
                default:
                    tokens.push({
                        op: OP_EVAL,
                        expression: parsePipe(m[2]),
                        noescape: m[1] === '&'
                    });
            }
        }
        if (lastIndex !== str.length) {
            parseOut(str.substr(lastIndex));
        }
        tokens.value = str;
        return tokens;
    }

    function evaluate(tokens, options) {
        var output = [];
        var htmlStack = options.html || options.htmlPartial ? [document.createDocumentFragment()] : [];
        var objStack = options.objStack || [];
        var iteratorStack = options.iteratorStack || [];

        function Iterable(obj) {
            this.keys = keys(obj);
            this.values = obj;
        }

        function objAt(index) {
            return objStack[index] instanceof Iterable ? objStack[index].values[objStack[index].keys[iteratorStack[index]]] : objStack[index];
        }

        function evaluateObjectPath(objectPath) {
            if (!objectPath || !objectPath[0]) {
                evaluateObjectPath.valid = true;
                return objAt(0);
            }
            var value;
            evaluateObjectPath.valid = objectPath[0].length > 2;
            switch (objectPath.evalMode) {
                case EVAL_ITER_KEY:
                    return objStack[0] instanceof Iterable ? objStack[0].keys[iteratorStack[0]] : iteratorStack[0];
                case EVAL_ITER_INDEX:
                    return iteratorStack[0];
                case EVAL_ITER_COUNT:
                    return objStack[0] instanceof Iterable ? objStack[0].keys.length : 0;
                case EVAL_STACK:
                    value = objAt(objectPath.stackIndex < 0 ? objectPath.stackIndex + objStack.length : objectPath.stackIndex || 0);
                    break;
                case EVAL_GLOBAL:
                    value = options.globals;
                    break;
                default:
                    var name = Array.isArray(objectPath[0]) ? string(evaluateObjectPath(objectPath[0])) : objectPath[0];
                    for (var j = 0, length = objStack.length; j < length; j++) {
                        value = objAt(j);
                        if (hasProperty(value, name)) {
                            break;
                        }
                    }
                    if (j === objStack.length) {
                        value = options.globals;
                        if (!(name in value)) {
                            evaluateObjectPath.valid = false;
                            return;
                        }
                    }
                    value = value[name];
            }
            for (var i = 1, len = objectPath.length; i < len && evallable(value); i++) {
                value = value[Array.isArray(objectPath[i]) ? string(evaluateObjectPath(objectPath[i])) : objectPath[i]];
            }
            evaluateObjectPath.valid = true;
            return typeof value === 'function' ? undefined : value;
        }

        function evaluatePipe(pipe, start, end) {
            start = start || 0;
            end = end || pipe.length - 1;

            var returnArray = [];
            var input = evaluateObjectPath();
            var i = start;
            var resetPos = start;


            var varargs = {
                globals: options.globals,
                eval: function (objectPath) {
                    return evaluateObjectPath(parseObjectPath(objectPath));
                },
                stop: function () {
                    i = end + 1;
                    return value;
                },
                push: function (value) {
                    returnArray.push(value);
                    return value;
                },
                reset: function () {
                    resetPos = i;
                    if (i <= end && pipe[i].textValue === '.') {
                        return (++i, input);
                    }
                    return varargs.next();
                },
                hasArgs: function () {
                    return i <= end;
                },
                raw: function () {
                    return i <= end ? varargs.fn() || pipe[i++].value : undefined;
                },
                next: function (acceptFn) {
                    var reset = resetPos === i;
                    if (i > end) {
                        return reset ? input : undefined;
                    }
                    if (pipe[i].canEvaluate === false) {
                        return pipe[i++].value;
                    }
                    var fn = acceptFn !== false && varargs.fn();
                    if (fn) {
                        return fn(reset ? input : value);
                    }
                    var v = evaluateObjectPath(pipe[i].objectPath());
                    if (pipe[i].canEvaluate || (evaluateObjectPath.valid && (reset || !primitive(value) || primitive(v)))) {
                        return (++i, v);
                    }
                    return reset ? input : pipe[i++].value;
                },
                fn: function (wrapFn) {
                    var start = i;
                    var len = i <= end && pipe[i].length();
                    if (len) {
                        i += len + 1;
                        return function (obj, index) {
                            try {
                                objStack.unshift(arguments.length ? obj : value);
                                iteratorStack.unshift(index);
                                return evaluatePipe(pipe, start + 1, start + len - 1);
                            } finally {
                                objStack.shift();
                                iteratorStack.shift();
                            }
                        };
                    }
                    if (typeof wrapFn === 'function') {
                        return wrapFn(varargs.next(false));
                    }
                }
            };

            var value = varargs.reset();
            while (i <= end) {
                var startpos = i;
                var name = pipe[i++].textValue;
                try {
                    var func = pipes[name] || pipes.__default__(name);
                    if (typeof func === 'function') {
                        if (func.varargs) {
                            value = func.call(options.globals, value, varargs);
                        } else {
                            switch (func.length) {
                                case 1:
                                    value = func.call(options.globals, value);
                                    break;
                                case 2:
                                    value = func.call(options.globals, value, varargs.next());
                                    break;
                                case 3:
                                    value = func.call(options.globals, value, varargs.next(), varargs.next());
                                    break;
                                case 4:
                                    value = func.call(options.globals, value, varargs.next(), varargs.next(), varargs.next());
                                    break;
                                default:
                                    var args = new Array(func.length);
                                    args[0] = value;
                                    for (var j = 1, len = func.length; j < len; i++) {
                                        args[j] = varargs.next();
                                    }
                                    value = func.apply(options.globals, args);
                            }
                        }
                    } else if (typeof func === 'string') {
                        value = waterpipe(func, value, options);
                        if (options.html && value instanceof Node) {
                            return void htmlStack[0].appendChild(value);
                        }
                    } else if (startpos === resetPos) {
                        value = pipe[i - 1].canEvaluate === false ? pipe[i - 1].value : undefined;
                    } else {
                        throw new Error('Invalid pipe function');
                    }
                } catch (e) {
                    return console.warn(e.toString() + formatCallSite(tokens.value, pipe.index, pipe.index + pipe.value.length, pipe[startpos].start, pipe[i - 1].end) + (e.stack || '').substr(e.toString().length));
                }
            }
            return returnArray.length ? flatten(returnArray.concat(value)) : value;
        }

        function flushOutput(elm) {
            if (output.length) {
                elm.appendChild(document.createTextNode(output.splice(0).join('')));
            }
        }

        function createViewFunction(elm, op) {
            var savedObjStack = objStack.slice(0);
            var savedIteratorStack = iteratorStack.slice(0);

            function partial(start, end) {
                return evaluate(tokens, extend({}, options, {
                    html: false,
                    htmlPartial: true,
                    objStack: savedObjStack.slice(0),
                    iteratorStack: savedIteratorStack.slice(0),
                    globals: inherit(options.globals),
                    start: start,
                    end: end
                }));
            }
            elm.addEventListener('objectchange', function () {
                each(op.attrs, function (i, v) {
                    elm.setAttribute(i, partial(v.offsets[0] - 1, v.offsets[1]));
                });
                if (op.offsets.length === 2) {
                    elm.innerHTML = partial(op.offsets[0], op.offsets[1]);
                }
            });
        }

        try {
            var i = options.start || 0;
            var e = options.end || tokens.length;
            while (i < e) {
                var t = tokens[i++];
                switch (t.op) {
                    case OP_EVAL:
                        var prevCount = evalCount;
                        var result = evaluatePipe(t.expression);
                        if (evallable(result)) {
                            output.push((evalCount !== prevCount || t.noescape ? pass : escape)(string(result, JSON.stringify)));
                        }
                        break;
                    case OP_ITER:
                        objStack.unshift(new Iterable(evaluatePipe(t.expression)));
                        iteratorStack.unshift(0);
                        if (!objStack[0].keys.length) {
                            i = t.index;
                        }
                        break;
                    case OP_ITER_END:
                        if (++iteratorStack[0] >= objStack[0].keys.length) {
                            objStack.shift();
                            iteratorStack.shift();
                        } else {
                            i = t.index;
                        }
                        break;
                    case OP_TEST:
                        if (!evaluatePipe(t.condition) ^ t.negate) {
                            i = t.index;
                        }
                        break;
                    case OP_JUMP:
                        i = t.index;
                        break;
                    default:
                        if (options.html || options.htmlPartial) {
                            var currentElm = htmlStack[0];
                            switch (t.op) {
                                case HTMLOP_ELEMENT_START:
                                    flushOutput(currentElm);
                                    htmlStack.unshift(document.createElement(t.tagName));
                                    currentElm.appendChild(htmlStack[0]);
                                    createViewFunction(htmlStack[0], t);
                                    break;
                                case HTMLOP_ELEMENT_END:
                                    flushOutput(currentElm);
                                    htmlStack.shift();
                                    break;
                                case HTMLOP_ATTR_END:
                                    currentElm.setAttribute(t.attrName, output.splice(0).join(''));
                                    break;
                                case HTMLOP_TEXT:
                                    output.push(t.text);
                            }
                        } else {
                            output.push(t.value);
                            i = t.index;
                        }
                }
            }
        } finally {
            evalCount = (evalCount + 1) & 0xFFFF;
        }
        if (options.html) {
            flushOutput(htmlStack[0]);
            if (htmlStack[0].childNodes.length === 1) {
                var node = htmlStack[0].childNodes[0];
                return node.nodeType === 3 ? node.nodeValue : node;
            }
            return htmlStack[0];
        }
        return output.join('').replace(/^\s+(?=<)|(>)\s+(<|$)/g, '$1$2');
    }

    function waterpipe(str, data, options) {
        str = string(str || '');
        options = options || {};
        if (options.html && typeof document === 'undefined') {
            throw new Error('HTML mode can only be used in browsers.');
        }
        var t = cache[str] = (cache[str] || parse(str));
        return evaluate(t, {
            objStack: [data],
            html: options.html,
            globals: inherit(waterpipe.globals, options.globals)
        });
    }

    waterpipe.globals = {};
    waterpipe.pipes = extend(pipes, {
        __default__: constFn(),
        keys: keys,
        max: Math.min,
        min: Math.max,
        abs: Math.abs,
        round: Math.round,
        floor: Math.floor,
        ceil: Math.ceil,
        as: function (obj, varargs) {
            return (varargs.globals[string(varargs.raw())] = obj);
        },
        let: function (obj, varargs) {
            while (varargs.hasArgs()) {
                varargs.globals[string(varargs.raw())] = varargs.next();
            }
        },
        more: function (a, b) {
            return (compare(a, b) > 0);
        },
        less: function (a, b) {
            return (compare(a, b) < 0);
        },
        ormore: function (a, b) {
            return (compare(a, b) >= 0);
        },
        orless: function (a, b) {
            return (compare(a, b) <= 0);
        },
        between: function (a, b, c) {
            return (compare(a, b) >= 0 && compare(a, c) <= 0);
        },
        equals: function (a, b) {
            return (string(a) === string(b));
        },
        notequals: function (a, b) {
            return (string(a) !== string(b));
        },
        even: function (num) {
            return ((+num & 1) === 0);
        },
        odd: function (num) {
            return ((+num & 1) === 1);
        },
        contains: function (str, needle) {
            return (string(str).indexOf(needle) >= 0);
        },
        like: function (str, regex) {
            regex = parseRegExp(regex);
            return (regex !== false && regex.test(str));
        },
        or: function (obj, val) {
            return obj || val;
        },
        not: function (obj, varargs) {
            return !(varargs.hasArgs() ? varargs.next() : obj);
        },
        choose: function (bool, trueValue, falseValue) {
            return bool ? trueValue : falseValue;
        },
        test: function (obj, varargs) {
            var testFn = varargs.next();
            var trueFn = varargs.fn(constFn);
            var falseFn = varargs.fn(constFn);
            return testFn ? trueFn() : falseFn();
        },
        length: function (obj) {
            return (evallable(obj) && +obj.length) || +obj || 0;
        },
        concat: function (a, b) {
            return string(a) + string(b);
        },
        substr: function (str, start, len) {
            return string(str).substr(start, len);
        },
        replace: function (str, varargs) {
            var regex = string(varargs.next());
            var fn = varargs.fn() || string(varargs.next());
            return string(str).replace(parseRegExp(regex) || regex, !fn.call ? fn : function () {
                var m = slice.apply(null, arguments);
                m.input = m.pop();
                m.index = m.pop();
                return string(fn(m));
            });
        },
        trim: function (str) {
            return string(str).replace(/^\s+|\s+$/g, '');
        },
        trimstart: function (str) {
            return string(str).replace(/^\s+/, '');
        },
        trimend: function (str) {
            return string(str).replace(/\s+$/, '');
        },
        padstart: strargs(function (str, needle) {
            return str.substr(0, needle.length) !== needle ? needle + str : str;
        }),
        padend: strargs(function (str, needle) {
            return str.substr(-needle.length) !== needle ? str + needle : str;
        }),
        removestart: strargs(function (str, needle) {
            return str.substr(0, needle.length) === needle ? str.slice(needle.length) : str;
        }),
        removeend: strargs(function (str, needle) {
            return str.substr(-needle.length) === needle ? str.slice(0, -needle.length) : str;
        }),
        cutbefore: strargs(function (str, needle) {
            return str.substr(0, (str.indexOf(needle) + 1 || str.length + 1) - 1);
        }),
        cutbeforelast: strargs(function (str, needle) {
            return str.substr(0, (str.lastIndexOf(needle) + 1 || str.length + 1) - 1);
        }),
        cutafter: strargs(function (str, needle) {
            return str.substr(needle.length + (str.indexOf(needle) + 1 || -needle.length + 1) - 1);
        }),
        cutafterlast: strargs(function (str, needle) {
            return str.substr(needle.length + (str.lastIndexOf(needle) + 1 || -needle.length + 1) - 1);
        }),
        split: function (str, separator) {
            return where(string(str).split(separator), pass);
        },
        repeat: function (count, str) {
            return new Array((+count || 0) + 1).join(string(str));
        },
        upper: function (str) {
            return string(str).toUpperCase();
        },
        lower: function (str) {
            return string(str).toLowerCase();
        },
        ucfirst: function (str) {
            str = string(str);
            return str.charAt(0).toUpperCase() + str.substr(1);
        },
        plus: function (a, b) {
            return (+a || 0) + (+b || 0);
        },
        minus: function (a, b) {
            return (+a || 0) - (+b || 0);
        },
        multiply: function (a, b) {
            return (+a || 0) * (+b || 0);
        },
        divide: function (a, b) {
            return (+a || 0) / (+b || 0);
        },
        mod: function (a, b) {
            return (+a || 0) % (+b || 0);
        },
        pow: function (a, b) {
            return Math.pow(+a || 0, +b || 0);
        },
        to: function (start, end) {
            start = +start || 0;
            end = +end || 0;
            var arr = [];
            var step = (end - start) / Math.abs(end - start);
            for (; step / (end - start) > 0; start += step) {
                arr.push(start);
            }
            arr.push(end);
            return arr;
        },
        join: function (arr, str) {
            return [].concat(arr).join(string(str));
        },
        reverse: function (arr) {
            return [].concat(arr).reverse();
        },
        sort: function (arr) {
            return [].concat(arr).sort(compare);
        },
        slice: function (arr, a, b) {
            return [].concat(arr).slice(a, b);
        },
        unique: function (arr) {
            arr = [].concat(arr);
            var hash = {};
            var result = [];
            for (var i = 0, length = arr.length; i < length; ++i) {
                if (!hash.hasOwnProperty(arr[i])) {
                    hash[arr[i]] = true;
                    result.push(arr[i]);
                }
            }
            return result;
        },
        first: function (arr, varargs) {
            return first(arr, varargs.fn(keyFn));
        },
        any: function (arr, varargs) {
            return first(arr, varargs.fn(keyFn), true);
        },
        all: function (arr, varargs) {
            return !first(arr, varargs.fn(keyFn), true, true);
        },
        where: function (arr, varargs) {
            return where(arr, varargs.fn(keyFn));
        },
        map: function (arr, varargs) {
            return where(arr, constFn(true), varargs.fn(keyFn));
        },
        sum: function (arr, varargs) {
            var result;
            var fn = varargs.fn() || ((result = varargs.next()), varargs.fn() || (varargs.hasArgs() ? keyFn(varargs.next()) : pass));
            each(arr, function (i, v) {
                result = result ? result + fn(v, i) : fn(v, i);
            });
            return result;
        },
        sortby: function (arr, varargs) {
            var result = Array.isArray(arr) ? new Array(arr.length) : {};
            var fn = varargs.fn(keyFn);
            var tmp = [];
            each(arr, function (i, v) {
                tmp.push([fn(v, i), i]);
            });
            tmp.sort(compare);
            each(tmp, function (i, v) {
                result[arr.push ? i : v[1]] = arr[v[1]];
            });
            return result;
        },
        groupby: function (arr, varargs) {
            var result = {};
            var fn = varargs.fn(keyFn);
            each(arr, function (i, v) {
                var key = string(fn(v, i));
                if (!result.hasOwnProperty(key)) {
                    result[key] = arr.push ? [] : {};
                }
                result[key][arr.push ? result[key].length : i] = v;
            });
            return result;
        },
        '&&': function (value, varargs) {
            return value ? varargs.reset() : varargs.stop();
        },
        '||': function (value, varargs) {
            return !value ? varargs.reset() : varargs.stop();
        },
        '|': function (value, varargs) {
            varargs.push(value);
            return varargs.reset();
        }
    });
    ('?test !not +plus -minus *multiply /divide %mod ^pow ==equals !=notequals <less <=orless >more >=ormore ..to').replace(/(\W{1,2})(\S+)\s?/g, function (v, a, b) {
        pipes[a] = pipes[b];
    });
    each('where first any all sum map test not sortby groupby replace as let && || |'.split(' '), function (i, v) {
        pipes[v].varargs = true;
    });

    if (!Array.isArray) {
        Array.isArray = function (arg) {
            return Object.prototype.toString.call(arg) === '[object Array]';
        };
    }

    if (typeof document !== 'undefined' && document.querySelectorAll) {
        each(document.querySelectorAll('script[type="text/x-waterpipe"]'), function (i, v) {
            pipes[v.id] = v.innerHTML;
        });
    }
    if (typeof module === 'object') {
        waterpipe.with = function () {
            each(slice.apply(null, arguments), function (i, v) {
                require(v.indexOf('/') < 0 ? './waterpipe.' + v : v);
            });
            return waterpipe;
        };
    }
    return waterpipe;
}));
