/**
 * Names say what each control is, on the REAL graphty-element and Les Miserables, by real clicks:
 * the rename box is a layer's or a folder's name; the Which row's name holds its rule; the
 * condition list and the Vary by list search "attributes" alike, each row with its fact; the
 * Vary by button, its tooltip and its pop-out share one name; the match menu is in sentence case;
 * the View button's name holds the "3D" it shows; Analyze's option names are separated.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and the runs finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * The app on Les Miserables, with Degree run so a number field is listed.
 * @returns the session.
 */
async function openScene(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(
        () => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.runs.start("degree", {});
    await session.styles.settled();
    return session;
}

/**
 * "+" > Layer, then Escape: a new layer, selected, its Style tab open.
 */
async function newLayer(): Promise<void> {
    await userEvent.click(
        await screen.findByRole("button", { name: "Add a layer or a folder" }, { timeout: TIMEOUT_MS }),
    );
    await userEvent.click(await screen.findByRole("menuitem", { name: "Layer" }));
    await screen.findByRole("textbox", { name: "Layer name" });
    await userEvent.keyboard("{Escape}");
}

describe("names and words", () => {
    it("names the rename box for a layer and a folder, never 'Row name'", async () => {
        await openScene();
        await newLayer();
        await userEvent.click(screen.getByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Folder" }));
        await screen.findByRole("textbox", { name: "Folder name" });
        assert.isNull(screen.queryByRole("textbox", { name: "Row name" }));
        await userEvent.keyboard("{Escape}");
    });

    it("lists attributes with their facts, speaks one case in a match menu, and names the rule", async () => {
        await openScene();
        await newLayer();
        // A new layer opens its Which picker on arrival.
        const region = await screen.findByRole("group", { name: "Which nodes" }, { timeout: TIMEOUT_MS });
        await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
        await screen.findByLabelText("Find an attribute");
        await screen.findByRole("listbox", { name: "Attributes" });
        // The fact on the row is part of its name, as in the Vary by list.
        const degree = await screen.findByRole("option", { name: "Degree, 1 to 36" });
        await userEvent.click(degree);

        // A text card's match menu speaks one case: "Contains" beside "Has a value".
        await within(region).findByRole("group", { name: /^Degree(,|$)/ });
        await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
        await userEvent.click(await screen.findByRole("option", { name: /^name(,|$)/ }));
        // The menu and the box are named for what they choose, beside the column they read.
        within(region).getByRole("combobox", { name: "name: text to match" });
        await userEvent.click(await within(region).findByRole("combobox", { name: "name: how to match" }));
        await screen.findByRole("option", { name: "Contains" });
        await screen.findByRole("option", { name: "Has a value" });
        await userEvent.keyboard("{Escape}");

        // A column that is a condition already says so in its name.
        await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
        await screen.findByRole("option", { name: /^Degree, 1 to 36, already a condition$/ });
        await userEvent.keyboard("{Escape}");

        // Folded, the row names its rule.
        await userEvent.click(within(region).getByRole("button", { name: "Done" }));
        const folded = await screen.findByRole("button", { name: /^Which nodes, / });
        assert.include(folded.getAttribute("aria-label") ?? "", "Degree");
    });

    it("gives the Vary by button, its tooltip and its pop-out one name", async () => {
        await openScene();
        await newLayer();
        const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Size" }));
        const vary = await screen.findByRole("button", { name: "Node size by attribute" }, { timeout: TIMEOUT_MS });
        await userEvent.click(vary);
        await screen.findByRole("dialog", { name: "Node size by attribute" });
        await screen.findByRole("combobox", { name: "Find an attribute" });
    });

    it("names the View button with the mode it shows, and separates Analyze's option names", async () => {
        await openScene();
        const toolbar = await screen.findByRole("toolbar", { name: "Canvas tools" }, { timeout: TIMEOUT_MS });
        within(toolbar).getByRole("button", { name: /^View, (2D|3D)$/ });

        await userEvent.click(within(toolbar).getByRole("button", { name: "Analyze" }));
        // The badge is part of the description, never of the name.
        const louvain = await screen.findByRole("option", { name: "Louvain" });
        assert.isNotEmpty(louvain.getAttribute("aria-description") ?? "");
        // Degree ran: its Recent entry and its entry under its heading have two names.
        await screen.findByRole("option", { name: "Degree, recent" });
        await screen.findByRole("option", { name: "Degree" });
    });

    it("makes each style section a heading named once", async () => {
        await openScene();
        await newLayer();
        const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        await within(tab).findByRole("heading", { level: 3, name: "Shape" });
        assert.isNull(within(tab).queryByRole("group", { name: "Node shape" }), "no wrapper repeating the title");
        assert.lengthOf(within(tab).getAllByRole("group", { name: "Shape" }), 1);
    });
});
