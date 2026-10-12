/**
 * @file The style tree: folders, pins, the reader's lock and the eye, read back through what the
 * stack paints (`styles.explain`), what it saves, and what undo takes back.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import type { LayerSpec } from "../../src/catalog/types";
import { isGraphtyError } from "../../src/errors";

/**
 * A layer painting every node one color.
 * @param name - Its name.
 * @param color - Its color.
 * @returns The specification.
 */
function paint(name: string, color: string): LayerSpec {
    return { name, target: "node", selector: { match: "everything" }, set: { "node.color": color } };
}

/**
 * A session with three nodes.
 * @returns The session.
 */
async function threeNodes(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    return session;
}

/**
 * The layer that decides node a's color.
 * @param session - The session.
 * @returns Its id, or undefined when nothing the consumer added paints it.
 */
function colorOfA(session: GraphSession): string | undefined {
    return session.styles.explain({ node: "a" }).channels.find((entry) => entry.channel === "node.color")?.layerId;
}

/**
 * The code a call refused with.
 * @param call - The call.
 * @returns The code, or null when it did not refuse.
 */
async function codeOf(call: () => PromiseLike<unknown>): Promise<string | null> {
    try {
        await call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

/**
 * The tree as names, bottom first, a folder as `name[children]`.
 * @param session - The session.
 * @returns The outline.
 */
function outline(session: GraphSession): string {
    const write = (rows: ReturnType<GraphSession["styles"]["tree"]>): string =>
        rows.map((row) => (row.kind === "folder" ? `${row.name}[${write(row.children)}]` : row.name)).join(",");
    return write(session.styles.tree());
}

describe("the style tree", () => {
    it("reads an existing stack as one row per layer, and leaves list() as it was", async () => {
        const session = await threeNodes();
        await session.styles.add(paint("Red", "#ff0000"));
        await session.styles.add(paint("Blue", "#0000ff"));
        const listed = session.styles.list();

        assert.strictEqual(outline(session), "Red,Blue");
        assert.deepEqual(
            session.styles.tree().map((row) => [row.kind, row.pin, row.locked, row.hidden]),
            [
                ["layer", "none", false, false],
                ["layer", "none", false, false],
            ],
        );
        assert.strictEqual(session.styles.tree(), session.styles.tree(), "the same array until the stack changes");
        assert.strictEqual(session.styles.list(), listed);
        assert.deepEqual(
            session.styles.list().map((layer) => [layer.name, layer.locked, layer.enabled, layer.target]),
            listed.map((layer) => [layer.name, layer.locked, layer.enabled, layer.target]),
        );
        assert.notProperty(session.styles.toDocument(), "tree", "a plain tree saves what it saved before");
        session.dispose();
    });

    it("paints in tree order: moving a folder below a layer changes what a node both paint is", async () => {
        const session = await threeNodes();
        const red = await session.styles.add(paint("Red", "#ff0000"));
        const blue = await session.styles.add(paint("Blue", "#0000ff"));
        const folder = await session.styles.addFolder("Annotations");
        await session.styles.moveRow(blue.id, { parent: folder.id });

        assert.strictEqual(outline(session), "Red,Annotations[Blue]");
        assert.strictEqual(colorOfA(session), blue.id, "Blue, in the folder above Red, paints a");

        await session.styles.moveRow(folder.id, { parent: null, index: 0 });

        assert.strictEqual(outline(session), "Annotations[Blue],Red");
        assert.strictEqual(colorOfA(session), red.id, "with the folder moved below Red, Red paints a");
        assert.deepEqual(
            session.styles.list().map((layer) => layer.name),
            session.styles
                .list()
                .filter((layer) => layer.locked)
                .map((layer) => layer.name)
                .concat(["Blue", "Red"]),
            "list() follows the tree",
        );
        session.dispose();
    });

    it("stops a hidden folder's rows painting, and keeps their layers as written", async () => {
        const session = await threeNodes();
        const red = await session.styles.add(paint("Red", "#ff0000"));
        const blue = await session.styles.add(paint("Blue", "#0000ff"));
        const folder = await session.styles.addFolder("Annotations");
        await session.styles.moveRow(blue.id, { parent: folder.id });

        await session.styles.hideRow(folder.id, true);

        assert.strictEqual(colorOfA(session), red.id, "the hidden folder's layer no longer paints a");
        assert.isTrue(session.styles.get(blue.id)?.enabled, "list() still says what its author wrote");
        assert.isFalse(
            session.styles.explain({ node: "a" }).contributions.some((entry) => entry.layerId === blue.id),
            "it paints nothing at all",
        );

        await session.styles.hideRow(folder.id, false);
        assert.strictEqual(colorOfA(session), blue.id);
        session.dispose();
    });

    it("keeps a row pinned to the bottom below a layer added later", async () => {
        const session = await threeNodes();
        const floor = await session.styles.add(paint("Everything", "#888888"));
        await session.styles.pinRow(floor.id, "bottom");
        await session.styles.add(paint("Later", "#00ff00"));
        await session.styles.add(paint("Below", "#0000ff"), { below: floor.id });

        assert.strictEqual(outline(session), "Everything,Below,Later");
        assert.strictEqual(session.styles.tree()[0]?.pin, "bottom");

        // A move out of its band puts it back in.
        await session.styles.moveRow(floor.id, { parent: null });
        assert.strictEqual(outline(session), "Everything,Below,Later");
        session.dispose();
    });

    it("refuses an update to a locked row, or to a row in a locked folder, with E_LOCKED", async () => {
        const session = await threeNodes();
        const red = await session.styles.add(paint("Red", "#ff0000"));
        const blue = await session.styles.add(paint("Blue", "#0000ff"));
        await session.styles.lockRow(red.id, true);

        assert.strictEqual(
            await codeOf(() => session.styles.update(red.id, { set: { "node.color": "#000000" } })),
            "E_LOCKED",
        );
        assert.strictEqual(session.styles.get(red.id)?.set?.["node.color"], "#ff0000");
        assert.isFalse(session.styles.get(red.id)?.locked, "the reader's lock is not Layer.locked");

        const folder = await session.styles.addFolder("Locked");
        await session.styles.moveRow(blue.id, { parent: folder.id });
        await session.styles.lockRow(folder.id, true);
        assert.strictEqual(await codeOf(() => session.styles.update(blue.id, { name: "x" })), "E_LOCKED");

        // A rename, a move and a delete still work on a locked row.
        await session.styles.renameRow(red.id, "Still red");
        assert.strictEqual(session.styles.get(red.id)?.name, "Still red");
        await session.styles.deleteRow(folder.id);
        assert.isUndefined(session.styles.get(blue.id));
        assert.strictEqual(outline(session), "Still red");
        session.dispose();
    });

    it("saves and reopens folders, pins, locks, hidden rows and order", async () => {
        const saved = await threeNodes();
        const red = await saved.styles.add(paint("Red", "#ff0000"));
        const blue = await saved.styles.add(paint("Blue", "#0000ff"));
        const green = await saved.styles.add(paint("Green", "#00ff00"));
        const folder = await saved.styles.addFolder("Annotations");
        await saved.styles.moveRow(blue.id, { parent: folder.id });
        await saved.styles.moveRow(red.id, { parent: folder.id, index: 1 });
        await saved.styles.pinRow(green.id, "bottom");
        await saved.styles.lockRow(folder.id, true);
        await saved.styles.hideRow(blue.id, true);
        const before = outline(saved);
        const { text } = await saved.project.save();

        const opened = createGraphSession();
        const report = await opened.project.open(text);

        assert.deepEqual(report.problems, []);
        assert.strictEqual(outline(opened), before);
        assert.strictEqual(before, "Green,Annotations[Blue,Red]");
        const [floor, annotations] = opened.styles.tree();
        assert.strictEqual(floor?.pin, "bottom");
        assert.isTrue(annotations?.locked);
        assert.isTrue(annotations?.children[0]?.hidden);
        assert.notStrictEqual(annotations?.id, undefined);
        assert.strictEqual(colorOfA(opened), annotations?.children[1]?.id, "Red, on top, paints a");
        saved.dispose();
        opened.dispose();
    });

    it("makes each call one undo step and one change event", async () => {
        const session = await threeNodes();
        const red = await session.styles.add(paint("Red", "#ff0000"));
        await session.styles.add(paint("Blue", "#0000ff"));
        let changes = 0;
        const stop = session.on("style:changed", () => {
            changes++;
        });

        const folder = await session.styles.addFolder("F");
        await session.styles.settled();
        const steps = session.history.steps.length;
        const verbs: [string, () => PromiseLike<unknown>][] = [
            ["renameRow", () => session.styles.renameRow(folder.id, "G")],
            ["moveRow", () => session.styles.moveRow(red.id, { parent: folder.id })],
            ["pinRow", () => session.styles.pinRow(folder.id, "bottom")],
            ["lockRow", () => session.styles.lockRow(folder.id, true)],
            ["hideRow", () => session.styles.hideRow(folder.id, true)],
            ["deleteRow", () => session.styles.deleteRow(folder.id)],
        ];
        const outlines = [outline(session)];
        for (const [, call] of verbs) {
            await call();
            await session.styles.settled();
            outlines.push(outline(session));
        }

        assert.strictEqual(session.history.steps.length, steps + verbs.length, "one step per call");
        assert.strictEqual(changes, verbs.length + 1, "one change event per call, the folder's included");
        assert.deepEqual(
            session.history.steps.slice(-verbs.length).map((step) => step.fact.code),
            [
                "style.rename-row",
                "style.move-row",
                "style.pin-row",
                "style.lock-row",
                "style.hide-row",
                "style.delete-row",
            ],
        );

        for (let at = verbs.length - 1; at >= 0; at--) {
            await session.undo();
            await session.styles.settled();
            assert.strictEqual(outline(session), outlines[at], `undo of ${verbs[at]?.[0] ?? ""}`);
        }

        const tree = session.styles.tree();
        assert.strictEqual(tree.find((row) => row.kind === "folder")?.name, "F");
        stop();
        session.dispose();
    });
});
