import { ForceAtlas2Simulation, type LayoutAccelerator, type LayoutSimulation } from "@graphty/layout";
import cytoscape, { type Core, type ElementDefinition, type EventObject, type LayoutOptions } from "cytoscape";
import { beforeAll, describe, expect, it } from "vitest";

import graphtyCytoscape, { LAYOUT_NAMES } from "../src/index";

const BOX = { x1: 0, y1: 0, w: 400, h: 300 };
const EVENTS = "layoutstart layoutready layoutstop";

/**
 * A 3 x 4 grid graph: connected, planar and bipartite, so every layout accepts it.
 * @returns the elements
 */
function gridElements(): ElementDefinition[] {
    const els: ElementDefinition[] = [];
    for (let i = 0; i < 12; i++) {
        els.push({ data: { id: `n${i}`, subset: i % 3, side: (Math.floor(i / 4) + (i % 4)) % 2 } });
    }
    for (let i = 0; i < 12; i++) {
        if (i % 4 < 3) {
            els.push({ data: { id: `e${i}r`, source: `n${i}`, target: `n${i + 1}`, w: 1 + (i % 3) } });
        }
        if (i < 8) {
            els.push({ data: { id: `e${i}d`, source: `n${i}`, target: `n${i + 4}`, w: 2 } });
        }
    }
    return els;
}

/**
 * A headless core over the grid graph.
 * @returns the core
 */
function makeCy(): Core {
    return cytoscape({ headless: true, elements: gridElements() });
}

/**
 * Runs a layout and resolves with the events it emitted, in order.
 * @param cy - the core
 * @param options - the layout options
 * @returns the event types
 */
async function run(cy: Core, options: Record<string, unknown>): Promise<string[]> {
    const seen: string[] = [];
    const layout = cy.layout({ boundingBox: BOX, seed: 7, ...options } as unknown as LayoutOptions);
    layout.on(EVENTS, (e: EventObject) => seen.push(e.type));
    const done = layout.pon("layoutstop");
    layout.run();
    await done;
    return seen;
}

/**
 * Every node position, by id.
 * @param cy - the core
 * @returns the positions
 */
function positions(cy: Core): Map<string, { x: number; y: number }> {
    return new Map(cy.nodes().map((n) => [n.id(), { ...n.position() }]));
}

/**
 * Asserts every position is finite and the nodes are not all on one point.
 * @param cy - the core
 */
