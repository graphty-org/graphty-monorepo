/* global document -- stubbed for the page in these tests */

import { afterEach, describe, expect, it, vi } from "vitest";

import { installVisualStoryTest, modeGlobals, shotsDisagreed } from "../capture/story-test-setup.mjs";

describe("modeGlobals", () => {
    it("lets a story's own global win over the capture mode's, as iframe.html does (#5836)", () => {
        const globals = { colorScheme: "light", locale: "en" };
        expect(modeGlobals(globals, { colorScheme: "light" }, { colorScheme: "dark" })).toEqual(globals);
    });

    it("lets the mode win over the story's defaults when the story forces nothing", () => {
        expect(modeGlobals({ colorScheme: "light", locale: "en" }, {}, { colorScheme: "dark" })).toEqual({
            colorScheme: "dark",
            locale: "en",
        });
    });

    it("renders with the story's globals when there is no mode", () => {
        expect(modeGlobals({ colorScheme: "light" }, {}, null)).toEqual({ colorScheme: "light" });
    });
});

describe("shotsDisagreed", () => {
    it("fails a story whose second shot matched the baseline after a first that did not (#3389)", () => {
        expect(shotsDisagreed({ status: "unchanged", flaky: true })).toBe(true);
    });

    it("fails an unstable story and passes a changed or unchanged one", () => {
        expect(shotsDisagreed({ status: "unstable" })).toBe(true);
        expect(shotsDisagreed({ status: "changed" })).toBe(false);
        expect(shotsDisagreed({ status: "unchanged" })).toBe(false);
    });
});

/**
 * The tester page installVisualStoryTest runs in, faked in Node: the globals it reads and writes,
 * the Node commands it calls (recorded, with scripted shots), and its hooks, run in Vitest's order.
 * @param {object} [options] what the page holds
 * @param {Record<string, string[] | "broken">} [options.databases] its IndexedDB databases: name to
 *     store names ("fails" among them fails the clear), or "broken" for one that cannot be opened
 * @param {Record<string, object[]>} [options.elements] its elements per selector
 * @param {(object | Error)[]} [options.shots] what `visualShot` returns (or throws), in order
 * @returns {object} the page
 */
