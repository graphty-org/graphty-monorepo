/**
 * `<graphty-element autosave>` in a real page, on the browser's own IndexedDB and Web Locks: an
 * element removed and added again gets its work back with no extra entry, two keys never mix, a
 * bare `autosave` on two elements without an id refuses, the `beforeunload` guard exists only
 * while it should, a stash survives a remount, `requestPersistence()` reports the browser's answer,
 * and the events are typed and quiet at connect.
 *
 * Runs in Chromium through the "browser" project and in Firefox and WebKit through the
 * "autosave-engines" project (vitest.config.ts). Every test uses keys of its own.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { AutosaveAtRisk, AutosaveAvailable, AutosaveRestored, AutosaveStatus, Graphty } from "../../../index.js";
import { listAutosaves } from "../../../src/autosave/elementAutosave";
import { memoryAutosaveStore } from "../../../src/autosave/memoryStore";
import type { AutosaveStore } from "../../../src/autosave/types";
import { write } from "../../autosave/store-contract";

const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }];
const EDGES = [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
];

const cleanups: (() => void)[] = [];

/** Every at-risk fact in this page: it fires once per page load, whichever element sends it. */
const pageAtRisk: AutosaveAtRisk[] = [];
document.addEventListener("graphty-autosave-at-risk", (event) => pageAtRisk.push(event.detail));

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A fresh key, so no test sees another's entries.
 * @param name - What the test calls it.
 * @returns The key.
 */
function keyFor(name: string): string {
    return `test.autosave.${name}.${crypto.randomUUID()}`;
}

/**
 * Add a graph to the page the way a page declares one: the attribute first, then its rows.
 * @param autosave - The `autosave` attribute's value; null for none.
 * @param configure - Anything else to set before it is added.
 * @returns The element.
 */
function mount(autosave: string | null, configure?: (element: Graphty) => void): Graphty {
    const element = document.createElement("graphty-element");
    if (autosave !== null) {
        element.setAttribute("autosave", autosave);
    }

    element.style.display = "block";
    element.style.width = "300px";
    element.style.height = "200px";
    // A layout that does not move, so no layout coming to rest writes positions behind a test's back.
    element.layout = "fixed";
    configure?.(element);
    element.nodeData = NODES;
    element.edgeData = EDGES;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    return element;
}

/**
 * Whether the page would ask before closing now: a `beforeunload` listener cancelled the event.
 * @returns True when one did.
 */
function guardArmed(): boolean {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
}

/**
 * Wait until a status condition holds, reading the status after every status event.
 * @param element - The element.
 * @param condition - The condition.
 */
async function until(element: Graphty, condition: (status: AutosaveStatus) => boolean): Promise<void> {
    while (!condition(element.autosaver.status)) {
        await new Promise<void>((resolve) => {
            element.addEventListener("graphty-autosave-status", () => resolve(), { once: true });
        });
    }
}

/**
 * Wait, a frame at a time, until the page's own rows are in the graph.
 * @param element - The element.
 */
async function loaded(element: Graphty): Promise<void> {
    await element.autosaver.ready;
    for (let frame = 0; frame < 600 && element.session.data.snapshot().edgeCount < EDGES.length; frame++) {
        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve());
        });
    }

    assert.strictEqual(element.session.data.snapshot().nodeCount, NODES.length, "the page's rows loaded");
    assert.strictEqual(element.session.data.snapshot().edgeCount, EDGES.length, "the page's rows loaded");
}

/**
 * Change the work, as one committed step, once the page's own rows are in.
 * @param element - The element.
 * @param name - The project's new name.
 */
async function edit(element: Graphty, name: string): Promise<void> {
    await loaded(element);
    await element.session.config.set({ name });
}

