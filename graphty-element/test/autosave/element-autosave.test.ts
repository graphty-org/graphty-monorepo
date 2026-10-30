/**
 * Autosave on the page, without a browser: the key an element resolves, and the persistent-storage
 * request `persist: true` makes. The page is an {@link AutosaveEnvironment} the test owns (event
 * targets for the window and the document, a storage manager that counts its calls, a clock and
 * locks); the session, the writer and the store are real.
 */

import { assert, describe, it } from "vitest";

import {
    type AutosaveEnvironment,
    ElementAutosave,
    type PageLocks,
    resolveAutosaveKey,
} from "../../src/autosave/elementAutosave";
import { memoryAutosaveStore } from "../../src/autosave/memoryStore";
import type { AutosaveStore } from "../../src/autosave/types";
import { type GraphtyError, isGraphtyError } from "../../src/errors/GraphtyError";
import { baseSession } from "../helpers/project-session";
import { FakeClock, FakeLocks } from "./fakes";

describe("the autosave key", () => {
    const base = { attribute: "", id: "", location: "/page?x=1#top", bareWithoutId: 1 };

    it("autosaveOptions.key wins over the attribute", () => {
        assert.strictEqual(
            resolveAutosaveKey({ ...base, optionKey: "acme.option", attribute: "acme.attr" }),
            "acme.option",
        );
    });

    it("the attribute's value is the key when no option names one", () => {
        assert.strictEqual(resolveAutosaveKey({ ...base, optionKey: undefined, attribute: "acme.attr" }), "acme.attr");
        assert.strictEqual(resolveAutosaveKey({ ...base, optionKey: "", attribute: "acme.attr" }), "acme.attr");
    });

    it("a bare attribute keys by the page's address and the element's id", () => {
        assert.strictEqual(resolveAutosaveKey({ ...base, optionKey: undefined, id: "graph" }), "/page?x=1#top#graph");
        assert.strictEqual(resolveAutosaveKey({ ...base, optionKey: undefined }), "/page?x=1#top#");
    });

    it("a bare attribute on several elements without an id is ambiguous, never keyed by position", () => {
        assert.deepStrictEqual(resolveAutosaveKey({ ...base, optionKey: undefined, bareWithoutId: 2 }), {
            code: "E_AUTOSAVE_KEY_AMBIGUOUS",
            params: { elements: 2 },
        });
        assert.strictEqual(
            resolveAutosaveKey({ ...base, optionKey: undefined, id: "mine", bareWithoutId: 2 }),
            "/page?x=1#top#mine",
        );
    });
});

/** A page the test owns, and what its storage manager was asked. */
function page(): { env: AutosaveEnvironment; persistCalls: () => number } {
    let persistCalls = 0;
    let persisted = false;
    const locks: PageLocks = Object.assign(new FakeLocks(), { wait: () => Promise.resolve() });
    const env: AutosaveEnvironment = {
        window: new EventTarget(),
        document: Object.assign(new EventTarget(), { visibilityState: "visible" }),
        storage: {
            persist: () => {
                persistCalls += 1;
                persisted = true;
                return Promise.resolve(true);
            },
            persisted: () => Promise.resolve(persisted),
            estimate: () => Promise.resolve({ usage: 1000, quota: 2 ** 40 }),
        },
        sessionStorage: () => undefined,
        locks,
        clock: new FakeClock(),
        userActivated: () => false,
        thirdParty: () => false,
        defaultStore: () => undefined,
    };
    return { env, persistCalls: () => persistCalls };
}

/**
 * Autosave started on a page, over a session holding a small graph.
 * @param env - The page.
 * @param store - The store.
 * @returns The element's autosave and its session.
 */
async function started(
    env: AutosaveEnvironment,
    store: AutosaveStore,
): Promise<{ autosave: ElementAutosave; session: Awaited<ReturnType<typeof baseSession>> }> {
    const session = await baseSession();
    const autosave = new ElementAutosave(() => undefined, env);
    await autosave.start({
        session,
        key: "test.persist",
        options: { persist: true, store },
        restore: "auto",
        pageConfig: {},
        reloadPage: () => Promise.resolve(),
    });
    return { autosave, session };
}

