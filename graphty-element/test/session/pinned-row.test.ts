/**
 * @file The `"pinned"` element state and the Pinned starting row the `pinnedStyle` project
 * setting adds: absent by default, painting the nodes a real pin pins and no other.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";

/** The look a consumer sets for a pinned node. */
const LOOK = { color: "#868e96", scale: 1.12, opacity: 1 } as const;

/**
 * A session holding a triangle, drawing the starting rows.
 * @returns The session.
 */
async function triangle(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ]);
    await session.config.set({ startingRows: true });
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
            [
                ["Everything", "bottom"],
                ["Selected", "top"],
                ["Hovered", "top"],
            ],
        );
        await session.styles.restoreStartingRows();
        assert.isUndefined(pinnedLayer(session));
        session.dispose();
    });

    it("arrives directly below Selected with the setting, and goes with it", async () => {
        const session = await triangle();
        await session.config.set({ pinnedStyle: LOOK });
        assert.deepStrictEqual(
            session.styles.tree().map((each) => each.name),
            ["Everything", "Pinned", "Selected", "Hovered"],
        );
        assert.deepStrictEqual(session.styles.get(pinnedLayer(session) ?? "")?.set, {
            "node.haloColor": "#868E96",
            "node.haloScale": 1.12,
            "node.haloOpacity": 1,
        });

        // Deleted, it comes back with restoreStartingRows while the setting is set.
        const row = session.styles.tree().find((each) => each.name === "Pinned");
        await session.styles.deleteRow(row?.id ?? "");
        assert.isUndefined(pinnedLayer(session));
        await session.styles.restoreStartingRows();
        assert.isDefined(pinnedLayer(session));

        await session.config.set({ pinnedStyle: undefined });
        assert.isUndefined(pinnedLayer(session));
        await session.undo();
        assert.isDefined(pinnedLayer(session));
        session.dispose();
    });

    it("paints a node pinned through the positions API and leaves an unpinned one untouched", async () => {
        const session = await triangle();
        await session.config.set({ pinnedStyle: LOOK });
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
        const session = await triangle();
        await session.config.set({ pinnedStyle: LOOK });
        const saved = session.styles.toDocument();
        const reopened = createGraphSession();
        await reopened.config.set({ startingRows: true, pinnedStyle: LOOK });
        await reopened.project.open((await session.project.save()).text, { discard: true });
        assert.deepStrictEqual(
            reopened.styles.tree().map((each) => each.name),
            ["Everything", "Pinned", "Selected", "Hovered"],
        );
        assert.deepStrictEqual(reopened.styles.toDocument(), saved);
        session.dispose();
        reopened.dispose();
    });
});
