/**
 * no-test-timing: tests wait on conditions and assert on counted work, never on the clock.
 *
 * A test that asserts on elapsed time, sleeps for a fixed time or carries a hand-set timeout passes
 * on an idle machine and fails when several test runs share it. This rule reports:
 *
 * - an assertion on an elapsed time: a comparison (`<`, `>`, `<=`, `>=`) or a comparison matcher
 *   (`toBeLessThan`, ...) inside `expect(...)` / `assert(...)` / `assert.*(...)` whose operand is
 *   a difference of two readings of `performance.now()`, `Date.now()`, `new Date().getTime()` or
 *   `process.hrtime*`, or a ratio or multiple of one, directly or through a variable. A reading
 *   compared with a recorded timestamp (`before <= event.time`) is not a duration and is not
 *   reported;
 * - a fixed sleep in a test, a hook or a helper: `x.waitForTimeout(n)`, `new Promise((r) => setTimeout(r, n))`, `await
 *   setTimeout(n)` (node:timers/promises) and a call to a sleep helper (`sleepNames`, default
 *   sleep, delay, wait, pause) with a number;
 * - a per-test timeout: a timeout argument or `{ timeout }` option on it / test / describe / the
 *   hooks, `vi.setConfig({ testTimeout | hookTimeout })`, `this.timeout(n)` and `x.setTimeout(n)`.
 *
 * Zero-delay timers (`setTimeout(r, 0)`) yield to the event loop and are not reported, and neither
 * is a sleep inside a callback handed to the code under test, which simulates slow work.
 */

const CLOCK_HINT =
    "Assert on counted work (operations, visits, calls) instead of elapsed time; a timing check belongs in a benchmark (*.bench.test.ts, benchmarks/).";
const SLEEP_HINT =
    "Wait on a condition instead of the clock: expect.poll(), vi.waitFor(), a Playwright locator assertion or an awaited event.";
const TIMEOUT_HINT = "Do not set a per-test timeout; find what the test waits on and wait on that condition instead.";

