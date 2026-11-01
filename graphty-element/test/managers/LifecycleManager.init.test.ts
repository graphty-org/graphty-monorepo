import { assert, describe, it } from "vitest";

import type { EventManager } from "../../src/managers/EventManager";
import type { Manager } from "../../src/managers/interfaces";
import { LifecycleManager } from "../../src/managers/LifecycleManager";

/** What the stand-in managers and event manager saw, in order. */
type Log = string[];

/**
 * A stand-in event manager that records what it was asked to emit.
 * @param log - Where to record.
 * @returns The stand-in.
 */
function events(log: Log): EventManager {
    return {
        emit: (name: string, data: { managerName?: string }) => {
            log.push(`emit ${name}${data.managerName === undefined ? "" : ` ${data.managerName}`}`);
        },
        emitGraphError: (_graph: unknown, error: Error, context: string) => {
            log.push(`error ${context} ${error.message}`);
        },
    } as unknown as EventManager;
}

/**
 * A stand-in manager that records its init and dispose.
 * @param name - Its name.
 * @param log - Where to record.
 * @param init - What its init does after recording, if anything.
 * @returns The stand-in.
 */
function manager(name: string, log: Log, init?: () => void): Manager {
    return {
        init: () => {
            log.push(`init ${name}`);
            init?.();
            return Promise.resolve();
        },
        dispose: () => {
            log.push(`dispose ${name}`);
        },
    };
}

describe("LifecycleManager.init", () => {
    it("initializes every manager in order, then reports the whole lifecycle initialized", async () => {
        const log: Log = [];
        const managers = new Map([
            ["a", manager("a", log)],
            ["b", manager("b", log)],
        ]);
        await new LifecycleManager(managers, events(log), ["b", "a"]).init();
        assert.deepEqual(log, [
            "init b",
            "emit manager-initialized b",
            "init a",
            "emit manager-initialized a",
            "emit lifecycle-initialized",
        ]);
    });

    it("refuses a name with no manager, reporting it as an init error", async () => {
        const log: Log = [];
        const lifecycle = new LifecycleManager(new Map([["a", manager("a", log)]]), events(log), ["a", "missing"]);
        const failure = await lifecycle.init().then(
            () => null,
            (error: unknown) => error as Error,
        );
        assert.strictEqual(failure?.message, "Manager 'missing' not found in manager map");
        assert.deepEqual(log, [
            "init a",
            "emit manager-initialized a",
            "error init Manager 'missing' not found in manager map",
        ]);
    });

    it("disposes the managers before a failing one, in reverse, and wraps the failure", async () => {
        const log: Log = [];
        const managers = new Map([
            ["a", manager("a", log)],
            ["b", manager("b", log)],
            [
                "c",
                manager("c", log, () => {
                    throw new Error("boom");
                }),
            ],
            ["d", manager("d", log)],
        ]);
        const failure = await new LifecycleManager(managers, events(log), ["a", "b", "c", "d"]).init().then(
            () => null,
            (error: unknown) => error as Error,
        );
        assert.strictEqual(failure?.message, "Failed to initialize manager 'c': boom");
        assert.deepEqual(log, [
            "init a",
            "emit manager-initialized a",
            "init b",
            "emit manager-initialized b",
            "init c",
            "dispose b",
            "dispose a",
            "error init Failed to initialize manager 'c': boom",
        ]);
    });

    it("stops after the manager during whose init the lifecycle was disposed, and can init again", async () => {
        const log: Log = [];
        let lifecycle: LifecycleManager | null = null;
        const managers = new Map([
            ["a", manager("a", log, () => lifecycle?.dispose())],
            ["b", manager("b", log)],
        ]);
        lifecycle = new LifecycleManager(managers, events(log), ["a", "b"]);
        await lifecycle.init();
        assert.deepEqual(log, ["init a", "dispose b", "dispose a", "emit lifecycle-disposed"]);

        log.length = 0;
        await lifecycle.init();
        assert.deepEqual(
            log,
            ["init a", "dispose b", "dispose a", "emit lifecycle-disposed"],
            "init cleared the disposed flag and ran again",
        );
    });

    it("keeps a registered event manager alive until the failure and the disposal are reported", async () => {
        const log: Log = [];
        const eventManager = events(log);
        Object.assign(eventManager, { init: () => Promise.resolve(), dispose: () => log.push("dispose event") });
        const managers = new Map<string, Manager>([
            ["event", eventManager],
            ["a", manager("a", log)],
            [
                "b",
                manager("b", log, () => {
                    throw new Error("boom");
                }),
            ],
        ]);
        const lifecycle = new LifecycleManager(managers, eventManager, ["event", "a", "b"]);
        await lifecycle.init().catch(() => undefined);
        assert.strictEqual(log.at(-1), "error init Failed to initialize manager 'b': boom");
        assert.notInclude(log, "dispose event", "the failure is reported through it");

        log.length = 0;
        lifecycle.dispose();
        assert.deepEqual(log, ["dispose b", "dispose a", "emit lifecycle-disposed", "dispose event"]);
    });
});
