/**
 * A group's Values tab lists the values over-represented in the group, as graphty-element's
 * `session.data.overRepresented` reports them, with the adjusted p and the correction it applied.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { type GraphSession, RESULT_SHAPE_CONTRACTS } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Two rings of six joined by one bridge; each ring's nodes carry their own side. */
const NODES = Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}`, side: i < 6 ? "left" : "right" }));
const ring = (from: number): { source: string; target: string }[] =>
    Array.from({ length: 6 }, (_, i) => ({
        source: `n${String(from + i)}`,
        target: `n${String(from + ((i + 1) % 6))}`,
    }));
const EDGES = [...ring(0), ...ring(6), { source: "n0", target: "n6" }];

describe("a group's over-represented values", () => {
    it("lists the side its members share, with the adjusted p and the correction", async () => {
        const store = createWorkspaceStore({ project: { name: "Two rings", id: 1 } });
        render(<Workspace store={store} />);
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
        await live.data.addEdges(EDGES);
        const run = live.runs.start("louvain");
        await act(async () => {
            await run;
            await live.styles.settled();
        });

        const louvain = live.runs.get(run.id);
        const field = louvain === undefined ? null : RESULT_SHAPE_CONTRACTS[louvain.shape].primaryField;
        if (louvain === undefined || field === null) {
            throw new Error("Louvain left no grouping");
        }
        const profile = live.data.overRepresented(live.results.path(run.id, field));
        const top = profile.groups.find((group) => group.values.some((row) => row.path === "data.side"));
        const side = top?.values.find((row) => row.path === "data.side");
        if (top === undefined || side === undefined) {
            throw new Error("no group has an over-represented side");
        }
        assert.isBelow(side.adjustedP, 0.05);

        act(() => {
            store.set({
                inspected: { kind: "group-row", id: JSON.stringify([run.id, top.group]) },
                tabs: { "group-row": "values" },
            });
        });
        const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
        const section = await inspector.findByRole("group", { name: "Over-represented" });
        const text = section.textContent;
        assert.include(text, "Adjusted p (Benjamini-Hochberg)");
        assert.include(text, `: ${String(side.value)}`);
    });
});
