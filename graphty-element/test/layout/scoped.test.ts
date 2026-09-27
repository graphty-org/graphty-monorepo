/**
 * @file Layouts over a set (design/sets/sets-design.md section 11): which engines accept a scope,
 * how the catalogue learns it, and the hold -- the nodes outside the scope, which no layout step
 * may move and which each live engine also fixes in its own state.
 *
 * The simulation bridge is compared against a hand-pinned run over a real graph in
 * `test/browser/sets/LayoutManager.scope.test.ts`, because it cannot run without one.
 */
// Registers the element's engines, which is what `setLayout` looks them up in.
import "../../src/layout/index";

import { NullEngine, Scene } from "@babylonjs/core";
import { makeMask, maskSet, type NodeMask } from "@graphty/graph-format";
import { afterEach, assert, describe, expectTypeOf, it } from "vitest";

import { registeredLayoutDescriptors } from "../../src/catalog/layoutRegistry";
import { layoutDescriptor } from "../../src/catalog/layouts";
import type { AuthoredLayoutDescriptor, Scope } from "../../src/catalog/types";
import { ElementPositions } from "../../src/data/positions";
import type { Edge } from "../../src/Edge";
import { isGraphtyError } from "../../src/errors";
import { CircularLayout } from "../../src/layout/CircularLayoutEngine";
import { D3GraphEngine } from "../../src/layout/D3GraphLayoutEngine";
import { LayoutEngine, type Position } from "../../src/layout/LayoutEngine";
import { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import { DataManager } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { DefaultGraphContext } from "../../src/managers/GraphContext";
import { LayoutManager } from "../../src/managers/LayoutManager";
import { StatsManager } from "../../src/managers/StatsManager";
import { MeshCache } from "../../src/meshes/MeshCache";
import type { Node } from "../../src/Node";
import { Styles } from "../../src/Styles";

/** An engine that exposes the one guarded write, so the guard can be driven directly. */
class Probe extends LayoutEngine {
    static override type = "test-scoped-probe";
    static override maxDimensions = 3;

    async init(): Promise<void> {
        // Nothing to set up.
    }
    addNode(): void {
        // Keeps no list.
    }
    addEdge(): void {
        // Keeps no list.
    }
    getNodePosition(): Position {
        return { x: 0, y: 0, z: 0 };
    }
    setNodePosition(): void {
        // Unused.
    }
    getEdgePosition(): { src: Position; dst: Position } {
        return { src: { x: 0, y: 0, z: 0 }, dst: { x: 0, y: 0, z: 0 } };
    }
    step(): void {
        // Static.
    }
    pin(): void {
        // The array holds pins.
    }
    unpin(): void {
        // The array holds pins.
    }
    get nodes(): Iterable<Node> {
        return [];
    }
    get edges(): Iterable<Edge> {
        return [];
    }
    get isSettled(): boolean {
        return true;
    }
    write(n: Node, x: number, intent: "layout" | "placement" = "layout"): boolean {
        return this.writeNodePosition(n, x, 0, 0, intent);
    }
}

/**
 * A node as an engine driven directly sees one: an id, a row, and whether the array pins it.
 * @param id - The node id.
 * @param index - Its row.
 * @param positions - The array its pin lives in.
 * @returns The node.
 */
function node(id: string, index: number, positions: ElementPositions): Node {
    return { id, index, isPinned: () => positions.isPinned(index) } as unknown as Node;
}

/**
 * An edge between two direct nodes.
 * @param src - The source.
 * @param dst - The target.
 * @returns The edge.
 */
function edge(src: Node, dst: Node): Edge {
    return { srcId: src.id, dstId: dst.id, srcNode: src, dstNode: dst } as unknown as Edge;
}

/**
 * A mask over `rows` rows with the given rows set.
 * @param rows - The row count.
 * @param set - The rows to set.
 * @returns The mask.
 */
function maskOf(rows: number, set: readonly number[]): NodeMask {
    const mask = makeMask(rows);
    for (const row of set) {
        maskSet(mask, row, true);
    }

    return mask;
}

describe("which engines accept a scope", () => {
    it("is false on the base class and true on the five live simulations", () => {
        assert.isFalse(LayoutEngine.scoped);
        assert.isFalse(CircularLayout.scoped, "a one-shot arrangement inherits the refusal");
        assert.isTrue(SimulationLayoutEngine.scoped);
        assert.isTrue(NGraphEngine.scoped);
        assert.isTrue(D3GraphEngine.scoped);
    });

    it("is published on the built-in catalogue entries from the engine class", () => {
        assert.isTrue(layoutDescriptor("force")?.scoped, "force runs on ngraph");
        assert.isFalse(layoutDescriptor("circular")?.scoped);
    });

    it("is derived by register onto a third party's descriptor, never authored", () => {
        const authored: AuthoredLayoutDescriptor = {
            id: "test-scoped-plugin",
            plainName: "Scoped plugin",
            technicalName: "Scoped plugin",
            description: "Holds what it is told to.",
            family: "force",
            kind: "live",
            maxDimensions: 3,
            sizeRating: "any",
            structuralInputs: [],
            options: [],
            engine: "test-scoped-plugin",
        };
        class ScopedPlugin extends Probe {
            static override type = "test-scoped-plugin";
            static override scoped = true;
            static override descriptor = authored;
        }
        class UnscopedPlugin extends Probe {
            static override type = "test-unscoped-plugin";
            static override descriptor = { ...authored, id: "test-unscoped-plugin", engine: "test-unscoped-plugin" };
        }
        LayoutEngine.register(ScopedPlugin);
        LayoutEngine.register(UnscopedPlugin);

        const published = (id: string): boolean | undefined =>
            registeredLayoutDescriptors().find((descriptor) => descriptor.id === id)?.scoped;
        assert.isTrue(published("test-scoped-plugin"));
        assert.isFalse(published("test-unscoped-plugin"), "an engine that says nothing is not scoped");
        expectTypeOf<AuthoredLayoutDescriptor>().not.toHaveProperty("scoped");
    });
});

describe("the hold", () => {
    it("refuses a layout write onto a held row that has a coordinate, and nothing else", () => {
        const positions = new ElementPositions(3);
        const probe = new Probe();
        probe.attachPositions(positions);
        const [member, held, fresh] = [node("m", 0, positions), node("h", 1, positions), node("f", 2, positions)];
        assert.isTrue(probe.write(held, 5), "a held row with no coordinate takes its first one");
        probe.setHoldMask(maskOf(2, [1]), 2);

        assert.isFalse(probe.write(held, 9), "a held row is not moved by a layout step");
        assert.isTrue(probe.write(member, 9), "a member is");
        assert.isTrue(probe.write(held, 7, "placement"), "a drag still moves a held node");
        assert.isTrue(probe.write(fresh, 1), "a node newer than the hold is placed once");
        assert.isFalse(probe.write(fresh, 2), "and then held, because it is not a member");

        probe.setHoldMask(null, 0);
        assert.isTrue(probe.write(held, 3), "releasing the hold releases the row");
        assert.isFalse(positions.isPinned(1), "and the hold was never a pin");
    });

    /**
     * Run a live engine twice over the same five-node path -- once holding rows 0 and 1, once with
     * the same rows pinned by hand -- and return both arrays.
     * @param build - Builds a fresh engine.
     * @returns The held run's array and the pinned run's.
     */
    function heldAndPinned(build: () => LayoutEngine): { held: ElementPositions; pinned: ElementPositions } {
        const run = (hold: boolean): ElementPositions => {
            const positions = new ElementPositions(5);
            const engine = build();
            engine.attachPositions(positions);
            const nodes = Array.from({ length: 5 }, (_, index) => node(`n${String(index)}`, index, positions));
            engine.addNodes(nodes);
            engine.addEdges(nodes.slice(1).map((dst, index) => edge(nodes[index], dst)));
            nodes.forEach((n, index) => {
                engine.setNodePosition(n, { x: index * 10, y: index % 2, z: 0 });
            });
            if (hold) {
                engine.setHoldMask(maskOf(5, [0, 1]), 5);
            } else {
                positions.setPinned(0, true);
                positions.setPinned(1, true);
                engine.pin(nodes[0]);
                engine.pin(nodes[1]);
            }

            for (let step = 0; step < 50; step++) {
                engine.step();
            }

            engine.publishPositions();
            return positions;
        };

        return { held: run(true), pinned: run(false) };
    }

    for (const [name, build] of [
        ["d3", () => new D3GraphEngine({})],
        ["ngraph", () => new NGraphEngine({})],
    ] as const) {
        it(`${name} fixes held nodes natively, exactly as a hand-pinned run`, () => {
            const { held, pinned } = heldAndPinned(build);
            const a = { x: 0, y: 0, z: 0 };
            const b = { x: 0, y: 0, z: 0 };

            for (let row = 0; row < 5; row++) {
                held.read(row, a);
                pinned.read(row, b);
                assert.deepEqual(a, b, `row ${String(row)} matches the hand-pinned run`);
            }

            held.read(0, a);
            assert.deepEqual([a.x, a.y], [0, 0], "a held node stayed where it was");
            held.read(4, a);
            assert.notDeepEqual([a.x, a.y], [40, 0], "while a member moved");
            assert.isFalse(held.isPinned(0), "and the hold was never written as a pin");
        });

        it(`${name} does not release a held node the reader unpins`, () => {
            const positions = new ElementPositions(3);
            const engine = build();
            engine.attachPositions(positions);
            const nodes = Array.from({ length: 3 }, (_, index) => node(`n${String(index)}`, index, positions));
            engine.addNodes(nodes);
            const first = edge(nodes[0], nodes[1]);
            engine.addEdges([first, edge(nodes[1], nodes[2])]);
            nodes.forEach((n, index) => {
                engine.setNodePosition(n, { x: index * 10, y: 0, z: 0 });
            });
            engine.setHoldMask(maskOf(3, [0]), 3);

            engine.unpin(nodes[0]);
            for (let step = 0; step < 30; step++) {
                engine.step();
            }

            // The engine's own state, not the array (which the guard protects either way): the
            // edge is drawn from where the engine thinks the node is.
            const drawn = engine.getEdgePosition(first);
            assert.closeTo(drawn.src.x, 0, 1e-9, "the engine still holds it where it was");
            assert.closeTo(drawn.src.y, 0, 1e-9);
        });
    }
});

describe("a scope on a layout manager", () => {
    let dispose: (() => void) | undefined;

    afterEach(() => {
        dispose?.();
        dispose = undefined;
    });

    /**
     * A real manager over a NullEngine scene, whose scopes resolve to the listed ids.
     * @returns The manager.
     */
    function manager(): LayoutManager {
        const engine = new NullEngine();
        const scene = new Scene(engine);
        const styles = Styles.default();
        const eventManager = new EventManager();
        const dataManager = new DataManager(eventManager, styles);
        const layoutManager = new LayoutManager(eventManager, dataManager, styles);
        const context = new DefaultGraphContext(
            () => styles,
            dataManager,
            layoutManager,
            new MeshCache(),
            scene,
            new StatsManager(eventManager),
            {},
        );
        layoutManager.setGraphContext(context);
        layoutManager.setScopeSource({
            canonical: (input) => input as Scope,
            members: (scope) => (typeof scope === "object" && "nodes" in scope ? scope.nodes : []),
            detached: () => false,
        });
        dispose = (): void => {
            layoutManager.dispose();
            scene.dispose();
            engine.dispose();
        };

        return layoutManager;
    }

    it("refuses a scope on a one-shot layout with E_UNSUPPORTED, and keeps the scope it had", async () => {
        const layouts = manager();
        let error: unknown;
        try {
            await layouts.setLayout("circular", {}, { nodes: ["a"] });
        } catch (caught) {
            error = caught;
        }

        assert.isTrue(isGraphtyError(error) && error.code === "E_UNSUPPORTED", String(error));
        assert.isUndefined(layouts.scope);
    });

    it("carries a scope a one-shot layout cannot use without refusing, and holds nothing", async () => {
        const layouts = manager();
        await layouts.setLayout("ngraph", {}, { nodes: ["a"] });
        await layouts.setLayout("circular", {});

        assert.deepEqual(layouts.scope, { nodes: ["a"] }, "the scope is still carried");
        assert.isNull(layouts.layoutEngine?.holdMask ?? null, "but a static layout holds nothing");
        assert.isUndefined(layouts.scopeUser(), "and is not a user of the scope");
    });
});
