/**
 * Style panel v2 on several layers at once, on the REAL graphty-element (design/ui/style-panel-v2/design.md,
 * section 10.4 and acceptance check 12): a folder and a two-row selection open v2, a write reaches
 * both layers, layers holding different values draw today's "Layer" field, and a thing's minus takes
 * it off both in one undo step. Find a setting draws v2's own lines.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openProject, openStyle, sectionOf } from "./v2Harness";

/**
 * Adds two layers over every node, each with its own size, in a folder "Both".
 * @param session - the session.
 * @param sizes - each layer's node size.
 * @returns the two layers' ids.
 */
async function twoInAFolder(session: GraphSession, sizes: readonly [number, number]): Promise<string[]> {
    const ids: string[] = [];
    for (const [at, size] of sizes.entries()) {
        const { id } = await session.styles.add({
            name: `Part ${String(at + 1)}`,
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": size, "node.shape": "box" },
        });
        ids.push(id);
    }
    const folder = await session.styles.addFolder("Both");
    for (const id of ids) {
        await session.styles.moveRow(session.styles.get(id)?.row ?? id, { parent: folder.id });
    }
    await session.styles.settled();
    return ids;
}

/**
 * What a layer sets for a channel.
 * @param session - the session.
 * @param id - the layer.
 * @param channel - the channel.
 * @returns the value.
 */
function valueOf(session: GraphSession, id: string, channel: string): unknown {
    return (session.styles.get(id)?.set as Record<string, unknown> | undefined)?.[channel];
}

describe("Style panel v2 on several layers", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("a folder opens v2 and its Size line writes both layers", async () => {
        const { session } = await openProject();
        const ids = await twoInAFolder(session, [2, 2]);
        const tab = await openStyle("Both");
        const shape = sectionOf(tab, "node-shape");
        const size = await waitFor(() => {
            const found = shape.querySelector<HTMLElement>('.ws-row[data-line="node.size"] input');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.tripleClick(size);
        await userEvent.keyboard("5{Enter}");
        await waitFor(() => {
            assert.deepEqual(
                ids.map((id) => valueOf(session, id, "node.size")),
                [5, 5],
            );
        });
    });

    it("layers holding different sizes draw the Layer field, and the minus takes the shape off both in one step", async () => {
        const { session } = await openProject();
        const ids = await twoInAFolder(session, [2, 3]);
        const tab = await openStyle("Both");
        const shape = sectionOf(tab, "node-shape");
        await waitFor(() => {
            const line = shape.querySelector<HTMLElement>('.ws-row[data-line="node.size"]');
            assert.isNotNull(line);
            assert.isNotNull(within(line).queryByRole("button", { name: /: from each layer, / }));
        });
        const row = shape.querySelector<HTMLElement>('[data-thing="shape"]');
        assert.isNotNull(row);
        await userEvent.click(within(row).getByRole("button", { name: /^Remove node shape/ }));
        await waitFor(() => {
            assert.deepEqual(
                ids.map((id) => [valueOf(session, id, "node.shape"), valueOf(session, id, "node.size")]),
                [
                    [undefined, undefined],
                    [undefined, undefined],
                ],
            );
        });
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.deepEqual(
                ids.map((id) => [valueOf(session, id, "node.shape"), valueOf(session, id, "node.size")]),
                [
                    ["box", 2],
                    ["box", 3],
                ],
                "one Undo brings both back",
            );
        });
    });

    it("two rows picked together open v2", async () => {
        const { session, id } = await openProject();
        const { id: other } = await session.styles.add({
            name: "Others",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#228BE6" },
        });
        await session.styles.settled();
        await openStyle("Key people");
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.keyboard("{Control>}");
        await userEvent.click(within(tree).getByRole("treeitem", { name: /^Others, / }));
        await userEvent.keyboard("{/Control}");
        await showKind("node");
        const tab = await screen.findByTestId("style-tab");
        const shape = await waitFor(() => sectionOf(tab, "node-shape"));
        await userEvent.click(within(shape).getByRole("button", { name: "Add Shape" }));
        await waitFor(() => {
            const shapes = [id, other].map((each) => valueOf(session, each, "node.shape"));
            assert.isString(shapes[0]);
            assert.equal(shapes[1], shapes[0], "both layers get the shape");
        });
    });

    it("Find a setting draws v2's lines and names no other layer", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        await userEvent.click(within(tab).getByRole("searchbox", { name: "Find a setting" }));
        await userEvent.keyboard("corners");
        const result = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>("[data-find-results] [data-result]");
            assert.isNotNull(found, "a sub-group's name finds its lines");
            return found;
        });
        assert.isNotNull(result.querySelector(".ws-row[data-rule]"), "the line is v2's");
        assert.isNull(tab.querySelector(".ws-also-set"), "no other layer is named");
        assert.equal(valueOf(session, id, "node.color"), "#E8590C");
    });
});
