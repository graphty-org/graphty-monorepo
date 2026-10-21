/**
 * The Samples dialog, as a reader reaches it from the Sources "+" of a project, without the
 * element: its groups, its tiles with the start page's pictures and their sizes as chips, its
 * search and its group filter. `open-doors.real-element.test.tsx` loads the fixtures from it.
 */
import { assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

const { initSentry, stopSentry } = vi.hoisted(() => ({ initSentry: vi.fn(), stopSentry: vi.fn() }));
vi.mock("../../../lib/sentry", () => ({ initSentry, stopSentry, captureUserFeedback: vi.fn() }));

import { render, screen, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * Opens an empty project on the Data place and the Samples dialog from its Sources "+".
 * @returns the dialog.
 */
async function openSamples(): Promise<HTMLElement> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place: "data" })} />);
    await userEvent.click(await screen.findByRole("button", { name: "Add source" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Samples/ }));
    return screen.findByRole("dialog", { name: "Samples" });
}

/**
 * The tile of a sample in the dialog.
 * @param dialog - the dialog.
 * @param name - the sample's name, as the tile's text starts.
 * @returns the tile's button.
 */
function tile(dialog: HTMLElement, name: string): HTMLElement {
    const found = within(dialog)
        .getAllByRole("button")
        .find((button) => button.textContent.startsWith(name));
    if (found === undefined) {
        throw new Error(`Samples lists no ${name}`);
    }
    return found;
}

describe("the Samples dialog", () => {
    it("groups every sample once, as tiles with the start page's pictures and their sizes", async () => {
        const dialog = await openSamples();

        const headings = within(dialog)
            .getAllByRole("region")
            .map((section) => section.getAttribute("aria-label"));
        assert.includeMembers(headings, ["Proteins", "Supply chain", "Graphs", "Datasets", "Generated"]);
        const names = within(dialog)
            .getAllByRole("button")
            .map((button) => button.textContent);
        assert.lengthOf(
            names.filter((name) => name.startsWith("Les Miserables")),
            1,
            "the app's own copy, not graph-samples' as well",
        );
        // The same picture the start page's tile shows.
        const picture = tile(dialog, "Doubtful Sound dolphins").querySelector("img");
        assert.match(picture?.src ?? "", /\/data\/graph-samples\/v1\/[a-z0-9-]+\.webp$/);
        assert.include(tile(dialog, "Les Miserables").textContent, "77");
        assert.include(tile(dialog, "Gene Ontology (go-basic)").textContent, "1.4 MB");
        assert.include(tile(dialog, "auth-log.csv").textContent, "400 rows");
    });

    it("narrows to what the search box names, and to one group", async () => {
        const dialog = await openSamples();
        const search = within(dialog).getByRole("searchbox", { name: "Search samples" });

        await userEvent.type(search, "dolphin");
        const sections = within(dialog).getAllByRole("region");
        assert.deepEqual(
            sections.map((section) => section.getAttribute("aria-label")),
            ["Datasets"],
        );
        await userEvent.clear(search);

        await userEvent.click(within(within(dialog).getByRole("radiogroup", { name: "Group" })).getByText("Fraud"));
        assert.deepEqual(
            within(dialog)
                .getAllByRole("region")
                .map((section) => section.getAttribute("aria-label")),
            ["Fraud"],
        );
        await userEvent.type(search, "zzz");
        assert.isNotNull(within(dialog).getByText("No matches"));
    });
});
