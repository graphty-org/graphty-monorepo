/**
 * @file The `"pinned"` element state and the Pinned default row: written once with the default
 * rows when `pinnedStyle` is set, absent otherwise, an ordinary row from then on, painting the
 * nodes a real pin pins and no other.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";

/** The look a consumer sets for a pinned node. */
const LOOK = { color: "#868e96", scale: 1.12, opacity: 1 } as const;

/**
 * A session holding a triangle, drawing the default rows.
 * @param config - Settings written with `startingRows`.
 * @returns The session.
 */
async function triangle(config: Parameters<GraphSession["config"]["set"]>[0] = {}): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ]);
    await session.config.set({ startingRows: true, ...config });
    return session;
}

/**
 * The Pinned row's node layer, if there is one.
 * @param session - The session.
 * @returns Its id.
 */
function pinnedLayer(session: GraphSession): string | undefined {
    return session.styles
        .list()
        .find((layer) => layer.source.by === "template" && layer.source.templateId === "graphty:starting-pinned")?.id;
}

/**
 * The Ghost row, which the starting rows include only with the timeline experiment on.
 * @param session - The session.
 * @returns The Ghost row's name and pin, or nothing with the timeline off.
 */
function ghost(session: GraphSession): [string, string][] {
    return session.features.enabled.includes("timeline") ? [["Ghost", "top"]] : [];
}

/**
 * The halo color a node is drawn with.
 * @param session - The session.
 * @param node - The node.
 * @returns The color as upper-case hex, or undefined.
 */
function halo(session: GraphSession, node: string): string | undefined {
    return session.styles.explain({ node }).merged["node.haloColor"]?.hex.toUpperCase();
}

describe("the Pinned row", () => {
    it("is absent without pinnedStyle, so the starting rows are unchanged", async () => {
        const session = await triangle();
        assert.isUndefined(session.config.pinnedStyle);
        assert.deepStrictEqual(
            session.styles.tree().map((each) => [each.name, each.pin]),
            [["Everything", "bottom"], ...ghost(session), ["Selected", "top"], ["Hovered", "top"]],
        );
        // Set later, the setting writes no row: the default rows were written when the project began.
        await session.config.set({ pinnedStyle: LOOK });
        assert.isUndefined(pinnedLayer(session));
        session.dispose();
    });

    it("arrives directly below Selected with the default rows, and is an ordinary row from then on", async () => {
        const session = await triangle({ pinnedStyle: LOOK });
        assert.deepStrictEqual(
            session.styles.tree().map((each) => each.name),
            ["Everything", ...ghost(session).map(([name]) => name), "Pinned", "Selected", "Hovered"],
        );
        assert.deepStrictEqual(session.styles.get(pinnedLayer(session) ?? "")?.set, {
            "node.haloColor": "#868E96",
            "node.haloScale": 1.12,
            "node.haloOpacity": 1,
        });

        // Clearing or changing the setting leaves the row as it is.
        await session.config.set({ pinnedStyle: undefined });
        assert.isDefined(pinnedLayer(session));
        await session.config.set({ pinnedStyle: { ...LOOK, color: "#ff0000" } });
        assert.strictEqual(session.styles.get(pinnedLayer(session) ?? "")?.set?.["node.haloColor"], "#868E96");

        // Deleted, it stays deleted whatever the setting says; undo brings it back.
        const row = session.styles.tree().find((each) => each.name === "Pinned");
        await session.styles.deleteRow(row?.id ?? "");
        assert.isUndefined(pinnedLayer(session));
        await session.config.set({ pinnedStyle: LOOK });
        assert.isUndefined(pinnedLayer(session));
        await session.undo();
        await session.undo();
        assert.isDefined(pinnedLayer(session));
        session.dispose();
    });

    it("paints a pinned node through a row the reader adds, like any other row", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.styles.addRow({
            name: "Held in place",
            target: "node",
            selector: { match: "state", state: "pinned" },
            set: { "node.haloColor": "#123456", "node.haloScale": 1.2, "node.haloOpacity": 1 },
        });
        await session.positions.pin(["a"]);
        await session.styles.settled();
        assert.strictEqual(halo(session, "a"), "#123456");
        assert.isUndefined(halo(session, "b"));
        session.dispose();
    });

    it("paints a node pinned through the positions API and leaves an unpinned one untouched", async () => {
        const session = await triangle({ pinnedStyle: LOOK });
        const layer = pinnedLayer(session) ?? "";
        assert.strictEqual(session.styles.counts(layer).matched, 0);
        assert.isUndefined(halo(session, "a"));

        await session.positions.pin(["a"]);
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(layer).matched, 1);
        assert.strictEqual(halo(session, "a"), "#868E96");
        assert.isUndefined(halo(session, "b"));

        await session.positions.unpin(["a"]);
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(layer).matched, 0);
        assert.isUndefined(halo(session, "a"));

        // Undo pins it again.
        await session.undo();
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(layer).matched, 1);
        session.dispose();
    });

    it("saves pinnedStyle with the project only when it is set", async () => {
        const session = await triangle();
        const plain = createGraphSession();
        await plain.project.open((await session.project.save()).text, { discard: true });
        assert.isUndefined(plain.config.pinnedStyle);

        await session.config.set({ pinnedStyle: LOOK });
        const reopened = createGraphSession();
        await reopened.project.open((await session.project.save()).text, { discard: true });
        assert.deepInclude(reopened.config.pinnedStyle ?? {}, { color: "#868E96", scale: 1.12, opacity: 1 });
        session.dispose();
        plain.dispose();
        reopened.dispose();
    });

    it("reopens a project into a session with the same settings with exactly its saved rows", async () => {
        const session = await triangle({ pinnedStyle: LOOK });
        const saved = session.styles.toDocument();
        const reopened = createGraphSession();
        await reopened.config.set({ startingRows: true, pinnedStyle: LOOK });
        await reopened.project.open((await session.project.save()).text, { discard: true });
        assert.deepStrictEqual(
            reopened.styles.tree().map((each) => each.name),
            ["Everything", ...ghost(reopened).map(([name]) => name), "Pinned", "Selected", "Hovered"],
        );
        assert.deepStrictEqual(reopened.styles.toDocument(), saved);
        session.dispose();
        reopened.dispose();
    });
});
