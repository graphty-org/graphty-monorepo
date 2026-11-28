/**
 * A reload of this tab puts back what the reader typed or chose in a form that reopens (issue
 * #9702): the Path popover's From and To, the join screen's match, Save as's name, the shader
 * editor's code, the Export dialog's Report words, Report a problem's message, the Custom score's
 * name, the Notes place's Sort and a selection workspace's folded card, Preview and new step
 * (issue #10356), Load custom model's address and Name, and the shader editor opened from a layer's
 * Shaders or the Background (issue #10430). Safari ends
 * a background tab and loads it again, often with its session storage emptied, so each case runs
 * with that storage kept and with it emptied. Real element, real autosave, real input.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { EditorView } from "@codemirror/view";
import { afterEach, assert, beforeAll, beforeEach, describe, it, vi } from "vitest";
import { type Locator, page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { forgetAutosave, openAutosaved, reload } from "../../../test/reload";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { setUsageSenderForTests } from "../../privacy/usageData";
import { drop } from "../../source-steps/__tests__/sourceSteps";
import { quadGlb } from "../../style/__tests__/quadGlb";
import { Workspace } from "../../Workspace";
import { createWorkspaceStore } from "../store";

/** Starts with nothing kept: no autosaved work, nothing in this tab's session storage, no usage answer. */
async function forget(): Promise<void> {
    await forgetAutosave();
    sessionStorage.clear();
    localStorage.removeItem(USAGE_ANSWER_KEY);
}

/** Where the usage data answer is stored (usageData.ts). */
const USAGE_ANSWER_KEY = "graphty.usageData.v1";

/**
 * The opened element.
 * @returns it, once its session is up.
 */
async function elementNow(): Promise<HTMLElementTagNameMap["graphty-element"]> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        );
        assert.isDefined(found?.session);
        return found;
    });
}

/**
 * Types a name into a Path field and picks the node it names with Enter.
 * @param form - the Path form.
 * @param field - the field's name.
 * @param name - the node's name.
 */
async function pickEnd(form: HTMLElement, field: string, name: string): Promise<void> {
    const box = within(form).getByRole("combobox", { name: field });
    await userEvent.click(page.elementLocator(form).getByRole("combobox", { name: field, exact: true }));
    await userEvent.type(page.elementLocator(form).getByRole("combobox", { name: field, exact: true }), name);
    await within(form).findByRole("option", { name });
    await userEvent.keyboard("{Enter}");
    await waitFor(() => {
        assert.strictEqual((box as HTMLInputElement).value, name);
    });
}

/**
 * What a shader editor's code box holds.
 * @param box - the code box.
 * @returns its text.
 */
function codeOf(box: HTMLElement): string {
    const view = EditorView.findFromDOM(box);
    assert.isNotNull(view, "the box is a code editor");
    return view.state.doc.toString();
}

/**
 * The shader editor's code box, once its code editor has loaded.
 * @returns the code box.
 */
async function shaderCode(): Promise<HTMLElement> {
    const dialog = await screen.findByRole("dialog", { name: "New shader" });
    await waitFor(() => {
        assert.isNotNull(dialog.querySelector('[data-editor="ready"]'), "the code editor has loaded");
    });
    return within(dialog).getByRole("textbox", { name: "Shader code" });
}

/**
 * Opens a tab's Shaders gallery from its "+" and picks New shader....
 * @param side - the tab.
 */
async function newShaderFromList(side: "node"): Promise<void> {
    const shaders = await waitFor(() => {
        const found = document.querySelector<HTMLElement>(`[data-section="${side}-shaders"]`);
        assert.isNotNull(found, "the Shaders section is drawn");
        return found;
    });
    await userEvent.click(
        page.elementLocator(shaders).getByRole("button", { name: `Add to ${side} shaders`, exact: true }),
    );
    await screen.findByTestId("shader-gallery", {});
    await userEvent.click(
        page.getByTestId("shader-gallery").getByRole("button", { name: "New shader...", exact: true }),
    );
}

