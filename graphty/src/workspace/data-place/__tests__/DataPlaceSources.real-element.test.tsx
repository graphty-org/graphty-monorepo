/**
 * The Sources tab with two loads, on the REAL graphty-element, driven by real clicks (the owner's
 * review, 2026-11-07): each load is a section of its own, listing only the columns its rows carry,
 * with its node and edge rows and its own Filters; a filter made under one load counts "N of that
 * load's" and hides only that load's nodes and edges.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, LoadedSource } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import football from "../../../../public/samples/football.gml?raw";
import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { sourceName } from "../words";

// The Sources tab belongs to the `selection-workspace` experiment.
withFeatures(["selection-workspace"]);

/**
 * College football, then Les Miserables added to it, in the workspace on the Data place.
 * @returns the session and the two loads, College football first.
 */
async function openTwo(): Promise<{ session: GraphSession; football: LoadedSource; miserables: LoadedSource }> {
    await page.viewport(1440, 1000);
    const store = createWorkspaceStore({ project: { name: "Two", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "football.gml", config: { data: football } });
    await session.data.import(
        { type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } },
        { mode: "merge" },
    );
    const [first, second] = await waitFor(() => {
        const loads = session.data.sources();
        assert.lengthOf(loads, 2);
        return loads;
    });
    return { session, football: first, miserables: second };
}

/**
 * A load's own section in the Data place, waited for.
 * @param load - the load.
 * @returns the section.
 */
async function sectionOf(load: LoadedSource): Promise<HTMLElement> {
    const place = await screen.findByRole("region", { name: "Data place" });
    return within(place).findByRole("group", { name: sourceName(load) });
}

/**
 * Opens a load's section when it is shut.
 * @param section - the section.
 */
async function opened(section: HTMLElement): Promise<void> {
    const toggle = within(section).queryByRole("button", { name: /^Expand / });
    if (toggle !== null) {
        await userEvent.click(toggle);
    }
}

/**
 * College football alone in the workspace on the Data place.
 * @returns the session.
 */
async function openFootball(): Promise<GraphSession> {
    await page.viewport(1440, 1000);
    const store = createWorkspaceStore({ project: { name: "One", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "football.gml", config: { data: football } });
    return session;
}

describe("the Sources tab with two loads", () => {
    it("draws the loads' sections in the Data sources list's order when a second is added", async () => {
        const session = await openFootball();
        const place = await screen.findByRole("region", { name: "Data place" });
        await userEvent.click(within(place).getByRole("button", { name: "Add source" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Samples/ }));
        const dialog = await screen.findByRole("dialog");
        await userEvent.click(within(dialog).getAllByText("Les Miserables", { exact: true })[0]);
        await userEvent.click(await screen.findByRole("button", { name: "Add as rows" }));
        const loads = await waitFor(() => {
            const found = session.data.sources();
            assert.lengthOf(found, 2);
            return found;
        });
        const names = loads.map((each) => sourceName(each));
        // The Data sources list, then the sections, in one order.
        const list = within(place).getByRole("list", { name: "Data sources" });
        const rows = await waitFor(() => names.map((name) => within(list).getByRole("listitem", { name })));
        assert.isTrue(
            Boolean(rows[0].compareDocumentPosition(rows[1]) & Node.DOCUMENT_POSITION_FOLLOWING),
            "the list holds the loads in order",
        );
        const sections = await waitFor(() => names.map((name) => within(place).getByRole("group", { name })));
        assert.isTrue(
            Boolean(sections[0].compareDocumentPosition(sections[1]) & Node.DOCUMENT_POSITION_FOLLOWING),
            `${names[0]}'s section comes before ${names[1]}'s, as in Data sources`,
        );
    });

    it("gives each load its own section with its node and edge rows, its own columns and its own Filters", async () => {
        const { football: cf, miserables: lm } = await openTwo();
        for (const load of [cf, lm]) {
            const section = await sectionOf(load);
            await opened(section);
            await waitFor(() => {
                within(section).getByText("Nodes", { exact: true });
                within(section).getByText("Edges", { exact: true });
                within(section).getByRole("group", { name: "Filters" });
                within(section).getByRole("button", { name: "Add filter" });
            });
            const edges = section.querySelector('[data-kind="edge"] .cm-entity-text');
            assert.strictEqual(edges?.textContent, String(load.counts.edges), "the load's own edge count");
        }
        // Les Miserables' Label offers its own columns, never College football's.
        const section = await sectionOf(lm);
        await userEvent.click(within(section).getByRole("button", { name: "Add to node attributes" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Label" }));
        const options = (await screen.findAllByRole("option")).map((each) => each.textContent ?? "");
        assert.isTrue(
            options.some((text) => text.startsWith("name")),
            `its own column: ${options.join(", ")}`,
        );
        assert.isFalse(
            options.some((text) => text.startsWith("value")),
            `not College football's: ${options.join(", ")}`,
        );
    });

    it("a filter made under one load counts that load's nodes and hides only that load's", async () => {
        const { session, football: cf, miserables: lm } = await openTwo();
        const section = await sectionOf(lm);
        await opened(section);
        await userEvent.click(within(section).getByRole("button", { name: "Add filter" }));
        const modal = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(".sel-ws");
            assert.isNotNull(found, "the workspace is open");
            return found;
        });
        // The new card's Value opens the picker when it has not opened by itself.
        if (screen.queryByRole("combobox", { name: "Find attributes, results" }) === null) {
            const empty = await waitFor(() => {
                const found = modal.querySelector<HTMLElement>("[data-new-step] [data-first-focus]");
                assert.isNotNull(found, "the new card's Value");
                return found;
            });
            await userEvent.click(empty);
        }
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Degree");
        await userEvent.keyboard("{Enter}");
        const from = await within(modal).findByRole("textbox", { name: "Degree from, number" });
        await userEvent.clear(from);
        await userEvent.type(from, "10{Enter}");
        // Les Miserables' count, not the whole graph's 192.
        await waitFor(() => {
            const head = modal.querySelector(".sel-ws-head")?.textContent ?? "";
            assert.match(head, new RegExp(`\\d of ${String(lm.counts.nodes)}(?!\\d)`, "u"), head);
        });
        await userEvent.click(within(modal).getByRole("button", { name: /^Done/ }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"), "Done closes it");
        });
        const [condition] = session.visibility.conditions;
        assert.strictEqual(condition.source, lm.key, "made for Les Miserables");
        // College football keeps every node, though many of its nodes have a degree under 10.
        const summary = session.visibility.summaryOf(cf.key);
        assert.strictEqual(summary.visibleNodes, summary.totalNodes);
        const own = session.visibility.summaryOf(lm.key);
        assert.isBelow(own.visibleNodes, own.totalNodes);
        // Listed in Les Miserables' Filters only.
        await waitFor(() => {
            const list = within(section).getByRole("list", { name: "Filters" });
            assert.lengthOf(within(list).getAllByRole("listitem"), 1);
        });
        const other = await sectionOf(cf);
        assert.isNull(within(other).queryByRole("list", { name: "Filters" }));
    });
});
