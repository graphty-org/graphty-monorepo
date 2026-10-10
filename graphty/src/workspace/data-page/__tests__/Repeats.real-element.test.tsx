/**
 * Adding a newer copy of a loaded file on the REAL graphty-element: the Add page says how many of
 * the file's edges the graph already holds (the element's `repeated.seen`) and offers to replace
 * the graph's source with the file, beside Load. A file with no repeated edge shows neither.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { assert, describe, it } from "vitest";

import FRIENDS from "../../../../../design/ui/studio/tool/files/friends.csv?raw";
import FRIENDS_V2 from "../../../../../design/ui/studio/tool/files/friends-v2.csv?raw";
import { render, screen, waitFor } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { openDataPage } from "../request";
import { repeatsWords } from "../words";

/** A hang guard for the element coming up and loading, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

describe("Add a file whose edges the graph already holds", () => {
    it("words the count", () => {
        assert.equal(
            repeatsWords(41, "friends"),
            "41 edges in this file are already in friends. Load adds them a second time.",
        );
        assert.equal(
            repeatsWords(1, "friends"),
            "1 edge in this file is already in friends. Load adds it a second time.",
        );
    });

    it("says so and offers Replace beside Load, which leaves 41 edges; a file of other edges shows neither", async () => {
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

        // Nothing repeats: no line, no Replace.
        act(() => {
            openDataPage(store, { intent: "add", files: [new File(["source,target\nZed,Yan\n"], "others.csv")] });
        });
        await screen.findByTestId("model-strip", {}, { timeout: TIMEOUT_MS });
        assert.isNull(screen.queryByTestId("repeats"));
        assert.isNull(screen.queryByRole("button", { name: "Replace friends.csv" }));
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

        act(() => {
            openDataPage(store, { intent: "add", files: [new File([FRIENDS_V2], "friends-v2.csv")] });
        });
        const line = await screen.findByTestId("repeats", {}, { timeout: TIMEOUT_MS });
        assert.equal(line.textContent, repeatsWords(41, "friends"));
        await userEvent.click(screen.getByRole("button", { name: "Replace friends.csv" }));

        await screen.findByRole("heading", { name: "Replace: friends-v2.csv" });
        await screen.findByTestId("replace-report", {}, { timeout: TIMEOUT_MS });
        assert.isNull(screen.queryByTestId("repeats"), "a replace repeats nothing");
        await userEvent.click(screen.getByRole("button", { name: "Replace" }));
        await waitFor(
            () => {
                assert.strictEqual(store.get().page, "panels");
                assert.strictEqual(live.data.statistics().edgeCount, 41);
            },
            { timeout: TIMEOUT_MS },
        );
    });
});
