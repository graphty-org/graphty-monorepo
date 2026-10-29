/**
 * A Sources row's issues on the REAL graphty-element, with the table closed: the row's warning chip
 * counts the source's open issues and opens the one issue list (the table's) in a popover; a fix
 * there is made by real input, said once in the status line, and leaves the chip; Escape closes the
 * popover and gives focus back to the chip.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** A site list with one name padded with spaces. */
const SITES_CSV = "id,name,families\nA,Alpha,3\nB, Beta ,4\nC,Gamma,5\n";

/**
 * Renders the workspace on the Data place with a project open, loads the sites and waits for them.
 * @returns the element's session.
 */
async function openSites(file = new File([SITES_CSV], "sites.csv")): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Sites", id: 1 }, place: "data" })} />);
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
    // A synthetic drop, the one exception to real input: a page cannot drag a file from the system.
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    for (const type of ["dragover", "drop"]) {
        globalThis.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
    return session;
}

/**
 * What the polite status lines say now.
 * @returns each one's text.
 */
function spoken(): string[] {
    return [...document.querySelectorAll('[role="status"][aria-live="polite"]')].map((each) => each.textContent);
}

describe("a Sources row's issues", () => {
    beforeAll(async () => {
        await page.viewport(1366, 900);
    });

    it("opens the issue list from the row's chip, trims by real input and says so once", async () => {
        const session = await openSites();
        const place = within(screen.getByRole("region", { name: "Data place" }));
        const row = await place.findByRole("listitem", { name: "sites.csv" }, { timeout: TIMEOUT_MS });
        const chip = await within(row).findByRole("button", { name: "1 issue in sites.csv" }, { timeout: TIMEOUT_MS });
        assert.isNull(screen.queryByRole("region", { name: "Table" }), "the table is closed");

        await userEvent.click(chip);
        const dialog = await screen.findByRole("dialog", { name: "Issues in sites.csv" });
        assert.include(dialog.textContent, "1 value with padded spaces");
        within(dialog).getByRole("button", { name: "Ignore in all columns" });

        await userEvent.click(within(dialog).getByRole("button", { name: "Trim: 1 value with padded spaces" }));
        await waitFor(() => {
            assert.lengthOf(session.data.issues(), 0);
            assert.include(spoken(), "name: 1 value trimmed");
        });
        // The issue is settled: once the popover closes, the row has nothing left to show.
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(within(row).queryByRole("button", { name: /issue/ }));
        });
    });

    it("opens with Enter and closes with Escape, focus back on the chip", async () => {
        await openSites();
        const place = within(screen.getByRole("region", { name: "Data place" }));
        const row = await place.findByRole("listitem", { name: "sites.csv" }, { timeout: TIMEOUT_MS });
        const chip = await within(row).findByRole("button", { name: "1 issue in sites.csv" }, { timeout: TIMEOUT_MS });
        chip.focus();
        await userEvent.keyboard("{Enter}");
        await screen.findByRole("dialog", { name: "Issues in sites.csv" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Issues in sites.csv" }));
            assert.equal(document.activeElement, chip);
        });
    });

    it("draws the row's counts whole beside its issue chip at the narrowest left panel", async () => {
        // A chain of 1,000 edges (1,001 nodes) with one padded value: two wide count chips and an
        // issue chip in a row at the left panel's narrowest width, which is also its default.
        const rows = Array.from({ length: 1000 }, (_, i) => `n${String(i)},n${String(i + 1)},${i === 0 ? " x " : "x"}`);
        const name = "a-long-file-name-for-the-row.csv";
        await openSites(new File([`source,target,kind\n${rows.join("\n")}\n`], name));
        const place = within(screen.getByRole("region", { name: "Data place" }));
        const row = await place.findByRole("listitem", { name }, { timeout: TIMEOUT_MS });
        const issues = await within(row).findByRole("button", { name: `1 issue in ${name}` }, { timeout: TIMEOUT_MS });
        await waitFor(() => {
            assert.include(row.textContent, "1,000");
        });
        const chips = [...row.querySelectorAll(".dp-source-chips > *"), issues].map((each) =>
            each.getBoundingClientRect(),
        );
        assert.lengthOf(chips, 3, "a node chip, an edge chip and the issue chip");
        for (let i = 1; i < chips.length; i++) {
            assert.isAtMost(chips[i - 1].right, chips[i].left, `chip ${String(i + 1)} covers chip ${String(i)}`);
        }
    });
});