function page({ databases = {}, elements = {}, shots = [] } = {}) {
    const saved = {
        console: Object.fromEntries(["log", "info", "warn", "error", "debug"].map((m) => [m, console[m]])),
        performance: Object.fromEntries(
            ["getEntries", "getEntriesByType", "getEntriesByName"].map((m) => [m, performance[m]]),
        ),
        Date: globalThis.Date,
    };
    const calls = [];
    const cleared = [];
    const classes = new Set(["sb-main-padded"]);
    const appended = [];
    const listeners = {};
    const byId = {};
    const gpuHolder = { gpu: {} };
    vi.stubGlobal("navigator", Object.create(gpuHolder));
    vi.stubGlobal("location", { href: "http://localhost/tester?x=1" });
    const history = {
        state: { s: 1 },
        replaceState: (state, _, url) => calls.push(["replaceState", state, String(url)]),
    };
    vi.stubGlobal("history", history);
    vi.stubGlobal("requestAnimationFrame", (cb) => queueMicrotask(cb));
    vi.stubGlobal("addEventListener", (type, fn) => {
        listeners[type] = fn;
    });
    vi.stubGlobal("localStorage", { clear: () => cleared.push("localStorage") });
    vi.stubGlobal("sessionStorage", { clear: () => cleared.push("sessionStorage") });
    vi.stubGlobal("indexedDB", {
        databases: async () => Object.keys(databases).map((name) => ({ name })),
        open: (name) => {
            const request = {};
            queueMicrotask(() => {
                if (databases[name] === "broken") {
                    request.error = new Error(`cannot open ${name}`);
                    request.onerror();
                    return;
                }
                const stores = databases[name];
                const db = {
                    objectStoreNames: stores.filter((s) => s !== "fails"),
                    close: () => cleared.push(`closed ${name}`),
                    transaction: () => {
                        const tx = {
                            objectStore: (s) => ({ clear: () => cleared.push(`${name}/${s}`) }),
                        };
                        queueMicrotask(() => {
                            if (stores.includes("fails")) {
                                tx.error = new Error(`cannot clear ${name}`);
                                tx.onerror();
                            } else {
                                tx.oncomplete();
                            }
                        });
                        return tx;
                    },
                };
                request.result = db;
                request.onsuccess();
            });
            return request;
        },
    });
    vi.stubGlobal("document", {
        documentElement: {},
        head: { append: (el) => appended.push(el) },
        body: {
            classList: {
                add: (...c) => c.forEach((x) => classes.add(x)),
                remove: (...c) => c.forEach((x) => classes.delete(x)),
            },
        },
        fonts: { ready: Promise.resolve() },
        createElement: (tag) => ({ tag }),
        querySelectorAll: (selector) => elements[selector] ?? [],
        getElementById: (id) => byId[id],
    });
    const project = {};
    globalThis.globalProjectAnnotations = project;

    const commands = {
        visualHead: async () => {
            calls.push(["visualHead"]);
            return "body { margin: 0 }";
        },
        visualPark: async () => {
            calls.push(["visualPark"]);
        },
        visualPlan: async (arg) => {
            calls.push(["visualPlan", arg]);
            return page.plan;
        },
        visualShot: async (arg) => {
            calls.push(["visualShot", arg]);
            const next = shots.shift() ?? {};
            if (next instanceof Error) {
                throw next;
            }
            return next;
        },
        visualFail: async (arg) => {
            calls.push(["visualFail", arg]);
        },
    };
    const before = [];
    const after = [];
    installVisualStoryTest({ beforeEach: (fn) => before.push(fn), afterEach: (fn) => after.push(fn), commands });
    const page = {
        plan: { modes: [{ name: null }] },
        calls,
        cleared,
        classes,
        appended,
        listeners,
        byId,
        project,
        gpuHolder,
        history,
        shots: () => calls.filter(([c]) => c === "visualShot").map(([, a]) => a),
        fails: () => calls.filter(([c]) => c === "visualFail").map(([, a]) => a),
        beforeEach: async () => {
            for (const fn of before) {
                await fn();
            }
        },
        // Vitest runs afterEach hooks in reverse order of registration.
        afterEach: async (context) => {
            for (const fn of after.toReversed()) {
                await fn(context);
            }
        },
        // Storybook's own beforeEach, which the setup adds to the project's annotations.
        storybookBeforeEach: (ctx) => {
            for (const fn of project.beforeEach ?? []) {
                fn(ctx);
            }
        },
        restore: () => {
            Object.assign(console, saved.console);
            Object.assign(performance, saved.performance);
            globalThis.Date = saved.Date;
            delete globalThis.globalProjectAnnotations;
            vi.unstubAllGlobals();
        },
    };
    return page;
}

/**
 * A composed story as the story test's context carries it.
 * @param {object} [fields] the story's id, globals and parameters
 * @returns {object} the story; `runs` lists the argument of every render
 */
const story = (fields = {}) => {
    const runs = [];
    return {
        id: "a--one",
        globals: { colorScheme: "light" },
        parameters: {},
        runs,
        run: async (arg) => {
            runs.push(arg);
        },
        ...fields,
    };
};

/**
 * The context Vitest hands the afterEach hooks of a story test.
 * @param {object} s the story
 * @param {object} [result] the test's result
 * @returns {object} the context
 */
const contextOf = (s, result = { state: "pass" }) => {
    const file = { filepath: "/repo/src/a.stories.ts", name: "a.stories.ts" };
    const suite = { name: "A", suite: file, file };
    return { story: s, task: { name: "One", suite, file, result } };
};

/**
 * A render that waits until released, and says when it has started waiting.
 * @returns {{ started: Promise<void>, wait: () => Promise<void>, release: () => void }} the gate
 */
const gate = () => {
    let release;
    let entered;
    const opened = new Promise((r) => {
        release = r;
    });
    const started = new Promise((r) => {
        entered = r;
    });
    return {
        started,
        release,
        wait: async () => {
            entered();
            await opened;
        },
    };
};

