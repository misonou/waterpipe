/*jshint esversion:6,node:true,-W030,-W083 */
/*globals describe,it */

var assert = require('assert');
var waterpipe = require('../src/waterpipe.js').with('format');
var spec = JSON.parse(require('fs').readFileSync('test/test.json', 'utf8'));

var consoleWarnCount = 0;
console.warn = (function (f) {
    return function () {
        ++consoleWarnCount;
    };
}(console.warn));

waterpipe.pipes.fn1 = function (a) {
    return arguments.length;
};
waterpipe.pipes.fn2 = function (a, b) {
    return arguments.length;
};
waterpipe.pipes.fn3 = function (a, b, c) {
    return arguments.length;
};
waterpipe.pipes.fn4 = function (a, b, c, d) {
    return arguments.length;
};
waterpipe.pipes.fn5 = function (a, b, c, d, e) {
    return arguments.length;
};

for (var i in spec.globals) {
    waterpipe.globals[i] = spec.globals[i];
}
for (var i in spec.pipes) {
    waterpipe.pipes[i] = spec.pipes[i];
}
for (var i in spec.tests) {
    describe(i, (function (t) {
        return function () {
            for (var i in t) {
                it(i, (function (t) {
                    return function () {
                        function execute() {
                            assert.deepStrictEqual((t.func ? waterpipe[t.func] : waterpipe)(t.template, t.input, t.globals && {
                                globals: t.globals
                            }), t.expect);
                        }
                        var prevCount = consoleWarnCount;
                        if (t.exception) {
                            assert.throws(execute);
                        } else {
                            execute();
                        }
                        if (t.warn) {
                            assert.strictEqual(consoleWarnCount, prevCount + 1, 'console.warn() not called exactly once.');
                        }
                    };
                }(t[i])));
            }
        };
    }(spec.tests[i])));
}