const TEST_NAMES = new Set(["it", "test", "describe", "suite"]);
const HOOK_NAMES = new Set(["beforeAll", "beforeEach", "afterAll", "afterEach"]);
const COMPARISONS = new Set(["<", ">", "<=", ">="]);
const ARITHMETIC = new Set(["*", "/", "%"]);
const COMPARISON_MATCHERS = new Set([
    "toBeLessThan",
    "toBeLessThanOrEqual",
    "toBeGreaterThan",
    "toBeGreaterThanOrEqual",
    "toBeCloseTo",
    "isBelow",
    "isAbove",
    "isAtMost",
    "isAtLeast",
    "isBelowOrEqual",
    "isAboveOrEqual",
]);
const FUNCTION_TYPES = new Set(["ArrowFunctionExpression", "FunctionExpression", "FunctionDeclaration"]);

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
    meta: {
        type: "problem",
        docs: { description: "Disallow wall-clock assertions, fixed sleeps and per-test timeouts in tests" },
        schema: [
            {
                type: "object",
                properties: { sleepNames: { type: "array", items: { type: "string" } } },
                additionalProperties: false,
            },
        ],
        messages: {
            clock: `Assertion on a wall-clock value. ${CLOCK_HINT}`,
            sleep: `Fixed sleep used to wait. ${SLEEP_HINT}`,
            timeout: `Per-test timeout override. ${TIMEOUT_HINT}`,
        },
    },
    create(context) {
        const sleepNames = new Set(context.options[0]?.sleepNames ?? ["sleep", "delay", "wait", "pause"]);
        const { sourceCode } = context;
        // Variables holding a wall-clock value, and whether it is a reading or an elapsed time.
        const clockVars = new Map();

        const isFunction = (n) => Boolean(n) && FUNCTION_TYPES.has(n.type);
        const propName = (m) => {
            if (m?.type !== "MemberExpression") {
                return undefined;
            }
            return m.computed ? m.property.value : m.property.name;
        };

        // A number literal, or arithmetic/unary over number literals (`60_000`, `2 * 1000`).
        const isNumeric = (n) =>
            (n?.type === "Literal" && typeof n.value === "number") ||
            (n?.type === "UnaryExpression" && isNumeric(n.argument)) ||
            (n?.type === "BinaryExpression" && isNumeric(n.left) && isNumeric(n.right));
        const isZero = (n) => n === undefined || (n.type === "Literal" && n.value === 0);

        const isClockCall = (n) => {
            if (n.type === "CallExpression") {
                const c = n.callee;
                const name = propName(c);
                const obj = c.type === "MemberExpression" ? c.object : undefined;
                if (
                    name === "now" &&
                    obj?.type === "Identifier" &&
                    (obj.name === "performance" || obj.name === "Date")
                ) {
                    return true;
                }
                if (
                    name === "getTime" &&
                    obj?.type === "NewExpression" &&
                    obj.callee.name === "Date" &&
                    obj.arguments.length === 0
                ) {
                    return true;
                }
                if (name === "hrtime" && obj?.type === "Identifier" && obj.name === "process") {
                    return true;
                }
                if (name === "bigint" && propName(obj) === "hrtime") {
                    return true;
                }
            }
            return false;
        };

        const resolve = (id) => {
            for (let scope = sourceCode.getScope(id); scope; scope = scope.upper) {
                const v = scope.set.get(id.name);
                if (v) {
                    return v;
                }
            }
            return undefined;
        };

        // "raw" for a clock reading (or one moved by a constant), "elapsed" for a difference of two
        // readings or a ratio or multiple of one, else undefined. A value only flows through arithmetic, a variable and a numeric wrapper
        // (`Math.round`, `Number`): a file name or an object built from `Date.now()` is not a time.
        const clockKind = (n) => {
            switch (n?.type) {
                case "CallExpression": {
                    if (isClockCall(n)) {
                        return "raw";
                    }
                    const base = baseName(n.callee);
                    return base === "Math" || base === "Number" ? n.arguments.map(clockKind).find(Boolean) : undefined;
                }
                case "Identifier": {
                    const v = resolve(n);
                    return v && clockVars.get(v);
                }
                case "BinaryExpression": {
                    const left = clockKind(n.left);
                    const right = clockKind(n.right);
                    if (n.operator === "-" && left && right) {
                        return "elapsed";
                    }
                    if (n.operator === "+" || n.operator === "-") {
                        // A reading moved by a constant is still a point in time.
                        return left ?? right;
                    }
                    return ARITHMETIC.has(n.operator) && (left || right) ? "elapsed" : undefined;
                }
                case "UnaryExpression":
                case "TSAsExpression":
                case "TSNonNullExpression":
                    return clockKind(n.argument ?? n.expression);
                default:
                    return undefined;
            }
        };
        // A bound on an elapsed time is what fails under load; a reading compared with a timestamp is not.
        const isElapsed = (n) => clockKind(n) === "elapsed";

        const markClock = (pattern, init) => {
            const kind = clockKind(init);
            if (pattern?.type === "Identifier" && kind) {
                const v = resolve(pattern);
                if (v) {
                    clockVars.set(v, kind);
                }
            }
        };

        // The base identifier of a callee chain: `it.skipIf(x).each(t)` -> `it`.
        const baseName = (n) => {
            while (n) {
                if (n.type === "Identifier") {
                    return n.name;
                }
                if (n.type === "MemberExpression") {
                    n = n.object;
                } else if (n.type === "CallExpression") {
                    n = n.callee;
                } else {
                    return undefined;
                }
            }
            return undefined;
        };

        const isAssertCall = (n) => {
            const base = baseName(n.callee);
            return base === "assert" || base === "expect";
        };

        const hasTimeoutKey = (obj, keys) =>
            obj?.type === "ObjectExpression" &&
            obj.properties.some((p) => p.type === "Property" && keys.has(p.key.name ?? p.key.value));

        const TIMEOUT_KEYS = new Set(["timeout"]);
        const CONFIG_KEYS = new Set(["testTimeout", "hookTimeout", "teardownTimeout"]);

        const checkTimeoutArgs = (node) => {
            const base = baseName(node.callee);
            const isTest = TEST_NAMES.has(base);
            const isHook = HOOK_NAMES.has(base) || HOOK_NAMES.has(propName(node.callee));
            if (!isTest && !isHook) {
                return;
            }
            // Only the call that registers the test: `test.each(t)("x", fn)` and `it("x", fn)`, not `test.each(t)`.
            const args = node.arguments;
            // With no function literal (`it("x", runCase, 5000)`) the body sits where the API puts it.
            const literalIndex = args.findIndex(isFunction);
            const bodyIndex = isTest ? 1 : 0;
            const fnIndex = literalIndex === -1 ? bodyIndex : literalIndex;
            if (args.length <= fnIndex) {
                return;
            }
            const others = args.filter((_, i) => i !== fnIndex);
            const after = args.slice(fnIndex + 1);
            if (
                others.some((a) => hasTimeoutKey(a, TIMEOUT_KEYS)) ||
                after.some((a) => a.type !== "ObjectExpression" && a.type !== "SpreadElement")
            ) {
                context.report({ node, messageId: "timeout" });
            }
        };

        // A sleep inside a callback handed to the code under test (`queue.run(async () => { await
        // sleep(10); })`, `vi.fn(async () => ...)`) simulates slow work; the test is not waiting on
        // it. A sleep in a test or hook body, a helper function or `page.evaluate` is a wait.
        const reportSleep = (node) => {
            let fn = node.parent;
            while (fn && !isFunction(fn)) {
                fn = fn.parent;
            }
            const call = fn?.parent;
            const simulated =
                (call?.type === "CallExpression" || call?.type === "NewExpression") &&
                call.arguments.includes(fn) &&
                !TEST_NAMES.has(baseName(call.callee)) &&
                !HOOK_NAMES.has(baseName(call.callee)) &&
                !HOOK_NAMES.has(propName(call.callee)) &&
                propName(call.callee) !== "evaluate" &&
                call.callee.name !== "Promise";
            if (!simulated) {
                context.report({ node, messageId: "sleep" });
            }
        };

        // expect(elapsed).toBeLessThan(n), assert.isBelow(elapsed, n)
        const checkClockMatcher = (node, name) => {
            if (!COMPARISON_MATCHERS.has(name) || !isAssertCall(node)) {
                return;
            }
            const { callee, arguments: args } = node;
            let target = callee.object;
            while (target?.type === "MemberExpression") {
                target = target.object;
            }
            const operands = baseName(callee) === "assert" ? args : [...(target?.arguments ?? []), ...args];
            if (operands.some(isElapsed)) {
                context.report({ node, messageId: "clock" });
            }
        };

        // page.waitForTimeout(n), sleep(n), await setTimeout(n) from node:timers/promises
        const isSleepCall = (node, name) => {
            const [first] = node.arguments;
            if (name === "waitForTimeout") {
                return true;
            }
            if (sleepNames.has(name)) {
                return isNumeric(first) && !isZero(first);
            }
            return (
                node.callee.type === "Identifier" &&
                name === "setTimeout" &&
                node.parent.type === "AwaitExpression" &&
                !isFunction(first) &&
                !isZero(first)
            );
        };

        // this.timeout(n), test.setTimeout(n), vi.setConfig({ testTimeout })
        const isTimeoutCall = (node, name) => {
            const { callee, arguments: args } = node;
            if (name === "timeout") {
                return callee.object?.type === "ThisExpression";
            }
            if (name === "setTimeout") {
                return callee.type === "MemberExpression" && args.length === 1 && !isFunction(args[0]);
            }
            return name === "setConfig" && args.some((a) => hasTimeoutKey(a, CONFIG_KEYS));
        };

        return {
            VariableDeclarator(node) {
                markClock(node.id, node.init);
            },
            AssignmentExpression(node) {
                markClock(node.left, node.right);
            },
            BinaryExpression(node) {
                if (!COMPARISONS.has(node.operator) || !(isElapsed(node.left) || isElapsed(node.right))) {
                    return;
                }
                // Only inside an assertion: a deadline loop is not an assertion.
                for (let p = node.parent; p && !isFunction(p); p = p.parent) {
                    if (p.type === "CallExpression" && isAssertCall(p)) {
                        context.report({ node, messageId: "clock" });
                        return;
                    }
                }
            },
            CallExpression(node) {
                const { callee } = node;
                const name = callee.type === "Identifier" ? callee.name : propName(callee);
                checkClockMatcher(node, name);
                if (isSleepCall(node, name)) {
                    reportSleep(node);
                }
                if (isTimeoutCall(node, name)) {
                    context.report({ node, messageId: "timeout" });
                } else {
                    checkTimeoutArgs(node);
                }
            },
            NewExpression(node) {
                // new Promise((r) => setTimeout(r, n))
                const [executor] = node.arguments;
                if (node.callee.name !== "Promise" || !isFunction(executor) || executor.params.length === 0) {
                    return;
                }
                const resolveName = executor.params[0].name;
                let call = executor.body;
                if (call.type === "BlockStatement") {
                    call = call.body.length === 1 ? call.body[0].expression : undefined;
                }
                if (
                    call?.type === "CallExpression" &&
                    (call.callee.name === "setTimeout" || propName(call.callee) === "setTimeout") &&
                    call.arguments[0]?.type === "Identifier" &&
                    call.arguments[0].name === resolveName &&
                    !isZero(call.arguments[1])
                ) {
                    reportSleep(node);
                }
            },
        };
    },
};

export default rule;