/** The shader editor's code box, as a locator. */
const SHADER_BOX = page
    .getByRole("dialog", { name: "New shader", exact: true })
    .getByRole("textbox", { name: "Shader code", exact: true });

/**
 * Serves quad.glb at an address, as a web server would.
 * @param url - the address.
 */
function serveQuad(url: string): void {
    const original = globalThis.fetch.bind(globalThis);
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
        const to = input instanceof Request ? input.url : String(input);
        return to === url
            ? Promise.resolve(
                  new Response(quadGlb(), { status: 200, headers: { "content-type": "model/gltf-binary" } }),
              )
            : original(input, init);
    });
}

/** A shader body the reader typed. */
const TYPED_SHADER = "vec4 shade(NodeInput n) {\n    return n.color * 0.5;\n}\n";

/**
 * Opens a Data > Calculated result row's "..." and picks one item.
 * @param id - the result.
 * @param item - the item's words.
 */
async function pickResultItem(id: string, item: string): Promise<void> {
    const list = await screen.findByRole("list", { name: "Results" });
    const row = await waitFor(() => {
        const found = list.querySelector<HTMLElement>(`[data-run="${id}"]`);
        assert.isNotNull(found);
        return found;
    });
    await userEvent.hover(page.elementLocator(list).getByCss(`[data-run="${id}"]`));
    await userEvent.click(page.elementLocator(row).getByRole("button", { name: /^More for/ }));
    await userEvent.click(page.getByRole("menuitem", { name: new RegExp(`^${item}`) }));
}

/**
 * The texts of the notes the Notes place lists, in order.
 * @returns the texts.
 */
function notesListed(): (string | null)[] {
    const list = screen.queryByRole("list", { name: "Notes" });
    return list === null
        ? []
        : within(list)
              .getAllByRole("listitem")
              .map((item) => item.getAttribute("aria-label"));
}

/** Opens Add filter in the Data place and picks Degree from 5, leaving its workspace open on card A. */
async function newDegreeFilter(): Promise<HTMLElement> {
    await userEvent.click(page.getByRole("button", { name: "Data", exact: true }));
    await userEvent.click(page.getByRole("button", { name: "Add filter", exact: true }));
    // The value picker opens on a new card's arrival, or from its empty Value.
    await waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws [data-new-step] [data-first-focus]");
        assert.isNotNull(found, "the new card's Value");
        return found;
    });
    if (screen.queryByRole("combobox", { name: "Find attributes, results" }) === null) {
        await userEvent.click(page.getByCss(".sel-ws [data-new-step] [data-first-focus]"));
    }
    await screen.findByRole("combobox", { name: "Find attributes, results" });
    await userEvent.keyboard("Degree{Enter}");
    const from = page.getByRole("textbox", { name: "Degree from, number", exact: true });
    await userEvent.clear(from);
    await userEvent.type(from, "5{Enter}");
    await screen.findAllByRole("region", { name: "A, 41 of 77 nodes" });
    return waitFor(() => {
        const ws = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(ws, "the workspace is open");
        return ws;
    });
}

/**
 * The open selection workspace's card A.
 * @returns the card.
 */
function cardA(): HTMLElement {
    const ws = document.querySelector<HTMLElement>(".sel-ws");
    assert.isNotNull(ws, "the workspace is open");
    return within(ws).getAllByRole("region", { name: /^A, / })[0];
}

const LINKS = "source,target\nB1,B2\nB2,B3";
/** Floors by badge, to join onto the people the links name. */
const DEPTS = "badge,floor\nB1,1\nB2,2\nb3,3";

