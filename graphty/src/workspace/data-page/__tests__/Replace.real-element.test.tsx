/**
 * Replace with file... on the REAL graphty-element (tier2-design.md section 7): a graph's one
 * source is replaced by a file with the same people and new weights; the page says what changes,
 * the PageRank run goes out of date with its reason, and nothing reruns until the reader says so.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, LoadedSource } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { assert, describe, it } from "vitest";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { canReplace, replaceSource } from "../request";
import { replacedWords, replaceWords } from "../words";

/** A hang guard for the element coming up, loading and running, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

const FRIENDS = "source,target,weight\nAva,Ben,3\nBen,Chloe,4\nChloe,Ava,5\nChloe,Dev,1\n";
/** The same people and links, new weights. */
const FRIENDS_V2 = "source,target,weight\nAva,Ben,1\nBen,Chloe,2\nChloe,Ava,1\nChloe,Dev,5\n";

/**
 * A loaded source, as `data.sources()` lists it.
 * @param tables - its table names.
 * @returns the source.
 */
function source(tables: string[]): LoadedSource {
    return { name: "friends.csv", tables, added: { nodes: 4, edges: 4 } } as unknown as LoadedSource;
}

describe("Replace with file...", () => {
    it("is offered only on a graph made by one load of one table", () => {
        assert.isTrue(canReplace([source(["rows"])]));
        assert.isTrue(canReplace([source([])]));
        assert.isFalse(canReplace([]), "nothing loaded");
        assert.isFalse(canReplace([source(["rows"]), source(["rows"])]), "two loads");
        assert.isFalse(canReplace([source(["nodes", "edges"])]), "a node table and an edge table");
    });

    it("words what changes and what went out of date", () => {
        assert.equal(replaceWords({ nodes: 20, edges: 60 }, { nodes: 22, edges: 74 }), "Was 20 nodes, 60 edges; now 22, 74");
        assert.equal(
            replacedWords("friends.csv", { nodes: 22, edges: 74 }, 3),
            "friends.csv replaced: 22 nodes, 74 edges. 3 rows out of date",
        );
        assert.equal(replacedWords("friends.csv", { nodes: 1, edges: 1 }, 0), "friends.csv replaced: 1 node, 1 edge.");
    });

    it(
        "marks the PageRank run out of date with its reason, and Rerun brings it up to date",
        async () => {
            const store = createWorkspaceStore({ project: { name: "friends", id: 1 }, place: "graph" });
            render(<Workspace store={store} />);
            let session: GraphSession | undefined;
            await waitFor(
                () => {
                    session = document.querySelector("graphty-element")?.session;
                    assert.isDefined(session);
                },
                { timeout: TIMEOUT_MS },
            );
            if (session === undefined) {
                throw new Error("the element never came up");
            }
            const live = session;
            await live.data.import({ type: "csv", config: { data: FRIENDS }, name: "friends.csv" });
            const run = live.runs.start("pagerank");
            await act(async () => {
                await run;
                await live.styles.settled();
            });
            await screen.findByRole("treeitem", { name: "PageRank" });

            act(() => {
                replaceSource(store, live.data.sources()[0], new File([FRIENDS_V2], "friends-v2.csv"));
            });
            await screen.findByRole("heading", { name: "Replace: friends-v2.csv" });
            const report = await screen.findByTestId("replace-report", {}, { timeout: TIMEOUT_MS });
            assert.equal(report.textContent, "Was 4 nodes, 4 edges; now 4, 4");
            // Every column matches, so Load has focus and one Enter replaces.
            const load = screen.getByRole("button", { name: "Load" });
            await waitFor(() => {
                assert.strictEqual(document.activeElement, load);
            });
            await userEvent.keyboard("{Enter}");

            await waitFor(
                () => {
                    assert.equal(
                        store.get().announcement,
                        "friends.csv replaced: 4 nodes, 4 edges. 1 row out of date",
                    );
                },
                { timeout: TIMEOUT_MS },
            );
            assert.isDefined(live.runs.get(run.id), "the run is kept");
            assert.strictEqual(live.runs.get(run.id)?.stale?.reason, "data-changed");
            const row = await screen.findByRole("treeitem", { name: "PageRank, out of date" });

            await userEvent.click(row);
            const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
            assert.isNotNull(await inspector.findByText("Data changed since this run"));
            assert.strictEqual(live.runs.get(run.id)?.status, "succeeded", "nothing reran by itself");

            await userEvent.click(inspector.getByRole("button", { name: "Rerun" }));
            await screen.findByRole("treeitem", { name: "PageRank" }, { timeout: TIMEOUT_MS });
            await waitFor(() => {
                assert.isNull(inspector.queryByText("Data changed since this run"));
            });
            assert.strictEqual(live.runs.get(run.id)?.stale, null);
        },
        TIMEOUT_MS * 2,
    );
});
