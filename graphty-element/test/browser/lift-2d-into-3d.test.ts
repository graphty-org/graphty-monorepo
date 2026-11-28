/**
 * @file Switching a settled 2D force drawing to 3D lifts it into depth instead of laying it out
 * again (issue #9372).
 *
 * The 3D force engine used to be built with fresh bodies, placed by ngraph near the origin: for a
 * few seconds the canvas showed a ball, which then spread into a different drawing, and the reader
 * lost their mental map. Then it started from the 2D drawing a seeded 5% of its width off the
 * plane, and a settled drawing, with next to no force out of the plane, kept that sliver of depth
 * and settled in its first frame. Now the 3D layout starts where the 2D drawing left every node and
 * the drawing rises into depth over the frames after the switch while the simulation runs.
 *
 * Both force engines (ngraph and d3) on both render paths (a node object per node, and batched
 * rows with no node object), and one seed twice gives one 3D drawing (issue #9475).
 */

import { afterEach, assert, describe, test } from "vitest";

import { Graphty } from "../../src/graphty-element";
import { D3GraphEngine } from "../../src/layout/D3GraphLayoutEngine";
import { LayoutManager, layoutManagerInternals } from "../../src/managers/LayoutManager";

/** Five five-node cliques joined in a ring: 25 nodes in clusters a reader would remember. */
const NODES = Array.from({ length: 25 }, (_, i) => ({ id: `n${String(i)}` }));
const EDGES: { source: string; target: string }[] = [];
for (let cluster = 0; cluster < 5; cluster++) {
    const first = cluster * 5;
    for (let a = first; a < first + 5; a++) {
        for (let b = a + 1; b < first + 5; b++) {
            EDGES.push({ source: `n${String(a)}`, target: `n${String(b)}` });
        }
    }

    EDGES.push({ source: `n${String(first)}`, target: `n${String(((cluster + 1) % 5) * 5)}` });
}

const hosts: HTMLElement[] = [];

afterEach(() => {
    for (const host of hosts.splice(0)) {
        host.remove();
    }
});

/**
 * Every node's published position, by row.
 * @param element - The element.
 * @returns One [x, y, z] per row.
 */
function positions(element: Graphty): [number, number, number][] {
    const session = element.graph.getSession();
    const at = { x: 0, y: 0, z: 0 };
    const out: [number, number, number][] = [];
    for (let row = 0; row < session.snapshot().nodeCount; row++) {
        session.positions.read(row, at);
        out.push([at.x, at.y, at.z]);
    }

    return out;
}

/**
 * How far the drawing spans along one axis.
 * @param drawn - The positions.
 * @param axis - 0, 1 or 2.
 * @returns The span.
 */
function span(drawn: [number, number, number][], axis: 0 | 1 | 2): number {
    const values = drawn.map((p) => p[axis]);
    return Math.max(...values) - Math.min(...values);
}

/**
 * Wait for the layout to come to rest and the frame to show it.
 * @param element - The element.
 */
async function settle(element: Graphty): Promise<void> {
    await element.waitForSettled();
    await element.waitForStableFrame();
}

/** A prototype's method, called on its instance. */
type Method = (this: object, ...args: unknown[]) => unknown;

/**
 * Trace what every lift does, for issue #10483: each layout build (type, dimension, lift, flatten, restoring), the pre-
 * steps, every rise step and whether the rise still runs, every arrangement handed to the layout (which ends a rise),
 * and every d3 engine load and wake with the engine's step count and alpha -- each with the frame it ran in. A rise
 * step's own load and wake are folded into it, and steps and rise steps are logged every tenth and after any other
 * event; a line repeated at once is counted, not repeated. A passing run builds only these few lines.
 * @returns `mark` a test event, `state` an element's engine and row 0, `text` the trace, `stop` to unhook.
 */