describe("unmount and remount", () => {
    it.each(["the same task", "a later task"])(
        "an element added again with the same key in %s restores the work, with no extra entry",
        async (when) => {
            const key = keyFor("remount");
            const first = mount(key);
            await edit(first, "Edited before the remount");
            first.remove();
            if (when === "a later task") {
                await new Promise<void>((resolve) => {
                    requestAnimationFrame(() => resolve());
                });
            }

            const second = mount(key);
            const restored = await second.autosaver.ready;
            assert.isNotNull(restored, "the work came back");
            assert.strictEqual(second.session.project.name, "Edited before the remount");
            assert.isTrue(second.session.project.dirty, "never saved to a file, so still unsaved");
            assert.strictEqual(second.session.data.snapshot().nodeCount, 3);

            await second.autosaver.flush();
            const entries = await second.autosaver.list();
            assert.deepStrictEqual(
                entries.map((entry) => entry.id),
                [restored.entry.id],
                "the page's own rows were absorbed: one entry, the restored one",
            );
            assert.strictEqual(second.autosaver.status.entry, restored.entry.id);
        },
    );

    it("a stash written just before flush() is read back by the remounted element", async () => {
        const key = keyFor("stash");
        const first = mount(key);
        await loaded(first);
        first.autosaver.stash("org.example.draft", { text: "half a sentence" });
        await first.autosaver.flush();
        first.remove();

        const second = mount(key);
        await second.autosaver.ready;
        assert.deepStrictEqual(second.autosaver.stashed("org.example.draft"), { text: "half a sentence" });
    });
});

describe("keys", () => {
    it("two elements with different keys in one page never mix", async () => {
        const [one, two] = [keyFor("one"), keyFor("two")];
        const first = mount(one);
        const second = mount(two);
        await edit(first, "One");
        await edit(second, "Two");
        await Promise.all([first.autosaver.flush(), second.autosaver.flush()]);

        const [listedOne, listedTwo] = await Promise.all([first.autosaver.list(), second.autosaver.list()]);
        assert.deepStrictEqual(
            listedOne.map((entry) => [entry.key, entry.name]),
            [[one, "One"]],
        );
        assert.deepStrictEqual(
            listedTwo.map((entry) => [entry.key, entry.name]),
            [[two, "Two"]],
        );

        first.remove();
        second.remove();
        const again = [mount(two), mount(one)];
        await Promise.all(again.map((element) => element.autosaver.ready));
        assert.deepStrictEqual(
            again.map((element) => element.session.project.name),
            ["Two", "One"],
        );
    });

    it("a bare autosave on two elements without an id reports E_AUTOSAVE_KEY_AMBIGUOUS", async () => {
        const elements = [mount(""), mount("")];
        await Promise.all(elements.map((element) => element.autosaver.ready));
        for (const element of elements) {
            assert.strictEqual(element.autosaver.status.state, "off");
            assert.deepStrictEqual(element.autosaver.status.problem, {
                code: "E_AUTOSAVE_KEY_AMBIGUOUS",
                params: { elements: 2 },
            });
        }

        for (const element of elements) {
            await loaded(element);
        }
    });
});

/**
 * A store whose commits wait until the test opens it. The first write carries the data, which is
 * written when the page goes idle, and an idle page (Firefox, WebKit) would otherwise commit it
 * before the test looks at the pending state.
 * @returns The store, and the function that lets its commits through.
 */
function heldStore(): { store: AutosaveStore; open: () => void } {
    const memory = memoryAutosaveStore();
    let open = (): void => undefined;
    const opened = new Promise<void>((resolve) => {
        open = resolve;
    });
    const store: AutosaveStore = {
        list: (key) => memory.list(key),
        read: (id) => memory.read(id),
        remove: (id) => memory.remove(id),
        commit: async (writes, options) => {
            await opened;
            return memory.commit(writes, options);
        },
    };
    return { store, open };
}

