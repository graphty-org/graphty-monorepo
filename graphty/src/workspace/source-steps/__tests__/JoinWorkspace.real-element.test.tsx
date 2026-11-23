/**
 * The join workspace on the REAL graphty-element with the source-steps experiment on (issue #9796),
 * driven by keys and clicks in the owner's founding example: door entries staged beside people in
 * the graph. Shift+J opens the modal with one card for the staged entries, its match the element's
 * guess; the card's count is the open draft's; picking Connect makes the card's step and colors it
 * in the preview; Undo takes it back; Enter in the Edge type box commits nothing; Esc leaves the
 * graph as it was; Done commits every card as one undo step.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import type { WorkspaceStore } from "../../state/store";
import { drop, emptyProject } from "./sourceSteps";

withFeatures(["source-steps"]);

const PEOPLE = "badge,name,dept\nB1,Ann,Ops\nB2,Bo,Lab\nB3,Cy,Sales";
/** B9 badges no person; B1 and B2 badged in twice. */
const ENTRIES = "entry,badge,door\nE1,B1,D1\nE2,B1,D2\nE3,B2,D1\nE4,B9,D1\nE6,B2,D2";

/**
 * People in the graph as type person, entries.csv dropped and staged, and the workspace opened
 * with Shift+J.
 * @returns the store, the session, the staged entries' key and the modal.
 */
async function opened(): Promise<{
    store: WorkspaceStore;
    session: GraphSession;
    entries: string;
    modal: HTMLElement;
}> {
    await page.viewport(1280, 900);
    const { store, session } = await emptyProject();
    await session.data.import(
        { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
        { key: "badge", type: "person" },
    );
    store.set({ dockOpen: false, dockMaximized: false });
    drop("entries.csv", ENTRIES);
    await screen.findByRole("region", { name: "entries.csv" });
    const entries = session.data.staged()[0]?.key ?? "";
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard("{Shift>}J{/Shift}");
    const modal = await screen.findByRole("dialog", { name: "Join" });
    return { store, session, entries, modal };
}

/**
 * Pick Connect on the open card and wait for its step.
 * @param modal - the workspace.
 * @param session - the session.
 */
async function connect(modal: HTMLElement, session: GraphSession): Promise<void> {
    await userEvent.click(within(modal).getByRole("radio", { name: "Connect" }));
    await waitFor(() => {
        assert.isTrue(
            session.data
                .currentDraft()
                ?.steps()
                .some((row) => row.op === "join.edges") === true,
        );
    });
}

describe("the join workspace (source-steps)", () => {
    it("opens with the element's guess, the draft's count, and Connect colors the card's step", async () => {
        const { session, entries, modal } = await opened();
        assert.strictEqual(
            within(modal).getByRole<HTMLInputElement>("combobox", { name: "Incoming field" }).value,
            "badge",
            "the guess picks the entries' badge",
        );
        assert.isAbove(within(modal).queryAllByText("suggested").length, 0, "a guess is tagged suggested");
        const steps = session.data.steps().length;
        const draft = session.data.currentDraft();
        assert.isNotNull(draft);
        const space = session.data.spaces().find((row) => row.nodes > 0)?.space ?? "";
        const counts = draft?.matchCounts({ from: { source: entries, field: "badge" }, into: { space } });
        await waitFor(() => {
            assert.strictEqual(
                within(modal).getByLabelText("Matched").textContent,
                `${String(counts?.matched)} / ${String((counts?.matched ?? 0) + (counts?.only2 ?? 0))}`,
            );
        });
        assert.strictEqual(session.data.currentDraft()?.steps().length, steps, "no step before a result is picked");
        await connect(modal, session);
        await waitFor(() => {
            assert.isTrue((session.styles.shownDraft?.steps?.length ?? 0) > 0, "the card's step is colored");
        });
        assert.strictEqual(session.data.steps().length, steps, "the graph is unchanged until Done");
    });

    it("Undo takes the card's step back; Enter in Edge type commits nothing; Esc leaves the graph", async () => {
        const { session, modal } = await opened();
        const steps = session.data.steps().length;
        await connect(modal, session);
        await userEvent.click(within(modal).getByRole("button", { name: /^Undo/ }));
        await waitFor(() => {
            assert.isFalse(
                session.data
                    .currentDraft()
                    ?.steps()
                    .some((row) => row.op === "join.edges") === true,
            );
        });
        await connect(modal, session);
        const edgeType = within(modal).getByLabelText("Edge type");
        await userEvent.click(edgeType);
        await userEvent.keyboard("entered{Enter}");
        await waitFor(() => {
            assert.strictEqual(session.data.currentDraft()?.steps().at(-1)?.act?.edgeType, "entered");
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }), "Enter does not close the workspace");
        assert.strictEqual(session.data.steps().length, steps, "Enter commits nothing");
        (document.activeElement as HTMLElement | null)?.blur();
        within(modal)
            .getByRole("button", { name: /^Cancel/ })
            .focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        assert.isNull(session.data.currentDraft(), "Cancel throws the draft away");
        assert.strictEqual(session.data.steps().length, steps, "the graph is as it was");
    });

    it("Done commits every card as one undo step", async () => {
        const { session, modal } = await opened();
        const history = session.history.steps.length;
        await connect(modal, session);
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        assert.isTrue(
            session.data.steps().some((row) => row.op === "join.edges"),
            "the join is in the graph",
        );
        assert.strictEqual(session.history.steps.length, history + 1, "one undo step");
    });
});
