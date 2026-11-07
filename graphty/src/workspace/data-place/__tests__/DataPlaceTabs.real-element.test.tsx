/**
 * The Data place's Loaded and Calculated tabs, on the REAL graphty-element and Les Miserables,
 * driven by real clicks (the owner's review, 2026-11-07): the tabs come first and Filters under them; Loaded holds
 * the sources and Calculated the results, with no "Runs" heading; the tab chosen is kept; a result's
 * row has no filled tags, only quiet marks (what uses it, a scope other than what is showing), and
 * its "..." holds Apply style, greyed once it is styled, and Remove result; a filter's row says its
 * steps in one structured line.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// The tabs belong to the `selection-workspace` experiment.
withFeatures(["selection-workspace"]);

/**
 * Les Miserables in the workspace, on the Data place.
 * @returns the session and the store.
 */
async function openData(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    return { session, store };
}

/**
 * The Data place.
 * @returns it.
 */
const place = (): HTMLElement => screen.getByRole("region", { name: "Data place" });

/**
 * Opens the Calculated tab and waits for its one result row.
 * @returns the row.
 */
async function calculatedRow(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("tab", { name: "Calculated" }));
    const list = await screen.findByRole("list", { name: "Results" });
    return waitFor(() => {
        const found = list.querySelector<HTMLElement>("[data-run]");
        assert.isNotNull(found);
        return found;
    });
}