describe("the unload guard", () => {
    it("pending: a beforeunload listener exists only while a write is outstanding or failing", async () => {
        assert.isFalse(guardArmed(), "no listener before any element");
        const { store: held, open } = heldStore();
        const element = mount(keyFor("guard"), (each) => {
            each.autosaveOptions = { store: held };
        });
        await loaded(element);
        assert.isFalse(guardArmed(), "nothing to write: no listener");

        await edit(element, "Edited");
        assert.strictEqual(element.autosaver.status.state, "pending");
        assert.isTrue(guardArmed(), "a write is outstanding");

        open();
        await element.autosaver.flush();
        assert.strictEqual(element.autosaver.status.state, "saved");
        assert.isFalse(guardArmed(), "committed: the listener is gone");
    });

    it("pending: a failing store keeps the listener", async () => {
        const memory = memoryAutosaveStore();
        const failing: AutosaveStore = {
            list: (key) => memory.list(key),
            read: (id) => memory.read(id),
            remove: (id) => memory.remove(id),
            commit: () => Promise.reject(new DOMException("disk on fire", "DataError")),
        };
        const element = mount(keyFor("guard-failing"), (each) => {
            each.autosaveOptions = { store: failing };
        });
        await edit(element, "Edited");
        await element.autosaver.flush();
        assert.strictEqual(element.autosaver.status.state, "failing");
        assert.strictEqual(element.autosaver.status.problem?.code, "E_AUTOSAVE_FAILED");
        assert.isTrue(guardArmed());
    });

    it("unexported: the listener exists while the work was never saved to a file", async () => {
        const element = mount(keyFor("guard-unexported"), (each) => {
            each.autosaveOptions = { unloadGuard: "unexported" };
        });
        await element.autosaver.ready;
        assert.isFalse(guardArmed());

        await edit(element, "Edited");
        await element.autosaver.flush();
        assert.strictEqual(element.autosaver.status.state, "saved");
        assert.isTrue(guardArmed(), "saved in the browser, but not in a file");

        await element.session.project.save();
        await until(element, (status) => !status.unexported);
        assert.isFalse(guardArmed(), "saved to a file: no listener");
    });

    it("off: never a listener", async () => {
        const { store: held, open } = heldStore();
        cleanups.push(open);
        const element = mount(keyFor("guard-off"), (each) => {
            each.autosaveOptions = { store: held, unloadGuard: "off" };
        });
        await edit(element, "Edited");
        assert.strictEqual(element.autosaver.status.state, "pending");
        assert.isFalse(guardArmed());
    });
});

describe("persistent storage", () => {
    it("requestPersistence() and status.persisted report the browser's answer", async () => {
        const element = mount(keyFor("persist"));
        await element.autosaver.ready;
        const answer = await element.autosaver.requestPersistence();
        // Some engines have no storage manager at all (Playwright's WebKit on Linux): no answer.
        const storage = navigator.storage as StorageManager | undefined;
        const browser = storage === undefined ? null : await storage.persisted();
        assert.strictEqual(answer, browser === true);
        assert.strictEqual(element.autosaver.status.persisted, browser);
    });
});

