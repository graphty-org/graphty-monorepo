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