describe("the Data place's Loaded and Calculated tabs", () => {
    it("puts the tabs first, named Data, Filters under them, Loaded first with the sources, and no Runs heading", async () => {
        await openData();
        const list = await within(place()).findByRole("tablist", { name: "Data" });
        const tabs = within(list).getAllByRole("tab");
        assert.deepEqual(
            tabs.map((tab) => tab.textContent),
            ["Loaded", "Calculated"],
        );
        assert.strictEqual(tabs[0].getAttribute("aria-selected"), "true", "Loaded first");
        const filters = within(place()).getByText("Filters");
        assert.isTrue(
            Boolean(tabs[0].compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING),
            "Filters come after the tabs, so adding one never moves them",
        );
        await waitFor(() => {
            const panel = within(place()).getByRole("tabpanel");
            assert.isNotNull(panel.querySelector("[data-source]"), "the loaded source under Loaded");
        });
        assert.isNull(within(place()).queryByText("Runs"), "no Runs heading");
    });

    it("an empty Calculated tab offers Analyze with its key, and no sentence", async () => {
        await openData();
        await userEvent.click(await screen.findByRole("tab", { name: "Calculated" }));
        const analyze = await within(place()).findByRole("button", { name: /^Analyze/ });
        assert.strictEqual(analyze.getAttribute("aria-keyshortcuts"), "Shift+A");
        assert.include(analyze.textContent ?? "", "A", "the key on the button");
        assert.isNull(analyze.querySelector(".mantine-Kbd-root"), "the key as a menu's quiet hint, not a filled box");
        await userEvent.click(analyze);
        await screen.findByRole("dialog", { name: /Analyze/ });
    });

    it("keeps the tab chosen across a visit to another place", async () => {
        const { store } = await openData();
        await userEvent.click(await screen.findByRole("tab", { name: "Calculated" }));
        store.set({ place: "graph" });
        await waitFor(() => {
            assert.isNull(document.querySelector('[aria-label="Data place"]'));
        });
        await userEvent.click(screen.getByRole("button", { name: /^Data/ }));
        const calculated = await within(place()).findByRole("tab", { name: "Calculated" });
        assert.strictEqual(calculated.getAttribute("aria-selected"), "true");
    });

    it("a result's row has no tags; its ... greys Apply style while it is styled, and applies it once unstyled", async () => {
        const { session } = await openData();
        await session.runs.start("pagerank", {});
        const id = session.runs.list().find((run) => run.algorithm === "pagerank")?.id ?? "";
        const row = await calculatedRow();
        assert.lengthOf(row.querySelectorAll(".mantine-Badge-root"), 0, "no filled tags");
        assert.notInclude(row.textContent ?? "", "Everything");
        assert.notInclude(row.textContent ?? "", "Filter");
        assert.isNull(within(row).queryByRole("button", { name: "Show" }), "no Show button");
        // Its style layer draws it: one quiet count by a style's brush, its name naming the layer.
        const used = await within(row).findByRole("img", { name: /^Styles: / });
        assert.match(used.textContent ?? "", /^\d+$/u, "a count, no words");
        assert.isNotNull(used.querySelector(".lucide-paintbrush"), "a style's own glyph, not a link");
        assert.isNull(row.querySelector(".lucide-link-2"), "no link glyph, which Loaded uses for a source");

        await userEvent.click(within(row).getByRole("button", { name: /^More for / }));
        const items = await screen.findAllByRole("menuitem");
        assert.deepEqual(
            items.map((item) => /^(Apply style|Remove result)/u.exec(item.textContent ?? "")?.[1]),
            ["Apply style", "Remove result"],
        );
        assert.include(items[0].textContent ?? "", "Already styled");
        assert.isTrue(items[0].hasAttribute("data-disabled") || items[0].hasAttribute("disabled"), "greyed");
        await userEvent.keyboard("{Escape}");

        // With its layer gone, Apply style paints it again.
        for (const layer of session.runs.bindings(id)) {
            await session.styles.remove(layer);
        }
        await waitFor(() => {
            assert.isNull(within(row).queryByRole("img", { name: /^Styles/ }), "nothing uses it now");
        });
        await userEvent.click(within(row).getByRole("button", { name: /^More for / }));
        const apply = await screen.findByRole("menuitem", { name: /^Apply style/ });
        assert.notInclude(apply.textContent ?? "", "Already styled");
        await userEvent.click(apply);
        await waitFor(() => {
            assert.isAbove(session.runs.bindings(id).length, 0, "its style is applied");
        });
    });

    it("marks a result run over the whole graph with a quiet icon that says so", async () => {
        const { session } = await openData();
        await session.runs.start("louvain", {}, { scope: "graph" });
        const row = await calculatedRow();
        const mark = await within(row).findByRole("img", { name: "Whole graph" });
        assert.isNull(mark.querySelector(".lucide-layers"), "not the layers glyph, which reads as style layers");
        assert.isNotNull(mark.querySelector(".lucide-scan"), "a frame round the part it read");
        assert.isNotNull(row.querySelector(".lucide-boxes"), "a grouping's row shows the groups glyph, not a flask");
    });

    it("a result's row opens it in the inspector on a press and on Enter", async () => {
        const { session, store } = await openData();
        await session.runs.start("pagerank", {});
        const id = session.runs.list().find((run) => run.algorithm === "pagerank")?.id ?? "";
        const row = await calculatedRow();
        const main = row.querySelector<HTMLElement>(".dp-run-main");
        assert.isNotNull(main, "the row has a press");
        await userEvent.click(main ?? row);
        await waitFor(() => {
            assert.deepEqual(store.get().inspected, { kind: "measure-row", id });
        });
        assert.strictEqual(main?.getAttribute("aria-current"), "true");
        store.set({ inspected: null });
        main?.focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.deepEqual(store.get().inspected, { kind: "measure-row", id });
        });
    });

    it("a filter's row is one group named by its words, its controls by short names, Edit showing Enter", async () => {
        const { session } = await openData();
        await session.visibility.addCondition({
            id: "busy",
            effect: "keep",
            rule: {
                kind: "union",
                side: "nodes",
                within: "graph",
                branches: [{ start: "all", steps: [{ op: "keep", rule: { kind: "degree", min: 3 } }] }],
            },
        });
        const group = await within(place()).findByRole("group", { name: /^Degree 3\+, \d+ of 77 nodes$/u });
        within(group).getByRole("checkbox", { name: "Use" });
        within(group).getByRole("button", { name: "Edit" });
        await userEvent.click(within(group).getByRole("button", { name: "More" }));
        const edit = await screen.findByRole("menuitem", { name: /^Edit/ });
        assert.include(edit.textContent ?? "", "Enter", "Edit shows its key");
    });

    it("says a filter's steps in one structured line: '; ' between them, '-' for a range, '20+' for a lower bound", async () => {
        const { session } = await openData();
        await session.visibility.addCondition({
            id: "busy",
            effect: "keep",
            rule: {
                kind: "union",
                side: "nodes",
                within: "graph",
                branches: [
                    { start: "all", steps: [{ op: "keep", rule: { kind: "degree", min: 2, max: 9 } }] },
                    { start: "none", steps: [{ op: "add", rule: { kind: "degree", min: 20 } }] },
                ],
            },
        });
        const list = await within(place()).findByRole("list", { name: "Filters" });
        await waitFor(() => {
            const title = list.querySelector(".dp-filter-title")?.textContent ?? "";
            assert.strictEqual(title, "Degree 2-9; Degree 20+");
        });
        // A long description wraps to a second line before it is cut short.
        const title = list.querySelector<HTMLElement>(".dp-filter-title");
        assert.isNotNull(title);
        const style = getComputedStyle(title ?? document.body);
        assert.notStrictEqual(style.whiteSpace, "nowrap", "it wraps");
        assert.strictEqual(style.getPropertyValue("-webkit-line-clamp"), "2", "two lines, then cut");
    });
});
