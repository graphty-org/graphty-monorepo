/**
 * A turn's change lines read once: identical lines fold, only the last selection has a line, and
 * "and {N} more" opens the rest of the lines where they are, with focus on the first of them.
 */
import type { AiEffect } from "@graphty/graphty-element/catalog";
import React from "react";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { ChangeRows } from "../Checks";
import { changeLines } from "../words";

const sized = (nodes: number): AiEffect => ({ code: "AI_EFFECT_STYLE", params: { channel: "node.size", nodes } });
const selected = (nodes: number): AiEffect => ({ code: "AI_EFFECT_SELECTION", params: { nodes } });
const run = (algorithm: string): AiEffect => ({ code: "AI_EFFECT_RUN", params: { run: algorithm, algorithm } });

describe("ChangeRows", () => {
    it("folds identical lines and keeps only the last selection", () => {
        const lines = changeLines(null, [selected(5), sized(9), selected(5), sized(9), selected(2)]);
        assert.deepEqual(lines, ["Sized 9 nodes", "Selected 2 nodes"]);
    });

    it("opens the rest of the lines in place, not the steps", async () => {
        const store = createWorkspaceStore();
        const value = makeWorkspaceValue(store, createRegistry(REGISTRATIONS), null, null);
        let more = 0;
        const changes = ["a", "b", "c", "d", "e"].map(run);
        render(
            <WorkspaceContext.Provider value={value}>
                <ChangeRows
                    changes={changes}
                    provenance={undefined}
                    undone={false}
                    onMore={() => {
                        more += 1;
                    }}
                />
            </WorkspaceContext.Provider>,
        );
        assert.isNull(screen.queryByText("Computed d"));
        // Each line starts with the layers glyph, left of its words.
        const first = screen.getByText("Computed a");
        const mark = first.parentElement?.querySelector("svg");
        assert.isOk(mark);
        assert.isBelow(mark.getBoundingClientRect().right, first.getBoundingClientRect().left + 1);
        await userEvent.click(screen.getByRole("button", { name: "and 2 more" }));
        assert.strictEqual(more, 1);
        assert.isNull(screen.queryByRole("button", { name: "and 2 more" }));
        const fourth = await screen.findByText("Computed d");
        assert.isOk(screen.getByText("Computed e"));
        assert.strictEqual(document.activeElement, fourth);
    });
});
