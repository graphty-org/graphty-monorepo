/**
 * The "Filter +" row, on the REAL graphty-element, driven by real clicks (the owner's choice,
 * 2026-11-15): with the selection workspace on, a load with no filter shows one "Filter +" row at
 * the bottom of its section instead of an empty Filters header; its first filter brings the header
 * back with the filter under it, and removing the last filter brings the row back, with focus on it.
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

/**
 * The workspace on the Data place, with College football and, when asked, Les Miserables added.
 * @param two - add Les Miserables too.
 * @returns the session and its loads, College football first.
 */
async function openData(two = false): Promise<{ session: GraphSession; loads: readonly LoadedSource[] }> {
    await page.viewport(1440, 1000);
    const store = createWorkspaceStore({ project: { name: "Filters", id: 1 }, place: "data" });
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
    if (two) {
        await session.data.import(
            { type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } },
            { mode: "merge" },
        );
    }
    const loads = await waitFor(() => {
        const found = session.data.sources();
        assert.lengthOf(found, two ? 2 : 1);
        return found;
    });
    return { session, loads };
}

/**
 * A load's own section in the Data place, opened.
 * @param load - the load.
 * @returns the section.
 */
async function sectionOf(load: LoadedSource): Promise<HTMLElement> {
    const place = await screen.findByRole("region", { name: "Data place" });
    const section = await within(place).findByRole("group", { name: sourceName(load) });
    const toggle = within(section).queryByRole("button", { name: /^Expand / });
    if (toggle !== null) {
        await userEvent.click(toggle);
    }
    return section;
}

/**
 * The open selection workspace, waited for.
 * @returns it.
 */
async function ws(): Promise<HTMLElement> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the workspace is open");
        return found;
    });
}

/** Waits until the selection workspace has closed. */
async function closed(): Promise<void> {
    await waitFor(() => {
        assert.isNull(document.querySelector(".sel-ws"), "the workspace closes");
    });
}

/**
 * Makes a "Degree 10 or more" filter in the open workspace and presses Done.
 * @param session - the session.
 */
async function degreeFilter(session: GraphSession): Promise<void> {
    const modal = await ws();
    if (screen.queryByRole("combobox", { name: "Find attributes, results" }) === null) {
        const value = await waitFor(() => {
            const found = modal.querySelector<HTMLElement>("[data-new-step] [data-first-focus]");
            assert.isNotNull(found, "the new card's Value");
            return found;
        });
        await userEvent.click(value);
    }
    await screen.findByRole("combobox", { name: "Find attributes, results" });
    await userEvent.keyboard("Degree");
    await userEvent.keyboard("{Enter}");
    const from = await within(modal).findByRole("textbox", { name: "Degree from, number" });
    await userEvent.clear(from);
    await userEvent.type(from, "10{Enter}");
    await waitFor(() => {
        assert.lengthOf(session.visibility.conditions, 1, "the card is written");
    });
    await userEvent.click(within(modal).getByRole("button", { name: /^Done/ }));
    await closed();
}

/**
 * Deletes the one filter listed in a section from its More menu.
 * @param section - the section.
 * @param session - the session.
 */
async function deleteFilter(section: HTMLElement, session: GraphSession): Promise<void> {
    const list = await within(section).findByRole("list", { name: "Filters" });
    await userEvent.click(within(list).getByRole("button", { name: "More" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /^Delete/ }));
    await waitFor(() => {
        assert.lengthOf(session.visibility.conditions, 0, "the filter is removed");
    });
}

/**
 * A section's "Filter +" row, the button the reader clicks.
 * @param section - the section.
 * @returns the row's button.
 */
function row(section: HTMLElement): HTMLElement {
    const found = within(section).getByRole("button", { name: "Add filter" });
    assert.strictEqual(found.textContent, "Filter", "the row reads Filter, with its +");
    assert.isNotNull(found.closest(".dp-filter-plus-row"), "it is the row, not a header's +");
    return found;
}

describe("the Filter + row, with the selection workspace on", () => {
    withFeatures(["selection-workspace"]);

    it("stands in for the empty Filters header until the first filter, then the header holds it", async () => {
        const { session, loads } = await openData();
        const section = await sectionOf(loads[0]);
        await waitFor(() => {
            row(section);
        });
        assert.isNull(within(section).queryByRole("group", { name: "Filters" }), "no empty Filters header");

        await userEvent.click(row(section));
        await degreeFilter(session);

        const filters = await within(section).findByRole("group", { name: "Filters" });
        const list = within(filters).getByRole("list", { name: "Filters" });
        assert.lengthOf(within(list).getAllByRole("listitem"), 1, "the filter under the header");
        assert.isNull(section.querySelector(".dp-filter-plus-row"), "the row is gone");
        const plus = within(filters).getByRole("button", { name: "Add filter" });
        assert.isNull(plus.closest(".dp-filter-plus-row"), "the header has its +");
    });

    it("Cancel on the new filter brings the row back, focused", async () => {
        await openData();
        const place = await screen.findByRole("region", { name: "Data place" });
        await waitFor(() => {
            row(place);
        });
        await userEvent.click(row(place));
        await userEvent.click(within(await ws()).getByRole("button", { name: /^Cancel/ }));
        await closed();
        await waitFor(() => {
            assert.strictEqual(document.activeElement, row(place), "focus back on the row");
        });
    });

    it("removing the last filter brings the row back, focused", async () => {
        const { session, loads } = await openData();
        const section = await sectionOf(loads[0]);
        await waitFor(() => {
            row(section);
        });
        await userEvent.click(row(section));
        await degreeFilter(session);
        await deleteFilter(section, session);
        await waitFor(() => {
            assert.strictEqual(document.activeElement, row(section), "focus on the row");
        });
        assert.isNull(within(section).queryByRole("group", { name: "Filters" }));
    });

    it("with two loads, focus returns to the row of the load whose filter went, not the first", async () => {
        const { session, loads } = await openData(true);
        const section = await sectionOf(loads[1]);
        await waitFor(() => {
            row(section);
        });
        await userEvent.click(row(section));
        await degreeFilter(session);
        assert.strictEqual(session.visibility.conditions[0]?.source, loads[1].key, "made for the second load");
        await deleteFilter(section, session);
        await waitFor(() => {
            assert.strictEqual(document.activeElement, row(section), "the second load's row");
        });
    });
});

describe("the Filters section, with the selection workspace off", () => {
    withFeatures([]);

    it("keeps the empty Filters header and its +, as released", async () => {
        await openData();
        const place = await screen.findByRole("region", { name: "Data place" });
        const filters = await within(place).findByRole("group", { name: "Filters" });
        const plus = within(filters).getByRole("button", { name: "Add filter" });
        assert.isNull(plus.closest(".dp-filter-plus-row"));
        assert.isNull(place.querySelector(".dp-filter-plus-row"), "no Filter + row");
    });
});