describe("persist: true", () => {
    it("asks for persistent storage once, after the first write that follows a user gesture", async () => {
        const { env, persistCalls } = page();
        const { autosave, session } = await started(env, memoryAutosaveStore());

        await session.config.set({ name: "Before any gesture" });
        await autosave.api.flush();
        assert.strictEqual(autosave.api.status.state, "saved");
        assert.strictEqual(persistCalls(), 0, "no gesture yet: nothing asked");

        env.window.dispatchEvent(new Event("pointerdown"));
        assert.strictEqual(persistCalls(), 0, "a gesture alone asks nothing: the write after it does");

        await session.config.set({ name: "After a gesture" });
        await autosave.api.flush();
        await autosave.api.ready;
        // The request runs after the commit's status change; let it settle.
        await Promise.resolve();
        assert.strictEqual(persistCalls(), 1);

        await session.config.set({ name: "Later" });
        await autosave.api.flush();
        await Promise.resolve();
        assert.strictEqual(persistCalls(), 1, "once per page load");
        autosave.depart();
    });

    it("is not asked for when the option is off, whatever the reader does", async () => {
        const { env, persistCalls } = page();
        const session = await baseSession();
        const autosave = new ElementAutosave(() => undefined, env);
        await autosave.start({
            session,
            key: "test.persist-off",
            options: { store: memoryAutosaveStore() },
            restore: "auto",
            pageConfig: {},
            reloadPage: () => Promise.resolve(),
        });
        env.window.dispatchEvent(new Event("keydown"));
        await session.config.set({ name: "Edited" });
        await autosave.api.flush();
        await Promise.resolve();
        assert.strictEqual(persistCalls(), 0);
        autosave.depart();
    });
});

describe("autosave off", () => {
    it("restore and remove refuse with a coded error, and the rest answer as empty", async () => {
        const { env } = page();
        const control = new ElementAutosave(() => undefined, env);
        control.off();
        assert.isNull(await control.api.ready);
        assert.strictEqual(control.api.status.state, "off");
        assert.deepStrictEqual(await control.api.list(), []);
        for (const call of [() => control.api.restore("any"), () => control.api.remove("any")]) {
            let refused: unknown = null;
            try {
                await call();
            } catch (error) {
                refused = error;
            }

            assert.isTrue(isGraphtyError(refused), "a GraphtyError");
            assert.strictEqual((refused as GraphtyError).code, "E_UNSUPPORTED");
            assert.deepStrictEqual((refused as GraphtyError).details, { reason: "autosave-off" });
        }
    });
});

describe("the ephemeral fact", () => {
    /**
     * The ephemeral fact autosave reports once started on a page.
     * @param change - What to change on the test's page.
     * @returns The fact.
     */
    async function ephemeral(change: (env: AutosaveEnvironment) => AutosaveEnvironment): Promise<string> {
        const { autosave } = await started(change(page().env), memoryAutosaveStore());
        const fact = autosave.api.status.ephemeral;
        autosave.depart();
        return fact;
    }

    it("is unknown on a normal profile whose quota is small, as on a small disk", async () => {
        const fact = await ephemeral((env) => ({
            ...env,
            storage: {
                ...env.storage,
                estimate: () => Promise.resolve({ usage: 1000, quota: 50 * 2 ** 20 }),
                getDirectory: () => Promise.resolve({} as FileSystemDirectoryHandle),
            },
        }));
        assert.strictEqual(fact, "unknown");
    });

    it("is likely where the origin private file system is refused (Safari's, Firefox's private windows)", async () => {
        const fact = await ephemeral((env) => ({
            ...env,
            storage: {
                ...env.storage,
                getDirectory: () => Promise.reject(new DOMException("denied", "SecurityError")),
            },
        }));
        assert.strictEqual(fact, "likely");
    });

    it("is likely in another site's frame", async () => {
        assert.strictEqual(await ephemeral((env) => ({ ...env, thirdParty: () => true })), "likely");
    });
});

