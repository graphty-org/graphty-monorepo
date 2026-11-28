/**
 * @file A layer's counts and the legend's drawn counts are kept across changes that cannot move
 * them (issue #10296): a layout switch, an edit of a color or a size, and a selection change for a
 * layer that reads the time window. The graphty app reads every layer's counts on each of these,
 * and each read walked the whole graph again.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { LayerSpec } from "../../../src/catalog/types";
import { countCounters, type StyleCounts } from "../../../src/session/styles/explain";
import { drawnCounters } from "../../../src/session/styles/StylesApi";

const NODES = 2000;

const KIND_ONE: LayerSpec = {
    name: "Kind one",
    target: "node",
    selector: { match: "rule", where: { kind: "categories", attribute: "data.kind", values: ["k1"] } },
    set: { "node.color": "#d55e00", "node.size": 2 },
};
const ARROWS: LayerSpec = {
    name: "Arrows",
    target: "edge",
    selector: { match: "everything" },
    set: { "edge.arrowHead": "normal", "edge.arrowHeadText": "to" },
};
const WINDOW: LayerSpec = {
    name: "Outside the window",
    target: "node",
    selector: { match: "state", state: "outsideWindow" },
    set: { "node.opacity": 0.2 },
};

/**
 * A chain of nodes with a node layer, an edge layer and a time-window layer.
 * @returns The session.
 */
async function chain(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.config.set({ startingRows: true });
    const nodes = Array.from({ length: NODES }, (_unused, i) => ({ id: `n${String(i)}`, kind: `k${String(i % 4)}` }));
    const edges = Array.from({ length: NODES - 1 }, (_unused, i) => ({
        source: `n${String(i)}`,
        target: `n${String(i + 1)}`,
    }));
    await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes, edges }) } });
    for (const spec of [KIND_ONE, ARROWS, WINDOW]) {
        await session.styles.add(spec);
    }
    await session.styles.settled();
    // A pass after the layers are added prepares the ones that matched nothing yet.
    const kind = session.styles.list().find((layer) => layer.name === KIND_ONE.name)?.id;
    assert.isDefined(kind);
    await session.styles.update(kind, { set: KIND_ONE.set });
    await session.styles.settled();
    return session;
}

/**
 * Every layer's counts and the legend, as a panel reads them.
 * @param session - The session.
 * @returns The counts by layer name, without the revision they carry.
 */
function readAll(session: GraphSession): Record<string, Omit<StyleCounts, "revision">> {
    session.styles.legend();
    return Object.fromEntries(
        session.styles.list().map((layer) => {
            const { revision: _revision, ...counts } = session.styles.counts(layer.id);
            return [layer.name, counts];
        }),
    );
}

/**
 * The walks a step costs the readers.
 * @param session - The session.
 * @param step - The change.
 * @returns The walks of the stack over an element and of the drawn elements through a selector.
 */
async function walksOf(session: GraphSession, step: () => PromiseLike<unknown>): Promise<number> {
    // The first reads of a new session settle what it reads lazily.
    readAll(session);
    readAll(session);
    const before = countCounters.walks + drawnCounters.walks;
    await step();
    await session.styles.settled();
    readAll(session);
    readAll(session);
    return countCounters.walks + drawnCounters.walks - before;
}

/**
 * The id of a layer by its name.
 * @param session - The session.
 * @param name - The name.
 * @returns The id.
 */
function idOf(session: GraphSession, name: string): string {
    const id = session.styles.list().find((layer) => layer.name === name)?.id;
    assert.isDefined(id);
    return id;
}

