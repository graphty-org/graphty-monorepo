/**
 * The Data place's Runs (the `selection-workspace` experiment) on the REAL graphty-element: Show on
 * a run that paints nothing paints that run as it is, from the result it holds, even after a filter
 * left it out of date -- it never starts a second run beside it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// The Runs section is drawn only while the `selection-workspace` experiment is on.
withFeatures(["selection-workspace"]);

/** A triangle with a tail: the degree-2 filter keeps the triangle. */
const CSV = "source,target\nAva,Ben\nBen,Lee\nLee,Ava\nLee,Dev\nDev,Zed\n";

describe("Show on an unpainted run", () => {
    it("paints the run as it is, after a filter, without running it again", async () => {
        await page.viewport(1440, 900);
        const store = createWorkspaceStore({ project: { name: "Friends", id: 1 }, place: "data" });
        render(<Workspace store={store} />);
        const session = await waitFor(() => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        });
        await session.data.import({ type: "csv", config: { data: CSV } });
        // As a card's run is: computed, painting nothing.
        const run = session.runs.start("pagerank", undefined, { style: false });
        await run;
        await session.visibility.set({ kind: "degree", min: 2 });
        await waitFor(() => {
            assert.isNotNull(run.stale, "the filter left it out of date");
        });

        const runs = await screen.findByRole("list", { name: "Runs" });
        await userEvent.click(within(runs).getByRole("button", { name: "Show" }));

        await waitFor(() => {
            assert.isAbove(session.runs.bindings(run.id).length, 0, "its layer is on the stack");
        });
        assert.lengthOf(
            session.runs.list().filter((each) => each.algorithm === "pagerank"),
            1,
            "no second run beside it",
        );
        assert.isNotNull(run.stale, "the result it painted is the one it held");
    });
});
