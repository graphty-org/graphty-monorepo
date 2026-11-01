/**
 * A row the reader clicks in the table dock is a selection made by hand, exactly like a click on
 * the canvas: on the REAL graphty-element it switches a filter's select condition off, so the
 * filter card never claims a selection that is gone, and undo switches it back on.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { Workspace } from "../../Workspace";

const NODES = Array.from({ length: 6 }, (_, i) => ({ id: `n${String(i)}`, team: i < 3 ? "North" : "South" }));

describe("a table row click and a select condition", () => {
    beforeAll(async () => {
        // Wide enough for the canvas, the dock and both side panels side by side.
        await page.viewport(1366, 900);
    });

    it("switches the select condition off, keeps the reader's row selected, and undo switches it back on", async () => {
        render(<Workspace initialState={{ project: { name: "Untitled", id: 1 } }} />);
        let session: GraphSession | undefined;
        await waitFor(() => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        });
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        const live = session;
        await live.data.addNodes(NODES);
        await live.visibility.addCondition({
            id: "north",
            effect: "select",
            rule: { kind: "categories", attribute: "data.team", values: ["North"] },
        });
        assert.sameMembers(live.selection.nodes.map(String), ["n0", "n1", "n2"], "the condition selected North");

        await userEvent.keyboard("{Shift>}T{/Shift}");
        const dock = await screen.findByRole("region", { name: "Table" });
        await within(dock).findByText("6 nodes");
        await userEvent.click(within(dock).getAllByRole("rowheader", { name: "n4" })[0]);

        await waitFor(() => {
            assert.isFalse(live.visibility.conditions[0]?.on, "the reader's row click switched the condition off");
        });
        assert.deepEqual(live.selection.nodes.map(String), ["n4"], "the reader's selection stands");

        await live.undo();
        assert.isTrue(live.visibility.conditions[0]?.on, "undo switches the condition back on");
    });
});
