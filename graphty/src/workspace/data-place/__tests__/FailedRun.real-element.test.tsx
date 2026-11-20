/**
 * A failed run is visible where the reader started it (#8300), on the REAL graphty-element and Les
 * Miserables: Katz started from Analyze with an attenuation too large for the graph never settles,
 * and the reader sees an error notice saying so and a failed mark on its row in the Calculated tab.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// Every experiment stays off here.
withFeatures([]);

const FAILED = "The run failed: it did not settle on an answer";

describe("a failed run", () => {
    it("shows an error notice and a failed mark on its row", async () => {
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

        // Katz from the Calculated tab's Analyze, its Attenuation at the top of its range. Attenuation
        // starts empty (the element derives one that converges), and an empty number field is a text
        // box until it holds a number.
        await userEvent.click(await screen.findByRole("tab", { name: "Calculated" }));
        const place = screen.getByRole("region", { name: "Data place" });
        await userEvent.click(await within(place).findByRole("button", { name: /^Analyze/ }));
        await userEvent.type(await screen.findByRole("combobox", { name: "Filter analyses" }), "Katz");
        await userEvent.click(await screen.findByRole("option", { name: /^Katz/ }));
        await userEvent.click(await screen.findByRole("button", { name: "Settings for Katz" }));
        const alpha = await screen.findByRole("textbox", { name: /^Attenuation/ });
        await userEvent.tripleClick(alpha);
        await userEvent.keyboard("0.5{Tab}");
        await userEvent.click(await screen.findByRole("button", { name: /^Run\b/ }));

        // The notice says it failed, in the app's words.
        const notice = await screen.findByText(FAILED);
        assert.notInclude(notice.textContent, "E_");
        const run = session.runs.list().find((each) => each.algorithm === "katz");
        assert.equal(run?.status, "failed");

        // Its row in the Calculated tab carries the failed mark.
        const list = await screen.findByRole("list", { name: "Results" });
        const row = list.querySelector<HTMLElement>(`[data-run="${run?.id ?? ""}"]`);
        assert.isNotNull(row);
        await waitFor(() => {
            assert.isNotNull(within(row).queryByRole("img", { name: FAILED }));
        });
    });
});