function traceLifts(): {
    mark: (event: string) => void;
    state: (element: Graphty) => string;
    text: () => string;
    stop: () => void;
} {
    const events: string[] = [];
    const ids = new WeakMap<object, number>();
    const steps = new WeakMap<object, number>();
    let handed = 0;
    let rises = 0;
    /** Above 0 inside a rise step, whose own engine load and wake are not logged apart. */
    let quiet = 0;
    let repeats = 0;
    let frame = 0;
    let running = true;
    const tick = (): void => {
        frame++;
        if (running) {
            requestAnimationFrame(tick);
        }
    };
    requestAnimationFrame(tick);
    const tag = (thing: object, kind: string): string => {
        let id = ids.get(thing);
        if (id === undefined) {
            id = ++handed;
            ids.set(thing, id);
        }

        return `${kind}${String(id)}`;
    };
    const alpha = (engine: object): string =>
        engine instanceof D3GraphEngine ? engine.d3ForceLayout.alpha().toFixed(6) : "-";
    let last = "";
    const push = (line: string): void => {
        if (line === last) {
            repeats++;
            return;
        }

        if (repeats > 0) {
            events.push(`   (the line above ${String(repeats)} more times)`);
            repeats = 0;
        }

        last = line;
        events.push(`f${String(frame)} ${line}`);
    };
    const restores: (() => void)[] = [];
    const hook = (
        proto: object,
        name: string,
        describe: (self: object, args: unknown[]) => string | null,
        hush = false,
    ): void => {
        const own = Object.getOwnPropertyDescriptor(proto, name);
        const original = (proto as Record<string, Method>)[name];
        Object.defineProperty(proto, name, {
            configurable: true,
            writable: true,
            value: function (this: object, ...args: unknown[]): unknown {
                const line = describe(this, args);
                if (line !== null) {
                    push(line);
                }

                quiet += hush ? 1 : 0;
                try {
                    return original.apply(this, args);
                } finally {
                    quiet -= hush ? 1 : 0;
                }
            },
        });
        restores.push(() => {
            if (own === undefined) {
                Reflect.deleteProperty(proto, name);
            } else {
                Object.defineProperty(proto, name, own);
            }
        });
    };

    const d3 = D3GraphEngine.prototype;
    hook(d3, "step", (self) => {
        const n = (steps.get(self) ?? 0) + 1;
        steps.set(self, n);
        const routine = last.includes(" stepped ") || last.includes(" riseStep ");
        return n === 1 || n % 10 === 0 || !routine
            ? `${tag(self, "d3#")} stepped ${String(n)} alpha ${alpha(self)}`
            : null;
    });
    for (const name of ["loadArrangement", "wakeForLift", "wakeForResize"]) {
        hook(d3, name, (self) =>
            quiet > 0
                ? null
                : `${tag(self, "d3#")} ${name} after step ${String(steps.get(self) ?? 0)} alpha ${alpha(self)}`,
        );
    }

    const manager = LayoutManager.prototype;
    hook(manager, "_setLayoutInternal", (self, [type, , how]) => {
        const build = how as { dimension?: number; lift?: boolean; flatten?: boolean; restoring?: boolean };
        rises = 0;
        return (
            `${tag(self, "LM#")} build ${String(type)} ${String(build.dimension)}D lift=${String(build.lift)} ` +
            `flatten=${String(build.flatten)} restoring=${String(build.restoring)}`
        );
    });
    hook(manager, "spendPreSteps", (self) => `${tag(self, "LM#")} spendPreSteps`);
    hook(
        manager,
        "riseStep",
        (self) => {
            if (!layoutManagerInternals.rising(self as LayoutManager)) {
                return null;
            }

            rises++;
            const routine = last.includes(" stepped ") || last.includes(" riseStep ");
            return rises === 1 || rises % 10 === 0 || !routine ? `${tag(self, "LM#")} riseStep ${String(rises)}` : null;
        },
        true,
    );
    hook(
        manager,
        "loadArrangement",
        (self, args) => `${tag(self, "LM#")} loadArrangement(${args.map(String).join(",")})`,
    );

    return {
        mark: (event) => {
            push(`-- ${event}`);
        },
        state: (element) => {
            const manager = element.graph.getLayoutManager();
            const engine = manager.layoutEngine;
            const at = positions(element)[0]
                .map((v) => v.toFixed(6))
                .join(",");
            return engine === undefined
                ? `no engine, row 0 at ${at}`
                : `${tag(manager, "LM#")} ${tag(engine, "d3#")} ${engine.constructor.name} steps ${String(steps.get(engine) ?? 0)} ` +
                      `alpha ${alpha(engine)} config ${JSON.stringify(element.layoutConfig)} row 0 at ${at}`;
        },
        text: () =>
            [...events, ...(repeats > 0 ? [`   (the line above ${String(repeats)} more times)`] : [])].join("\n"),
        stop: () => {
            running = false;
            for (const restore of restores.splice(0).reverse()) {
                restore();
            }
        },
    };
}

/** The force engines and render paths a lift is checked on; d3 has no seed and runs the same every time. */
const CASES = [
    { layout: "ngraph", config: { seed: 7 }, path: "objects" },
    { layout: "ngraph", config: { seed: 7 }, path: "batched" },
    { layout: "d3", config: {}, path: "objects" },
    { layout: "d3", config: {}, path: "batched" },
] as const;