describe.each([{ lostSession: false }, { lostSession: true }])(
    "what the reader typed in a form, across a reload (session storage emptied: $lostSession)",
    ({ lostSession }) => {
        beforeAll(async () => {
            await page.viewport(1440, 900);
        });
        beforeEach(async () => {
            await forget();
            // Share starts error reporting: a stand-in sender, so the test sends nothing.
            setUsageSenderForTests({ start: () => undefined, stop: () => undefined });
        });
        afterEach(async () => {
            vi.restoreAllMocks();
            setUsageSenderForTests();
            await forget();
        });
        withFeatures([]);

        it("reopens the Path popover on the From and To the reader picked, which Find path still runs", async () => {
            const before = await openAutosaved("Les Miserables");
            (await elementNow()).focus();
            await userEvent.keyboard("p");
            const form = await screen.findByRole("form", { name: "Shortest path" });
            await pickEnd(form, "From node", "Valjean");
            await pickEnd(form, "To node", "Javert");

            const after = await reload(before, { lostSession });
            const back = await screen.findByRole("form", { name: "Shortest path" });
            assert.strictEqual(
                within(back).getByRole<HTMLInputElement>("combobox", { name: "From node" }).value,
                "Valjean",
            );
            assert.strictEqual(
                within(back).getByRole<HTMLInputElement>("combobox", { name: "To node" }).value,
                "Javert",
            );
            const { session } = await elementNow();
            const runs = session.runs.list().length;
            await userEvent.click(page.elementLocator(back).getByRole("button", { name: "Find path", exact: true }));
            await waitFor(() => {
                assert.strictEqual(session.runs.list().length, runs + 1);
            });
            after.view.unmount();
        });

        it("reopens the join screen on the match the reader changed", async () => {
            await page.viewport(1440, 900);
            const store = createWorkspaceStore({ autosave: true, project: { name: "Doors", id: 1 }, place: "data" });
            const view = render(<Workspace store={store} />);
            store.set({ dockOpen: false, dockMaximized: false });
            const { session } = await elementNow();
            drop("links.csv", LINKS);
            await waitFor(() => {
                assert.lengthOf(session.data.nodes(), 3);
            });
            drop("depts.csv", DEPTS);
            const join = await screen.findByRole("region", { name: "Join depts.csv" });
            const ignore = within(join).getByRole<HTMLInputElement>("checkbox", { name: /^Ignore case/ });
            assert.isFalse(ignore.checked);
            await userEvent.click(page.elementLocator(join).getByRole("checkbox", { name: /^Ignore case/ }));
            await waitFor(() => {
                assert.isTrue(ignore.checked);
            });

            const after = await reload({ store, view }, { lostSession });
            const back = await screen.findByRole("region", { name: "Join depts.csv" });
            assert.isTrue(within(back).getByRole<HTMLInputElement>("checkbox", { name: /^Ignore case/ }).checked);
            after.view.unmount();
        });

        it("reopens the shader editor on the code the reader typed", async () => {
            const before = await openAutosaved("Les Miserables");
            await userEvent.click(page.getByRole("button", { name: "Main menu", exact: true }));
            await userEvent.click(page.getByRole("menuitem", { name: "Add Shader...", exact: true }));
            await userEvent.fill(await shaderCode(), TYPED_SHADER);

            const after = await reload(before, { lostSession });
            assert.strictEqual(codeOf(await shaderCode()), TYPED_SHADER);
            after.view.unmount();
        });

        it("reopens Export on the Report the reader was writing", async () => {
            const before = await openAutosaved("Les Miserables");
            (await elementNow()).focus();
            await userEvent.keyboard("{Control>}e{/Control}");
            const dialog = await screen.findByRole("dialog", { name: "Export" });
            await userEvent.click(
                page
                    .elementLocator(dialog)
                    .getByRole("grid", { name: "What to export", exact: true })
                    .getByText("Report", { exact: true }),
            );
            await userEvent.type(
                page.elementLocator(dialog).getByRole("textbox", { name: "Title", exact: true }),
                "Ring study",
            );
            await userEvent.type(
                page.elementLocator(dialog).getByRole("textbox", { name: "Summary", exact: true }),
                "Half written.",
            );

            const after = await reload(before, { lostSession });
            const back = await screen.findByRole("dialog", { name: "Export" });
            assert.strictEqual(
                (await within(back).findByRole<HTMLInputElement>("textbox", { name: "Title" })).value,
                "Ring study",
            );
            assert.strictEqual(
                within(back).getByRole<HTMLTextAreaElement>("textbox", { name: "Summary" }).value,
                "Half written.",
            );
            after.view.unmount();
        });

        it("reopens Save as on the name the reader typed", async () => {
            const before = await openAutosaved("Les Miserables");
            await userEvent.keyboard("{Shift>}{Control>}s{/Control}{/Shift}");
            const dialog = await screen.findByRole("dialog", { name: "Save Les Miserables as" });
            const name = (): Locator => page.elementLocator(dialog).getByRole("textbox", { name: "Name", exact: true });
            await userEvent.clear(name());
            await userEvent.type(name(), "Half typed");

            const after = await reload(before, { lostSession });
            const back = await screen.findByRole("dialog", { name: "Save Les Miserables as" });
            assert.strictEqual(
                within(back).getByRole<HTMLInputElement>("textbox", { name: "Name" }).value,
                "Half typed",
            );
            after.view.unmount();
        });

        it("reopens Report a problem on the message the reader typed", async () => {
            const before = await openAutosaved("Les Miserables");
            // Help > Report a problem asks for usage data: the reader turns it on in Settings > Privacy.
            await userEvent.click(page.getByRole("button", { name: "Main menu", exact: true }));
            await userEvent.click(page.getByRole("menuitem", { name: "Settings...", exact: true }));
            const settings = await screen.findByRole("dialog", { name: "Settings" });
            await userEvent.click(page.elementLocator(settings).getByText("Privacy", { exact: true }));
            const share = await within(settings).findByRole<HTMLInputElement>("switch", { name: "Share usage data" });
            await userEvent.click(
                page.elementLocator(settings).getByRole("switch", { name: "Share usage data", exact: true }),
            );
            await waitFor(() => {
                assert.isTrue(share.checked);
            });
            await userEvent.keyboard("{Escape}");
            await waitFor(() => {
                assert.isNull(screen.queryByRole("dialog", { name: "Settings" }));
            });
            await userEvent.click(page.getByRole("button", { name: "Main menu", exact: true }));
            await userEvent.hover(page.getByRole("menuitem", { name: "Help", exact: true }));
            await userEvent.click(page.getByRole("menuitem", { name: "Report a problem", exact: true }));
            const dialog = await screen.findByRole("dialog", { name: "Send Feedback" });
            await userEvent.type(
                page.elementLocator(dialog).getByRole("textbox", { name: "Name (optional)", exact: true }),
                "Ada",
            );
            await userEvent.type(
                page.elementLocator(dialog).getByRole("textbox", { name: /^What happened/ }),
                "The tab went blank.",
            );

            const after = await reload(before, { lostSession });
            const back = await screen.findByRole("dialog", { name: "Send Feedback" });
            assert.strictEqual(
                within(back).getByRole<HTMLInputElement>("textbox", { name: "Name (optional)" }).value,
                "Ada",
            );
            assert.strictEqual(
                within(back).getByRole<HTMLTextAreaElement>("textbox", { name: /^What happened/ }).value,
                "The tab went blank.",
            );
            after.view.unmount();
        });

        it("reopens Custom score on the name the reader typed", async () => {
            const before = await openAutosaved("Les Miserables");
            const { session } = await elementNow();
            const run = session.runs.start("degree", {});
            await run;
            await userEvent.click(page.getByRole("button", { name: "Data", exact: true }));
            await userEvent.click(page.getByRole("tab", { name: "Calculated", exact: true }));
            await pickResultItem(run.id, "Combine into a score");
            const dialog = await screen.findByRole("dialog", { name: "Custom score" });
            const name = (): Locator => page.elementLocator(dialog).getByRole("textbox", { name: "Name", exact: true });
            await userEvent.clear(name());
            await userEvent.type(name(), "Reach");

            const after = await reload(before, { lostSession });
            const back = await screen.findByRole("dialog", { name: "Custom score" });
            assert.strictEqual(within(back).getByRole<HTMLInputElement>("textbox", { name: "Name" }).value, "Reach");
            after.view.unmount();
        });

        it("keeps the Notes place's Sort the reader picked", async () => {
            const before = await openAutosaved("Les Miserables");
            const { session } = await elementNow();
            session.notes.add({ text: "first", targets: [{ graph: true }] });
            session.notes.add({ text: "second", targets: [{ graph: true }] });
            await userEvent.click(page.getByRole("button", { name: "Notes", exact: true }));
            await waitFor(() => {
                assert.deepEqual(notesListed(), ["second", "first"]);
            });
            await userEvent.click(page.getByRole("combobox", { name: "Sort", exact: true }));
            await userEvent.click(page.getByRole("option", { name: "Oldest", exact: true }));
            await waitFor(() => {
                assert.deepEqual(notesListed(), ["first", "second"]);
            });

            const after = await reload(before, { lostSession });
            await waitFor(() => {
                assert.deepEqual(notesListed(), ["first", "second"]);
            });
            assert.strictEqual(screen.getByRole<HTMLInputElement>("combobox", { name: "Sort" }).value, "Oldest");
            after.view.unmount();
        });

        it("reopens a selection workspace with the card the reader folded and the Preview they picked", async () => {
            const before = await openAutosaved("Les Miserables");
            const ws = await newDegreeFilter();
            await userEvent.click(page.elementLocator(ws).getByText("Styled", { exact: true }));
            await userEvent.click(
                page.elementLocator(cardA()).getByRole("button", { name: "Collapse A", exact: true }),
            );
            await waitFor(() => {
                assert.isTrue(cardA().hasAttribute("data-folded"));
            });

            const after = await reload(before, { lostSession });
            await waitFor(() => {
                assert.isTrue(cardA().hasAttribute("data-folded"), "card A is still folded");
            });
            const preview = screen.getByRole("radiogroup", { name: "Preview" });
            assert.isTrue(within(preview).getByRole("radio", { name: "Styled" }).matches(":checked"));
            after.view.unmount();
        });

        it("reopens a selection workspace on the step the reader was adding", async () => {
            const before = await openAutosaved("Les Miserables");
            await newDegreeFilter();
            await userEvent.click(page.elementLocator(cardA()).getByRole("button", { name: "Keep", exact: true }));
            await screen.findByRole("combobox", { name: "Find attributes, results" });

            const after = await reload(before, { lostSession });
            await screen.findByRole("combobox", { name: "Find attributes, results" });
            assert.isNotNull(cardA().querySelector('[data-new-step] [data-op="keep"]'), "the Keep step is back");
            after.view.unmount();
        });

        it("reopens the shader editor a layer's Shaders opened, on the code the reader typed", async () => {
            const before = await openAutosaved("Les Miserables");
            const { session } = await elementNow();
            await session.styles.add({
                name: "Busy",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "#d55e00" },
            });
            await session.styles.settled();
            const tree = await screen.findByRole("tree", { name: "Style layers" });
            await within(tree).findByRole("treeitem", { name: /^Busy, / });
            await userEvent.click(
                page
                    .getByRole("tree", { name: "Style layers", exact: true })
                    .getByRole("treeitem", { name: /^Busy, / }),
            );
            const inspector = screen.getByRole("complementary", { name: "Inspector" });
            const style = await within(inspector).findByRole("tab", { name: "Style" });
            if (style.getAttribute("aria-selected") !== "true") {
                await userEvent.click(
                    page
                        .getByRole("complementary", { name: "Inspector", exact: true })
                        .getByRole("tab", { name: "Style", exact: true }),
                );
            }
            await newShaderFromList("node");
            await shaderCode();
            await userEvent.fill(SHADER_BOX, TYPED_SHADER);

            const after = await reload(before, { lostSession });
            assert.strictEqual(codeOf(await shaderCode()), TYPED_SHADER);
            // Opened from the layer's list again: its Add puts the shader on the layer.
            const dialog = screen.getByRole("dialog", { name: "New shader" });
            assert.isNotNull(within(dialog).queryByRole("button", { name: "Add" }));
            assert.isNull(within(dialog).queryByRole("button", { name: "Add to project" }));
            after.view.unmount();
        });

        it("reopens the shader editor the Background opened, on the code the reader typed", async () => {
            const before = await openAutosaved("Les Miserables");
            await userEvent.click(page.getByRole("button", { name: "Graph settings", exact: true }));
            const inspector = await screen.findByRole("complementary", { name: "Inspector" });
            await within(inspector).findByRole("tab", { name: "Style", selected: true });
            await screen.findByRole("button", { name: "Add to background" });
            await userEvent.click(page.getByRole("button", { name: "Add to background", exact: true }));
            await screen.findByRole("menuitem", { name: /^Shader/ });
            await userEvent.click(page.getByRole("menuitem", { name: /^Shader/ }));
            await screen.findByTestId("shader-gallery", {});
            await userEvent.click(
                page.getByTestId("shader-gallery").getByRole("button", { name: "New shader...", exact: true }),
            );
            await shaderCode();
            await userEvent.fill(SHADER_BOX, TYPED_SHADER);

            const after = await reload(before, { lostSession });
            assert.strictEqual(codeOf(await shaderCode()), TYPED_SHADER);
            const dialog = screen.getByRole("dialog", { name: "New shader" });
            assert.isNotNull(within(dialog).queryByRole("button", { name: "Add" }));
            assert.isNull(within(dialog).queryByRole("button", { name: "Add to project" }));
            after.view.unmount();
        });

        it("reopens Load custom model on the address the reader loaded, whose Enter brings the model back with its Name", async () => {
            const url = "https://models.example.com/reload/quad.glb";
            serveQuad(url);
            const before = await openAutosaved("Les Miserables");
            const custom = page.getByRole("dialog", { name: "Load custom model", exact: true });
            await userEvent.click(page.getByRole("button", { name: "Main menu", exact: true }));
            await screen.findByRole("menuitem", { name: "Add custom model..." });
            await userEvent.click(page.getByRole("menuitem", { name: "Add custom model...", exact: true }));
            const dialog = await screen.findByRole("dialog", { name: "Load custom model" });
            await userEvent.type(custom.getByRole("textbox", { name: "Model address", exact: true }), `${url}{Enter}`);
            await within(dialog).findByRole("textbox", { name: "Name" });
            const name = custom.getByRole("textbox", { name: "Name", exact: true });
            await userEvent.clear(name);
            await userEvent.type(name, "Panel");

            // The loaded file cannot come back: the dialog reopens on its address, and Name with it once
            // the reader loads that again.
            const after = await reload(before, {
                lostSession,
                lost: ["region: Details", "region: Files", "value: Name = Panel", `value: Model address = ${url}`],
            });
            const back = await screen.findByRole("dialog", { name: "Load custom model" });
            const address = within(back).getByRole<HTMLInputElement>("textbox", { name: "Model address" });
            assert.strictEqual(address.value, url);
            await userEvent.click(custom.getByRole("textbox", { name: "Model address", exact: true }));
            await userEvent.keyboard("{Enter}");
            assert.strictEqual(
                (await within(back).findByRole<HTMLInputElement>("textbox", { name: "Name" })).value,
                "Panel",
            );
            after.view.unmount();
        });
    },
);
