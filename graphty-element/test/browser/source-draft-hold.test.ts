/**
 * @file A source draft's preview held still (`draft.display(true, { hold: true })`, design 5.3): the
 * nodes of the committed graph keep their places while After is drawn, only what the draft adds is laid
 * out, and a node it adds is drawn from the same place by the next After and by the commit. Under a
 * scoped layout the reader's own hold comes and goes by itself.
 */
import { afterEach, assert, describe, test } from "vitest";

import { featuresFrom, Graph, operationQueueOf } from "../../src/Graph.js";
import { layoutManagerInternals } from "../../src/managers/LayoutManager";
import type { GraphSession, SourceDraft } from "../../src/session";

const graphs: Graph[] = [];
const containers: HTMLElement[] = [];

afterEach(() => {
    for (const graph of graphs.splice(0)) {
        graph.dispose();
    }
    for (const container of containers.splice(0)) {
        container.remove();
    }
});

const PEOPLE = Array.from({ length: 12 }, (_, i) => `P${String(i)}`);

/** A place. */
type Place = readonly [number, number, number];

/**
 * Where nodes are drawn.
 * @param graph - The graph.
 * @param ids - The nodes; absent, every one.
 * @returns The places by id.
 */
function places(graph: Graph, ids?: readonly string[]): Map<string, Place> {
    const session = graph.getSession();
    const out = new Map<string, Place>();
    for (const id of ids ?? session.data.nodes().map((node) => String(node.id))) {
        const at = session.positions.get(id);
        if (at !== undefined) {
            out.set(id, [at.x, at.y, at.z ?? 0]);
        }
    }
    return out;
}

/**
 * How far each node is from where it was.
 * @param was - Where the nodes were.
 * @param now - Where they are.
 * @returns The farthest.
 */
function farthest(was: ReadonlyMap<string, Place>, now: ReadonlyMap<string, Place>): number {
    return Math.max(
        ...[...was].map(([id, at]) => {
            const to = now.get(id);
            return to === undefined ? Number.POSITIVE_INFINITY : Math.hypot(...at.map((v, i) => v - to[i]));
        }),
    );
}

/** A rendered graph of people linked in a ring, at rest, and a draft over it. */
interface Drawn {
    readonly graph: Graph;
    readonly session: GraphSession;
    readonly draft: SourceDraft;
    /** Visits, one per person, waiting; each names a room. */
    readonly visits: string;
}

/**
 * People in the graph at rest, visits waiting, and a draft.
 * @param prepare - What to do before the draft opens.
 * @returns It.
 */
async function drawn(prepare: (graph: Graph) => Promise<unknown> = () => Promise.resolve()): Promise<Drawn> {
    const container = document.createElement("div");
    container.style.width = "320px";
    container.style.height = "240px";
    document.body.appendChild(container);
    containers.push(container);
    const graph = new Graph(container);
    graphs.push(graph);
    featuresFrom(graph, () => ["source-steps"]);
    await graph.init();
    const session = graph.getSession();
    const ring = PEOPLE.map((id, i) => `e${String(i)},${id},${PEOPLE[(i + 1) % PEOPLE.length]}`);
    await session.data.import(
        { type: "csv", config: { data: ["id,from,to", ...ring].join("\n") }, name: "ring.csv" },
        { edges: { from: { column: "from" }, to: { column: "to" }, id: "id" } },
    );
    const rows = PEOPLE.map((id, i) => `V${String(i)},${id},R${String(i % 3)}`);
    const visits = await session.data.stage(
        { type: "csv", config: { data: ["visit,person,room", ...rows].join("\n") }, name: "visits.csv" },
        { key: "visit" },
    );
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    await prepare(graph);
    await graph.waitForStableFrame();
    return { graph, session, draft: session.data.draft(), visits };
}

/**
 * Link each visit to its person.
 * @param d - The drawn graph.
 */
function link(d: Drawn): void {
    const space = d.draft.spaces()[0]?.space ?? "";
    d.draft.connect({ from: { source: d.visits, field: "person" }, into: { space } });
}

