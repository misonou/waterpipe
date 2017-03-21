/*!
 * Waterpipe JavaScript Template "format" Pipe
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 misonou
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
        define(['waterpipe'], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./waterpipe'));
    } else {
        root.waterpipeFormat = factory(root.waterpipe);
    }
}(this, function (waterpipe, internals) {
    'use strict';

    waterpipe.pipes[':json'] = JSON.stringify;
    waterpipe.pipes[':query'] = function (obj) {
        var arr = internals.buildParams([], obj);
        return arr.join("&").replace(/%20/g, "+");
    };
    waterpipe.pipes[':date'] = function (obj, format) {
        var date = obj instanceof Date ? obj : typeof obj === 'number' ? new Date(obj) : new Date(Date.parse(obj));
        return internals.formatDate(date, format, this.DATE_LABELS);
    };
    waterpipe.pipes[':printf'] = function (obj, format) {
        return internals.sprintf(format, obj);
    };
    waterpipe.pipes.__default__ = (function (previous) {
        return function (name) {
            if (name.charAt(0) === '%') {
                return function (obj) {
                    return internals.sprintf(name, obj);
                };
            }
            return previous(name);
        };
    }(waterpipe.pipes.__default__));

    /*jshint ignore:start */
    internals = {};

    /*! jquery.js | Copyright jQuery Foundation and other contributors | Released under the MIT license */
    (function (exports) {
        exports.buildParams = function (arr, obj, prefix) {
            if (prefix && Array.isArray(obj)) {
                for (var i = 0, len = obj.length; i < len; i++) {
                    if (/\[\]$/.test(prefix)) {
                        arr[arr.length] = encodeURIComponent(prefix) + '=' + encodeURIComponent(obj[i]);
                    } else {
                        exports.buildParams(arr, obj[i], prefix + "[" + (typeof obj[i] === "object" && obj[i] ? i : "") + "]");
                    }
                }
            } else if (typeof obj === "object") {
                for (var name in obj) {
                    exports.buildParams(arr, obj[name], prefix ? prefix + "[" + name + "]" : name);
                }
            } else {
                arr[arr.length] = encodeURIComponent(prefix) + '=' + encodeURIComponent(obj);
            }
            return arr;
        }
    }(internals));

    /*! sprintf.js | Copyright (c) 2007-2013 Alexandru Marasteanu <hello at alexei dot ro> | 3 clause BSD license */
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
    (function (exports) {
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
            return (new Array(len + 1).join('0') + num).substr(-len);
        }

        function formatDate(date, format, translationsOverride) {
            format = standardFormat[format] || format;
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
                default:
                    return '';
                }
            }

            var arr = [];
            var m, r = /%?(?:(?!\\)(d{1,4}|f{1,7}|F{1,7}|g{1,2}|h{1,2}|H{1,2}|K|m{1,2}|M{1,4}|s{1,2}|t{1,2}|y{1,5}|z{1,3}|\:|\/))|\\?(.)/g;
            while ((m = r.exec(format)) !== null) {
                arr.push(m[1] ? getString(m[1]) : m[2]);
            }
            return arr.join('');
        }

        exports.formatDate = formatDate;
    })(internals);
    /*jshint ignore:end */
}));
