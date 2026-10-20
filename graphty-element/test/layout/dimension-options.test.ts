/**
 * Which dimension a layout is computed in, given the caller's options and the graph's 2D/3D mode.
 *
 * In 3D the caller may choose (`dim: 2` lays a 3D view out flat). In 2D the layout is always
 * computed in 2D: a caller's `dim: 3` would otherwise be a 3D drawing with its Z dropped onto the
 * plane, its nodes overlapping. The replaced value is returned so the element can report it as
 * `W_DIMENSION_OVERRIDDEN`.
 */
import "../../src/layout";

import { afterEach, assert, describe, it } from "vitest";

import type { LayoutWarningEvent } from "../../src/events";
import { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";
import { DataManager } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { LayoutManager, layoutManagerInternals, withDimensionOptions } from "../../src/managers/LayoutManager";
import { Styles } from "../../src/Styles";

describe("withDimensionOptions", () => {
    it("in 2D replaces the caller's dim: 3 with dim: 2 and reports it", () => {
        const resolved = withDimensionOptions({ dim: 3, seed: 1 }, { dim: 2 }, 2);
        assert.deepEqual(resolved.options, { dim: 2, seed: 1 });
        assert.deepEqual(resolved.overridden, { requested: { dim: 3 }, used: { dim: 2 } });
    });

    it("in 3D keeps the caller's dim: 2 and reports nothing", () => {
        const resolved = withDimensionOptions({ dim: 2 }, { dim: 3 }, 3);
        assert.deepEqual(resolved.options, { dim: 2 });
        assert.isUndefined(resolved.overridden);
    });

    it("follows the mode when the caller sets no dim", () => {
        assert.deepEqual(withDimensionOptions({}, { dim: 2 }, 2), { options: { dim: 2 } });
        assert.deepEqual(withDimensionOptions({}, { dim: 3 }, 3), { options: { dim: 3 } });
    });

    it("reports nothing when the caller's value is the one the mode uses", () => {
        assert.deepEqual(withDimensionOptions({ dim: 2 }, { dim: 2 }, 2), { options: { dim: 2 } });
    });

    it("adds nothing for an engine that declares no dimension options", () => {
        assert.deepEqual(withDimensionOptions({ dim: 3 }, null, 2), { options: { dim: 3 } });
        assert.deepEqual(withDimensionOptions({ dim: 3 }, {}, 2), { options: { dim: 3 } });
    });
});

describe("the layout manager computes a 2D view's layout in 2D", () => {
    const managers: LayoutManager[] = [];

    afterEach(() => {
        for (const manager of managers.splice(0)) {
            manager.dispose();
        }
    });

    /**
     * A layout manager over an empty graph, and the warnings it emits.
     * @returns The manager and the warnings so far.
     */
    function createManager(): { manager: LayoutManager; warnings: LayoutWarningEvent[] } {
        const styles = Styles.default();
        const eventManager = new EventManager();
        const manager = new LayoutManager(eventManager, new DataManager(eventManager, styles), styles);
        managers.push(manager);
        const warnings: LayoutWarningEvent[] = [];
        eventManager.addListener("layout-warning", (event) => {
            warnings.push(event as LayoutWarningEvent);
        });
        return { manager, warnings };
    }

    /**
     * The dimension the force engine's simulation was built in.
     * @param manager - The manager.
     * @returns 2 or 3.
     */
    function builtDimension(manager: LayoutManager): number {
        const engine = manager.layoutEngine;
        assert.instanceOf(engine, NGraphEngine);
        return engine.ngraphLayout.simulator.settings.dimensions;
    }

    it("rebuilds a 3D force layout with dim: 3 in 2D on the switch to 2D, and in 3D again on the way back", async () => {
        const { manager, warnings } = createManager();
        const force = { id: "force", engine: "ngraph", options: { dim: 3 }, dimension: "3d" } as const;

        await layoutManagerInternals.apply(manager, force, { restoring: false });
        assert.strictEqual(builtDimension(manager), 3);
        assert.lengthOf(warnings, 0);

        await layoutManagerInternals.apply(manager, { ...force, dimension: "2d" }, { restoring: false });
        assert.strictEqual(builtDimension(manager), 2, "a 2D view draws a 2D layout");
        assert.strictEqual(manager.dimension, 2);
        assert.deepEqual(
            warnings.map((w) => [w.code, w.params]),
            [["W_DIMENSION_OVERRIDDEN", { requested: { dim: 3 }, used: { dim: 2 } }]],
        );

        await layoutManagerInternals.apply(manager, { ...force, dimension: "3d" }, { restoring: false });
        assert.strictEqual(builtDimension(manager), 3, "back in 3D the caller's dim: 3 holds again");
        assert.lengthOf(warnings, 1);
    });

    it("keeps a caller's dim: 2 in 3D, with no warning", async () => {
        const { manager, warnings } = createManager();
        const flat = { id: "force", engine: "ngraph", options: { dim: 2 }, dimension: "3d" } as const;

        await layoutManagerInternals.apply(manager, flat, { restoring: false });

        assert.strictEqual(builtDimension(manager), 2);
        assert.lengthOf(warnings, 0);
    });
});