function expectPlaced(cy: Core): void {
    const ps = [...positions(cy).values()];
    for (const p of ps) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    }
    expect(new Set(ps.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`)).size).toBeGreaterThan(1);
}

beforeAll(() => {
    cytoscape.use(graphtyCytoscape);
});

const runnable = LAYOUT_NAMES.filter((n) => n !== "spring-electrical");

describe("every graphty layout", () => {
    it("registers thirteen static layouts and three simulations", () => {
        expect(LAYOUT_NAMES).toHaveLength(16);
    });

    for (const name of runnable) {
        it(`graphty-${name}: places every node, holds a locked node, fires events in order`, async () => {
            const cy = makeCy();
            cy.$("#n5").position({ x: 777, y: 555 }).lock();
            const callbacks: string[] = [];
            const events = await run(cy, {
                name: `graphty-${name}`,
                ready: () => callbacks.push("ready"),
                stop: () => callbacks.push("stop"),
            });
            expect(events).toEqual(["layoutstart", "layoutready", "layoutstop"]);
            expect(callbacks).toEqual(["ready", "stop"]);
            expect(cy.$("#n5").position()).toEqual({ x: 777, y: 555 });
            expectPlaced(cy);
        });

        it(`graphty-${name}: dim 3 is projected to finite 2D positions`, async () => {
            const cy = makeCy();
            await run(cy, { name: `graphty-${name}`, dim: 3 });
            expectPlaced(cy);
        });
    }
});

describe("static layouts", () => {
    it("fit the result inside the bounding box", async () => {
        const cy = makeCy();
        await run(cy, { name: "graphty-circular" });
        for (const p of positions(cy).values()) {
            expect(p.x).toBeGreaterThanOrEqual(BOX.x1 - 1e-6);
            expect(p.x).toBeLessThanOrEqual(BOX.x1 + BOX.w + 1e-6);
            expect(p.y).toBeGreaterThanOrEqual(BOX.y1 - 1e-6);
            expect(p.y).toBeLessThanOrEqual(BOX.y1 + BOX.h + 1e-6);
        }
    });

    it("tween with animate 'end' and still finish", async () => {
        // Cytoscape animates only with style enabled; a plain headless core cannot tween at all
        const cy = cytoscape({ headless: true, styleEnabled: true, elements: gridElements() });
        const events = await run(cy, { name: "graphty-grid", animate: "end", animationDuration: 10 });
        expect(events).toEqual(["layoutstart", "layoutready", "layoutstop"]);
        expectPlaced(cy);
    });

    it("take Cytoscape selectors for shell, bipartite, multipartite, bfs and radial", async () => {
        const cy = makeCy();
        await run(cy, { name: "graphty-radial", root: "#n0" });
        const c = { x: BOX.x1 + BOX.w / 2, y: BOX.y1 + BOX.h / 2 };
        const p0 = cy.$("#n0").position();
        // the root sits at the rings' centre: the mean of the placed nodes is not the centre, so compare distances
        const d0 = Math.hypot(p0.x - c.x, p0.y - c.y);
        const far = cy.nodes().map((n) => Math.hypot(n.position().x - p0.x, n.position().y - p0.y));
        expect(Math.max(...far)).toBeGreaterThan(d0);

        await run(cy, { name: "graphty-bipartite", top: "[side = 0]" });
        const xs = new Set(cy.nodes("[side = 0]").map((n) => n.position().x.toFixed(3)));
        expect(xs.size).toBe(1);

        await run(cy, { name: "graphty-multipartite", subsets: ["[subset = 0]", cy.nodes("[subset > 0]")] });
        expect(new Set(cy.nodes().map((n) => n.position().x.toFixed(3))).size).toBe(2);

        await run(cy, { name: "graphty-multipartite" }); // default: the "subset" data field
        expect(new Set(cy.nodes().map((n) => n.position().x.toFixed(3))).size).toBe(3);

        await run(cy, { name: "graphty-shell", nlist: ["#n0", cy.nodes().not("#n0")] });
        expectPlaced(cy);

        await run(cy, { name: "graphty-bfs", start: "#n11" });
        expectPlaced(cy);
    });

    it("throw on a selection that matches no node", () => {
        const cy = makeCy();
        expect(() =>
            cy.layout({ name: "graphty-bfs", start: "#missing", boundingBox: BOX } as unknown as LayoutOptions).run(),
        ).toThrow(/matches no node/);
    });

    it("lay out only the collection they are called on", async () => {
        const cy = makeCy();
        const before = cy.$("#n11").position();
        const layout = cy
            .elements()
            .not("#n11")
            .layout({ name: "graphty-circular", boundingBox: BOX } as unknown as LayoutOptions);
        const done = layout.pon("layoutstop");
        layout.run();
        await done;
        expect(cy.$("#n11").position()).toEqual(before);
    });
});

describe("simulations", () => {
    for (const name of ["forceatlas2", "fruchterman-reingold"]) {
        it(`graphty-${name}: a locked node is fixed in the computation, not only in the drawing`, async () => {
            const cy = makeCy();
            const anchor = { x: 5000, y: 5000 };
            cy.$("#n0").position(anchor).lock();
            await run(cy, { name: `graphty-${name}` });
            expect(cy.$("#n0").position()).toEqual(anchor);
            const dist = (id: string): number => {
                const p = cy.$(`#${id}`).position();
                return Math.hypot(p.x - anchor.x, p.y - anchor.y);
            };
            // n0's neighbours are pulled toward it; the node farthest from it in the graph is not
            expect(Math.max(dist("n1"), dist("n4"))).toBeLessThan(dist("n11"));
        });

        it(`graphty-${name}: animate true draws per frame and fires events in order`, async () => {
            const cy = makeCy();
            const callbacks: string[] = [];
            const events = await run(cy, {
                name: `graphty-${name}`,
                animate: true,
                refresh: 10,
                ready: () => callbacks.push("ready"),
                stop: () => callbacks.push("stop"),
            });
            expect(events).toEqual(["layoutstart", "layoutready", "layoutstop"]);
            expect(callbacks).toEqual(["ready", "stop"]);
            expectPlaced(cy);
        });
    }

    it("stop() ends a continuous run with one layoutstop", async () => {
        const cy = makeCy();
        const seen: string[] = [];
        const layout = cy.layout({
            name: "graphty-forceatlas2",
            animate: true,
            maxIter: 1_000_000,
            settleThreshold: 0,
            boundingBox: BOX,
        } as unknown as LayoutOptions);
        layout.on(EVENTS, (e: EventObject) => seen.push(e.type));
        const done = layout.pon("layoutstop");
        layout.run();
        await new Promise((r) => setTimeout(r, 50));
        layout.stop();
        await done;
        await new Promise((r) => setTimeout(r, 50));
        expect(seen).toEqual(["layoutstart", "layoutready", "layoutstop"]);
        expectPlaced(cy);
    });

    it("read the weight from an edge data field", async () => {
        const a = makeCy();
        const b = makeCy();
        await run(a, { name: "graphty-forceatlas2" });
        await run(b, { name: "graphty-forceatlas2", weight: "w" });
        expect([...positions(a).values()]).not.toEqual([...positions(b).values()]);
    });

    it("randomize false starts from the current positions", async () => {
        const cy = makeCy();
        cy.nodes().forEach((n, i) => {
            n.position({ x: (i % 4) * 50, y: Math.floor(i / 4) * 50 });
        });
        await run(cy, { name: "graphty-fruchterman-reingold", randomize: false });
        expectPlaced(cy);
    });

    it("spring-electrical needs an accelerator and says so", () => {
        const cy = makeCy();
        expect(() =>
            cy.layout({ name: "graphty-spring-electrical", boundingBox: BOX } as unknown as LayoutOptions).run(),
        ).toThrow(/no CPU simulation/);
    });

    /**
     * A stand-in for a GPU accelerator: the CPU simulation behind an asynchronous step, as a GPU simulation has.
     * @param failAt - the step call that rejects, or undefined for none
     * @returns the accelerator
     */
    function asyncAccelerator(failAt?: number): LayoutAccelerator {
        return {
            kind: "test-async",
            forceAtlas2: (options): LayoutSimulation => {
                const sim = new ForceAtlas2Simulation(options);
                let calls = 0;
                return {
                    load: (s, p) => {
                        sim.load(s, p);
                    },
                    step: async (k) => {
                        await Promise.resolve();
                        if (++calls === failAt) {
                            throw new Error("device lost");
                        }
                        sim.step(k);
                    },
                    get settled() {
                        return sim.settled;
                    },
                    setFixed: (m) => {
                        sim.setFixed(m);
                    },
                    setPosition: (i, x, y, z) => {
                        sim.setPosition(i, x, y, z);
                    },
                    dispose: () => {
                        sim.dispose();
                    },
                };
            },
        };
    }

    for (const animate of [false, true]) {
        it(`run an asynchronous (GPU-style) simulation, animate ${String(animate)}`, async () => {
            const cy = makeCy();
            const events = await run(cy, { name: "graphty-forceatlas2", accelerator: asyncAccelerator(), animate });
            expect(events).toEqual(["layoutstart", "layoutready", "layoutstop"]);
            expectPlaced(cy);
        });

        it(`report an asynchronous failure as layouterror then layoutstop, animate ${String(animate)}`, async () => {
            const cy = makeCy();
            const errors: unknown[] = [];
            cy.on("layouterror", (_e: EventObject, error: unknown) => errors.push(error));
            const events = await run(cy, {
                name: "graphty-forceatlas2",
                accelerator: asyncAccelerator(1),
                animate,
            });
            expect(events.at(-1)).toBe("layoutstop");
            expect(errors).toHaveLength(1);
            expect((errors[0] as Error).message).toBe("device lost");
        });
    }
});
