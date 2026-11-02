/**
 * Escape is the reader clearing the selection by hand, exactly like a click on empty canvas: on
 * the REAL graphty-element it switches a filter's select condition off, so the filter card never
 * claims a selection that is gone, and undo switches it back on.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, describe, it } from "vitest";

import { render, waitFor } from "../../../test/test-utils";
import { Workspace } from "../../Workspace";

const NODES = Array.from({ length: 6 }, (_, i) => ({ id: `n${String(i)}`, team: i < 3 ? "North" : "South" }));

describe("Escape and a select condition", () => {
    it("switches the select condition off, leaves nothing selected, and undo switches it back on", async () => {
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

        await userEvent.keyboard("{Escape}");

        await waitFor(() => {
            assert.isFalse(live.visibility.conditions[0]?.on, "the reader's Escape switched the condition off");
        });
        assert.strictEqual(live.selection.size, 0, "the reader's clear stands");

        await live.undo();
        assert.isTrue(live.visibility.conditions[0]?.on, "undo switches the condition back on");
    });
});
