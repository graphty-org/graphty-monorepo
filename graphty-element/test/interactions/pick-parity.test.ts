/**
 * @file Pointing at nodes and edges answers the same on both render paths, and the same as before the
 * renderer optimizations: what the pointer hovers, what `elementAt` and `screenToWorld` find there and
 * what a click selects agree with each other, on `"objects"` and on `"batched"`.
 *
 * Every case drives the browser's own mouse (test/helpers/real-input.ts) and reads the element's public
 * readers: the `graphty-node-hover` event, `session.selection`, `elementAt`, `screenToWorld`, the
 * cursor, and the pixels the Hovered and Selected layers paint. The objects answers of the build from
 * before the optimizations (commit 57c0ee700e) are kept in pick-parity.reference.json; a case whose
 * key is there must answer the same on the objects path today. See README.md beside this file for how
 * to run it and how to record the reference again.
 *
 * Batched fixtures are disjoint components with data loaded after the first frame, so the rows stay
 * lazy (no Node or Edge object) until the pointer reaches them: building one Node builds its whole
 * component, and a connected fixture would test the objects code while claiming to test batched.
 *
 * Each case sets the render path itself, so the forced-batched project skips this file.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { drawnFrames } from "../helpers/drawn-frames";
import { inkNear } from "../helpers/drawn-invariants";
import { click, hover, type Modifiers, type Point, rightClick } from "../helpers/real-input";
import REFERENCE from "./pick-parity.reference.json";

type Path = "objects" | "batched";
type View = "2d" | "3d";

/** The paths each case runs on, objects first: a point found by scanning on objects is used on batched. */
const PATHS: readonly Path[] = ["objects", "batched"];
const VIEWS: readonly View[] = ["2d", "3d"];

/** The element's size: the test iframe is narrower than 500 px, so everything stays inside 400. */
const SIZE = 400;

/** How far from an edge's line, in CSS pixels, a point still picks it (PickService EDGE_PICK_TOLERANCE_PX). */
const EDGE_TOLERANCE_PX = 6;

/** A point with nothing drawn near it, in every fixture. */
const EMPTY: Point = { x: 6, y: 6 };

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

interface NodeIn {
    id: string;
    x: number;
    y: number;
    z?: number;
}

interface EdgeIn {
    id: string;
    source: string;
    target: string;
    directed?: boolean;
    kind?: string;
}

type Layer = Parameters<Graphty["session"]["styles"]["add"]>[0];

/**
 * Each fixture edge's name, by the id the element gave it: the element numbers edges in the order
 * they were added, and a name says which case a pick or a selection found.
 */
const edgeNames = new WeakMap<Graphty, Map<string, string>>();

/**
 * An edge id as the fixture names it.
 * @param element - The element.
 * @param id - The id the element reports.
 * @returns The fixture's name for it, or the id.
 */
function edgeName(element: Graphty, id: unknown): string {
    return edgeNames.get(element)?.get(String(id)) ?? String(id);
}

/**
 * Let what the last input or write started finish, and the frame settle.
 * @param element - The element.
 */
