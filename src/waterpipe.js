/*!
 * Waterpipe JavaScript Template v2.3.0
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
    /* istanbul ignore next */
    if (typeof define === 'function' && define.amd) {
        define('waterpipe', [], factory);
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
    var OP_SPACE = 6;
    var OP_TEXT = 7;

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

    var NEWLINE = '\r\n';
    var VOID_TAGS = 'area base br col command embed hr img input keygen link meta param source track wbr !doctype !--'.split(' ');
    var CONSTANTS = {
        'true': true,
        'false': false,
        'undefined': undefined,
        'null': null,
        '0': 0
    };

    var evalCount = 0;
    var execStack = [];
    var pipes = Object.create ? Object.create(null) : {};

    function cached(fn, str) {
        var cache = fn.cache = fn.cache || {};
        return cache.hasOwnProperty(str) ? cache[str] : (cache[str] = fn(str));
    }

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

    function isFunction(value) {
        return typeof value === 'function';
    }

    function isString(value) {
        return typeof value === 'string';
    }

    function isObject(value) {
        return typeof value === 'object';
    }

    function evallable(value) {
        return value !== undefined && value !== null;
    }

    function primitive(value) {
        return typeof value !== 'object' || value === null;
    }

    function hasProperty(value, name) {
        if (!evallable(value) || isFunction(value[name])) {
            return false;
        }
        if (!isObject(value)) {
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
        return function (obj) {
            return evallable(obj) ? obj[key] : undefined;
        };
    }

    function detectKeyFn(varargs, arr) {
        function isValidKey(key) {
            return first(arr, function (v) {
                return hasProperty(v, key);
            }, true);
        }
        switch (varargs.state()) {
            case 'func':
                return varargs.fn();
            case 'auto':
                var key = varargs.raw();
                var value = varargs.eval(key);
                if (isString(value) && isValidKey(value)) {
                    return cached(keyFn, value);
                }
                var fn = pipes[key];
                if (fn && !fn.varargs && !isValidKey(key)) {
                    return isFunction(fn) ? fn : function (v) {
                        return run(fn, v);
                    };
                }
                return cached(keyFn, key);
        }
        return cached(keyFn, string(varargs.next()));
    }

    function json(value) {
        try {
            return JSON.stringify(value);
        } catch (e) {
            return String(value);
        }
    }

    function string(value, stringify) {
        return !evallable(value) || value !== value || isFunction(value) ? '' : isString(value) ? value : (stringify || String)(value);
    }

    function repeat(str, count) {
        return new Array((+count || 0) + 1).join(string(str));
    }

    function indent(str, level, start) {
        if (typeof str === 'number') {
            str = repeat(' ', str);
        }
        return (start || '') + repeat(str, level);
    }

    function parseRegExp(str) {
        return str.charAt(0) === '/' && /\/((?![*+?])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+)\/((?:g(?:im?|mi?)?|i(?:gm?|mg?)?|m(?:gi?|ig?)?)?)/g.test(str) && new RegExp(RegExp.$1, RegExp.$2);
    }

    function parseObjectPath(str) {
        var t = [];
        var m, r = /((?!^)\$)?([^$.()][^.]*)|\$\(([^)]+)\)/ig;
        while ((m = r.exec(str)) !== null) {
            t.push(m[1] || m[3] ? cached(parseObjectPath, m[3] || m[2]) : m[2]);
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
            case '#count':
                t.evalMode = EVAL_ITER_COUNT;
                break;
            case '_':
            case '@root':
                t.evalMode = EVAL_STACK;
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

    function escape(str, preserveEntity) {
        var re = preserveEntity ? /["'<>]|&(?!#\d+;|[a-z][a-z0-9]+;)/i : /["'&<>]/;
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

    function hyphenate(str) {
        return string(str).replace(/[A-Z](?:[A-Z]+(?=$|[A-Z]))?/g, function (v, i) {
            return (i > 0 ? '-' : '') + v.toLowerCase();
        });
    }

    function each(obj, callback) {
        var i, len;
        if (obj && 'length' in obj) {
            for (i = 0, len = obj.length; i < len; i++) {
                if (callback(i, obj[i]) === false) {
                    return;
                }
            }
        } else if (obj && isObject(obj)) {
            var arr = Object.getOwnPropertyNames(obj);
            for (i = 0, len = arr.length; i < len; i++) {
                if (callback(arr[i], obj[arr[i]]) === false) {
                    return;
                }
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
        return waterpipe('at line {{$0}} column {{$1}}:{{$6}}{{&$2}}{{&$3}}{{$6}}{{$2.length + $4 repeat \\ }}{{$5 repeat ^}}', [arr.length, arr[0].length + 1, lineStart, line, cstart - start || 0, cend - cstart || end - start, '\n\t']);
    }

    function strargs(fn) {
        return function (str, needle) {
            return fn(string(str), string(needle));
        };
    }

    function Pipe(str, index) {
        this.value = str;
        this.index = index;
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
        return (this.objectPath = constFn(cached(parseObjectPath, this.textValue.replace(/^\$/, '')))).call();
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

    function parse(str) {
        var tokens = [];
        var controlStack = [{}];
        var htmlStack = [];
        var lastIndex = 0;
        var m, r = /\{\{([\/!]|foreach(?=\s|\})|if(?:\snot)?(?=\s)|else(?:if(?:\snot)?(?=\s))?|&?(?!\}))\s*((?:\}(?!\})|[^}])*\}*)\}\}/g;

        function assert(result) {
            if (!result) {
                throw new Error('Unexpected ' + m[0] + ' ' + formatCallSite(str, m.index, r.lastIndex));
            }
        }

        function parsePipe(str) {
            var t = new Pipe(str, m.index + m[0].indexOf(str));
            var n, r = /([^\s\\"]|\\.)(?:[^\s\\]|\\.)*|"((?:[^"\\]|\\.)*)"/ig;
            while ((n = r.exec(str)) !== null) {
                t.unshift(new PipeArgument(t[0], (n[2] !== undefined ? n[2] : n[0]).replace(/\\(.)/g, '$1'), t.index + n.index, t.index + r.lastIndex, n[2] !== undefined ? false : n[1] === '$' ? true : undefined));
            }
            return t.reverse();
        }

        function parseHTML(str, htmlStackCount) {
            var start = tokens.length;
            var m, r = /<(\/?)([0-9a-z]+|!doctype|!--)|\/?>|-->|([^\s=\/<>"0-9.-][^\s=\/<>"]*)(?:="|$|(?=[\s=\/<>"]))|"|\r?\n\s*/ig;
            var lastIndex = 0;

            function isScriptOrStyle() {
                return htmlStack[0].tagName === 'script' || htmlStack[0].tagName === 'style';
            }

            function shiftHtmlStack() {
                return htmlStack.length > (controlStack[0].htmlStackCount || 1) && htmlStack.shift();
            }

            function writeText(str, stripWS) {
                if (isScriptOrStyle()){
                    tokens.push({
                        op: OP_TEXT,
                        value: str
                    });
                    return;
                }
                if (stripWS || htmlStack[0].attrName || htmlStack[0].opened) {
                    var last1 = tokens[tokens.length - 1];
                    var last2 = tokens[tokens.length - 2];
                    var newline;
                    if (!stripWS) {
                        newline = str.indexOf('\n') >= 0;
                        str = escape(str.replace(/\s+/g, htmlStack[0].opened || (htmlStack[0].attrName && htmlStack[0].text) ? ' ' : ''), true);
                        newline &= (!str || str === ' ');
                    }
                    htmlStack[0].text += str;
                    if (newline) {
                        last1.stripWSEnd = false;
                        tokens.push({
                            op: OP_SPACE,
                            value: NEWLINE
                        });
                    } else if (str && ((htmlStack[1] && htmlStack[0].opened) || str !== ' ')) {
                        if (tokens.length > start && last1.op === OP_TEXT) {
                            last1.value += str;
                            last1.stripWSEnd = stripWS;
                        } else if (tokens.length > start + 1 && last2.op === OP_TEXT && last1.value !== NEWLINE) {
                            last2.value += (stripWS || last2.stripWSEnd ? '' : last1.value) + str;
                            last2.stripWSEnd = stripWS;
                            tokens.pop();
                        } else {
                            tokens.push({
                                op: OP_TEXT,
                                stripWS: stripWS,
                                stripWSEnd: stripWS,
                                value: str,
                                indent: htmlStack.length - 2 + !!htmlStack[0].opened
                            });
                        }
                    } else {
                        tokens.push({
                            op: OP_SPACE,
                            value: ' '
                        });
                    }
                }
            }

            while ((m = r.exec(str)) !== null) {
                if (lastIndex !== m.index) {
                    writeText(str.substring(lastIndex, m.index));
                }
                lastIndex = r.lastIndex;

                switch (m[0].charAt(0)) {
                    case '<':
                        if (isScriptOrStyle() && (!m[1] || m[2].toLowerCase() !== htmlStack[0].tagName)) {
                            writeText(m[0], true);
                        } else {
                            while (VOID_TAGS.indexOf(htmlStack[0].tagName) >= 0 && shiftHtmlStack());
                            if (m[1]) {
                                if (htmlStack[0].tagName !== m[2] || htmlStack.length <= (controlStack[0].htmlStackCount || 1)) {
                                    htmlStack[0].muteTagEnd = true;
                                    htmlStack[0].opened = undefined;
                                } else {
                                    htmlStack[0].opened = false;
                                    writeText(m[0], true);
                                }
                            } else {
                                htmlStack.unshift({
                                    tagName: m[2].toLowerCase(),
                                    text: ''
                                });
                                writeText(m[0].toLowerCase(), true);
                                htmlStack[0].index = tokens.length - 1;
                            }
                        }
                        continue;
                    case '>':
                    case '/':
                    case '-':
                        if (htmlStack[0].tagName && (!htmlStack[0].opened || m[0] === '/>' || m[0] === '-->')) {
                            if (htmlStack[0].muteTagEnd) {
                                htmlStack[0].muteTagEnd = false;
                            } else {
                                writeText(m[0], true);
                            }
                            if ((htmlStack[0].opened !== false && m[0] !== '/>' && m[0] !== '-->') || !shiftHtmlStack()) {
                                htmlStack[0].opened = true;
                            }
                            continue;
                        }
                        break;
                    case '"':
                        if (htmlStack[0].attrName && shiftHtmlStack()) {
                            writeText(m[0], true);
                            continue;
                        }
                        break;
                    default:
                        if (htmlStack[0].tagName && !htmlStack[0].opened) {
                            writeText(' ' + m[0], true);
                            if (m[0].indexOf('=') >= 0) {
                                htmlStack.unshift({
                                    attrName: m[3],
                                    text: ''
                                });
                            }
                            continue;
                        }
                }
                writeText(m[0]);
            }
            if (lastIndex !== str.length) {
                writeText(str.substr(lastIndex));
            }
            while (htmlStack[htmlStackCount]) {
                var tagName = htmlStack.shift().tagName;
                if (VOID_TAGS.indexOf(tagName) < 0) {
                    writeText('</' + tagName + '>', true);
                }
            }
        }

        str = string(str).replace(/^\s+|\s+$/g, '');
        htmlStack.unshift({
            opened: true,
            text: ''
        });
        while ((m = r.exec(str)) !== null) {
            if (lastIndex !== m.index) {
                parseHTML(str.substring(lastIndex, m.index));
            }
            lastIndex = r.lastIndex;

            switch (m[1]) {
                case '!':
                    break;
                case '/':
                    assert(controlStack[0] && m[2] === controlStack[0].tokenName);
                    parseHTML('', controlStack[0].htmlStackCount);
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
                        htmlStackCount: htmlStack.length,
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
                    parseHTML('', controlStack[0].htmlStackCount);
                    var previousControl = controlStack.splice(0, 1, {
                        htmlStackCount: controlStack[0].htmlStackCount,
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
                        htmlStackCount: htmlStack.length,
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
                        noescape: m[1] === '&',
                        indent: htmlStack.length - 1
                    });
            }
        }
        parseHTML(str.substr(lastIndex), 1);
        for (var i = tokens.length - 1, j = 0; i >= 0; i--) {
            if (tokens[i].indent !== undefined) {
                j = tokens[i].indent;
            } else {
                tokens[i].indent = j;
            }
        }
        tokens.value = str;
        return tokens;
    }

    function evaluate(tokens, options, outstr) {
        var output = [];
        var objStack = options.objStack || [];
        var iteratorStack = options.iteratorStack || [];
        var result;

        function Iterable(obj) {
            this.keys = keys(obj);
            this.values = obj;
        }

        function objAt(index) {
            return objStack[index] instanceof Iterable ? objStack[index].values[objStack[index].keys[iteratorStack[index]]] : objStack[index];
        }

        function evaluateObjectPath(objectPath, acceptShorthand) {
            if (!objectPath || !objectPath[0]) {
                evaluateObjectPath.valid = true;
                return objAt(0);
            }
            var value;
            var valid = evaluateObjectPath.valid = acceptShorthand || !objectPath.evalMode || (objectPath[0].length > 1 && objectPath[0] !== '##');
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
            evaluateObjectPath.valid = valid;
            return isFunction(value) ? undefined : value;
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
                    return evaluateObjectPath(cached(parseObjectPath, objectPath));
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
                    return varargs.next();
                },
                hasArgs: function () {
                    return i <= end;
                },
                state: function () {
                    return i > end ? 'end' : pipe[i].length() ? 'func' : pipe[i].canEvaluate === undefined ? 'auto' : pipe[i].canEvaluate ? 'path' : 'const';
                },
                raw: function () {
                    return i <= end ? varargs.fn() || pipe[i++].value : undefined;
                },
                next: function (preferObject) {
                    var reset = resetPos === i;
                    if (i > end) {
                        return reset ? input : undefined;
                    }
                    if (pipe[i].canEvaluate === false) {
                        return pipe[i++].value;
                    }
                    var fn = varargs.fn();
                    if (fn) {
                        return fn(reset ? input : value);
                    }
                    var v = evaluateObjectPath(pipe[i].objectPath(), reset);
                    if (pipe[i].canEvaluate || (evaluateObjectPath.valid && (reset || preferObject || !primitive(value) || primitive(v)))) {
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
                    if (isFunction(wrapFn)) {
                        return wrapFn(varargs.next());
                    }
                }
            };

            var value = varargs.reset();
            while (i <= end) {
                var startpos = i;
                var name = pipe[i++].textValue;
                try {
                    var func = pipes[name] || pipes.__default__(name);
                    if (isFunction(func)) {
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
                                    for (var j = 1, len = func.length; j < len; j++) {
                                        args[j] = varargs.next();
                                    }
                                    value = func.apply(options.globals, args);
                            }
                        }
                    } else if (isString(func)) {
                        value = run(func, value, extend({}, options, {
                            indentPadding: undefined,
                            trimStart: true
                        }));
                    } else if (startpos === resetPos) {
                        value = pipe[i - 1].canEvaluate === false ? pipe[i - 1].value : undefined;
                    } else {
                        throw new Error('Invalid pipe function');
                    }
                } catch (e) {
                    return console.warn(e.toString() + ' ' + formatCallSite(tokens.value, pipe.index, pipe.index + pipe.value.length, pipe[startpos].start, pipe[i - 1].end) + (e.stack || '').substr(e.toString().length));
                }
            }
            return returnArray.length ? flatten(returnArray.concat(value)) : value;
        }

        try {
            var i = options.start || 0;
            var e = options.end || tokens.length;
            var ws = false;
            execStack.unshift(options);
            while (i < e) {
                var t = tokens[i++];
                options.level = t.indent;
                switch (t.op) {
                    case OP_EVAL:
                        var prevCount = evalCount;
                        result = evaluatePipe(t.expression);
                        if (evallable(result)) {
                            outstr = outstr !== undefined;
                            if (ws) {
                                output.push(ws);
                            }
                            ws = undefined;
                            output.push((evalCount !== prevCount || t.noescape ? pass : escape)(string(result, json)));
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
                    case OP_SPACE:
                        if (ws === false) {
                            ws = undefined;
                        } else if (t.value === NEWLINE && options.indent) {
                            var k = NEWLINE + indent(options.indent, t.indent, options.indentPadding);
                            if (k.indexOf(output[output.length - 1]) === 0) {
                                output.pop();
                            }
                            output.push(k);
                            ws = undefined;
                        } else {
                            ws = t.value;
                        }
                        break;
                    default:
                        if (ws && !t.stripWS) {
                            output.push(ws);
                        }
                        output.push(t.value);
                        outstr = true;
                        ws = t.stripWSEnd ? false : undefined;
                }
            }
        } finally {
            evalCount = (evalCount + !!outstr) & 0xFFFF;
            execStack.shift();
        }
        if (options.indent && options.indentPadding && !options.trimStart) {
            output.unshift(options.indentPadding);
        }
        return outstr === true ? output.join('') : result;
    }

    function run(str, data, options, outstr) {
        str = string(str || '');
        options = extend({}, waterpipe.defaultOptions, options || {});
        return evaluate(cached(parse, str), {
            indent: evallable(options.indent) ? indent(options.indent, 1) : '',
            indentPadding: evallable(options.indentPadding) ? indent(options.indentPadding, 1) : execStack[0] ? indent(execStack[0].indent, execStack[0].level, execStack[0].indentPadding) : '',
            trimStart: options.trimStart,
            objStack: [data],
            globals: inherit(waterpipe.globals, options.globals)
        }, outstr);
    }

    function waterpipe(str, data, options) {
        return run(str, data, options, true);
    }

    waterpipe.defaultOptions = {};
    waterpipe.globals = {};
    waterpipe.string = string;
    waterpipe.eval = function (str, data, options) {
        return run('{{' + str + '}}', data, options);
    };
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
        iequals: strargs(function (a, b) {
            return a.toLowerCase() === b.toLowerCase();
        }),
        inotequals: strargs(function (a, b) {
            return a.toLowerCase() !== b.toLowerCase();
        }),
        startswith: strargs(function (a, b) {
            return b && a.substr(0, b.length) === b;
        }),
        endswith: strargs(function (a, b) {
            return b && a.substr(-b.length) === b;
        }),
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
            regex = cached(parseRegExp, regex);
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
            return string(str).replace(cached(parseRegExp, regex) || regex, !fn.call ? fn : function () {
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
            return repeat(str, count);
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
        lcfirst: function (str) {
            str = string(str);
            return str.charAt(0).toLowerCase() + str.substr(1);
        },
        hyphenate: function (str) {
            return cached(hyphenate, str);
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
            for (; (end - start) / step > 0; start += step) {
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
            return first(arr, detectKeyFn(varargs, arr));
        },
        any: function (arr, varargs) {
            return !!first(arr, detectKeyFn(varargs, arr), true);
        },
        all: function (arr, varargs) {
            return !first(arr, detectKeyFn(varargs, arr), true, true);
        },
        none: function (arr, varargs) {
            return !first(arr, detectKeyFn(varargs, arr), true);
        },
        where: function (arr, varargs) {
            return where(arr, detectKeyFn(varargs, arr));
        },
        map: function (arr, varargs) {
            return where(arr, constFn(true), detectKeyFn(varargs, arr));
        },
        sum: function (arr, varargs) {
            var result;
            var fn = varargs.fn() || ((result = varargs.next()), varargs.fn() || (varargs.hasArgs() ? detectKeyFn(varargs, arr) : pass));
            each(arr, function (i, v) {
                result = result ? result + fn(v, i) : fn(v, i);
            });
            return result;
        },
        sortby: function (arr, varargs) {
            var result = Array.isArray(arr) ? new Array(arr.length) : {};
            var fn = detectKeyFn(varargs, arr);
            var tmp = [];
            var j = 0;
            each(arr, function (i, v) {
                tmp.push([fn(v, i), ++j, i]);
            });
            tmp.sort(compare);
            each(tmp, function (i, v) {
                result[arr.push ? i : v[2]] = arr[v[2]];
            });
            return result;
        },
        groupby: function (arr, varargs) {
            var result = {};
            var fn = detectKeyFn(varargs, arr);
            each(arr, function (i, v) {
                var key = string(fn(v, i));
                if (!result.hasOwnProperty(key)) {
                    result[key] = arr.push ? [] : {};
                }
                result[key][arr.push ? result[key].length : i] = v;
            });
            return result;
        },
        in: function (value, varargs) {
            var b = varargs.next(true);
            return Array.isArray(b) ? b.indexOf(value) >= 0 : typeof b === 'object' && value in b;
        },
        '??': function (a, b) {
            return a !== null && a !== undefined ? a : b;
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
    ('?test !not +plus -minus *multiply /divide %mod ^pow ==equals !=notequals ~=iequals !~=inotequals ^=startswith $=endswith *=contains <less <=orless >more >=ormore ..to').replace(/(\W{1,3})(\S+)\s?/g, function (v, a, b) {
        pipes[a] = pipes[b];
    });
    each('where first any all none sum map test not sortby groupby replace as let in && || |'.split(' '), function (i, v) {
        pipes[v].varargs = true;
    });

    /* istanbul ignore next */
    if (!Array.isArray) {
        Array.isArray = function (arg) {
            return Object.prototype.toString.call(arg) === '[object Array]';
        };
    }
    /* istanbul ignore next */
    if (typeof document !== 'undefined' && document.querySelectorAll) {
        each(document.querySelectorAll('script[type="text/x-waterpipe"]'), function (i, v) {
            pipes[v.id] = v.innerHTML;
        });
    }
    /* istanbul ignore next */
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
