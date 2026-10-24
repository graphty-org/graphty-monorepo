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
 *   hooks, `vi.setConfig({ testTimeout | hookTimeout })`, `this.timeout(n)` and `x.setTimeout(n)`;
 * - a wait counted in animation frames: more than one awaited animation frame in a row, a counted
 *   loop that only awaits one (`for (let i = 0; i < 5; i++) await nextFrame();`), a call with a
 *   count above one to a helper that is such a loop over its parameter (`frames(30)`, or `frames()`
 *   when the parameter defaults above one), and nested `requestAnimationFrame` calls. A busy machine
 *   skips or adds frames, so a count of frames is a sleep (#2398, #2446, #2466). An awaited frame is
 *   `new Promise((r) => requestAnimationFrame(r))`, a function that returns only that, or an
 *   imported `nextFrame()`. A single frame is a yield and is not reported, nor is a loop that does
 *   work besides waiting (`render(); await nextFrame();`);
 * - a timer in code handed to the page: `setTimeout(fn, n)` with a delay inside a function passed
 *   to `evaluate`, `evaluateHandle`, `$eval`, `$$eval`, `addInitScript` or `evaluateOnNewDocument`.
 *   The page then runs its steps on the clock instead of on the events they wait on (#2422, #2447).
 *
 * - a time budget on a wait: a `timeout` or `interval` option (or a number in its place) on `waitFor`,
 *   `waitForElementToBeRemoved`, `vi.waitFor`, `vi.waitUntil`, `expect.poll`, `expect.element`,
 *   `find*By*`, a Playwright locator action or assertion, `toPass`, `waitForFunction`,
 *   `waitForSelector`, `waitForEvent` and the other `waitFor*` calls, or a helper that builds one
 *   (`storyWaitOptions(n)`). A wait's deadline decides pass or fail on a busy machine while the work
 *   it waits on still finishes; one global hang guard (tools/test-wait-guard.mjs) ends every wait
 *   that hangs. Fixable: `--fix` removes the option.
 * - any other local deadline: a timeout or interval option on a call that waits (`waitForStableFrame({
 *   timeoutMs })`, `untilIdle(x, { intervalMs })`) or runs a process or a request (`execFile(cmd, {
 *   timeout })`, `fetch`), a helper parameter that defaults to one, a
 *   `testTimeout` / `hookTimeout` / `teardownTimeout` anywhere (a per-project value in a vitest
 *   config), and a deadline loop or check (`while (Date.now() < deadline)`, `if (performance.now() -
 *   start > budget) throw`). There is one hang guard, set in one place; nothing else may end a test
 *   on the clock. Only the guard's own constants (`WAIT_GUARD_MS`, `TEST_GUARD_MS`) may be passed:
 *   a synchronous child process (`spawnSync`) blocks the event loop, so no test timeout can end it.
 *   A timeout option of the code under test (a notifier's `timeoutMs`, graphviz's) is what the test
 *   checks, not a deadline on the test, and is not reported.
 *
 * Zero-delay timers (`setTimeout(r, 0)`) yield to the event loop and are not reported, and neither
 * is a sleep inside a callback handed to the code under test, which simulates slow work.
 */

const CLOCK_HINT =
    "Assert on counted work (operations, visits, calls) instead of elapsed time; a timing check belongs in a benchmark (*.bench.test.ts, benchmarks/).";
const SLEEP_HINT =
    "Wait on a condition instead of the clock: expect.poll(), vi.waitFor(), a Playwright locator assertion or an awaited event.";
const TIMEOUT_HINT = "Do not set a per-test timeout; find what the test waits on and wait on that condition instead.";
const FRAMES_HINT =
    "Count the work the test waits for (input updates, renders, events) and wait until that count is reached; a busy machine skips or adds animation frames.";
const WAIT_HINT =
    "Remove it: every wait shares the project's one hang guard (tools/test-wait-guard.mjs). If the wait runs out under load, wait on the event or state that settles it.";
const DEADLINE_HINT =
    "Remove it: the one global hang guard (tools/test-wait-guard.mjs) ends a real hang. Wait on the condition with no deadline of its own, or assert the state directly.";
const PAGE_TIMER_HINT =
    "Drive each step in the page from the event it waits on (an awaited waitForFunction, a promise the test resolves) instead of a timer.";

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
// An imported function by this name waits one animation frame; a local one is judged by its body.
const ONE_FRAME_NAMES = new Set(["nextFrame", "nextAnimationFrame", "animationFrame", "waitFrame", "waitForFrame"]);
// Calls that run a function in the page rather than in the test.
const NUMBER_OPS = { "+": (a, b) => a + b, "-": (a, b) => a - b, "*": (a, b) => a * b };
// Waits whose options take a deadline. A Playwright action or matcher takes one too, judged separately.
const WAIT_CALLS = new Set([
    "waitFor",
    "waitForElementToBeRemoved",
    "waitUntil",
    "poll",
    "element",
    "toPass",
    "waitForFunction",
    "waitForSelector",
    "waitForEvent",
    "waitForURL",
    "waitForLoadState",
    "waitForResponse",
    "waitForRequest",
]);
const LOCATOR_ACTIONS = new Set([
    "click",
    "dblclick",
    "fill",
    "hover",
    "press",
    "pressSequentially",
    "type",
    "check",
    "uncheck",
    "setChecked",
    "selectOption",
    "selectText",
    "tap",
    "dragTo",
    "focus",
    "blur",
    "clear",
    "setInputFiles",
    "scrollIntoViewIfNeeded",
    "textContent",
    "innerText",
    "inputValue",
    "getAttribute",
]);
// Matchers whose argument is the expected value, not options: `expect(x).toEqual({ timeout: 5000 })`.
const VALUE_MATCHER =
    /^to(Be|Equal|StrictEqual|MatchObject|ContainEqual|Contain|HaveProperty|HaveBeen.*|HaveReturned.*|HaveLastReturned.*|HaveNthReturned.*|Throw.*|Match.*Snapshot|Satisfy|HaveLength)$/;
const FIND_QUERY = /^find(All)?By[A-Z]/;
const WAIT_KEYS = new Set(["timeout", "interval"]);
// Any option or parameter that sets a deadline or a polling interval: `timeout`, `timeoutMs`,
// `pollIntervalMs`, `actionTimeout`, `testTimeout`.
const DEADLINE_KEY = /^(timeout|interval|pollInterval)(Ms|Millis|Seconds)?$|(Timeout|Interval)(Ms|Millis|Seconds)?$/;
// Keys that set every test's, hook's, wait's or action's deadline (a vitest config, Testing Library's
// `configure`, a Playwright provider), reported wherever they appear: the guard sets them.
const CONFIG_DEADLINE_KEYS = new Set([
    "testTimeout",
    "hookTimeout",
    "teardownTimeout",
    "asyncUtilTimeout",
    "actionTimeout",
]);
// Calls whose timeout option is a deadline on the test's own wait: a wait by name, a child process, a request.
const WAITING_CALL = /(^(wait|until|poll|settle|find))|((Stable|Settled|Idle)(Frame)?$)/i;
const PROCESS_CALLS = new Set(["exec", "execFile", "execSync", "execFileSync", "spawn", "spawnSync", "fork", "fetch"]);
// The global hang guard's own constants (tools/test-wait-guard.mjs): the one value a deadline may take.
const GUARD_NAMES = new Set(["WAIT_GUARD_MS", "TEST_GUARD_MS"]);
// Helpers that build a wait's deadline from a number.
const WAIT_BUILDERS = new Set(["storyWaitOptions"]);
const PAGE_CALLS = new Set(["evaluate", "evaluateHandle", "$eval", "$$eval", "addInitScript", "evaluateOnNewDocument"]);

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
    meta: {
        type: "problem",
        fixable: "code",
        docs: {
            description: "Disallow wall-clock assertions, fixed sleeps, per-test timeouts and wait deadlines in tests",
        },
        schema: [
            {
                type: "object",
                properties: {
                    sleepNames: { type: "array", items: { type: "string" } },
                    // false turns the animation-frame check off, for files listed with an issue to fix them.
                    frameWaits: { type: "boolean" },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            clock: `Assertion on a wall-clock value. ${CLOCK_HINT}`,
            sleep: `Fixed sleep used to wait. ${SLEEP_HINT}`,
            timeout: `Per-test timeout override. ${TIMEOUT_HINT}`,
            frames: `Animation frames counted as a wait. ${FRAMES_HINT}`,
            pageTimer: `Timer in code handed to the page. ${PAGE_TIMER_HINT}`,
            waitBudget: `Time budget on a wait. ${WAIT_HINT}`,
            deadline: `Local deadline. ${DEADLINE_HINT}`,
        },
    },
    create(context) {
        const sleepNames = new Set(context.options[0]?.sleepNames ?? ["sleep", "delay", "wait", "pause"]);
        const frameWaits = context.options[0]?.frameWaits ?? true;
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
        const isTimeoutProp = (p) => keyName(p) === "timeout";
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
            const isNumberArg = (a, i) => i > fnIndex && a.type !== "ObjectExpression" && a.type !== "SpreadElement";
            const isOptions = (a, i) => i !== fnIndex && hasTimeoutKey(a, TIMEOUT_KEYS);
            if (!args.some((a, i) => isNumberArg(a, i) || isOptions(a, i))) {
                return;
            }
            // Fixable: the timeout argument, or the `timeout` option, goes.
            const fix = (fixer) =>
                args.flatMap((a, i) => {
                    if (isNumberArg(a, i)) {
                        return [removeArg(fixer, args, i)];
                    }
                    return isOptions(a, i)
                        ? [removeProps(fixer, args, i, budgetProps(a).filter(isTimeoutProp))].flat()
                        : [];
                });
            context.report({ node, messageId: "timeout", fix });
        };

        // A sleep inside a callback handed to the code under test (`queue.run(async () => { await
        // sleep(10); })`, `vi.fn(async () => ...)`) simulates slow work; the test is not waiting on
        // it. A sleep in a test or hook body, a helper function or `page.evaluate` is a wait.
        const reportSleep = (node, messageId = "sleep") => {
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
                context.report({ node, messageId });
            }
        };

        // ---- Waits counted in animation frames. Judged at Program:exit, once every local function is known.
        const frameLoops = [];
        const frameCalls = [];
        const frameAwaits = [];
        const timers = [];

        // The value of a number literal, arithmetic over them, or a const initialised to one.
        const numValue = (n) => {
            if (n?.type === "Literal" && typeof n.value === "number") {
                return n.value;
            }
            if (n?.type === "UnaryExpression" && n.operator === "-") {
                const v = numValue(n.argument);
                return v === undefined ? undefined : -v;
            }
            if (n?.type === "BinaryExpression" && NUMBER_OPS[n.operator]) {
                const l = numValue(n.left);
                const r = numValue(n.right);
                return l === undefined || r === undefined ? undefined : NUMBER_OPS[n.operator](l, r);
            }
            return n?.type === "Identifier" ? constValue(n) : undefined;
        };
        const constValue = (id) => {
            const def = resolve(id)?.defs[0];
            return def?.type === "Variable" && def.parent.kind === "const" ? numValue(def.node.init) : undefined;
        };

        // The function a callee names, when it is declared in this file.
        const localFunction = (callee) => {
            const def = callee?.type === "Identifier" ? resolve(callee)?.defs[0] : undefined;
            if (def?.type === "FunctionName") {
                return def.node;
            }
            return def?.type === "Variable" && isFunction(def.node.init) ? def.node.init : undefined;
        };

        // The one expression a function's body evaluates to: `() => x`, `{ return x; }`, `{ await x; }`.
        const soleExpression = (fn) => {
            if (fn.body.type !== "BlockStatement") {
                return fn.body;
            }
            if (fn.body.body.length !== 1) {
                return undefined;
            }
            const [st] = fn.body.body;
            const e = st.type === "ReturnStatement" ? st.argument : st.expression;
            return e?.type === "AwaitExpression" ? e.argument : e;
        };

        const isRafCall = (n) =>
            n?.type === "CallExpression" &&
            (n.callee.name === "requestAnimationFrame" || propName(n.callee) === "requestAnimationFrame");

        // How many frames a requestAnimationFrame callback waits in all: `() => requestAnimationFrame(r)` adds one.
        const rafDepth = (call) => {
            const [cb] = call.arguments;
            const inner = isFunction(cb) ? soleExpression(cb) : undefined;
            return 1 + (isRafCall(inner) ? rafDepth(inner) : 0);
        };

        // How many animation frames an expression waits, when that is all it does; else undefined.
        const frameCount = (n, seen = new Set()) => {
            if (n?.type === "NewExpression" && n.callee.name === "Promise" && isFunction(n.arguments[0])) {
                const inner = soleExpression(n.arguments[0]);
                return isRafCall(inner) ? rafDepth(inner) : undefined;
            }
            if (n?.type !== "CallExpression") {
                return undefined;
            }
            const fn = localFunction(n.callee);
            if (fn) {
                if (seen.has(fn)) {
                    return undefined;
                }
                seen.add(fn);
                return frameCount(soleExpression(fn), seen);
            }
            const name = n.callee.type === "Identifier" ? n.callee.name : propName(n.callee);
            return ONE_FRAME_NAMES.has(name) && n.arguments.length === 0 ? 1 : undefined;
        };

        const awaitedFrames = (st) =>
            st?.type === "ExpressionStatement" && st.expression.type === "AwaitExpression"
                ? frameCount(st.expression.argument)
                : undefined;

        // A `for` loop whose only statement awaits one frame: its counter and bound, else undefined.
        const frameLoop = (loop) => {
            const body = loop.body.type === "BlockStatement" ? loop.body.body : [loop.body];
            const { test, init } = loop;
            if (body.length !== 1 || awaitedFrames(body[0]) !== 1 || test?.type !== "BinaryExpression") {
                return undefined;
            }
            if (!["<", "<="].includes(test.operator) || test.left.type !== "Identifier") {
                return undefined;
            }
            const decl = init?.type === "VariableDeclaration" ? init.declarations[0] : undefined;
            const start = decl?.id.name === test.left.name ? numValue(decl.init) : undefined;
            return { bound: test.right, start: start ?? 0, inclusive: test.operator === "<=" };
        };
        const iterations = ({ start, inclusive }, bound) => {
            if (bound === undefined) {
                return undefined;
            }
            return inclusive ? bound - start + 1 : bound - start;
        };

        // A function that waits as many frames as one of its parameters says: that parameter's index and default.
        const frameHelper = (fn) => {
            const loop = frameLoops
                .map((l) => ({ l, info: frameLoop(l) }))
                .find(({ l, info }) => {
                    let p = l.parent;
                    while (p && !isFunction(p)) {
                        p = p.parent;
                    }
                    return p === fn && info?.bound.type === "Identifier";
                });
            if (!loop) {
                return undefined;
            }
            const index = fn.params.findIndex(
                (p) => (p.type === "AssignmentPattern" ? p.left : p).name === loop.info.bound.name,
            );
            if (index === -1) {
                return undefined;
            }
            const param = fn.params[index];
            return { index, info: loop.info, fallback: param.type === "AssignmentPattern" ? param.right : undefined };
        };

        const loopWaitsFrames = (loop) => {
            const info = frameLoop(loop);
            return Boolean(info) && iterations(info, numValue(info.bound)) > 1;
        };
        const callWaitsFrames = (call) => {
            const fn = localFunction(call.callee);
            const helper = fn && frameHelper(fn);
            return (
                Boolean(helper) &&
                iterations(helper.info, numValue(call.arguments[helper.index] ?? helper.fallback)) > 1
            );
        };
        // Nested frames where they are written (a helper's body, not each call to it), or a second
        // awaited frame straight after another.
        const awaitWaitsFrames = (node) => {
            const count = frameCount(node.argument);
            if (count > 1) {
                return !localFunction(node.argument.callee);
            }
            const st = node.parent;
            const list = st.type === "ExpressionStatement" ? st.parent.body : undefined;
            const previous = Array.isArray(list) ? list[list.indexOf(st) - 1] : undefined;
            return count === 1 && awaitedFrames(previous) === 1;
        };
        const checkFrames = () => {
            [
                ...frameLoops.filter(loopWaitsFrames),
                ...frameCalls.filter(callWaitsFrames),
                ...frameAwaits.filter(awaitWaitsFrames),
            ].forEach((node) => reportSleep(node, "frames"));
        };

        // ---- Timers in code handed to the page.
        const pageFunctions = new Set();
        // `new Promise((r) => setTimeout(r, n))`, which is already reported as a sleep.
        const isPromiseSleep = (call) => {
            let fn = call.parent;
            while (fn && !isFunction(fn)) {
                fn = fn.parent;
            }
            const promise = fn?.parent;
            return (
                promise?.type === "NewExpression" &&
                promise.callee.name === "Promise" &&
                promise.arguments[0] === fn &&
                call.arguments[0]?.type === "Identifier" &&
                call.arguments[0].name === fn.params[0]?.name
            );
        };
        const inPageCode = (call) => {
            for (let p = call.parent; p; p = p.parent) {
                if (pageFunctions.has(p)) {
                    return true;
                }
            }
            return false;
        };
        const checkTimers = () => {
            timers
                .filter((call) => !isPromiseSleep(call) && inPageCode(call))
                .forEach((node) => context.report({ node, messageId: "pageTimer" }));
        };
        // Calls the frame and page-timer checks judge at the end of the file.
        const collectCall = (node, name) => {
            if (node.callee.type === "Identifier") {
                frameCalls.push(node);
            }
            if (name === "setTimeout" && !isZero(node.arguments[1])) {
                timers.push(node);
            }
            if (PAGE_CALLS.has(name) && node.callee.type === "MemberExpression") {
                node.arguments
                    .map((arg) => (isFunction(arg) ? arg : localFunction(arg)))
                    .filter(Boolean)
                    .forEach((fn) => pageFunctions.add(fn));
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

        // ---- Time budgets on waits.
        const keyName = (p) => p.type === "Property" && !p.computed && (p.key.name ?? p.key.value);
        const budgetProps = (obj) =>
            obj?.type === "ObjectExpression" ? obj.properties.filter((p) => WAIT_KEYS.has(keyName(p))) : [];
        // A const holding a budget object: `const WAIT = { timeout: 2000 }`.
        const budgetConst = (id) => {
            const def = id?.type === "Identifier" ? resolve(id)?.defs[0] : undefined;
            return def?.type === "Variable" && def.parent.kind === "const" && budgetProps(def.node.init).length > 0;
        };
        const isBuilder = (n) =>
            n?.type === "CallExpression" && n.callee.type === "Identifier" && WAIT_BUILDERS.has(n.callee.name);
        // Removes an argument with the comma before it (or after it, when it is first).
        const removeArg = (fixer, args, i) => {
            const tokens = sourceCode;
            if (i > 0) {
                return fixer.removeRange([args[i - 1].range[1], args[i].range[1]]);
            }
            const next = args[1];
            return fixer.removeRange([args[0].range[0], next ? next.range[0] : tokens.getTokenAfter(args[0]).range[0]]);
        };
        // Removes a property; the whole argument when nothing else is left in it.
        const removeProps = (fixer, args, i, props) => {
            const obj = args[i];
            if (props.length === obj.properties.length) {
                return removeArg(fixer, args, i);
            }
            return props.map((p) => {
                const after = sourceCode.getTokenAfter(p);
                const end = after.value === "," ? sourceCode.getTokenAfter(after).range[0] : p.range[1];
                const before = sourceCode.getTokenBefore(p);
                return after.value === ","
                    ? fixer.removeRange([p.range[0], end])
                    : fixer.removeRange([before.range[0], p.range[1]]);
            });
        };
        const isWaitCall = (node, name) => {
            if (WAIT_CALLS.has(name) || FIND_QUERY.test(name ?? "")) {
                return true;
            }
            // locator.click({ timeout }), expect(x).toBeVisible({ timeout }): a member call only.
            if (node.callee.type !== "MemberExpression") {
                return false;
            }
            return (
                LOCATOR_ACTIONS.has(name) ||
                (/^to[A-Z]/.test(name ?? "") && !VALUE_MATCHER.test(name) && baseName(node.callee) === "expect")
            );
        };
        // `vi.waitFor(fn, 5000)`, `vi.waitUntil(fn, 5000)`: a number where the options go.
        const NUMBER_BUDGET = new Set(["waitFor", "waitUntil"]);
        const isGuard = (v) =>
            (v?.type === "Identifier" && GUARD_NAMES.has(v.name)) ||
            (v?.type === "MemberExpression" && GUARD_NAMES.has(propName(v)));
        // A timeout or interval option on a call that is not a wait the checks above know.
        const checkDeadlineOptions = (node, name) => {
            const base = baseName(node.callee);
            if (!WAITING_CALL.test(name ?? "") && !PROCESS_CALLS.has(name)) {
                return;
            }
            // The checks above report a test's, a hook's and setConfig's own timeout.
            if (
                VALUE_MATCHER.test(name ?? "") ||
                base === "expect" ||
                TEST_NAMES.has(base) ||
                HOOK_NAMES.has(base) ||
                HOOK_NAMES.has(name) ||
                name === "setConfig"
            ) {
                return;
            }
            for (const arg of node.arguments) {
                if (arg.type !== "ObjectExpression") {
                    continue;
                }
                for (const p of arg.properties) {
                    const key = keyName(p);
                    if (key && DEADLINE_KEY.test(key) && !CONFIG_DEADLINE_KEYS.has(key) && !isGuard(p.value)) {
                        const args = node.arguments;
                        context.report({
                            node: p,
                            messageId: "deadline",
                            fix: (fixer) => removeProps(fixer, args, args.indexOf(arg), [p]),
                        });
                    }
                }
            }
        };
        const checkWaitBudget = (node, name) => {
            if (!name || !isWaitCall(node, name)) {
                checkDeadlineOptions(node, name);
                return;
            }
            const args = node.arguments;
            args.forEach((arg, i) => {
                const props = budgetProps(arg).filter((p) => !isGuard(p.value));
                if (props.length > 0) {
                    context.report({
                        node: arg,
                        messageId: "waitBudget",
                        fix: (fixer) => removeProps(fixer, args, i, props),
                    });
                } else if (isBuilder(arg)) {
                    context.report({ node: arg, messageId: "waitBudget", fix: (fixer) => removeArg(fixer, args, i) });
                } else if (budgetConst(arg)) {
                    context.report({ node: arg, messageId: "waitBudget" });
                } else if (i === 1 && NUMBER_BUDGET.has(name) && baseName(node.callee) === "vi" && isNumeric(arg)) {
                    context.report({ node: arg, messageId: "waitBudget", fix: (fixer) => removeArg(fixer, args, i) });
                }
            });
        };

        // A comparison against the clock outside an assertion: a deadline loop or check.
        // What gives up: a throw, a break or return, or settling a promise (`reject`, `resolve`, `fail`).
        const GIVE_UP_CALLS = new Set(["reject", "resolve", "fail"]);
        const givesUp = (n) => {
            if (!n || typeof n !== "object" || isFunction(n)) {
                return false;
            }
            if (["ThrowStatement", "BreakStatement", "ReturnStatement"].includes(n.type)) {
                return true;
            }
            if (n.type === "CallExpression" && GIVE_UP_CALLS.has(n.callee.name ?? propName(n.callee))) {
                return true;
            }
            return Object.entries(n).some(
                ([k, v]) => k !== "parent" && (Array.isArray(v) ? v.some(givesUp) : v?.type && givesUp(v)),
            );
        };
        // Work the test hands to the code under test or to a timer (`defineAlgorithm({ nodes: () =>
        // spin() })`, a fake server's `setInterval`) simulates that code; it is not the test waiting.
        const inSimulatedWork = (node) => {
            for (let p = node.parent; p; p = p.parent) {
                if (!isFunction(p)) {
                    continue;
                }
                const holder = p.parent?.type === "Property" ? p.parent.parent?.parent : p.parent;
                const callee = holder?.callee;
                const name = callee?.type === "Identifier" ? callee.name : propName(callee);
                if (
                    (holder?.type === "CallExpression" || holder?.type === "NewExpression") &&
                    !TEST_NAMES.has(baseName(callee)) &&
                    !HOOK_NAMES.has(baseName(callee)) &&
                    !WAITING_CALL.test(name ?? "") &&
                    name !== "Promise"
                ) {
                    return true;
                }
            }
            return false;
        };
        // A comparison against the clock that decides whether to keep waiting: a loop's condition,
        // or an `if` that gives up. An animation's progress (`if (progress < 1) requestAnimationFrame(f)`)
        // is not one.
        const isDeadlineCheck = (node) => {
            const left = clockKind(node.left);
            const right = clockKind(node.right);
            if (!(left === "elapsed" || right === "elapsed" || (left === "raw" && right === "raw"))) {
                return false;
            }
            let test = node;
            while (["LogicalExpression", "UnaryExpression"].includes(test.parent?.type)) {
                test = test.parent;
            }
            const st = test.parent;
            const loop = ["WhileStatement", "DoWhileStatement", "ForStatement"].includes(st?.type) && st.test === test;
            const check = st?.type === "IfStatement" && st.test === test && givesUp(st.consequent);
            return (loop || check) && !inSimulatedWork(node);
        };
        // A helper parameter that defaults to a deadline: `timeoutMs = 5000`, `{ timeout = 1000 } = {}`.
        const checkParams = (fn) => {
            const visit = (p) => {
                if (p?.type === "AssignmentPattern") {
                    if (p.left.type === "Identifier" && DEADLINE_KEY.test(p.left.name) && !isGuard(p.right)) {
                        context.report({ node: p, messageId: "deadline" });
                    }
                    visit(p.left);
                } else if (p?.type === "ObjectPattern") {
                    p.properties.forEach((q) => visit(q.type === "Property" ? q.value : q));
                }
            };
            fn.params.forEach(visit);
        };

        return {
            Property(node) {
                const call = node.parent.parent;
                const inSetConfig = call?.type === "CallExpression" && propName(call.callee) === "setConfig";
                if (CONFIG_DEADLINE_KEYS.has(keyName(node)) && !isGuard(node.value) && !inSetConfig) {
                    context.report({ node, messageId: "deadline" });
                }
            },
            ":function"(node) {
                checkParams(node);
            },
            ForStatement(node) {
                frameLoops.push(node);
            },
            AwaitExpression(node) {
                frameAwaits.push(node);
            },
            "Program:exit"() {
                if (frameWaits) {
                    checkFrames();
                }
                checkTimers();
            },
            VariableDeclarator(node) {
                markClock(node.id, node.init);
            },
            AssignmentExpression(node) {
                markClock(node.left, node.right);
            },
            BinaryExpression(node) {
                if (!COMPARISONS.has(node.operator)) {
                    return;
                }
                // Inside an assertion it asserts on elapsed time; anywhere else it is a deadline.
                for (let p = node.parent; p && !isFunction(p); p = p.parent) {
                    if (p.type === "CallExpression" && isAssertCall(p)) {
                        if (isElapsed(node.left) || isElapsed(node.right)) {
                            context.report({ node, messageId: "clock" });
                        }
                        return;
                    }
                }
                if (isDeadlineCheck(node)) {
                    context.report({ node, messageId: "deadline" });
                }
            },
            CallExpression(node) {
                const { callee } = node;
                const name = callee.type === "Identifier" ? callee.name : propName(callee);
                checkClockMatcher(node, name);
                checkWaitBudget(node, name);
                collectCall(node, name);
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