describe("events", () => {
    it("carry typed details, and none fires at connect", async () => {
        const key = keyFor("events");
        const statuses: AutosaveStatus[] = [];
        const restored: AutosaveRestored[] = [];
        const available: AutosaveAvailable[] = [];
        const atRisk: AutosaveAtRisk[] = [];
        const listen = (element: Graphty): void => {
            element.addEventListener("graphty-autosave-status", (event) => statuses.push(event.detail));
            element.addEventListener("graphty-autosave-restored", (event) => restored.push(event.detail));
            element.addEventListener("graphty-autosave-available", (event) => available.push(event.detail));
            element.addEventListener("graphty-autosave-at-risk", (event) => atRisk.push(event.detail));
        };

        const first = mount(key, listen);
        await loaded(first);
        assert.deepStrictEqual([statuses, restored, available, atRisk], [[], [], [], []], "nothing at connect");
        assert.strictEqual(first.autosaver.status.state, "saved");

        await edit(first, "Edited");
        await first.autosaver.flush();
        // One event per change of the status: the state, and anything else in it (`unexported`).
        assert.strictEqual(statuses[0]?.state, "pending");
        assert.strictEqual(statuses.at(-1)?.state, "saved");
        assert.includeMembers(["pending", "saved"], [...new Set(statuses.map((status) => status.state))]);
        statuses.slice(1).forEach((status, at) => {
            assert.notDeepEqual(status, statuses[at], "no event repeats the status before it");
        });
        assert.strictEqual(statuses.at(-1)?.revision, 1);
        // Earlier tests in this page made unsaved work too: the fact fired at most once for all of
        // them, and only while it held. (A test above may have been granted persistence since.)
        assert.isAtMost(pageAtRisk.length, 1, "the at-risk fact fires once per page load");
        const [fact] = pageAtRisk;
        if (fact === undefined) {
            const { status } = first.autosaver;
            assert.isTrue(status.persisted !== false && status.ephemeral !== "likely", "it holds, so it fired");
        } else {
            assert.strictEqual(fact.code, "W_AUTOSAVE_ORIGIN_EPHEMERAL");
            assert.isTrue(fact.params.persisted === false || fact.params.ephemeral === "likely");
            assert.isTrue(fact.params.unexported);
        }

        first.remove();
        statuses.length = 0;
        const second = mount(key, listen);
        const back = await second.autosaver.ready;
        assert.strictEqual(restored.length, 1);
        assert.strictEqual(restored[0]?.entry.id, back?.entry.id);
        assert.strictEqual(restored[0]?.revision, 1);
        assert.deepStrictEqual(statuses, [], "a restore at connect fires no status event");
    });
});

describe("this tab's own entry", () => {
    it("two lookups at once both report the entry this tab's session storage names as its own", async () => {
        const key = keyFor("own-twice");
        const store = memoryAutosaveStore();
        await store.commit([write("mine", key, 0, { rest: "mine" }, { dirty: true })]);
        sessionStorage.setItem(`graphty-autosave:own:${key}`, "mine");
        cleanups.push(() => {
            sessionStorage.removeItem(`graphty-autosave:own:${key}`);
        });

        // A React effect that runs twice on mount lists twice before either has finished.
        const [first, second] = await Promise.all([listAutosaves(key, { store }), listAutosaves(key, { store })]);
        for (const listed of [first, second]) {
            assert.deepEqual(
                listed.map(({ id, own, live }) => ({ id, own, live })),
                [{ id: "mine", own: true, live: false }],
            );
        }
    });
});

describe("waiting for the picture", () => {
    it("waitForStableFrame and waitForSettled wait for the page's rows held behind the restore", async () => {
        // The restore's listing waits until the test lets it through, as a slow IndexedDB would.
        const memory = memoryAutosaveStore();
        let letListingThrough = (): void => undefined;
        const listingOpen = new Promise<void>((resolve) => {
            letListingThrough = resolve;
        });
        const store: AutosaveStore = {
            list: async (key) => {
                await listingOpen;
                return memory.list(key);
            },
            read: (id) => memory.read(id),
            remove: (id) => memory.remove(id),
            commit: (writes, options) => memory.commit(writes, options),
        };
        const element = mount(keyFor("stable"), (each) => {
            each.autosaveOptions = { store };
        });

        const nodesAt: { stable?: number; settled?: number } = {};
        const waits = Promise.all([
            element.waitForStableFrame().then(() => {
                nodesAt.stable = element.session.data.snapshot().nodeCount;
            }),
            element.waitForSettled().then(() => {
                nodesAt.settled = element.session.data.snapshot().nodeCount;
            }),
        ]);

        // The empty canvas is drawn and stable while the restore is still undecided.
        for (let frame = 0; frame < 600 && !element.isFrameStable; frame++) {
            await new Promise<void>((resolve) => {
                requestAnimationFrame(() => resolve());
            });
        }
        assert.isTrue(element.isFrameStable, "the empty canvas reached a stable frame");
        assert.isTrue(element.autosaver.status.state !== "off", "autosave is on");

        letListingThrough();
        await waits;
        assert.deepStrictEqual(nodesAt, { stable: NODES.length, settled: NODES.length }, "the waits saw the rows");
    });
});
