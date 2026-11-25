/**
 * Style panel v2's Fill on the REAL graphty-element, by real clicks: a layer that writes a gradient in its older
 * two-color spelling (`node.gradientColor`, from the node's color into one more, as a file's styles write it) draws
 * the gradient bar from the colors graphty-element draws, and editing the bar writes the gradient list in their place
 * as one step of the history.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openProject, openStyle, sectionOf } from "./v2Harness";

describe("Style panel v2's Fill, a gradient in its two-color spelling", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("the bar starts from the node's color and the end color, and an edit writes the list in one step", async () => {
        const { session, id } = await openProject();
        await session.styles.update(id, { set: { "node.color": "#ff0000", "node.gradientColor": "#0000ff" } });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const fill = (): HTMLElement => sectionOf(tab, "node-fill");
        const bar = await waitFor(() => within(fill()).getByRole("button", { name: "Edit node gradient colors" }));
        await userEvent.click(bar);
        const editor = await screen.findByTestId("gradient-editor");
        const hexes = (): string[] =>
            within(editor)
                .getAllByTestId("gradient-editor-stop-hex")
                .map((box) => (box as HTMLInputElement).value.toUpperCase());
        assert.deepEqual(hexes(), ["FF0000", "0000FF"], "the colors graphty-element draws");
        const before = session.history.position;
        const [, last] = within(editor).getAllByTestId("gradient-editor-stop-hex");
        await userEvent.tripleClick(last);
        await userEvent.keyboard("00ff00{Enter}");
        await waitFor(() => {
            const set = session.styles.get(id)?.set ?? {};
            const colors = set["node.gradientColors"];
            assert.strictEqual(typeof colors === "string" ? colors.toUpperCase() : colors, "#FF0000 #00FF00");
            assert.notProperty(set, "node.gradientColor", "the older spelling is cleared");
        });
        assert.strictEqual(session.history.position, before + 1, "one step of the history");
        await session.undo();
        await waitFor(() => {
            const set = session.styles.get(id)?.set ?? {};
            assert.strictEqual(set["node.gradientColor"], "#0000ff", "undo brings the older spelling back");
            assert.notProperty(set, "node.gradientColors");
        });
    });
});
