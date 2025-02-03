/*! waterpipe v2.8.2 | (c) misonou | https://github.com/misonou/waterpipe#readme */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("waterpipe", [], factory);
	else if(typeof exports === 'object')
		exports["waterpipe"] = factory();
	else
		root["waterpipe"] = factory();
})(this, function() {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};
const waterpipe = (function () {
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
    var EVAL_NOW = 6;
    var EVAL_TODAY = 7;
    var EVAL_RAND = 8;

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

    var RegExp = /./.constructor;
    var evalCount = 0;
    var execStack = [];
    var collator = typeof Intl !== 'undefined' && Intl.Collator && new Intl.Collator(undefined, { caseFirst: 'upper' });
    var pipes = Object.create ? Object.create(null) : {};
    var internals = {};

    var compares = [
        function (a, b) { return compare(a, b, 1); },
        function (a, b) { return compare(a, b, 1, 1); },
        function (a, b) { return compare(a, b, -1); },
        function (a, b) { return compare(a, b, -1, 1); }
    ];

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

    function asdate(obj) {
        if (!evallable(obj) || obj instanceof Date) {
            return obj;
        }
        if (typeof obj === 'number') {
            return new Date(obj);
        }
        var str = string(obj);
        obj = new Date(str);
        if (!/\d{2}:\d{2}:\d{2}/.test(str)) {
            obj.setHours(0, 0, 0, 0);
        }
        return obj;
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

    function reverseIndex(v, i) {
        return ((v || '').length || 0) - (+i || 0) - 1;
    }

    function parseTimeRange(str) {
        var dir = 1;
        if (str[0] === '+' || str[0] === '-') {
            dir = str[0] === '-' ? -1 : 1;
            str = str.slice(1);
        }
        var args = [0, 0, 0, 0, 0, 0, 0];
        var m, re = /(\d+)([yMwdhms])/g;
        while ((m = re.exec(str)) !== null) {
            if (m[2] === 'w') {
                args[2] += parseInt(m[1]) * 7 * dir;
            } else {
                args['yMdhms'.indexOf(m[2])] += parseInt(m[1]) * dir;
            }
        }
        return args;
    }

    function parseRegExp(str) {
        return str.charAt(0) === '/' && /\/((?![*+?])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+)\/((?:g(?:im?|mi?)?|i(?:gm?|mg?)?|m(?:gi?|ig?)?)?)/g.test(str) && new RegExp(RegExp.$1, RegExp.$2);
    }

    function parseObjectPath(str) {
        var t = [];
        var m, r = /((?!^)\$)?([^$.()][^.]*)|\$\(([^)]+)\)/ig;
        while ((m = r.exec(str)) !== null) {
            t.push(m[1] || m[3] ? cached(parseObjectPath, m[3] || m[2]) : m[2][0] === '^' ? { fn: reverseIndex, arg: m[2].slice(1) } : m[2]);
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
            case '@now':
                t.evalMode = EVAL_NOW;
                break;
            case '@today':
                t.evalMode = EVAL_TODAY;
                break;
            case '@random':
                t.evalMode = EVAL_RAND;
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
        if (!evallable(arr)) {
            return arr;
        }
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

    function compare(a, b, dir, ignoreCase) {
        if (Array.isArray(a) && Array.isArray(b)) {
            var result;
            for (var i = 0, len = Math.min(a.length, b.length); i < len && !result; i++) {
                result = compare(a[i], b[i], dir, ignoreCase);
            }
            return result || a.length - b.length;
        }
        if (a === b) {
            return 0;
        }
        var x = !evallable(a) && -1;
        var y = !evallable(b) && 1;
        if (x || y) {
            return (x + y) * dir;
        }
        if (isString(a) || isString(b)) {
            a = string(a);
            b = string(b);
            if (ignoreCase) {
                /* istanbul ignore else */
                if (collator) {
                    return collator.compare(a, b) * dir;
                } else {
                    a = a.toLowerCase();
                    b = b.toLowerCase();
                }
            }
            return (a > b ? 1 : a < b ? -1 : 0) * dir;
        }
        return (a - b) * dir;
    }

    function sortby(arr, varargs, compare) {
        var result = Array.isArray(arr) ? new Array(arr.length) : {};
        var fn = detectKeyFn(varargs, arr);
        if (!evallable(arr)) {
            return arr;
        }
        var tmp = [];
        each(arr, function (i, v) {
            tmp.push([i, v, fn(v, i)]);
        });
        tmp.sort(function (a, b) {
            return compare(a[2], b[2]);
        });
        each(tmp, function (i, v) {
            result[arr.push ? i : v[0]] = v[1];
        });
        return result;
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
        return waterpipe('at line {{$0}} column {{$1}}:\n\t{{$2}}{{$3}}\n\t{{$2.length + $4 repeat " "}}{{$5 repeat ^}}', [arr.length, arr[0].length + 1, lineStart, line, cstart - start || 0, cend - cstart || end - start], { html: false });
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
        return (this.objectPath = constFn(cached(parseObjectPath, this.textValue.replace(/^\$(?!\()/, '')))).call();
    };
    PipeArgument.prototype.length = function () {
        if (this.value === '[' && this.canEvaluate === undefined) {
            for (var t = this.next, i = 1, count = 1; t; t = t.next, i++) {
                if (t.value === '[') {
                    count++;
                } else if (t.value === ']' && t.canEvaluate === undefined && --count === 0) {
                    return (this.length = constFn(i)).call();
                }
            }
        }
        this.length = function () {};
    };

    function parsePipe(str, index) {
        var t = new Pipe(str, index || 0);
        var n, r = /([^\s\\"`]|\\.)(?:[^\s\\]|\\.)*|"((?:[^"\\]|\\.)*)"|`(\S+)/ig;
        while ((n = r.exec(str)) !== null) {
            t.unshift(new PipeArgument(t[0], n[3] || (n[2] !== undefined ? n[2] : n[0]), t.index + n.index, t.index + r.lastIndex, n[3] || n[2] !== undefined ? false : n[1] === '$' ? true : undefined));
        }
        return t.reverse();
    }

    function parse(str) {
        var tokens = [];
        var controlStack = [{}];
        var htmlStack = [];
        var lastIndex = 0;
        var lastIndentWS = '';
        var m, r = /\{\{([\/!]|foreach(?=\s|\})|if(?:\snot)?(?=\s)|else(?:if(?:\snot)?(?=\s))?|&?(?!\}))\s*((?:\}(?!\})|[^}])*\}*)\}\}/g;

        function assert(result) {
            if (!result) {
                throw new Error('Unexpected ' + m[0] + ' ' + formatCallSite(str, m.index, r.lastIndex));
            }
        }

        function getPipe(str) {
            return parsePipe(str, m.index + m[0].indexOf(str));
        }

        function parseHTML(str, htmlStackCount) {
            var start = tokens.length;
            var m, r = /<(\/?)((?:[0-9a-z]+:)?[0-9a-z]+|!doctype|!--)|\/?>|-->|([^\s=\/<>"0-9.-][^\s=\/<>"]*)(?:="|$|(?=[\s=\/<>"]))|"|(\s+)/ig;
            var lastIndex = 0;

            function isScriptOrStyle() {
                return (htmlStack[0].opened && (htmlStack[0].tagName === 'script' || htmlStack[0].tagName === 'style')) || htmlStack[0].tagName === '!--';
            }

            function shiftHtmlStack() {
                return htmlStack.length > (controlStack[0].htmlStackCount || 1) && htmlStack.shift();
            }

            function writeText(str, stripWS, nstr) {
                if (isScriptOrStyle()) {
                    tokens.push({
                        op: OP_TEXT,
                        value: str,
                        ovalue: str,
                        nvalue: str
                    });
                    return;
                }
                var attrName = htmlStack[0].attrName;
                var opened = htmlStack[0].opened;
                if (nstr === undefined) {
                    nstr = str;
                }
                if (stripWS || attrName || opened) {
                    var last1 = tokens[tokens.length - 1];
                    var last2 = tokens[tokens.length - 2];
                    var newline;
                    var ostr = str;
                    if (!stripWS) {
                        newline = str.indexOf('\n') >= 0;
                        ostr = str = str.replace(/^\s+/g, (opened && (!last1 || last1.op !== OP_SPACE)) || (attrName && htmlStack[0].text) ? ' ' : '');
                        str = attrName ? str : escape(str, true);
                        newline &= (!str || str === ' ');
                    } else {
                        ostr = str.replace(/^\s+/, '');
                        nstr = nstr.replace(/^\s+/, '');
                    }
                    htmlStack[0].text += str;
                    if (newline) {
                        if (last1) {
                            last1.stripWSEnd = false;
                        }
                        tokens.push({
                            op: OP_SPACE,
                            value: NEWLINE,
                            ovalue: nstr
                        });
                        return;
                    }
                    if (str && ((htmlStack[1] && opened) || str !== ' ')) {
                        var isTagEnd = str[str.length - 1] === '>';
                        if (tokens.length > start && last1.op === OP_TEXT) {
                            last1.value += str;
                            last1.ovalue += ostr;
                            last1.nvalue += nstr;
                            last1.isTagEnd = isTagEnd;
                            last1.stripWSEnd = stripWS;
                        } else if (tokens.length > start + 1 && last2.op === OP_TEXT && last1.value !== NEWLINE) {
                            var ch = (str[0] === '<' || last2.isTagEnd || (!stripWS && !last2.stripWSEnd)) ? last1.value : '';
                            last2.value += ch + str;
                            last2.ovalue += last1.ovalue + ostr;
                            last2.nvalue += last1.ovalue + nstr;
                            last2.isTagEnd = isTagEnd;
                            last2.stripWSEnd = stripWS;
                            tokens.pop();
                        } else {
                            tokens.push({
                                op: OP_TEXT,
                                stripWS: stripWS,
                                stripWSEnd: stripWS,
                                isTagEnd: isTagEnd,
                                value: str,
                                ovalue: ostr,
                                nvalue: nstr,
                                indent: htmlStack.length - 2 + !!htmlStack[0].opened
                            });
                        }
                        return;
                    }
                }
                tokens.push({
                    op: OP_SPACE,
                    value: ' ',
                    ovalue: nstr
                });
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
                        if (htmlStack[0].tagName && !m[4]) {
                            if (htmlStack[0].tagName !== '!--' && !htmlStack[0].opened) {
                                writeText(' ' + m[0], true);
                                if (m[0].indexOf('=') >= 0) {
                                    htmlStack.unshift({
                                        attrName: m[3],
                                        text: ''
                                    });
                                }
                                continue;
                            }
                        } else if (htmlStack[0].attrName) {
                            if (m[0][m[0].length - 1] === '"') {
                                writeText(m[0].slice(0, -1));
                                shiftHtmlStack();
                                writeText('"', true);
                                continue;
                            }
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
                    writeText('</' + tagName + '>', true, '');
                }
            }
        }

        str = string(str).replace(/^\r?\n/, '');
        htmlStack.unshift({
            opened: true,
            text: ''
        });
        while ((m = r.exec(str)) !== null) {
            if (lastIndex !== m.index) {
                var cur = str.substring(lastIndex, m.index);
                if (/^([^\S\r\n]*(\r?\n[^\S\r\n]*))(\S?)/.test(cur)) {
                    cur = RegExp.$2.slice(lastIndentWS.length) + cur.slice(RegExp.$1.length);
                    if (RegExp.$3) {
                        tokens.push({
                            op: OP_SPACE,
                            value: NEWLINE,
                            ovalue: ''
                        });
                    }
                }
                lastIndentWS = /(\r?\n[^\S\r\n]*)?$/.test(cur) && RegExp.$1 || '';
                parseHTML(cur);
            } else {
                lastIndentWS = '';
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
                            condition: getPipe(m[2]),
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
                            condition: getPipe(m[2]),
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
                            expression: getPipe(m[2])
                        }
                    });
                    tokens.push(controlStack[0].token);
                    break;
                default:
                    lastIndentWS = '';
                    tokens.push({
                        op: OP_EVAL,
                        expression: getPipe(m[2]),
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

        function evaluateObjectPathPart(p, value) {
            if (Array.isArray(p)) {
                return string(evaluateObjectPath(p));
            }
            if (typeof p === 'object') {
                return p.fn(value, p.arg);
            }
            return p;
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
                case EVAL_NOW:
                    value = +new Date();
                    break;
                case EVAL_TODAY:
                    value = new Date();
                    value.setHours(0, 0, 0, 0);
                    value = +value;
                    break;
                case EVAL_RAND:
                    value = Math.random();
                    break;
                default:
                    var name = evaluateObjectPathPart(objectPath[0], value);
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
                value = value[evaluateObjectPathPart(objectPath[i], value)];
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
                        value = apply(value, func);
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
                            output.push((evalCount !== prevCount || t.noescape || options.noEncode ? pass : escape)(string(result, json)));
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
                        if (!options.html) {
                            output.push(t.ovalue);
                        } else if (ws === false) {
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
                        output.push(options.html === false ? t.nvalue : options.noEncode ? t.ovalue : t.value);
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

    function apply(data, str) {
        return run(str, data, extend({}, execStack[0], {
            indentPadding: undefined,
            trimStart: true
        }));
    }

    function getOptions(options, data) {
        options = extend({}, waterpipe.defaultOptions, options || {});
        return {
            html: options.html !== false,
            noEncode: options.html === false || options.noEncode,
            indent: evallable(options.indent) ? indent(options.indent, 1) : '',
            indentPadding: evallable(options.indentPadding) ? indent(options.indentPadding, 1) : execStack[0] ? indent(execStack[0].indent, execStack[0].level, execStack[0].indentPadding) : '',
            trimStart: options.trimStart,
            objStack: [data],
            globals: inherit(waterpipe.globals, options.globals)
        };
    }

    function run(str, data, options, outstr) {
        str = string(str || '');
        return evaluate(cached(parse, str), getOptions(options, data), outstr);
    }

    function waterpipe(str, data, options) {
        return run(str, data, options, true);
    }

    waterpipe.defaultOptions = {};
    waterpipe.globals = {};
    waterpipe.string = string;
    waterpipe.eval = function (str, data, options) {
        var tokens = [{ op: OP_EVAL, expression: cached(parsePipe, str) }];
        tokens.value = str;
        return evaluate(tokens, getOptions(options, data));
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
        asdate: asdate,
        eval: apply,
        as: function (obj, varargs) {
            return (varargs.globals[string(varargs.raw())] = obj);
        },
        let: function (obj, varargs) {
            while (varargs.hasArgs()) {
                varargs.globals[string(varargs.raw())] = varargs.next();
            }
        },
        more: function (a, b) {
            return (compare(a, b, 1) > 0);
        },
        less: function (a, b) {
            return (compare(a, b, 1) < 0);
        },
        ormore: function (a, b) {
            return (compare(a, b, 1) >= 0);
        },
        orless: function (a, b) {
            return (compare(a, b, 1) <= 0);
        },
        between: function (a, b, c) {
            var d = compare(b, c, 1) >= 0 ? [c, b] : [b, c];
            return (compare(a, d[0], 1) >= 0 && compare(a, d[1], 1) <= 0);
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
        to: function (a, b) {
            var start = +a;
            var end = +b;
            var pattern;
            var numDigit;
            if (isNaN(start) || isNaN(end)) {
                var re = /(\d+|\d*\.\d+)/;
                pattern = string(a).replace(re, '0');
                start = +RegExp.$1;
                numDigit = RegExp.$1.length;
                if (string(b).replace(re, '0') !== pattern) {
                    return [a];
                }
                end = +RegExp.$1;
            }
            start = start || 0;
            end = end || 0;
            var arr = [];
            var step = (end - start) / Math.abs(end - start);
            var format = function (n) {
                var m = Math.abs(n).toString();
                return m.length < numDigit ? new Array(numDigit - m.length + 1).join('0') + m : m;
            };
            for (; (end - start) / step > 0; start += step) {
                arr.push(pattern ? pattern.replace('0', format(start)) : start);
            }
            arr.push(pattern ? pattern.replace('0', format(end)) : end);
            return arr;
        },
        join: function (arr, str) {
            return [].concat(arr).join(string(str));
        },
        reverse: function (arr) {
            return [].concat(arr).reverse();
        },
        sort: function (arr) {
            return [].concat(arr).sort(compares[0]);
        },
        isort: function (arr) {
            return [].concat(arr).sort(compares[1]);
        },
        rsort: function (arr) {
            return [].concat(arr).sort(compares[2]);
        },
        irsort: function (arr) {
            return [].concat(arr).sort(compares[3]);
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
                result = result !== undefined ? result + fn(v, i) : fn(v, i);
            });
            return result;
        },
        sortby: function (arr, varargs) {
            return sortby(arr, varargs, compares[0]);
        },
        isortby: function (arr, varargs) {
            return sortby(arr, varargs, compares[1]);
        },
        rsortby: function (arr, varargs) {
            return sortby(arr, varargs, compares[2]);
        },
        irsortby: function (arr, varargs) {
            return sortby(arr, varargs, compares[3]);
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
        addtime: function (obj, span) {
            obj = asdate(obj);
            if (!evallable(obj)) {
                return obj;
            }
            var args = cached(parseTimeRange, span);
            return +new Date(
                args[0] + obj.getFullYear(),
                args[1] + obj.getMonth(),
                args[2] + obj.getDate(),
                args[3] + obj.getHours(),
                args[4] + obj.getMinutes(),
                args[5] + obj.getSeconds(),
                args[6] + obj.getMilliseconds()
            );
        },
        in: function (value, varargs) {
            var b = varargs.next(true);
            return Array.isArray(b) ? b.indexOf(value) >= 0 : !!b && typeof b === 'object' && value in b;
        },
        '??': function (a, b) {
            return a !== null && a !== undefined ? a : b;
        },
        '!!': function (obj, varargs) {
            return !!(varargs.hasArgs() ? varargs.next() : obj);
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
        },
        ':json': function (value) {
            return JSON.stringify(value);
        },
        ':query': function (obj) {
            var arr = internals.buildParams([], obj);
            return arr.join("&").replace(/%20/g, "+");
        },
        ':date': function (obj, format) {
            var date = obj instanceof Date ? obj : typeof obj === 'number' ? new Date(obj) : new Date(Date.parse(obj));
            return isNaN(date) ? '' : internals.formatDate(date, format, this.DATE_LABELS);
        },
        ':printf': function (obj, format) {
            return internals.sprintf(format, obj);
        }
    });
    ('|>eval ?test !not +plus -minus *multiply /divide %mod ^pow ==equals !=notequals ~=iequals !~=inotequals ^=startswith $=endswith *=contains <less <=orless >more >=ormore ..to ?:choose &concat').replace(/(\W{1,3})(\S+)\s?/g, function (v, a, b) {
        pipes[a] = pipes[b];
    });
    each('where first any all none sum map test not sortby isortby rsortby irsortby groupby replace as let in !! && || |'.split(' '), function (i, v) {
        pipes[v].varargs = true;
    });

    pipes.__default__ = (function (previous) {
        return function (name) {
            if (name.charAt(0) === '%') {
                return function (obj) {
                    return internals.sprintf(name, obj);
                };
            }
            return previous(name);
        };
    }(pipes.__default__));

    /*! jquery.js | Copyright jQuery Foundation and other contributors | Released under the MIT license */
    /* istanbul ignore next */
    (function (e) {
        e.buildParams = function buildParams(arr, obj, prefix) {
            if (prefix && Array.isArray(obj)) {
                for (var i = 0, len = obj.length; i < len; i++) {
                    if (/\[\]$/.test(prefix)) {
                        arr[arr.length] = encodeURIComponent(prefix) + '=' + encodeURIComponent(obj[i]);
                    } else {
                        buildParams(arr, obj[i], prefix + "[" + (typeof obj[i] === "object" && obj[i] ? i : "") + "]");
                    }
                }
            } else if (typeof obj === "object") {
                for (var name in obj) {
                    buildParams(arr, obj[name], prefix ? prefix + "[" + name + "]" : name);
                }
            } else {
                arr[arr.length] = encodeURIComponent(prefix) + '=' + encodeURIComponent(obj);
            }
            return arr;
        }
    }(internals));

    /*! sprintf.js | Copyright (c) 2007-2013 Alexandru Marasteanu <hello at alexei dot ro> | 3 clause BSD license */
    /* istanbul ignore next */
    (function (e) {
        function r(e) {
            return Object.prototype.toString.call(e).slice(8, -1).toLowerCase()
        }

        function i(e, t) {
            for (var n = []; t > 0; n[--t] = e);
            return n.join("")
        }
        var t = function () {
            return t.cache.hasOwnProperty(arguments[0]) || (t.cache[arguments[0]] = t.parse(arguments[0])), t.format.call(null, t.cache[arguments[0]], arguments)
        };
        t.format = function (e, n) {
            var s = 1,
                o = e.length,
                u = "",
                a, f = [],
                l, c, h, p, d, v;
            for (l = 0; l < o; l++) {
                u = r(e[l]);
                if (u === "string") f.push(e[l]);
                else if (u === "array") {
                    h = e[l];
                    if (h[2]) {
                        a = n[s];
                        for (c = 0; c < h[2].length; c++) {
                            if (!a.hasOwnProperty(h[2][c])) throw t('[sprintf] property "%s" does not exist', h[2][c]);
                            a = a[h[2][c]]
                        }
                    } else h[1] ? a = n[h[1]] : a = n[s++];
                    if (/[^s]/.test(h[8]) && r(a) != "number") throw t("[sprintf] expecting number but found %s", r(a));
                    switch (h[8]) {
                        case "b":
                            a = a.toString(2);
                            break;
                        case "c":
                            a = String.fromCharCode(a);
                            break;
                        case "d":
                            a = parseInt(a, 10);
                            break;
                        case "e":
                            a = h[7] ? a.toExponential(h[7]) : a.toExponential();
                            break;
                        case "f":
                            a = h[7] ? parseFloat(a).toFixed(h[7]) : parseFloat(a);
                            break;
                        case "o":
                            a = a.toString(8);
                            break;
                        case "s":
                            a = (a = String(a)) && h[7] ? a.substring(0, h[7]) : a;
                            break;
                        case "u":
                            a >>>= 0;
                            break;
                        case "x":
                            a = a.toString(16);
                            break;
                        case "X":
                            a = a.toString(16).toUpperCase()
                    }
                    a = /[def]/.test(h[8]) && h[3] && a >= 0 ? "+" + a : a, d = h[4] ? h[4] == "0" ? "0" : h[4].charAt(1) : " ", v = h[6] - String(a).length, p = h[6] ? i(d, v) : "", f.push(h[5] ? a + p : p + a)
                }
            }
            return f.join("")
        }, t.cache = {}, t.parse = function (e) {
            var t = e,
                n = [],
                r = [],
                i = 0;
            while (t) {
                if ((n = /^[^\x25]+/.exec(t)) !== null) r.push(n[0]);
                else if ((n = /^\x25{2}/.exec(t)) !== null) r.push("%");
                else {
                    if ((n = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(t)) === null) throw "[sprintf] huh?";
                    if (n[2]) {
                        i |= 1;
                        var s = [],
                            o = n[2],
                            u = [];
                        if ((u = /^([a-z_][a-z_\d]*)/i.exec(o)) === null) throw "[sprintf] huh?";
                        s.push(u[1]);
                        while ((o = o.substring(u[0].length)) !== "")
                            if ((u = /^\.([a-z_][a-z_\d]*)/i.exec(o)) !== null) s.push(u[1]);
                            else {
                                if ((u = /^\[(\d+)\]/.exec(o)) === null) throw "[sprintf] huh?";
                                s.push(u[1])
                            }
                        n[2] = s
                    } else i |= 2;
                    if (i === 3) throw "[sprintf] mixing positional and named placeholders is not (yet) supported";
                    r.push(n)
                }
                t = t.substring(n[0].length)
            }
            return r
        };
        var n = function (e, n, r) {
            return r = n.slice(0), r.splice(0, 0, e), t.apply(null, r)
        };
        e.sprintf = t, e.vsprintf = n
    })(internals);

    /*! formatdate.js | Copyright misonou | Released under the MIT license */
    (function (e) {
        'use strict';

        var standardFormat = {
            d: 'MM/dd/yyyy',
            D: 'dddd, dd MMMM yyyy',
            f: 'dddd, dd MMMM yyyy HH:mm',
            F: 'dddd, dd MMMM yyyy HH:mm:ss',
            g: 'MM/dd/yyyy HH:mm',
            G: 'MM/dd/yyyy HH:mm:ss',
            m: 'MMMM dd',
            M: 'MMMM dd',
            o: 'yyyy\\-MM\\-dd\\THH\\:mm\\:ss\\.fffffffK',
            O: 'yyyy\\-MM\\-dd\\THH\\:mm\\:ss\\.fffffffK',
            r: 'ddd, dd MMM yyyy HH\\:mm\\:ss \\G\\M\\T',
            R: 'ddd, dd MMM yyyy HH\\:mm\\:ss \\G\\M\\T',
            s: 'yyyy\\-MM\\-dd\\THH\\:mm\\:ss',
            t: 'HH:mm',
            T: 'HH:mm:ss',
            u: 'yyyy\\-MM\\-dd HH\\:mm\\:ss\\Z',
            U: 'dddd, dd MMMM yyyy HH:mm:ss',
            y: 'yyyy MMMM',
            Y: 'yyyy MMMM'
        };
        var defaultTranslations = {
            shortWeekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            longWeekday: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            shortMonth: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            longMonth: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            designator: ['AM', 'PM'],
            era: ['B.C.', 'A.D.'],
            timeSeparator: ':',
            dateSeparator: '/'
        };

        function padZero(num, len) {
            num = String(num);
            return num.length >= len ? num : (new Array(len + 1).join('0') + num).substr(-len);
        }

        function formatDate(date, format, translationsOverride) {
            format = standardFormat[format] || format || '';
            translationsOverride = translationsOverride || {};
            var translations = {};
            for (var i in defaultTranslations) {
                translations[i] = translationsOverride[i] || defaultTranslations[i];
            }

            function getString(specifier) {
                var len = specifier.length;
                switch (specifier.charAt(0)) {
                    case 'd':
                        return len === 4 ? translations.longWeekday[date.getDay()] : len === 3 ? translations.shortWeekday[date.getDay()] : padZero(date.getDate(), len);
                    case 'f':
                    case 'F':
                        var str = (date.getMilliseconds() + '000000').substr(0, len);
                        return specifier.charAt(0) === 'f' || !/^0+$/.test(str) ? str : '';
                    case 'g':
                        return translations.era[+(date.getFullYear() >= 0)];
                    case 'h':
                        return padZero((date.getHours() % 12) || 12, len);
                    case 'H':
                        return padZero(date.getHours(), len);
                    case 'm':
                        return padZero(date.getMinutes(), len);
                    case 'M':
                        return len === 4 ? translations.longMonth[date.getMonth()] : len === 3 ? translations.shortMonth[date.getMonth()] : padZero(date.getMonth() + 1, len);
                    case 's':
                        return padZero(date.getSeconds(), len);
                    case 't':
                        return translations.designator[+(date.getHours() >= 12)].substr(0, len);
                    case 'y':
                        return padZero(len >= 3 ? date.getFullYear() : date.getYear(), len);
                    case 'K':
                    case 'z':
                        var offset = date.getTimezoneOffset();
                        return len === 3 || specifier === 'K' ?
                            (offset >= 0 ? '-' : '+') + padZero(Math.abs(offset / 60) | 0, 2) + ':' + padZero((Math.abs(offset) % 60), 2) :
                            (offset >= 0 ? '-' : '+') + padZero(Math.abs(offset / 60) | 0, len);
                    case ':':
                        return translations.timeSeparator;
                    case '/':
                        return translations.dateSeparator;
                }
            }

            var arr = [];
            var m, r = /%?(?:(?!\\)(d{1,4}|f{1,7}|F{1,7}|g{1,2}|h{1,2}|H{1,2}|K|m{1,2}|M{1,4}|s{1,2}|t{1,2}|y{1,5}|z{1,3}|\:|\/))|\\?(.)/g;
            while ((m = r.exec(format)) !== null) {
                arr.push(m[1] ? getString(m[1]) : m[2]);
            }
            return arr.join('');
        }

        e.formatDate = formatDate;
    })(internals);

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
    if (true) {
        waterpipe.with = function () {
            return waterpipe;
        };
    }
    return waterpipe;
})();

/* harmony default export */ __webpack_exports__["default"] = (waterpipe);

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=waterpipe.js.map