describe("while the page is hidden", () => {
    it("writes a change made during a write right after it, with no timer (issue #3485)", async () => {
        const { env } = page();
        const clock = env.clock as FakeClock;
        const inner = memoryAutosaveStore();
        let held = false;
        let release: (() => void) | null = null;
        const store: AutosaveStore = {
            ...inner,
            commit: async (writes, options) => {
                if (held) {
                    held = false;
                    await new Promise<void>((resolve) => {
                        release = resolve;
                    });
                }

                return inner.commit(writes, options);
            },
        };
        let onSaved: (() => void) | null = null;
        const session = await baseSession();
        const autosave = new ElementAutosave((type, detail) => {
            if (type === "graphty-autosave-status" && (detail as { state: string }).state === "saved") {
                onSaved?.();
            }
        }, env);
        await autosave.start({
            session,
            key: "test.hidden",
            options: { store },
            restore: "auto",
            pageConfig: {},
            reloadPage: () => Promise.resolve(),
        });
        await session.config.set({ name: "Before hiding" });
        await autosave.api.flush();
        (env.document as { visibilityState: string }).visibilityState = "hidden";
        env.document.dispatchEvent(new Event("visibilitychange"));
        await autosave.api.flush();

        held = true;
        const firstWrite = new Promise<void>((resolve) => {
            const look = (): void => {
                if (release === null) {
                    queueMicrotask(look);
                } else {
                    resolve();
                }
            };
            look();
        });
        await session.config.set({ name: "While hidden" });
        await firstWrite;
        // A change that leaves the status as it was ("pending", the write in flight).
        autosave.api.stash("test.note", 1);
        // The write takes longer than the debounce, as on a loaded machine.
        const { fired } = clock;
        clock.advance(2000);
        assert.strictEqual(clock.fired, fired, "no debounce or maximum-wait timer was armed while hidden");
        const saved = new Promise<void>((resolve) => {
            onSaved = resolve;
        });
        (release as unknown as () => void)();
        await saved;
        assert.strictEqual(autosave.api.status.state, "saved");
        assert.deepStrictEqual(autosave.api.stashed("test.note"), 1);
        autosave.depart();
    });
});

describe("a remount", () => {
    it("finds an edit made while the page's own load was still running (issues #5038, #5039)", async () => {
        const { env } = page();
        const inner = memoryAutosaveStore();
        // Commits wait until the test opens them, as an IndexedDB commit is still running when an
        // element added again in the same task lists the key's entries.
        let open = (): void => undefined;
        const opened = new Promise<void>((resolve) => {
            open = resolve;
        });
        const store: AutosaveStore = {
            ...inner,
            commit: async (writes, options) => {
                await opened;
                return inner.commit(writes, options);
            },
        };
        const key = "test.remount-during-load";
        const startOn = async (session: Awaited<ReturnType<typeof baseSession>>): Promise<ElementAutosave> => {
            const autosave = new ElementAutosave(() => undefined, env);
            await autosave.start({
                session,
                key,
                options: { store },
                restore: "auto",
                pageConfig: {},
                reloadPage: () => Promise.resolve(),
            });
            return autosave;
        };

        const firstSession = await baseSession();
        const first = await startOn(firstSession);
        // The page's rows arrive as a load that has not settled when the reader edits: a large or a
        // busy page settles its load long after its rows are in, so the edit is held until then.
        let settle = (): void => undefined;
        void first.admit(
            { kind: "rows", nodes: [{ id: "a" }] },
            () =>
                new Promise<void>((resolve) => {
                    settle = resolve;
                }),
        );
        await firstSession.config.set({ name: "Edited while the load ran" });
        first.depart();
        settle();

        const secondSession = await baseSession();
        const second = startOn(secondSession);
        open();
        const restored = await (await second).api.ready;
        assert.isNotNull(restored, "the remount waited for the departed element's final write");
        assert.strictEqual(secondSession.project.name, "Edited while the load ran");
        (await second).depart();
    });
});