describe("installVisualStoryTest", () => {
    let p;
    afterEach(() => p?.restore());

    it("sets the page up as capture.mjs's: no WebGPU, chromatic=true, lang en, no performance entries", () => {
        p = page();
        expect("gpu" in navigator).toBe(false);
        expect(document.documentElement.lang).toBe("en");
        expect(p.calls[0]).toEqual(["replaceState", { s: 1 }, "http://localhost/tester?x=1&chromatic=true"]);
        expect(performance.getEntries()).toEqual([]);
        expect(performance.getEntriesByType("navigation")).toEqual([]);
        expect(performance.getEntriesByName("x")).toEqual([]);
    });

    it("gives every test a fresh page: storage cleared, IndexedDB stores emptied, the fixed running clock", async () => {
        p = page({ databases: { full: ["a", "b"], empty: [] } });
        await p.beforeEach();
        expect(p.cleared).toEqual(
            expect.arrayContaining([
                "localStorage",
                "sessionStorage",
                "full/a",
                "full/b",
                "closed full",
                "closed empty",
            ]),
        );
        expect(new Date().toISOString().startsWith("2026-01-01T12:")).toBe(true);
        expect(Date.now()).toBeGreaterThanOrEqual(Date.parse("2026-01-01T12:00:00Z"));
        expect(new Date(5).getTime()).toBe(5);
        // The head is fetched once, however many tests run.
        await p.beforeEach();
        expect(p.calls.filter(([c]) => c === "visualHead")).toHaveLength(1);
        expect(p.appended).toEqual([{ tag: "style", textContent: "body { margin: 0 }" }]);
    });

    it("fails the test when an IndexedDB database cannot be opened or emptied", async () => {
        p = page({ databases: { bad: "broken" } });
        await expect(p.beforeEach()).rejects.toThrow("cannot open bad");
        p.restore();
        p = page({ databases: { stuck: ["a", "fails"] } });
        await expect(p.beforeEach()).rejects.toThrow("cannot clear stuck");
        expect(p.cleared).toContain("closed stuck");
    });

    it("puts the story's layout class on the body and names its canvas #storybook-root", async () => {
        p = page();
        await p.beforeEach();
        const canvasElement = {};
        p.storybookBeforeEach({ parameters: { layout: "centered" }, canvasElement });
        expect([...p.classes]).toEqual(["sb-show-main", "sb-main-centered"]);
        expect(canvasElement.id).toBe("storybook-root");
        p.byId["storybook-root"] = canvasElement;
        const second = {};
        p.storybookBeforeEach({ parameters: {}, canvasElement: second });
        expect(second.id).toBeUndefined();
        expect(p.classes.has("sb-main-padded")).toBe(true);
    });

    it("does nothing after a test that is not a story", async () => {
        p = page();
        await p.beforeEach();
        await p.afterEach({ task: {} });
        expect(p.calls.filter(([c]) => c === "visualPlan")).toEqual([]);
    });

    it("shoots every mode, rendering again only for a mode that changes a global, with the page's console", async () => {
        p = page();
        p.plan = { modes: [{ name: "light" }, { name: "dark", globals: { colorScheme: "dark" } }], delay: 1 };
        const RealDate = globalThis.Date;
        await p.beforeEach();
        expect(globalThis.Date).not.toBe(RealDate);
        const s = story({ parameters: { chromatic: { modes: { a: 1 }, fn: () => 1 } } });
        console.warn("careful", 1);
        console.log("hello");
        p.listeners.error({ message: "boom" });
        await p.afterEach(contextOf(s));
        const [, plan] = p.calls.find(([c]) => c === "visualPlan");
        expect(plan).toEqual({
            id: "a--one",
            chromatic: { modes: { a: 1 } },
            test: { file: "/repo/src/a.stories.ts", name: "A > One" },
        });
        expect(s.runs).toEqual([{ globals: { colorScheme: "dark" } }]);
        expect(p.shots()).toEqual([
            {
                id: "a--one",
                mode: "light",
                chromatic: { modes: { a: 1 } },
                console: ["warning: careful 1", "log: hello", "pageerror: boom"],
            },
            { id: "a--one", mode: "dark", chromatic: { modes: { a: 1 } }, console: [] },
        ]);
        // The clock is taken down once no confirming render is left.
        expect(globalThis.Date).toBe(RealDate);
    });

    it("lets a global the story sets itself win over the mode's", async () => {
        p = page();
        p.plan = { modes: [{ name: "dark", globals: { colorScheme: "dark" } }] };
        await p.beforeEach();
        p.storybookBeforeEach({ parameters: {}, storyGlobals: { colorScheme: "light" } });
        const s = story();
        await p.afterEach(contextOf(s));
        // The story forces the mode's only global back to its own, so its first render is the mode's.
        expect(s.runs).toEqual([]);
        expect(p.shots().map((x) => x.mode)).toEqual(["dark"]);
    });

    it("records a failed story as failed in every mode and lets its scene finish, without shooting it", async () => {
        const settled = [];
        const elements = {
            "graph-el": [
                { ready: async () => settled.push("a") },
                {},
                { ready: async () => Promise.reject(new Error("x")) },
            ],
        };
        p = page({ elements });
        p.plan = { modes: [{ name: "light" }, { name: "dark" }], waitFor: { selector: "graph-el", method: "ready" } };
        await p.beforeEach();
        await p.afterEach(contextOf(story(), { state: "fail", errors: [{ message: "play failed" }] }));
        expect(p.fails()).toEqual([
            { id: "a--one", modes: ["light", "dark"], reason: "play failed", chromatic: {}, console: [] },
        ]);
        expect(settled).toEqual(["a"]);
        expect(p.shots()).toEqual([]);
    });

    it("names a failure with no error message, and lets an excluded story's scene finish", async () => {
        const settled = [];
        p = page({ elements: { g: [{ ready: async () => settled.push(1) }] } });
        p.plan = { modes: [{ name: null }] };
        await p.beforeEach();
        await p.afterEach(contextOf(story(), { state: "fail" }));
        expect(p.fails()[0].reason).toBe("the story test failed");
        p.plan = { modes: [], waitFor: { selector: "g", method: "ready" } };
        await p.beforeEach();
        await p.afterEach(contextOf(story()));
        expect(settled).toEqual([1]);
        expect(p.shots()).toEqual([]);
    });

    it("waits on the project's elements before the shot and fails on the project's console rule", async () => {
        const order = [];
        p = page({ elements: { g: [{ ready: async () => order.push("ready") }] } });
        p.plan = {
            modes: [{ name: "light" }, { name: "dark", globals: { colorScheme: "dark" } }],
            waitFor: { selector: "g", method: "ready", failOnConsole: "WebGL lost" },
        };
        await p.beforeEach();
        console.error("WebGL lost: context");
        const error = await p.afterEach(contextOf(story())).catch((e) => e);
        expect(error.message).toBe("WebGL lost");
        expect(order).toEqual(["ready"]);
        expect(p.shots()).toEqual([]);
        expect(p.fails()).toEqual([
            {
                id: "a--one",
                modes: ["light", "dark"],
                reason: "WebGL lost",
                chromatic: {},
                console: ["error: WebGL lost: context"],
            },
        ]);
    });

    it("renders a changed picture again in its own hook and passes when the second shot agrees", async () => {
        p = page({ shots: [{ again: true }, {}, { status: "changed" }] });
        p.plan = { modes: [{ name: "light" }, { name: "dark", globals: { colorScheme: "dark" } }] };
        const RealDate = globalThis.Date;
        await p.beforeEach();
        const s = story();
        await p.afterEach(contextOf(s));
        expect(globalThis.Date).toBe(RealDate);
        expect(p.shots().map((x) => x.mode)).toEqual(["light", "dark", "light"]);
        // The confirming render of the first mode is a fresh render with the story's own globals.
        expect(s.runs).toEqual([{ globals: { colorScheme: "dark" } }, undefined]);
    });

    it("fails a story whose two renders drew different pictures, naming the modes", async () => {
        p = page({ shots: [{ again: true }, { again: true }, { status: "unstable" }, { flaky: true }] });
        p.plan = { modes: [{ name: null }, { name: "dark", globals: { colorScheme: "dark" } }] };
        await p.beforeEach();
        await expect(p.afterEach(contextOf(story()))).rejects.toThrow(
            "visual-review: a--one is unstable (two renders drew different pictures): a--one, dark",
        );
    });

    it("records the modes left as failed when the confirming render throws", async () => {
        p = page({ shots: [{ again: true }, { again: true }, {}] });
        p.plan = { modes: [{ name: "light" }, { name: "dark", globals: { colorScheme: "dark" } }] };
        await p.beforeEach();
        const shots = p.calls;
        const s = story();
        let n = 0;
        s.run = async () => {
            n += 1;
            if (n === 3) {
                throw new Error("render broke");
            }
        };
        await expect(p.afterEach(contextOf(s))).rejects.toThrow("render broke");
        expect(p.fails()).toEqual([
            { id: "a--one", modes: ["dark"], reason: "render broke", chromatic: {}, console: [] },
        ]);
        expect(shots.filter(([c]) => c === "visualShot")).toHaveLength(3);
    });

    it("records the modes left as failed when a shot throws", async () => {
        p = page({ shots: [{}, new Error("no page")] });
        p.plan = { modes: [{ name: "a" }, { name: "b", globals: { colorScheme: "dark" } }, { name: "c" }] };
        await p.beforeEach();
        await expect(p.afterEach(contextOf(story()))).rejects.toThrow("no page");
        expect(p.fails().map((f) => [f.modes, f.reason])).toEqual([[["b", "c"], "no page"]]);
    });

    it("keeps a Date the story put in place of the clock", async () => {
        p = page();
        await p.beforeEach();
        class StoryDate extends Date {}
        globalThis.Date = StoryDate;
        await p.afterEach(contextOf(story()));
        expect(globalThis.Date).toBe(StoryDate);
    });

    it("stops a hook that outlived its test before it shoots into the next story's test (#3740)", async () => {
        p = page();
        p.plan = { modes: [{ name: "light" }, { name: "dark", globals: { colorScheme: "dark" } }] };
        await p.beforeEach();
        const g = gate();
        const s = story({ run: g.wait });
        const late = p.afterEach(contextOf(s));
        // The next test starts while the old hook still waits on its render.
        await g.started;
        const next = p.beforeEach();
        g.release();
        await Promise.all([late, next]);
        expect(p.shots().map((x) => x.mode)).toEqual(["light"]);
        expect(p.fails()).toEqual([]);
    });

    it("stops a stale hook without recording a failure when its render throws", async () => {
        p = page();
        p.plan = { modes: [{ name: "light" }, { name: "dark", globals: { colorScheme: "dark" } }] };
        await p.beforeEach();
        const g = gate();
        const s = story({
            run: async () => {
                await g.wait();
                throw new Error("late");
            },
        });
        const late = p.afterEach(contextOf(s));
        await g.started;
        const next = p.beforeEach();
        g.release();
        await Promise.all([late, next]);
        expect(p.fails()).toEqual([]);
    });

    it("stops a stale confirming hook before it renders or shoots", async () => {
        p = page({ shots: [{ again: true }, { again: true }] });
        p.plan = { modes: [{ name: "light" }, { name: "dark", globals: { colorScheme: "dark" } }] };
        await p.beforeEach();
        const g = gate();
        let n = 0;
        const s = story({
            run: async () => {
                n += 1;
                if (n === 2) {
                    await g.wait();
                }
            },
        });
        const late = p.afterEach(contextOf(s));
        // The confirming hook's first render (the second render in all) is waiting.
        await g.started;
        const next = p.beforeEach();
        g.release();
        await Promise.all([late, next]);
        expect(p.shots().map((x) => x.mode)).toEqual(["light", "dark"]);
    });
});
