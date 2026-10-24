/**
 * Adding a newer copy of a loaded file on the REAL graphty-element: the Add page says how many of
 * the file's edges the graph already holds (the element's `repeated.seen`) and offers to replace
 * the graph's source with the file, beside Load, and Load's description carries that warning. A file with no repeated edge shows neither.
 * When every edge in the file repeats, Load would only double them, so Replace is the primary
 * button and takes the focus; when some edges are new, Load stays the primary.
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

/**
 * The Load button's accessible description, read from its aria-describedby ids.
 * @returns The description, "" when it has none
 */
function loadDescription(): string {
    const ids = screen.getByRole("button", { name: "Load" }).getAttribute("aria-describedby") ?? "";
    return ids
        .split(" ")
        .filter((id) => id !== "")
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ");
}

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
        await waitFor(() => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        });
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        const live = session;
        await live.data.import({ type: "csv", config: { data: FRIENDS }, name: "friends.csv" });

        // Nothing repeats: no line, no Replace.
        act(() => {
            openDataPage(store, { intent: "add", files: [new File(["source,target\nZed,Yan\n"], "others.csv")] });
        });
        await screen.findByTestId("model-strip", {});
        assert.isNull(screen.queryByTestId("repeats"));
        assert.isNull(screen.queryByRole("button", { name: "Replace friends.csv" }));
        // What the load makes and the blocked reason, if any, describe Load: no warning.
        assert.equal(
            loadDescription(),
            [screen.getByTestId("model-strip").textContent, document.getElementById("dp-load-reason")?.textContent]
                .filter((words) => words !== undefined && words !== null)
                .join(" "),
        );
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

        // One edge repeats and one is new: Replace is offered, Load stays the primary.
        act(() => {
            openDataPage(store, {
                intent: "add",
                files: [new File(["source,target\nAva,Ben\nZed,Yan\n"], "some.csv")],
            });
        });
        await screen.findByTestId("repeats", {});
        assert.equal(screen.getByRole("button", { name: "Replace friends.csv" }).dataset.variant, "default");
        assert.equal(screen.getByRole("button", { name: "Load" }).dataset.variant, "filled");
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

        act(() => {
            openDataPage(store, { intent: "add", files: [new File([FRIENDS_V2], "friends-v2.csv")] });
        });
        const line = await screen.findByTestId("repeats", {});
        assert.equal(line.textContent, repeatsWords(41, "friends"));
        assert.include(loadDescription(), repeatsWords(41, "friends"), "Load's description carries the warning");
        // Every edge repeats: Replace is the primary, and a ready file's focus goes to it.
        const replace = screen.getByRole("button", { name: "Replace friends.csv" });
        assert.equal(replace.dataset.variant, "filled");
        assert.equal(screen.getByRole("button", { name: "Load" }).dataset.variant, "default");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, replace);
        });
        await userEvent.click(screen.getByRole("button", { name: "Replace friends.csv" }));

        await screen.findByRole("heading", { name: "Replace: friends-v2.csv" });
        await screen.findByTestId("replace-report", {});
        assert.isNull(screen.queryByTestId("repeats"), "a replace repeats nothing");
        await userEvent.click(screen.getByRole("button", { name: "Replace" }));
        await waitFor(() => {
            assert.strictEqual(store.get().page, "panels");
            assert.strictEqual(live.data.statistics().edgeCount, 41);
        });
    });
});