type Case = (typeof CASES)[number];

/**
 * Draw the graph in 2D with the case's layout and render path, settled.
 * @param c - The case.
 * @returns The element.
 */
async function drawFlat(c: Case): Promise<Graphty> {
    const host = document.createElement("div");
    host.style.width = "600px";
    host.style.height = "400px";
    document.body.append(host);
    hosts.push(host);

    const element = new Graphty();
    element.style.width = "100%";
    element.style.height = "100%";
    element.style.display = "block";
    element.renderPath = c.path;
    element.viewMode = "2d";
    element.layout = c.layout;
    element.layoutConfig = { ...c.config };
    element.nodeData = NODES;
    element.edgeData = EDGES;
    host.append(element);
    await settle(element);
    return element;
}

describe.each(CASES)("switching a 2D $layout drawing to 3D on the $path path", (c) => {
    test("starts the 3D layout from the 2D drawing and lifts it into depth over the frames after", async () => {
        const element = await drawFlat(c);

        const flat = positions(element);
        const width = Math.max(span(flat, 0), span(flat, 1));
        assert.isAbove(width, 0, "the 2D drawing is spread out");

        // The 3D layout's first published arrangement, read the moment it is built.
        let start: [number, number, number][] | null = null;
        element.addEventListener("layout-initialized", () => {
            start ??= positions(element);
        });

        await element.setViewMode("3d");
        assert.isNotNull(start, "the switch to 3D built the 3D layout");
        const started = start as unknown as [number, number, number][];
        for (const [row, [x, y, z]] of started.entries()) {
            assert.closeTo(x, flat[row][0], width * 1e-3, `row ${String(row)} starts at its 2D X`);
            assert.closeTo(y, flat[row][1], width * 1e-3, `row ${String(row)} starts at its 2D Y`);
            assert.isAtMost(Math.abs(z), width * 0.05, `row ${String(row)} starts on the plane`);
        }

        // The depth of every frame drawn until the layout comes to rest.
        const depths: number[] = [];
        let resting = false;
        const sample = (): void => {
            if (!resting) {
                depths.push(span(positions(element), 2));
                requestAnimationFrame(sample);
            }
        };
        requestAnimationFrame(sample);
        await settle(element);
        resting = true;

        const depth = span(positions(element), 2);
        const rises = depths.filter((d, i) => i > 0 && d > depths[i - 1]).length;
        assert.isAtLeast(rises, 10, `the depth grew over many frames, not at once: ${depths.join(", ")}`);
        assert.isAtLeast(depth, width * 0.3, `the settled 3D drawing has real depth (width ${String(width)})`);
        assert.isAtMost(depths[0], width * 0.1, "the first frame after the switch is still near the plane");
    });

    test("lifts the same drawing to the same 3D drawing every time", async () => {
        const drawn: [number, number, number][][] = [];
        const trace = traceLifts();
        try {
            for (let run = 0; run < 2; run++) {
                trace.mark(`lift ${String(run)}: build 2D`);
                const element = await drawFlat(c);
                trace.mark(`lift ${String(run)}: flat ${trace.state(element)}; switch to 3D`);
                await element.setViewMode("3d");
                trace.mark(`lift ${String(run)}: switched`);
                await settle(element);
                drawn.push(positions(element));
                trace.mark(`lift ${String(run)}: settled ${trace.state(element)}`);
            }
        } finally {
            trace.stop();
        }

        const [first, second] = drawn;
        const width = Math.max(span(first, 0), span(first, 1), span(first, 2));
        assert.isAtLeast(span(first, 2), width * 0.3, "the lifted drawing has real depth");
        // Issue #10483: in CI the first of the two lifts once ended elsewhere, and more than 100 local lifts did not.
        // A failure prints what each lift did, so the next CI failure names the path the odd one took.
        const differs = first.some((at, row) => at.some((v, axis) => Math.abs(second[row][axis] - v) > width * 1e-6));
        if (differs) {
            console.log(`LIFT TRACE (issue #10483)\n${trace.text()}`);
        }

        for (const [row, at] of first.entries()) {
            for (const axis of [0, 1, 2] as const) {
                assert.closeTo(
                    second[row][axis],
                    at[axis],
                    width * 1e-6,
                    `row ${String(row)} axis ${String(axis)}; what each lift did:\n${trace.text()}`,
                );
            }
        }
    });
});