describe("styles.counts keeps what a change cannot move", () => {
    it("walks nothing for a switch between two flat layouts", async () => {
        const session = await chain();
        await session.layout.set("circular");
        await session.styles.settled();
        assert.strictEqual(await walksOf(session, () => session.layout.set("grid")), 0);
        session.dispose();
    });

    it("walks nothing for a color edit or a size edit", async () => {
        const session = await chain();
        const id = idOf(session, "Kind one");
        const edit = (set: LayerSpec["set"]) => () => session.styles.update(id, { set });
        assert.strictEqual(await walksOf(session, edit({ "node.color": "#0072b2", "node.size": 2 })), 0, "color");
        assert.strictEqual(await walksOf(session, edit({ "node.color": "#0072b2", "node.size": 3 })), 0, "size");
        session.dispose();
    });

    it("walks nothing for a selection change on a layer that reads the time window", async () => {
        const session = await chain();
        const id = idOf(session, "Outside the window");
        session.styles.counts(id);
        const before = countCounters.walks + drawnCounters.walks;
        await session.selection.apply({ ids: ["n1"] });
        session.styles.counts(id);
        await session.selection.apply({ ids: [] });
        session.styles.counts(id);
        assert.strictEqual(countCounters.walks + drawnCounters.walks - before, 0);
        session.dispose();
    });

    it("answers what a fresh session answers after each kept change", async () => {
        const session = await chain();
        readAll(session);
        await session.layout.set("grid");
        await session.styles.update(idOf(session, "Kind one"), {
            set: { "node.color": "#0072b2", "node.size": 3 },
        });
        await session.styles.settled();
        const kept = readAll(session);

        const fresh = createGraphSession();
        await fresh.config.set({ startingRows: true });
        const nodes = Array.from({ length: NODES }, (_unused, i) => ({
            id: `n${String(i)}`,
            kind: `k${String(i % 4)}`,
        }));
        const edges = Array.from({ length: NODES - 1 }, (_unused, i) => ({
            source: `n${String(i)}`,
            target: `n${String(i + 1)}`,
        }));
        await fresh.data.import({ type: "json", config: { data: JSON.stringify({ nodes, edges }) } });
        await fresh.layout.set("grid");
        for (const spec of [{ ...KIND_ONE, set: { "node.color": "#0072b2", "node.size": 3 } }, ARROWS, WINDOW]) {
            await fresh.styles.add(spec);
        }
        await fresh.styles.settled();
        assert.deepEqual(kept, readAll(fresh));
        session.dispose();
        fresh.dispose();
    });

    it("counts again after an edit of a value a count reads", async () => {
        const session = await chain();
        const id = idOf(session, "Arrows");
        const captions = (): number =>
            session.styles.counts(id).undrawn.filter((fact) => fact.code === "caption.noArrow").length;
        assert.strictEqual(captions(), 0);
        await session.styles.update(id, { set: { "edge.arrowHead": "none", "edge.arrowHeadText": "to" } });
        await session.styles.settled();
        assert.strictEqual(captions(), 1, "a caption on an end with no arrow is counted");
        session.dispose();
    });

    it("counts again after a set's members change, for a layer that names the set", async () => {
        const session = await chain();
        const set = session.sets.create({ kind: "fixed", nodes: ["n0", "n1"], reading: "listed" });
        const layer = await session.styles.add({
            name: "In the set",
            target: "node",
            selector: { match: "member", of: { set } },
            set: { "node.color": "#cc79a7" },
        });
        await session.styles.settled();
        const drawn = (): number | undefined => session.styles.counts(layer.id).visible?.matched;
        const legend = (): number | undefined =>
            session.styles.legend().find((block) => block.layerId === layer.id)?.scope?.count;
        assert.strictEqual(drawn(), 2);
        assert.strictEqual(legend(), 2);
        session.sets.redefine(set, { kind: "fixed", nodes: ["n0", "n1", "n2", "n3", "n4"], reading: "listed" });
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(layer.id).matched, 5);
        assert.strictEqual(drawn(), 5, "the drawn count follows the set");
        assert.strictEqual(legend(), 5, "and so does the legend");
        session.dispose();
    });

    it("counts the drawn elements again when the time window's layer turns from hiding to ghosting", async () => {
        /**
         * A timed chain with a window over its first half, its outside layer in one look.
         * @param look - The outside layer's look.
         * @returns The session.
         */
        const windowed = async (look: "hidden" | "ghost"): Promise<GraphSession> => {
            const session = createGraphSession();
            await session.config.set({ startingRows: true, timelineHiddenLook: look });
            const nodes = Array.from({ length: 8 }, (_unused, i) => ({ id: `n${String(i)}`, t: i }));
            await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes, edges: [] }) } });
            await session.time.setField({ nodes: { start: "t" } });
            await session.time.window({ from: 0, to: 3 });
            await session.styles.settled();
            return session;
        };
        const outside = (session: GraphSession): ReturnType<GraphSession["styles"]["list"]>[number] => {
            const layer = session.styles
                .list()
                .find(
                    (each) =>
                        each.target === "node" &&
                        each.selector.match === "state" &&
                        each.selector.state === "outsideWindow",
                );
            assert.isDefined(layer);
            return layer;
        };
        const drawn = (session: GraphSession): readonly unknown[] =>
            session.styles.list().map((layer) => session.styles.counts(layer.id).visible);

        const session = await windowed("hidden");
        const ghosted = await windowed("ghost");
        drawn(session);
        session.styles.legend();
        const layer = outside(session);
        await session.styles.update(layer.id, { set: outside(ghosted).set });
        await session.styles.settled();
        // What is drawn reads whether the window's layer hides: the drawn counts are read again.
        const before = drawnCounters.walks;
        assert.deepEqual(drawn(session), drawn(ghosted), "the drawn counts follow the look");
        assert.isAbove(drawnCounters.walks, before, "read again, not kept from the hiding look");
        session.dispose();
        ghosted.dispose();
    });

    it("still moves the revision a count carries on every style change", async () => {
        const session = await chain();
        const id = idOf(session, "Kind one");
        const before = session.styles.counts(id).revision;
        await session.styles.update(id, { set: { "node.color": "#0072b2", "node.size": 2 } });
        await session.styles.settled();
        assert.notStrictEqual(session.styles.counts(id).revision, before);
        session.dispose();
    });
});
