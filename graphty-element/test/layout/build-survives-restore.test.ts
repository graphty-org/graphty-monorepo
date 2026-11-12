/**
 * A layout build that an arrangement restore lands on is started over, never failed (issue #5613).
 *
 * Another command's rollback -- a queued layout that a `setLayout` overtook -- restores the
 * arrangement through the `arrangement` hook. Whether that landed before or after the new build
 * began depended on microtask ordering, and landing after made the `setLayout` reject with
 * "The layout was cancelled or replaced before it finished building." Here the build is held in
 * its engine's `init()` while the restore lands, so the ordering that failed is the one tested.
 */
import "../../src/layout";

import { afterEach, assert, describe, it } from "vitest";

import type { AuthoredLayoutDescriptor } from "../../src/catalog/types";
import { LayoutEngine } from "../../src/layout/LayoutEngine";
import { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";
import { DataManager } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { LayoutManager, layoutManagerInternals } from "../../src/managers/LayoutManager";
import { Styles } from "../../src/Styles";

/** Each `init()` waits for the test to open the gate, and says it has started. */
const gate = { started: (): void => undefined, open: Promise.resolve() };

class HeldEngine extends NGraphEngine {
    static override type = "test-held-init";
    static override descriptor: AuthoredLayoutDescriptor = {
        id: "test-held-init",
        plainName: "Held force",
        technicalName: "force layout whose set-up waits for the test",
        description: "The force layout, with an init() the test holds open.",
        family: "force",
        kind: "live",
        maxDimensions: 3,
        sizeRating: "any",
        structuralInputs: [],
        engine: "test-held-init",
        options: [],
    };

    override async init(): Promise<void> {
        gate.started();
        await gate.open;
        return super.init();
    }
}

LayoutEngine.register(HeldEngine);

const HELD = { id: "test-held-init", engine: "test-held-init", options: {}, dimension: "3d" } as const;

describe("a layout build an arrangement restore lands on", () => {
    const managers: LayoutManager[] = [];

    afterEach(() => {
        for (const manager of managers.splice(0)) {
            manager.dispose();
        }
    });

    /**
     * A layout manager over an empty graph.
     * @returns The manager.
     */
    function createManager(): LayoutManager {
        const styles = Styles.default();
        const eventManager = new EventManager();
        const manager = new LayoutManager(eventManager, new DataManager(eventManager, styles), styles);
        managers.push(manager);
        return manager;
    }

    /**
     * Hold the next `init()` until the returned function is called.
     * @returns Settles once `init()` has started; resolves to the function that lets it go on.
     */
    function holdInit(): Promise<() => void> {
        let release = (): void => undefined;
        gate.open = new Promise<void>((resolve) => {
            release = resolve;
        });
        return new Promise((resolve) => {
            gate.started = () => {
                resolve(release);
            };
        });
    }

    it("is built over the restored arrangement instead of rejecting", async () => {
        const manager = createManager();
        const held = holdInit();
        const built = layoutManagerInternals.apply(manager, { ...HELD, options: {} }, { restoring: false });
        const release = await held;

        manager.loadArrangement(true);
        gate.started = () => undefined;
        gate.open = Promise.resolve();
        release();

        await built;
        assert.instanceOf(manager.layoutEngine, HeldEngine, "the layout asked for is the one built");
    });

    it("still stops when its own command is cancelled", async () => {
        const manager = createManager();
        const held = holdInit();
        const controller = new AbortController();
        const built = layoutManagerInternals.apply(
            manager,
            { ...HELD, options: {} },
            { restoring: false, signal: controller.signal },
        );
        const release = await held;

        controller.abort();
        manager.loadArrangement(true);
        release();

        const error = await built.then(
            () => null,
            (e: unknown) => e as Error,
        );
        assert.strictEqual(error?.name, "AbortError");
        assert.notInstanceOf(manager.layoutEngine, HeldEngine);
    });
});
