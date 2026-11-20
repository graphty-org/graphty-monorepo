/**
 * The Join card on the REAL graphty-element with the source-steps experiment on
 * (design/data/multiple-data-sources-design.md, section 5.2), driven by keys and clicks, in the
 * owner's founding example: door entries staged beside people already in the graph. J opens the
 * card on the staged entries; picking Key of person and the entries' badge shows the element's six
 * live counts; Ignore case adds the element's "+n"; the dock's Fields tab lists the unmatched badge
 * under Only 2; arrow keys move the act; Esc closes the card writing nothing; and the inspector's
 * Join on a person fills Field 1.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, SourceMatchPair } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import type { WorkspaceStore } from "../../state/store";
import { choose, drop, emptyProject } from "./sourceSteps";

withFeatures(["source-steps"]);

const PEOPLE = "badge,name,dept\nB1,Ann,Ops\nB2,Bo,Lab\nB3,Cy,Sales";
/** B9 badges no person, b3 is B3 typed in lower case, B1 and B2 badged in twice. */
const ENTRIES = "entry,badge,door\nE1,B1,D1\nE2,B1,D2\nE3,B2,D1\nE4,B9,D1\nE5,b3,D3\nE6,B2,D2";

/**
 * People in the graph as type person, and entries.csv dropped and staged.
 * @returns the store, the session and the staged entries' key.
 */
async function foundingProject(): Promise<{ store: WorkspaceStore; session: GraphSession; entries: string }> {
    const { store, session } = await emptyProject();
    await session.data.import(
        { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
        { key: "badge", type: "person" },
    );
    store.set({ dockOpen: false, dockMaximized: false });
    drop("entries.csv", ENTRIES);
    await screen.findByRole("region", { name: "entries.csv" });
    const entries = session.data.staged()[0]?.key ?? "";
    return { store, session, entries };
}

/**
 * What the card shows for one count.
 * @param card - the card.
 * @param label - the count's words.
 * @returns its text.
 */
function shown(card: HTMLElement, label: string): string {
    return within(card).getByLabelText(label).textContent ?? "";
}

/**
 * The person space's name, as the element lists it.
 * @param session - the session.
 * @returns the space people live in.
 */
function personSpace(session: GraphSession): string {
    const people = session.data.sources()[0]?.key ?? "";
    const space = session.data.spaces().find((row) => row.nodes > 0 && row.sources.includes(people))?.space;
    assert.isDefined(space);
    return space ?? "";
}

describe("the Join card (source-steps)", () => {
    it("J opens it; Key of person and badge shows the element's counts, Ignore case its +n, Fields lists B9", async () => {
        const { store, session, entries } = await foundingProject();
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("j");
        const card = await screen.findByRole("form", { name: "Join" });
        assert.isTrue(store.get().dockOpen, "the dock opens on its Fields tab");
        assert.strictEqual(
            within(card).getByRole<HTMLInputElement>("combobox", { name: "Field 2 source" }).value,
            "entries.csv",
            "the staged source is Field 2",
        );

        const space = personSpace(session);
        await choose(card, "Field 1 type", "person");
        await choose(card, "Field 1 field", "Key");
        await choose(card, "Field 2 field", "badge");

        const pair: SourceMatchPair = { from: { source: entries, field: "badge" }, into: { space } };
        const counts = session.data.matchCounts(pair);
        await waitFor(() => {
            assert.strictEqual(shown(card, "matched"), String(counts.matched));
        });
        assert.strictEqual(counts.matched, 2, "B1 and B2");
        assert.strictEqual(shown(card, "only 1"), String(counts.only1));
        assert.strictEqual(shown(card, "only 2"), String(counts.only2));
        assert.strictEqual(shown(card, "repeat in 1"), String(counts.repeated1));
        assert.strictEqual(shown(card, "repeat in 2"), String(counts.repeated2));
        assert.strictEqual(shown(card, "text vs number"), String(counts.textVersusNumber));
        assert.strictEqual(shown(card, "Ignore case more"), `+${String(counts.moreWithIgnoreCase)}`);

        await userEvent.click(within(card).getByRole("switch", { name: "Ignore case" }));
        await waitFor(() => {
            assert.strictEqual(shown(card, "matched"), String(counts.matched + (counts.moreWithIgnoreCase ?? 0)));
        });
        assert.strictEqual(
            shown(card, "matched"),
            String(session.data.matchCounts(pair, { ignoreCase: true }).matched),
        );

        // The dock's Fields tab: the two profiles, and the values only Field 2 holds.
        const dock = screen.getByRole("tab", { name: "Fields" });
        assert.strictEqual(dock.getAttribute("aria-selected"), "true");
        const profile = screen.getByRole("group", { name: "entries.csv badge" });
        assert.strictEqual(
            within(profile).getByLabelText("entries.csv badge distinct").textContent,
            String(session.data.sourceTable(entries).profile("badge").distinct),
        );
        // The filter's radios are visually hidden: a reader clicks the label.
        await userEvent.click(within(screen.getByRole("radiogroup", { name: "Values" })).getByText("Only 2"));
        const values = await screen.findByRole("grid", { name: "Values" });
        await waitFor(() => {
            assert.include(values.textContent, "B9");
        });
        assert.notInclude(values.textContent, "B1", "B1 matched");

        // The act: none picked, then arrow keys move it.
        const edge = within(card).getByRole<HTMLInputElement>("radio", { name: "Make an edge" });
        const merge = within(card).getByRole<HTMLInputElement>("radio", { name: "Merge 2 into 1" });
        assert.isFalse(edge.checked || merge.checked, "no act until the reader picks one");
        await userEvent.click(edge);
        assert.isNotNull(within(card).getByRole("textbox", { name: "Edge type" }), "Make an edge asks its type");
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => {
            assert.isTrue(merge.checked);
        });

        // Esc in an open select closes only its list.
        await userEvent.click(within(card).getByRole("combobox", { name: "Field 2 field" }));
        await screen.findByRole("option", { name: "door" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("option", { name: "door" }));
        });
        assert.isNotNull(screen.queryByRole("form", { name: "Join" }), "the card stays open");

        // Esc closes it, writing nothing, and gives the dock back.
        const before = session.data.store.getSnapshot();
        merge.focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Join" }));
        });
        assert.isFalse(store.get().dockOpen, "the dock closes again");
        assert.strictEqual(session.data.store.getSnapshot(), before, "nothing was written");
        assert.strictEqual(session.data.staged()[0]?.key, entries, "entries stays staged");
    });

    it("the inspector's Join on a person fills Field 1 with its type, on its key", async () => {
        const { session } = await foundingProject();
        await session.selection.apply({ nodes: ["B1"] });
        const inspector = await screen.findByRole("complementary", { name: "Inspector" });
        const join = await within(inspector).findByRole("button", { name: /^Join/ });
        await userEvent.click(join);
        const card = await screen.findByRole("form", { name: "Join" });
        assert.strictEqual(
            within(card).getByRole<HTMLInputElement>("combobox", { name: "Field 1 type" }).value,
            "person",
        );
        assert.strictEqual(
            within(card).getByRole<HTMLInputElement>("combobox", { name: "Field 1 field" }).value,
            "Key",
        );
        assert.strictEqual(
            within(card).getByLabelText("Field 1 samples").textContent?.startsWith("3 keys"),
            true,
            "the person keys' profile",
        );
    });
});
