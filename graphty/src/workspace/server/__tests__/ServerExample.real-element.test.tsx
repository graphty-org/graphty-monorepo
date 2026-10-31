/**
 * The server form's Example on the REAL graphty-element (issue #4601): an example only fills the
 * form, the reader can clear it back to none, and what the reader typed is what loads. Neo4j's own
 * source runs; `fetch` is stubbed, so nothing reaches the network, and it records where each
 * request went. Every step is real input.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeAll, beforeEach, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** The reader's own Neo4j. */
const OWN = "https://neo4j.reader.test:7473";

/** Every URL the page fetched while a test ran. */
let fetched: string[] = [];

/**
 * Renders the workspace on the Data place and opens the server form from the Sources "+".
 * @returns the form.
 */
async function openForm(): Promise<HTMLElement> {
    const store = createWorkspaceStore({ project: { name: "Server", id: 1 }, place: "data" });
    render(<Workspace store={store} />);
    await waitFor(() => {
        assert.isDefined(document.querySelector("graphty-element")?.session);
    });
    await userEvent.click(await screen.findByRole("button", { name: "Add source" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Server..." }));
    const form = await screen.findByRole("form", { name: "Server" });
    await pick(form, "Kind", "Neo4j");
    return form;
}

/**
 * Picks an option of a dropdown in the form by clicking it open and clicking the option.
 * @param form - the form.
 * @param label - the dropdown's label.
 * @param option - the option's text.
 */
async function pick(form: HTMLElement, label: string, option: string): Promise<void> {
    await userEvent.click(within(form).getByRole("combobox", { name: label }));
    await userEvent.click(await within(form).findByRole("option", { name: option }));
}

/**
 * Replaces a text box's value the way a reader does: clears it and types.
 * @param form - the form.
 * @param label - the box's label.
 * @param text - what to type.
 */
async function retype(form: HTMLElement, label: string, text: string): Promise<void> {
    const box = within(form).getByLabelText(label);
    await userEvent.clear(box);
    await userEvent.type(box, text);
}

/**
 * The value a text box in the form holds.
 * @param form - the form.
 * @param label - the box's label.
 * @returns the value.
 */
function valueOf(form: HTMLElement, label: string): string {
    return within(form).getByLabelText<HTMLInputElement>(label).value;
}

describe("the server form's Example", () => {
    beforeAll(async () => {
        await page.viewport(1366, 900);
    });

    beforeEach(() => {
        fetched = [];
        vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
            fetched.push(input instanceof Request ? input.url : String(input));
            const body = JSON.stringify({ errors: [{ code: "Neo.ClientError.Test", message: "stubbed" }] });
            return Promise.resolve(new Response(body, { status: 400 }));
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("loads the endpoint, login and database the reader typed over an example, not the example's", async () => {
        const form = await openForm();
        await pick(form, "Example", "Hetionet");
        await pick(form, "Example", "Neo4j demo: movies");
        await retype(form, "Endpoint", OWN);
        await retype(form, "User", "reader");
        await retype(form, "Password", "secret");

        assert.equal(
            within(form).getByRole<HTMLInputElement>("combobox", { name: "Example" }).value,
            "",
            "a typed endpoint ends the example",
        );

        await userEvent.click(within(form).getByRole("button", { name: "Load" }));
        await waitFor(() => {
            assert.isNotEmpty(fetched);
        });
        for (const url of fetched) {
            assert.isTrue(url.startsWith(`${OWN}/`), `${url} goes to the reader's server`);
            assert.notInclude(url, "/db/movies/", "the example's database stays with the example");
        }
    });

    it("clears back to no example, emptying what the example filled", async () => {
        const form = await openForm();
        await pick(form, "Example", "Neo4j demo: movies");
        assert.equal(valueOf(form, "Endpoint"), "https://demo.neo4jlabs.com:7473");

        // The Select's own clear button (Mantine keeps it out of the accessibility tree).
        const example = within(form).getByRole<HTMLInputElement>("combobox", { name: "Example" });
        await userEvent.click(within(form).getByLabelText("Clear Example"));
        assert.equal(example.value, "", "no example");
        assert.equal(valueOf(form, "Endpoint"), "");
        assert.equal(valueOf(form, "User"), "");
        assert.equal(valueOf(form, "Password"), "");
    });
});