async function settle(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

/**
 * An element already drawn, empty, then given its data: the way a file loads in the app, and the only
 * way rows are stored with no Node or Edge on the batched path.
 * @param path - The render path.
 * @param view - 2D or 3D.
 * @param nodes - The nodes, at fixed places.
 * @param edges - The edges; `kind` is data a layer can select.
 * @param layers - Style layers added before the data.
 * @returns The element.
 */
async function mount(path: Path, view: View, nodes: NodeIn[], edges: EdgeIn[], layers: Layer[] = []): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = `${String(SIZE)}px`;
    element.style.height = `${String(SIZE)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(view);
    for (const layer of layers) {
        await element.session.styles.add(layer);
    }

    await settle(element);
    await element.session.data.addNodes(nodes.map(({ id, x, y, z }) => ({ id, position: { x, y, z: z ?? 0 } })));
    if (edges.length > 0) {
        await element.session.data.addEdges(edges.map(({ id: _name, ...edge }) => ({ ...edge })));
        edgeNames.set(element, new Map(edges.map(({ id }, i) => [String(i), id])));
    }

    await element.graph.setLayout("fixed", { dim: 3 });
    await settle(element);
    return element;
}

/**
 * On the batched path, the fixture must still be lazy before the pointer comes: fewer Nodes built
 * than nodes, so the rows the pointer reaches have no Node yet.
 * @param element - The element.
 * @param path - The render path.
 * @param nodes - How many nodes the fixture holds.
 */
function assertLazy(element: Graphty, path: Path, nodes: number): void {
    if (path === "batched") {
        const built = dataManagerInternals.nodesBuilt(element.graph.getDataManager());
        assert.isBelow(built, nodes, "some node rows have no Node before the pointer comes");
    }
}

/**
 * Where a node is drawn.
 * @param element - The element.
 * @param id - The node.
 * @returns Its center and radius in CSS pixels.
 */
function spot(element: Graphty, id: string): { x: number; y: number; radius: number } {
    const at = element.nodeScreenPosition(id);
    assert.isDefined(at, `node ${id} is placed on screen`);
    return { x: at.x, y: at.y, radius: at.radius ?? 0 };
}

/** What every public reader says about one point. */
interface Answer {
    /** `elementAt`, as `kind:id`, or `none`. */
    at: string;
    /** `session.selection.hovered` after the pointer rests there. */
    hovered: string;
    /** The last `graphty-node-hover` heard on the way there, or `none`. */
    heard: string;
    /** Whether the cursor shows something under it. */
    pointer: boolean;
    /** Whether `screenToWorld` finds a surface there. */
    world: boolean;
    /** The selection after a click there, as `kind:id` joined, or `none`. */
    selected: string;
}

/**
 * The selection as one string.
 * @param element - The element.
 * @returns Node and edge ids, as `node:id` and `edge:id`, or `none`.
 */
function selection(element: Graphty): string {
    const { nodes, edges } = element.session.selection;
    const all = [...nodes.map((id) => `node:${String(id)}`), ...edges.map((id) => `edge:${edgeName(element, id)}`)];
    return all.length === 0 ? "none" : all.sort().join(",");
}

/**
 * Move the real pointer to a point, read every reader there, then click it and read the selection.
 * @param element - The element.
 * @param point - The point, in CSS pixels.
 * @param fromEmpty - Rest the pointer on empty canvas first, so the move onto the point is heard as a hover
 *     even when the last point was on the same node; false moves straight there from the last point.
 * @returns The answer.
 */
async function answer(element: Graphty, point: Point, fromEmpty = true): Promise<Answer> {
    if (fromEmpty) {
        await hover(element, EMPTY);
        await settle(element);
    }

    const heard: string[] = [];
    const listen = (event: Event): void => {
        heard.push(String((event as CustomEvent<{ nodeId?: unknown }>).detail.nodeId));
    };
    element.addEventListener("graphty-node-hover", listen);
    await hover(element, point);
    await settle(element);
    element.removeEventListener("graphty-node-hover", listen);
    const hit = element.elementAt(point);
    const canvas = element.graph.engine.getInputElement();
    const result = {
        at: hit === null ? "none" : `${hit.kind}:${hit.kind === "edge" ? edgeName(element, hit.id) : String(hit.id)}`,
        hovered: String(element.session.selection.hovered ?? "none"),
        heard: heard.at(-1) ?? "none",
        pointer: canvas?.style.cursor === "pointer",
        world: element.screenToWorld(point) !== null,
    };
    await click(element, point);
    await settle(element);
    return { ...result, selected: selection(element) };
}

/**
 * Where the readers of one answer disagree with each other: hover and the event name the node a click
 * finds and selects, a click on an edge selects it with the cursor showing it, a point where a click
 * finds nothing hovers nothing and clears the selection, and `screenToWorld` finds the node's surface.
 * @param name - The case.
 * @param a - The answer.
 * @returns One line per disagreement.
 */
function disagreements(name: string, a: Answer): string[] {
    const out: string[] = [];
    const [kind, id] = a.at.split(":");
    if (kind === "node") {
        if (a.hovered !== id) {
            out.push(`${name}: elementAt finds node ${id} but hover reads ${a.hovered}`);
        }
        if (a.heard !== id) {
            out.push(`${name}: elementAt finds node ${id} but the hover event said ${a.heard}`);
        }
        if (a.selected !== a.at) {
            out.push(`${name}: elementAt finds node ${id} but a click selects ${a.selected}`);
        }
        if (!a.world) {
            out.push(`${name}: screenToWorld finds nothing over node ${id}`);
        }
    } else if (kind === "edge") {
        if (a.selected !== a.at) {
            out.push(`${name}: elementAt finds edge ${id} but a click selects ${a.selected}`);
        }
        if (!a.pointer) {
            out.push(`${name}: elementAt finds edge ${id} but the cursor shows nothing`);
        }
    } else {
        if (a.hovered !== "none") {
            out.push(`${name}: elementAt finds nothing but hover reads ${a.hovered}`);
        }
        if (a.selected !== "none") {
            out.push(`${name}: elementAt finds nothing but a click selects ${a.selected}`);
        }
    }

    return out;
}

/** The objects answers of the build before the optimizations, by case. */
const reference = REFERENCE as Record<string, Answer | string | undefined>;

/**
 * Print one answer, so a run on the reference build can be recorded as pick-parity.reference.json.
 * @param key - The case.
 * @param path - The render path.
 * @param value - The answer.
 */
function record(key: string, path: Path, value: unknown): void {
    console.log(`[pick-parity] ${JSON.stringify({ key, path, value })}`);
}

/**
 * Compare the answers of both paths and the reference, and each answer's readers with each other.
 * @param answers - Per path, per case.
 * @param expected - The `elementAt` each case must give, where the case pins it.
 * @returns One line per problem.
 */
function problems(answers: Record<Path, Map<string, Answer>>, expected: Map<string, string>): string[] {
    const out: string[] = [];
    for (const path of PATHS) {
        for (const [key, a] of answers[path]) {
            out.push(...disagreements(`${path} ${key}`, a).map((line) => line));
            const want = expected.get(key);
            if (want !== undefined && a.at !== want) {
                out.push(`${path} ${key}: elementAt gives ${a.at}, the case puts ${want} there`);
            }
        }
    }

    for (const [key, a] of answers.objects) {
        const b = answers.batched.get(key);
        if (b !== undefined && JSON.stringify(a) !== JSON.stringify(b)) {
            out.push(`${key}: objects ${JSON.stringify(a)} but batched ${JSON.stringify(b)}`);
        }

        const before = reference[key];
        if (typeof before === "object" && JSON.stringify(a) !== JSON.stringify(before)) {
            out.push(`${key}: objects ${JSON.stringify(a)} but before the optimizations ${JSON.stringify(before)}`);
        }
    }

    return out;
}

/**
 * The node fixture: two undirected pairs and a directed triangle, so batched stays lazy, beside lone
 * nodes of every size and place the pointer has to find.
 * @param view - 2D or 3D: the overlapping pair is one unit apart in depth in 3D.
 * @returns The nodes.
 */
function nodeFixture(view: View): NodeIn[] {
    return [
        { id: "a0", x: -6, y: 6 },
        { id: "a1", x: -3, y: 6 },
        { id: "b0", x: 0, y: 6 },
        { id: "b1", x: 3, y: 6 },
        { id: "t0", x: -6, y: 1 },
        { id: "t1", x: -3, y: 1 },
        { id: "t2", x: -4.5, y: 3 },
        { id: "tiny", x: 6, y: 6 },
        { id: "big", x: 6, y: 1 },
        { id: "small", x: 6, y: -2.2 },
        { id: "ovA", x: 0, y: 1 },
        { id: "ovB", x: 0.4, y: 1, z: view === "3d" ? 1 : 0 },
        { id: "lab", x: -6, y: -4 },
        { id: "ul", x: -6, y: -3 },
        { id: "grow", x: 1, y: -4 },
        { id: "gone", x: 5, y: -4 },
    ];
}

const NODE_EDGES: EdgeIn[] = [
    { id: "ea", source: "a0", target: "a1", directed: false },
    { id: "eb", source: "b0", target: "b1", directed: false },
    { id: "t01", source: "t0", target: "t1" },
    { id: "t12", source: "t1", target: "t2" },
    { id: "t20", source: "t2", target: "t0" },
];

/**
 * A style layer on some nodes by id.
 * @param name - The layer's name.
 * @param nodes - The nodes.
 * @param set - What it sets.
 * @returns The layer.
 */
function onNodes(name: string, nodes: string[], set: Record<string, unknown>): Layer {
    return { name, target: "node", selector: { match: "ids", nodes }, set };
}

/**
 * A style layer on the edges of one kind.
 * @param kind - The edges' `kind` data.
 * @param set - What it sets.
 * @returns The layer.
 */
function onKind(kind: string, set: Record<string, unknown>): Layer {
    return { name: kind, target: "edge", selector: { match: "expression", where: `data.kind == '${kind}'` }, set };
}

const NODE_LAYERS: Layer[] = [
    onNodes("Tiny", ["tiny"], { "node.size": 0.05 }),
    onNodes("Big", ["big"], { "node.size": 3 }),
    onNodes("Small", ["small"], { "node.size": 0.4 }),
    onNodes("Label", ["lab"], { "node.label": "a label over its neighbor" }),
];

describe.each(VIEWS)("pointing at nodes in %s", (view) => {
    it("hover, elementAt, screenToWorld and a click agree on every node, on both paths and as before", async () => {
        const answers: Record<Path, Map<string, Answer>> = { objects: new Map(), batched: new Map() };
        const expected = new Map<string, string>();
        for (const id of ["a0", "a1", "b0", "t0", "t2", "tiny", "big", "small", "late"]) {
            expected.set(`${view} node ${id}`, `node:${id}`);
        }

        expected.set(`${view} grown rim`, "node:grow");
        expected.set(`${view} removed spot`, "none");
        for (const path of PATHS) {
            const nodes = nodeFixture(view);
            const element = await mount(path, view, nodes, NODE_EDGES, NODE_LAYERS);
            assertLazy(element, path, nodes.length);
            const put = async (key: string, point: Point, fromEmpty = true): Promise<void> => {
                const a = await answer(element, point, fromEmpty);
                answers[path].set(`${view} ${key}`, a);
                record(`${view} ${key}`, path, a);
            };

            for (const id of ["a0", "a1", "b0", "t0", "t2", "tiny", "big", "small", "ovA", "ovB", "lab", "ul"]) {
                await put(`node ${id}`, spot(element, id));
            }

            // Added after the first frame.
            await element.session.data.addNodes([{ id: "late", position: { x: 0, y: -6, z: 0 } }]);
            await settle(element);
            await put("node late", spot(element, "late"));

            // Grown by a restyle: its new rim, outside where it was drawn before.
            await element.session.styles.add(onNodes("Grow", ["grow"], { "node.size": 4 }));
            await settle(element);
            const grown = spot(element, "grow");
            await put("grown rim", { x: grown.x + grown.radius * 0.8, y: grown.y });

            // The place a removed neighbor was drawn, reached straight from the grown node.
            const gone = spot(element, "gone");
            await element.session.data.removeNodes(["gone"]);
            await settle(element);
            await put("removed spot", gone, false);
            element.remove();
        }

        assert.deepEqual(problems(answers, expected), []);
    });

    it("selects as a reader expects with shift, ctrl, right-click and a click on empty canvas", async () => {
        const steps: Record<Path, string[]> = { objects: [], batched: [] };
        for (const path of PATHS) {
            const nodes = nodeFixture(view);
            const element = await mount(path, view, nodes, NODE_EDGES, NODE_LAYERS);
            assertLazy(element, path, nodes.length);
            const a0 = spot(element, "a0");
            const a1 = spot(element, "a1");
            const edge = { x: (a0.x + a1.x) / 2, y: (a0.y + a1.y) / 2 };
            const step = async (
                name: string,
                point: Point,
                how: { modifiers?: Modifiers; right?: boolean } = {},
            ): Promise<void> => {
                if (how.right === true) {
                    await rightClick(element, point);
                } else {
                    await click(element, point, how.modifiers);
                }

                await settle(element);
                steps[path].push(`${name} -> ${selection(element)}`);
                record(`${view} selection ${name}`, path, selection(element));
            };

            await step("click a0", a0);
            await step("shift-click b0", spot(element, "b0"), { modifiers: { shift: true } });
            await step("shift-click a0", a0, { modifiers: { shift: true } });
            await step("shift-click the a0-a1 edge", edge, { modifiers: { shift: true } });
            await step("right-click b0", spot(element, "b0"), { right: true });
            await step("right-click empty canvas", EMPTY, { right: true });
            await step("ctrl-click t0", spot(element, "t0"), { modifiers: { ctrl: true } });
            await step("click empty canvas", EMPTY);
            element.remove();
        }

        const want = [
            "click a0 -> node:a0",
            "shift-click b0 -> node:a0,node:b0",
            "shift-click a0 -> node:b0",
            "shift-click the a0-a1 edge -> edge:ea,node:b0",
            "right-click b0 -> edge:ea,node:b0",
            "right-click empty canvas -> edge:ea,node:b0",
        ];
        assert.deepEqual(steps.objects.slice(0, want.length), want, "objects");
        assert.deepEqual(steps.batched, steps.objects, "batched selects as objects does");
        assert.strictEqual(steps.objects.at(-1), "click empty canvas -> none");
        for (const [i, line] of steps.objects.entries()) {
            const before = reference[`${view} selection ${line.split(" -> ")[0]}`];
            if (typeof before === "string") {
                assert.strictEqual(line, `${line.split(" -> ")[0]} -> ${before}`, `step ${String(i)} as before`);
            }
        }
    });
});

/** The edge kinds, each its own pair of nodes (a self-loop: one node), and what styles it. */
const EDGE_KINDS: { kind: string; directed: boolean; set?: Record<string, unknown> }[] = [
    { kind: "undirected", directed: false },
    { kind: "arrow", directed: true },
    { kind: "nohead", directed: true, set: { "edge.arrowHead": "none" } },
    { kind: "dash", directed: false, set: { "edge.style": "dash" } },
    { kind: "pattern", directed: false, set: { "edge.style": "zigzag" } },
    { kind: "curve", directed: false, set: { "edge.curvature": true } },
    { kind: "label", directed: false, set: { "edge.label": "E" } },
    { kind: "wide", directed: false, set: { "edge.width": 6 } },
    { kind: "par1", directed: false },
    { kind: "par2", directed: false },
    { kind: "loop", directed: false },
];

/**
 * The edge fixture: every kind on its own row of one of two columns, each a component of its own.
 * @returns The nodes and edges.
 */
function edgeFixture(): { nodes: NodeIn[]; edges: EdgeIn[] } {
    const nodes: NodeIn[] = [];
    const edges: EdgeIn[] = [];
    let slot = 0;
    for (const { kind, directed } of EDGE_KINDS) {
        // The parallel pair shares a slot, 0.7 apart: far enough apart that each line has its own pixels.
        const row = kind === "par2" ? slot - 1 : slot;
        const x = row % 2 === 0 ? -8 : 2;
        const y = 7 - Math.floor(row / 2) * 3 - (kind === "par2" ? 0.7 : 0);
        if (kind === "loop") {
            nodes.push({ id: "loop-s", x: x + 2, y });
            edges.push({ id: kind, source: "loop-s", target: "loop-s", directed, kind });
        } else {
            nodes.push({ id: `${kind}-s`, x, y }, { id: `${kind}-t`, x: x + 5, y });
            edges.push({ id: kind, source: `${kind}-s`, target: `${kind}-t`, directed, kind });
        }

        if (kind !== "par2") {
            slot++;
        }
    }

    return { nodes, edges };
}

/**
 * The first point of a list where `elementAt` finds one edge.
 * @param element - The element.
 * @param id - The edge.
 * @param points - The candidates, in order.
 * @returns The point, or undefined.
 */
function firstOn(element: Graphty, id: string, points: Point[]): Point | undefined {
    return points.find((p) => {
        const hit = element.elementAt(p);
        return hit?.kind === "edge" && edgeName(element, hit.id) === id;
    });
}

describe.each(VIEWS)("pointing at edges in %s", (view) => {
    it("every kind of edge is found, hovered and selected on its line, on both paths and as before", async () => {
        const answers: Record<Path, Map<string, Answer>> = { objects: new Map(), batched: new Map() };
        const expected = new Map<string, string>();
        // A curve and a loop are drawn off their chord: where objects finds them, relative to their nodes.
        const offsets = new Map<string, Point>();
        for (const path of PATHS) {
            const { nodes, edges } = edgeFixture();
            const layers: Layer[] = [
                { name: "Nodes", target: "node", selector: { match: "everything" }, set: { "node.size": 0.5 } },
                ...EDGE_KINDS.flatMap(({ kind, set }) => (set === undefined ? [] : [onKind(kind, set)])),
            ];
            const element = await mount(path, view, nodes, edges, layers);
            assertLazy(element, path, nodes.length);
            const put = async (key: string, point: Point | undefined, want: string): Promise<void> => {
                const full = `${view} ${key}`;
                expected.set(full, want);
                if (point === undefined) {
                    answers[path].set(full, {
                        at: "unreachable",
                        hovered: "",
                        heard: "",
                        pointer: false,
                        world: false,
                        selected: "",
                    });
                    return;
                }

                const a = await answer(element, point);
                answers[path].set(full, a);
                record(full, path, a);
            };

            for (const { kind } of EDGE_KINDS) {
                if (kind === "loop") {
                    const c = spot(element, "loop-s");
                    if (path === "objects") {
                        const ring = Array.from({ length: 40 }, (_, r) => c.radius + 2 + r * 2).flatMap((r) =>
                            Array.from({ length: 16 }, (__, k) => ({
                                x: c.x + r * Math.cos((k * Math.PI) / 8),
                                y: c.y + r * Math.sin((k * Math.PI) / 8),
                            })),
                        );
                        const found = firstOn(element, kind, ring);
                        if (found !== undefined) {
                            offsets.set(kind, { x: found.x - c.x, y: found.y - c.y });
                        }
                    }

                    const off = offsets.get(kind);
                    await put(
                        "edge loop",
                        off === undefined ? undefined : { x: c.x + off.x, y: c.y + off.y },
                        "edge:loop",
                    );
                    continue;
                }

                const s = spot(element, `${kind}-s`);
                const t = spot(element, `${kind}-t`);
                const mid = { x: (s.x + t.x) / 2, y: (s.y + t.y) / 2 };
                const length = Math.hypot(t.x - s.x, t.y - s.y);
                const dir = { x: (t.x - s.x) / length, y: (t.y - s.y) / length };
                const normal = { x: -dir.y, y: dir.x };
                if (kind === "curve") {
                    if (path === "objects") {
                        const across = Array.from({ length: 80 }, (_, i) => (i + 1) * (i % 2 === 0 ? 1 : -1)).map(
                            (d) => ({
                                x: mid.x + normal.x * Math.ceil(Math.abs(d) / 2) * Math.sign(d),
                                y: mid.y + normal.y * Math.ceil(Math.abs(d) / 2) * Math.sign(d),
                            }),
                        );
                        const found = firstOn(element, kind, across);
                        if (found !== undefined) {
                            offsets.set(kind, { x: found.x - mid.x, y: found.y - mid.y });
                        }
                    }

                    const off = offsets.get(kind);
                    await put(
                        "edge curve",
                        off === undefined ? undefined : { x: mid.x + off.x, y: mid.y + off.y },
                        "edge:curve",
                    );
                    continue;
                }

                await put(`edge ${kind} middle`, mid, `edge:${kind}`);
                if (kind === "arrow") {
                    // On the arrowhead, just before the target node.
                    const back = t.radius + 4;
                    await put("edge arrow cap", { x: t.x - dir.x * back, y: t.y - dir.y * back }, "edge:arrow");
                }

                if (kind === "undirected") {
                    // Where the line meets its trimmed end at the target, and two pixels past the pick tolerance.
                    const back = t.radius + 2;
                    await put(
                        "edge undirected trimmed end",
                        { x: t.x - dir.x * back, y: t.y - dir.y * back },
                        "edge:undirected",
                    );
                    const away = EDGE_TOLERANCE_PX + 2;
                    await put(
                        "edge undirected 2px past tolerance",
                        { x: mid.x + normal.x * away, y: mid.y + normal.y * away },
                        "none",
                    );
                }
            }

            element.remove();
        }

        assert.deepEqual(problems(answers, expected), []);
    });

    it("an undirected edge on lazy rows paints Hovered and Selected and is named for a menu", async () => {
        const hoveredInk = (p: readonly number[]): boolean => p[1] > p[0] + 60 && p[1] > p[2] + 60;
        const selectedInk = (p: readonly number[]): boolean => p[0] > p[2] + 60 && p[1] > p[2] + 60;
        const plainInk = (p: readonly number[]): boolean => p[0] > p[1] + 60 && p[2] > p[1] + 60;
        const results: Record<Path, string[]> = { objects: [], batched: [] };
        for (const path of PATHS) {
            const nodes: NodeIn[] = ["p", "q", "r"].flatMap((name, i) => [
                { id: `${name}0`, x: -5, y: 4 - i * 4 },
                { id: `${name}1`, x: 5, y: 4 - i * 4 },
            ]);
            const edges: EdgeIn[] = ["p", "q", "r"].map((name) => ({
                id: name,
                source: `${name}0`,
                target: `${name}1`,
                directed: false,
            }));
            const element = await mount(path, view, nodes, edges, [
                {
                    name: "Ink",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.color": "#2040ff", "node.size": 0.5 },
                },
                {
                    name: "Edges",
                    target: "edge",
                    selector: { match: "everything" },
                    set: { "edge.color": "#ff00ff", "edge.width": 4 },
                },
                { name: "Hovered", target: "edge", selector: { match: "hover" }, set: { "edge.color": "#00ff00" } },
                {
                    name: "Selected",
                    target: "edge",
                    selector: { match: "state", state: "selected" },
                    set: { "edge.color": "#ffff00" },
                },
            ]);
            assertLazy(element, path, nodes.length);
            if (path === "batched") {
                assert.strictEqual(
                    dataManagerInternals.edgesBuilt(element.graph.getDataManager()),
                    0,
                    "no edge row has an Edge",
                );
            }

            const mid = (name: string): Point => {
                const a = spot(element, `${name}0`);
                const b = spot(element, `${name}1`);
                return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            };
            const ink = async (name: string): Promise<string> => {
                const at = mid(name);
                if (await inkNear(element, at, selectedInk)) {
                    return "selected";
                }
                if (await inkNear(element, at, hoveredInk)) {
                    return "hovered";
                }
                return (await inkNear(element, at, plainInk)) ? "plain" : "missing";
            };
            const note = async (what: string): Promise<void> => {
                results[path].push(`${what}: p ${await ink("p")}, q ${await ink("q")}, sel ${selection(element)}`);
            };

            await hover(element, spot(element, "p0"));
            await settle(element);
            await note("hover p0");
            await hover(element, EMPTY);
            await settle(element);
            await note("pointer away");
            await click(element, mid("q"));
            await settle(element);
            await note("click q");
            await rightClick(element, mid("q"));
            await settle(element);
            const named = element.elementAt(mid("q"));
            results[path].push(
                `right-click q: sel ${selection(element)}, menu names ${named === null ? "none" : `${named.kind}:${edgeName(element, named.id)}`}`,
            );
            element.remove();
        }

        const want = [
            "hover p0: p hovered, q plain, sel none",
            "pointer away: p plain, q plain, sel none",
            "click q: p plain, q selected, sel edge:q",
            "right-click q: sel edge:q, menu names edge:q",
        ];
        assert.deepEqual(results.objects, want, "objects");
        assert.deepEqual(results.batched, want, "batched");
    });
});

/**
 * A seeded number generator (mulberry32).
 * @param seed - The seed.
 * @returns The next number in [0, 1).
 */
function seeded(seed: number): () => number {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

describe.each(PATHS)("hovering every node of a seeded 200-node graph on %s", (path) => {
    it("reads each node the pointer rests on as hovered, and a click there selects it", async () => {
        const random = seeded(9830);
        const nodes: NodeIn[] = Array.from({ length: 200 }, (_, i) => ({
            id: `n${String(i)}`,
            x: (i % 15) * 1.4 + (random() - 0.5) * 0.6,
            y: Math.floor(i / 15) * 1.4 + (random() - 0.5) * 0.6,
        }));
        const edges: EdgeIn[] = Array.from({ length: 100 }, (_, i) => ({
            id: `e${String(i)}`,
            source: `n${String(2 * i)}`,
            target: `n${String(2 * i + 1)}`,
            directed: false,
        }));
        const element = await mount(path, "2d", nodes, edges, [
            { name: "Small", target: "node", selector: { match: "everything" }, set: { "node.size": 0.6 } },
        ]);
        assertLazy(element, path, nodes.length);
        const missed: string[] = [];
        let checked = 0;
        for (const { id } of nodes) {
            const point = spot(element, id);
            // Where two nodes' shapes overlap a click may name either; check the points that are a node's own.
            if (element.elementAt(point)?.id !== id) {
                continue;
            }
            checked++;
            const a = await answer(element, point);
            if (a.hovered !== id || a.heard !== id || a.selected !== `node:${id}`) {
                missed.push(`${id}: ${JSON.stringify(a)}`);
            }
        }

        assert.isAtLeast(checked, 190, "nearly every node's center is its own");
        assert.deepEqual(missed, [], "nodes whose hover or click did not name them");
    });
});

/**
 * A force layout's fixture: twelve disjoint pairs on a grid.
 * @param spacing - The grid's spacing.
 * @returns The nodes and edges.
 */
function motionFixture(spacing = 1): { nodes: NodeIn[]; edges: EdgeIn[] } {
    const nodes = Array.from({ length: 24 }, (_, i) => ({
        id: `m${String(i)}`,
        x: ((i % 6) - 2.5) * spacing,
        y: (Math.floor(i / 6) - 1.5) * spacing,
    }));
    const edges = Array.from({ length: 12 }, (_, i) => ({
        id: `me${String(i)}`,
        source: `m${String(2 * i)}`,
        target: `m${String(2 * i + 1)}`,
        directed: false,
    }));
    return { nodes, edges };
}

/**
 * The probe's fixture: a directed chain of 60 nodes on a 4-wide grid, one component, so a hover on
 * batched builds every row.
 * @returns The nodes and edges.
 */
function chainFixture(): { nodes: NodeIn[]; edges: EdgeIn[] } {
    const nodes = Array.from({ length: 60 }, (_, i) => ({
        id: `m${String(i)}`,
        x: (i % 4) * 3 - 4.5,
        y: Math.floor(i / 4) * 3 - 21,
    }));
    const edges = Array.from({ length: 59 }, (_, i) => ({
        id: `mc${String(i)}`,
        source: `m${String(i)}`,
        target: `m${String(i + 1)}`,
    }));
    return { nodes, edges };
}

/**
 * Move the real pointer onto a point while a layout moves the nodes, and read what is hovered once the frame is
 * stable, beside the node that was drawn under the point when the browser handed the move over: the contract is
 * that hover names that node.
 * @param element - The element.
 * @param nodes - The nodes that may be under the point.
 * @param point - Where the pointer goes.
 * @returns The node under the point when the move arrived (or `none`), what was hovered, and whether the layout
 *     was running then.
 */
async function hoverWhileMoving(
    element: Graphty,
    nodes: readonly NodeIn[],
    point: Point,
): Promise<{ want: string; hovered: string; running: boolean }> {
    const canvas = element.graph.engine.getInputElement();
    assert.isNotNull(canvas);
    let under: string | null = null;
    let running = false;
    const onMove = (): void => {
        running = element.isRunning();
        let best = Infinity;
        for (const node of nodes) {
            const at = element.nodeScreenPosition(node.id);
            const d = at === undefined ? Infinity : Math.hypot(at.x - point.x, at.y - point.y);
            if (at !== undefined && d <= (at.radius ?? 0) && d < best) {
                best = d;
                under = node.id;
            }
        }
    };
    canvas?.addEventListener("pointermove", onMove, { once: true });
    await hover(element, point);
    await element.waitForStableFrame();
    return { want: under ?? "none", hovered: String(element.session.selection.hovered ?? "none"), running };
}

/**
 * Draw frames until the layout reports it is no longer running.
 * @param element - The element.
 */
async function untilSettled(element: Graphty): Promise<void> {
    while (element.isRunning()) {
        await drawnFrames(element.graph.scene, 1);
    }

    await element.waitForStableFrame();
}

describe.each(PATHS.flatMap((path) => VIEWS.map((view) => ({ path, view }))))(
    "pointing while a force layout runs on $path in $view",
    ({ path, view }) => {
        it("hovers the node that was under the pointer in the frame the move arrived", async () => {
            const samples: string[] = [];
            const wrong: string[] = [];
            let moving = 0;
            // One fresh layout per sample: a force layout moves fastest in its first frames. Twelve lazy pairs
            // packed together, and a directed chain of 60 (every row built), on each layout.
            const runs = ["ngraph", "forceatlas2"].flatMap((layout) =>
                ["m0", "m14"].flatMap((id) => [
                    { layout, fixture: "pairs", id },
                    { layout, fixture: "chain", id },
                ]),
            );
            for (const { layout, fixture, id } of runs) {
                const { nodes, edges } = fixture === "pairs" ? motionFixture(0.25) : chainFixture();
                const element = await mount(path, view, nodes, edges);
                if (fixture === "pairs") {
                    assertLazy(element, path, nodes.length);
                }
                await element.setLayout(layout, { seed: 5 });
                await drawnFrames(element.graph.scene, 1);
                const point = spot(element, id);
                const { want, hovered, running } = await hoverWhileMoving(element, nodes, point);
                const now = want === "none" ? point : spot(element, want);
                const moved = Math.hypot(now.x - point.x, now.y - point.y);
                if (running && want !== "none" && moved > (element.nodeScreenPosition(want)?.radius ?? 0)) {
                    moving++;
                }

                samples.push(
                    `${layout} ${fixture} ${id}: under ${want}${running ? " while running" : ""}, then moved ${moved.toFixed(0)} px, hovered ${hovered}`,
                );
                if (hovered !== want) {
                    wrong.push(samples.at(-1) ?? "");
                }
                element.remove();
            }

            record(`${view} hover while running`, path, samples);
            assert.isAtLeast(
                moving,
                runs.length / 2,
                `the node under the pointer moved off it before the read: ${samples.join("; ")}`,
            );
            assert.deepEqual(
                wrong,
                [],
                "hover read something other than the node under the pointer when the move arrived",
            );
        });

        it.each(["ngraph", "forceatlas2"])(
            "a click or right-click on a node of a settled %s layout leaves it settled",
            async (layout) => {
                const { nodes, edges } = motionFixture();
                const element = await mount(path, view, nodes, edges);
                await element.setLayout(layout, { seed: 5 });
                await untilSettled(element);
                const moved: string[] = [];
                for (const [how, id] of [
                    ["click", "m3"],
                    ["right-click", "m8"],
                ] as const) {
                    const before = new Map(nodes.map(({ id: n }) => [n, spot(element, n)]));
                    assertLazy(element, path, nodes.length);
                    if (how === "click") {
                        await click(element, spot(element, id));
                    } else {
                        await rightClick(element, spot(element, id));
                    }

                    // Long enough for a restarted simulation to move: it moves nodes on its first steps.
                    await drawnFrames(element.graph.scene, 30);
                    const far = nodes
                        .map(({ id: n }) => {
                            const a = before.get(n);
                            const b = spot(element, n);
                            return { n, d: a === undefined ? 0 : Math.hypot(b.x - a.x, b.y - a.y) };
                        })
                        .filter(({ d }) => d > 0.5);
                    if (element.isRunning() || far.length > 0) {
                        moved.push(
                            `${how} on ${id}: running ${String(element.isRunning())}, ${String(far.length)} nodes moved, most ${Math.max(0, ...far.map(({ d }) => d)).toFixed(1)} px`,
                        );
                    }

                    await untilSettled(element);
                }

                record(`${view} ${layout} settled after click`, path, moved);
                assert.deepEqual(moved, []);
            },
        );
    },
);

/** The nodes pointed at after a removal: rows after the removed one, near and far, and one in the last pair. */
const MOVED_ROWS = ["m1", "m5", "m13", "m23"];

describe.each(PATHS.flatMap((path) => VIEWS.map((view) => ({ path, view }))))(
    "pointing after a removal while a force layout runs on $path in $view",
    ({ path, view }) => {
        // Removing the first node renumbers every row after it on the batched path while the layout still places
        // nodes by row; undo brings the row back through the records. Hover answers from the ID buffer by row and a
        // click names a row's node, so an old row number names the wrong node or none.
        it.each(["removed", "removed and the removal undone"] as const)(
            "hover, its event, elementAt and a click name each node once m0 is %s mid-run",
            async (how) => {
                const { nodes, edges } = motionFixture();
                const element = await mount(path, view, nodes, edges);
                assertLazy(element, path, nodes.length);
                const scene = element.graph.getScene();
                // hovered and selected, so a hover or a selection left on the removed node shows
                await hover(element, spot(element, "m0"));
                await click(element, spot(element, "m0"));
                await settle(element);
                assert.strictEqual(selection(element), "node:m0", "m0 is selected before the run");
                await element.setLayout("ngraph", { seed: 5 });
                await drawnFrames(scene, 3);
                await element.session.data.removeNodes(["m0"]);
                const runningAtRemoval = element.isRunning();
                await drawnFrames(scene, 1);
                const left = {
                    hovered: String(element.session.selection.hovered ?? "none"),
                    selected: selection(element),
                };
                // still running, on the renumbered rows: the node under the pointer when the move arrives is hovered
                const moving = await hoverWhileMoving(
                    element,
                    nodes.filter(({ id }) => id !== "m0"),
                    spot(element, "m13"),
                );
                if (how !== "removed") {
                    await drawnFrames(scene, 2);
                    await element.session.undo();
                }

                await untilSettled(element);
                const ids = how === "removed" ? MOVED_ROWS : ["m0", ...MOVED_ROWS];
                const wrong: string[] = [];
                const answers: string[] = [];
                for (const id of ids) {
                    const a = await answer(element, spot(element, id));
                    answers.push(`${id}: ${JSON.stringify(a)}`);
                    wrong.push(...disagreements(id, a));
                    if (a.at !== `node:${id}`) {
                        wrong.push(`${id}: elementAt gives ${a.at} at the node's own center`);
                    }
                }

                // The last pair's edge, at the middle of its two drawn ends: edge ids do not move with rows.
                const [a, b] = [spot(element, "m22"), spot(element, "m23")];
                const edge = await answer(element, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
                answers.push(`me11: ${JSON.stringify(edge)}`);
                wrong.push(...disagreements("me11", edge));
                if (edge.at !== "edge:me11") {
                    wrong.push(`me11: elementAt gives ${edge.at} at the middle of the edge`);
                }

                record(`${view} pointing after m0 ${how} mid-run`, path, { left, moving, answers });
                assert.isTrue(runningAtRemoval, "the layout was running when m0 was removed");
                assert.strictEqual(
                    moving.hovered,
                    moving.want,
                    `hover mid-run names the node under the pointer when the move arrived (running ${String(moving.running)})`,
                );
                assert.notStrictEqual(left.hovered, "m0", "hover does not name the removed node");
                assert.notInclude(left.selected, "node:m0", "the selection does not name the removed node");
                if (how === "removed") {
                    assert.isUndefined(element.nodeScreenPosition("m0"), "the removed node is not placed");
                }

                assert.deepEqual(wrong, [], answers.join("\n"));
            },
        );
    },
);
