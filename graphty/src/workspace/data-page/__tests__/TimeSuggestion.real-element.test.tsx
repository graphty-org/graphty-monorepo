/**
 * A timed file says so on the Data page, on the real element: the column carries the mark, and the
 * reader still picks the role. Choosing it designates the column once the file has loaded.
 */

import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { act } from "react";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { siteFeatures } from "../../../test/siteFeatures";
import { render, screen, waitFor } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { openDataPage } from "../request";

const DATED_EDGES = "source,target,sent\nA,B,2026-01-01\nB,C,2026-01-02\nC,D,2026-01-03\n";

/**
 * Opens the dated file on the Data page. A drop is the closest to real input here: a page cannot
 * start a drag of a file from the operating system.
 * @returns the element's session.
 */
async function openDatedFile(): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Timeline", id: 1 } });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    act(() => {
        openDataPage(store, { intent: "new" });
    });
    const dataPage = await screen.findByRole("region", { name: "Data page" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([DATED_EDGES], "dated.csv"));
    for (const type of ["dragenter", "dragover", "drop"]) {
        dataPage.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
    await screen.findByRole("combobox", { name: "Role of sent" });
    const session = document.querySelector("graphty-element")?.session;
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

describe("the Data page's time suggestion", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("marks a timed column, and choosing Time designates it after load", async () => {
        await siteFeatures(["timeline"]);
        const session = await openDatedFile();
        await screen.findByText(/timeline candidate/);

        await userEvent.click(screen.getByRole("combobox", { name: "Role of sent" }));
        await userEvent.click(await screen.findByRole("option", { name: "Date or time (suggested)" }));
        await waitFor(() => {
            assert.isNull(screen.queryByText(/timeline candidate/));
        });
        assert.isNull(session.time.field, "choosing the role designates nothing before the load");

        await userEvent.click(screen.getByRole("button", { name: "Load" }));
        await waitFor(() => {
            assert.deepEqual(session.time.field, { edges: { start: "sent" } });
        });
    });

    it("leaves the column unmarked with the experiment off", async () => {
        await siteFeatures([]);
        await openDatedFile();
        await userEvent.click(screen.getByRole("combobox", { name: "Role of sent" }));
        const options = (await screen.findAllByRole("option")).map((option) => option.textContent);
        assert.notInclude(options, "Date or time (suggested)");
        assert.isNull(screen.queryByText(/timeline candidate/));
    });
});