describe("a source draft's preview held still", () => {
    test.each(["ngraph", "d3", "forceatlas2", "circular"])(
        "under %s the nodes the graph had stay where they are, and new ones are placed",
        async (layout) => {
            const d = await drawn((graph) => graph.setLayout(layout, {}));
            const was = places(d.graph, PEOPLE);
            link(d);
            await d.draft.display(true, { hold: true });
            const began = places(d.graph, ["V0", "V5", "V11"]);
            await d.graph.waitForStableFrame();
            assert.strictEqual(farthest(was, places(d.graph, PEOPLE)), 0, "no person moves");
            const visits = places(d.graph, ["V0", "V5", "V11"]);
            assert.strictEqual(visits.size, 3, "every visit has a place");
            await d.draft.show("before");
            await d.graph.waitForStableFrame();
            assert.strictEqual(farthest(was, places(d.graph, PEOPLE)), 0, "nor when the visits go again");
            if (layout !== "circular") {
                // a simulation that has not stepped yet has not placed them at all
                assert.isTrue(began.size === 0 || farthest(began, visits) > 0, "the layout moves the visits");
            }
        },
    );

    test("a node the draft adds keeps its place through Before, another act and the commit", async () => {
        const d = await drawn();
        const was = places(d.graph, PEOPLE);
        link(d);
        await d.draft.display(true, { hold: true });
        await d.graph.waitForStableFrame();
        const after = places(d.graph);
        await d.draft.show("before");
        await d.graph.waitForStableFrame();
        assert.strictEqual(farthest(was, places(d.graph, PEOPLE)), 0, "Before is the graph as it was");
        await d.draft.show("after");
        const again = places(d.graph);
        assert.strictEqual(farthest(was, again), 0);
        const near = farthest(after, again);
        const size = farthest(
            new Map([["P0", was.get("P0") ?? [0, 0, 0]]]),
            new Map([["P0", was.get("P6") ?? [0, 0, 0]]]),
        );
        assert.isBelow(near, size / 4, "drawn again where it was, not laid out afresh");
        await d.graph.waitForStableFrame();
        const last = places(d.graph);
        await d.draft.commit();
        assert.isBelow(farthest(last, places(d.graph)), size / 4, "the commit draws it from there");
        assert.isNull(d.graph.getLayoutManager().layoutEngine?.holdMask ?? null, "and the hold ends");
    });

    test("a node the draft adds is not left drawn over a node the graph holds", async () => {
        const d = await drawn();
        d.draft.add(d.visits);
        // V0 starts just in front of P0 along the camera's line of sight, so the repulsion between them,
        // along that line, would leave it drawn over P0.
        const camera = d.graph.scene.activeCamera?.position;
        const p0 = places(d.graph, ["P0"]).get("P0");
        assert.isDefined(camera);
        assert.isDefined(p0);
        if (camera === undefined || p0 === undefined) {
            return;
        }
        const toward = [camera.x - p0[0], camera.y - p0[1], camera.z - p0[2]];
        const length = Math.hypot(...toward);
        const [x, y, z] = p0.map((v, i) => v + (toward[i] / length) * 0.5);
        layoutManagerInternals.seedPlaces(d.graph.getLayoutManager(), new Map([["V0", { x, y, z }]]));
        await d.draft.display(true, { hold: true });
        await d.graph.waitForStableFrame();
        const visit = d.graph.nodeScreenPosition("V0");
        const person = d.graph.nodeScreenPosition("P0");
        assert.isDefined(visit);
        assert.isDefined(person);
        if (visit === undefined || person === undefined) {
            return;
        }
        assert.isAtLeast(
            Math.hypot(visit.x - person.x, visit.y - person.y),
            visit.radius + person.radius,
            "V0 is drawn clear of P0",
        );
    });

    test.each(["2d", "3d"] as const)(
        "in %s the nodes the draft adds are not left drawn over each other",
        async (view) => {
            const d = await drawn((graph) => graph.setViewMode(view));
            d.draft.add(d.visits);
            // Three visits start in a row in front of P0 along the camera's line of sight: the forces between
            // them run along that line, so the layout leaves them drawn over one another and only the push parts them.
            const camera = d.graph.scene.activeCamera?.position;
            const p0 = places(d.graph, ["P0"]).get("P0");
            assert.isDefined(camera);
            assert.isDefined(p0);
            if (camera === undefined || p0 === undefined) {
                return;
            }
            const toward = [camera.x - p0[0], camera.y - p0[1], camera.z - p0[2]];
            const length = Math.hypot(...toward);
            const seeded = ["V0", "V1", "V2"];
            const along = (step: number): { x: number; y: number; z: number } => {
                const [x, y, z] = p0.map((v, i) => v + (toward[i] / length) * 0.5 * (step + 1));
                return { x, y, z };
            };
            layoutManagerInternals.seedPlaces(
                d.graph.getLayoutManager(),
                new Map(seeded.map((id, step) => [id, along(step)])),
            );
            await d.draft.display(true, { hold: true });
            await d.graph.waitForStableFrame();
            const spots = seeded.map((id) => d.graph.nodeScreenPosition(id));
            let pairs = 0;
            for (const [i, a] of spots.entries()) {
                for (const b of spots.slice(i + 1)) {
                    assert.isDefined(a);
                    assert.isDefined(b);
                    if (a === undefined || b === undefined) {
                        return;
                    }
                    assert.isAtLeast(Math.hypot(a.x - b.x, a.y - b.y), a.radius + b.radius, "drawn clear");
                    pairs++;
                }
            }
            assert.strictEqual(pairs, 3, "every pair of seeded visits is measured");
        },
    );

    test("without hold the layout runs over the whole of After, as over any graph", async () => {
        const d = await drawn();
        const was = places(d.graph, PEOPLE);
        link(d);
        await d.draft.display(true);
        await d.graph.waitForStableFrame();
        assert.isAbove(farthest(was, places(d.graph, PEOPLE)), 0);
    });

    test("a join that removes nodes holds the rest, and Before has them back in place", async () => {
        const d = await drawn();
        const was = places(d.graph, PEOPLE);
        d.draft.removeSource(d.session.data.sources()[0]?.key ?? "");
        d.draft.add(d.visits);
        await d.draft.display(true, { hold: true });
        await d.graph.waitForStableFrame();
        assert.lengthOf(d.session.data.nodes(), 12, "only the visits");
        await d.draft.show("before");
        await d.graph.waitForStableFrame();
        assert.strictEqual(farthest(was, places(d.graph, PEOPLE)), 0);
    });

    test("a commit that empties the graph lands while the preview held it", async () => {
        const d = await drawn();
        d.draft.removeSource(d.session.data.sources()[0]?.key ?? "");
        await d.draft.display(true, { hold: true });
        await d.draft.commit();
        assert.lengthOf(d.session.data.nodes(), 0);
    });

    test("a scoped layout's own hold outlives the preview, and its release leaves the preview held", async () => {
        const d = await drawn(async (graph) => {
            await graph.setLayout("ngraph", {}, { scope: { nodes: ["P0", "P1"] } });
        });
        const was = places(d.graph, PEOPLE);
        link(d);
        await d.draft.display(true, { hold: true });
        await d.graph.waitForStableFrame();
        assert.strictEqual(farthest(was, places(d.graph, PEOPLE)), 0, "the scope's members too");
        const manager = d.graph.getLayoutManager();
        const mask = (): unknown => manager.layoutEngine?.holdMask ?? null;
        layoutManagerInternals.holdDraft(manager, null, false);
        assert.isNotNull(mask(), "the scope still holds the rest");
        layoutManagerInternals.holdDraft(manager, new Set(PEOPLE), false);
        // The set the scope names is removed: its hold goes, the preview's stays.
        manager.setScopeSource({ canonical: (scope) => scope as never, detached: () => true, members: () => [] });
        manager.releaseDetachedScope();
        await d.graph.waitForStableFrame();
        assert.strictEqual(farthest(was, places(d.graph, PEOPLE)), 0, "still held");
        await d.draft.display(false);
        await d.graph.waitForStableFrame();
        assert.isNull(mask(), "nothing is held once both are gone");
    });
});
