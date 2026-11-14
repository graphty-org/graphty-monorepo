/**
 * The Timeline Hidden starting row: one ordinary row selecting the state "outsideWindow", added
 * with the starting rows while the timeline is on, in the look the project setting
 * `timelineHiddenLook` names. It is the reader's row: deleted, it stays gone across a save and an
 * open, it never comes twice, and a project saved with its older name (Ghost) opens with that row.
 */

import { assert, beforeAll, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { setDefaultFeatures } from "../../../src/features/resolve";

beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

/**
 * A small timed graph with the starting rows drawn.
 * @param options - The look, and the session's features.
 * @param options.look - The Timeline Hidden row's look, when set.
 * @param options.features - The features; the default ones when absent.
 * @returns The session.
 */
async function timed(options: { look?: "hidden" | "ghost"; features?: string[] } = {}): Promise<GraphSession> {
    const session = createGraphSession(options.features === undefined ? {} : { features: options.features });
    await session.config.set({
        startingRows: true,
        ...(options.look === undefined ? {} : { timelineHiddenLook: options.look }),
    });
    const nodes = Array.from({ length: 4 }, (_, i) => ({ id: `n${String(i)}`, t: i }));
    await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes, edges: [] }) } });

    return session;
}

/**
 * The layers of the rows a name names, the test's way of finding them.
 * @param session - The session.
 * @param name - The row's name.
 * @returns The layers.
 */
function named(session: GraphSession, name: string): ReturnType<GraphSession["styles"]["list"]>[number][] {
    return session.styles.list().filter((layer) => layer.name === name);
}

/**
 * Open a project's text in a new session.
 * @param text - The project.
 * @returns The session.
 */
async function reopen(text: string): Promise<GraphSession> {
    const opened = createGraphSession();
    await opened.project.open(text);

    return opened;
}

describe("the Timeline Hidden row", () => {
    it("is added once with the starting rows, hiding what lies outside, directly below Selected", async () => {
        const session = await timed();
        const parts = named(session, "Timeline Hidden");
        assert.lengthOf(parts, 2);
        assert.sameMembers(
            parts.map((layer) => layer.target),
            ["node", "edge"],
        );
        for (const layer of parts) {
            assert.deepEqual(layer.selector, { match: "state", state: "outsideWindow" });
            assert.strictEqual(layer.set?.[`${layer.target}.visible`], false);
        }

        const tree = session.styles.tree().map((row) => row.name);
        assert.strictEqual(tree.indexOf("Timeline Hidden"), tree.indexOf("Selected") - 1, tree.join(", "));
        assert.strictEqual(session.config.timelineHiddenLook, "hidden");

        // Asked again, nothing comes twice.
        await session.styles.restoreStartingRows();
        await session.config.set({ startingRows: true, editableBase: true });
        assert.lengthOf(named(session, "Timeline Hidden"), 2);
        session.dispose();
    });

    it("starts ghosted when the project setting says so, and the setting never rewrites the row", async () => {
        const session = await timed({ look: "ghost" });
        const node = named(session, "Timeline Hidden").find((layer) => layer.target === "node");
        assert.deepInclude(node?.set ?? {}, { "node.color": "#9E9E9E", "node.opacity": 0.2 });
        assert.strictEqual(node?.set?.["node.visible"], true);
        assert.strictEqual(session.time.settings.outside, "ghost", "the look the row draws is the one it reports");

        await session.config.set({ timelineHiddenLook: "hidden" });
        const after = named(session, "Timeline Hidden").find((layer) => layer.target === "node");
        assert.deepStrictEqual(after?.set, node?.set);
        session.dispose();
    });

    it("stays deleted across a save and an open, and a saved one never comes twice", async () => {
        const session = await timed();
        const kept = await reopen((await session.project.save()).text);
        assert.lengthOf(named(kept, "Timeline Hidden"), 2, "opened once, not twice");
        const again = await reopen((await kept.project.save()).text);
        assert.lengthOf(named(again, "Timeline Hidden"), 2);

        const row = session.styles.tree().find((each) => each.name === "Timeline Hidden");
        await session.styles.deleteRow(row?.id ?? "");
        assert.lengthOf(named(session, "Timeline Hidden"), 0);
        const opened = await reopen((await session.project.save()).text);
        assert.lengthOf(named(opened, "Timeline Hidden"), 0);
        for (const each of [session, kept, again, opened]) {
            each.dispose();
        }
    });

    it("opens a project saved with the row's older name, Ghost, with that row intact", async () => {
        const session = await timed({ look: "ghost" });
        const text = (await session.project.save()).text
            .replaceAll("graphty:timeline-hidden", "graphty:timeline-ghost")
            .replaceAll('"Timeline Hidden"', '"Ghost"');
        session.dispose();
        assert.include(text, "graphty:timeline-ghost");

        const opened = await reopen(text);
        const ghost = named(opened, "Ghost");
        assert.lengthOf(ghost, 2);
        for (const layer of ghost) {
            assert.deepEqual(layer.selector, { match: "state", state: "outsideWindow" });
        }

        assert.lengthOf(named(opened, "Timeline Hidden"), 0, "the older row selects the state already");
        opened.dispose();
    });

    it("opens a reader's layer reading ghosted and a ghost-look row exactly as saved", async () => {
        const session = await timed({ look: "ghost" });
        await session.time.setField({ nodes: { start: "t" } });
        await session.time.window({ from: 1, to: 3 });
        await session.styles.add({
            name: "Held tint",
            target: "node",
            selector: { match: "state", state: "ghosted" },
            set: { "node.color": "#FF0000" },
        });
        const before = session.styles
            .list()
            .map((layer) => ({ name: layer.name, selector: layer.selector, set: layer.set }));

        const opened = await reopen((await session.project.save()).text);
        const after = opened.styles
            .list()
            .map((layer) => ({ name: layer.name, selector: layer.selector, set: layer.set }));
        assert.deepEqual(after, before);
        assert.strictEqual(opened.time.settings.outside, "ghost");
        for (const each of [session, opened]) {
            each.dispose();
        }
    });

    it("opens an older timed file, saved with the default Hide and no Ghost row, hiding what lies outside", async () => {
        const session = createGraphSession();
        const nodes = Array.from({ length: 4 }, (_, i) => ({ id: `n${String(i)}`, t: i }));
        await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes, edges: [] }) } });
        await session.time.setField({ nodes: { start: "t" } });
        await session.time.window({ from: 1, to: 3 });
        const saved = (await session.project.save()).text;
        session.dispose();
        // An older writer did not mark that the layers say how what lies outside draws.
        const document = JSON.parse(saved) as { members: { kind: string; visibility?: Record<string, unknown> }[] };
        const member = document.members.find((each) => each.kind === "graphty-session");
        assert.isTrue(member?.visibility?.outsideByLayers);
        delete member?.visibility?.outsideByLayers;
        const older = JSON.stringify(document);

        const opened = await reopen(older);
        const hiding = opened.styles
            .list()
            .filter((layer) => layer.selector.match === "state" && layer.selector.state === "outsideWindow");
        assert.sameMembers(
            hiding.map((layer) => layer.set?.[`${layer.target}.visible`]),
            [false, false],
        );
        assert.strictEqual(opened.time.settings.outside, "hide");
        opened.dispose();
    });

    it("is not added while the timeline is off", async () => {
        const session = await timed({ features: [] });
        assert.lengthOf(named(session, "Timeline Hidden"), 0);
        assert.lengthOf(named(session, "Selected"), 2);
        session.dispose();
    });
});
