/**
 * Paste shader, Copy shader, Duplicate and edit, Delete from project and Control+V on the REAL
 * graphty-element, driven by real input (shader-styles design, section 6.4, package A2). Every
 * assertion reads what the element reports: the layer stack, the project's shaders, the history.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { PopoutManager } from "@graphty/compact-mantine";
import { parseShaderText } from "@graphty/graphty-element/catalog";
import type { LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, describe, it } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { StylePanel } from "../StylePanel";
import { showKind } from "./kindTab";

declare module "vitest/browser" {
    interface BrowserCommands {
        grantClipboard: () => Promise<void>;
    }
}

/** A hang guard for the element coming up and compiling, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** A node effect whose body has a `while` loop, on line 7, column 5. */
const WHILE_TEXT = `/* graphty-shader 1
{ "id": "user/pulse-ring", "name": "Pulse ring", "kind": "node-effect", "reach": 2,
  "params": [ { "name": "tint", "type": "color", "default": "#FFAA00" } ] }
*/
vec4 shade(NodeInput n) {
    float ring = 0.0;
    while (ring < 0.5) { ring += 0.1; }
    return vec4(tint * ring, ring);
}
`;

/** The dialog, titled Paste shader, or Edit shader for Duplicate and edit. */
const DIALOG = /^(Paste|Edit) shader$/;

/** A node effect that passes the static checks and fails to compile: a vec3 stored in a float. */
const COMPILE_TEXT = `/* graphty-shader 1
{ "id": "user/bad-cast", "name": "Bad cast", "kind": "node-effect" }
*/
vec4 shade(NodeInput n) {
    float x = vec3(1.0);
    return vec4(x);
}
`;

/** A header with a key the format does not know: a problem with no line. */
const KEY_TEXT = `/* graphty-shader 1
{ "id": "user/odd", "name": "Odd", "kind": "node-effect", "bogus": 1 }
*/
vec4 shade(NodeInput n) {
    return n.color;
}
`;

/** The same shader with the loop in the fixed-count form. */
const FIXED_TEXT = WHILE_TEXT.replace("while (ring < 0.5)", "for (int i = 0; i < 5; i++)");

let host: HTMLElement | null = null;

afterEach(() => {
    host?.remove();
    host = null;
});

/**
 * Puts a real element on the page with a small graph and a reader's node layer, and renders that
 * layer's Style tab on the node side.
 * @param set - what the layer sets.
 * @returns the session and the layer's id.
 */
async function mount(
    set: Record<string, unknown> = { "node.opacity": 1 },
): Promise<{ session: GraphSession; id: LayerId; store: WorkspaceStore }> {
    host = document.createElement("div");
    host.style.width = "360px";
    host.style.height = "240px";
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "100%";
    element.style.height = "100%";
    host.appendChild(element);
    document.body.appendChild(host);
    await waitFor(
        () => {
            assert.isDefined(element.session);
        },
        { timeout: TIMEOUT_MS },
    );
    const { session } = element;
    await session.data.addNodes([{ id: "1" }, { id: "2" }]);
    await session.data.addEdges([{ source: "1", target: "2" }]);
    const layer = await session.styles.add({ name: "Top", target: "node", selector: { match: "everything" }, set });
    const store = createWorkspaceStore();
    const value = makeWorkspaceValue(store, createRegistry([]), session, element);
    render(
        <WorkspaceContext.Provider value={value}>
            <PopoutManager>
                <div style={{ width: 300 }}>
                    <StylePanel layers={[layer.id]} />
                </div>
            </PopoutManager>
        </WorkspaceContext.Provider>,
    );
    await showKind("node");
    return { session, id: layer.id, store };
}

/**
 * The node tab's Effects section.
 * @returns the section.
 */
function effects(): HTMLElement {
    const found = document.querySelector<HTMLElement>('[data-section="node-effects"]');
    assert.isNotNull(found, "the Effects section is drawn");
    return found;
}

/**
 * Opens the Effects gallery from its "+".
 * @returns the gallery.
 */
async function openGallery(): Promise<HTMLElement> {
    await userEvent.click(within(effects()).getByRole("button", { name: "Add to node effects" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Effect..." }));
    return screen.findByTestId("shader-gallery", {}, { timeout: TIMEOUT_MS });
}

/**
 * Opens Paste shader from the Effects gallery's last item.
 * @returns the code box.
 */
async function openPaste(): Promise<HTMLTextAreaElement> {
    const gallery = await openGallery();
    await userEvent.click(within(gallery).getByRole("button", { name: "Paste shader..." }));
    return codeBox();
}

/**
 * The open dialog's code box.
 * @returns the code box.
 */
async function codeBox(): Promise<HTMLTextAreaElement> {
    const dialog = await screen.findByRole("dialog", { name: DIALOG });
    return within(dialog).getByRole<HTMLTextAreaElement>("textbox", { name: "Shader code" });
}

/**
 * The open dialog's Add button.
 * @returns the button.
 */
function addButton(): HTMLElement {
    return within(screen.getByRole("dialog", { name: DIALOG })).getByRole("button", { name: "Add" });
}

/**
 * Waits for the checks to settle with Add enabled, then presses it.
 */
async function pressAdd(): Promise<void> {
    await waitFor(
        () => {
            assert.isNull(addButton().getAttribute("aria-disabled"), "Add is enabled");
        },
        { timeout: TIMEOUT_MS },
    );
    await userEvent.click(addButton());
}

describe("Paste shader on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
    });

    it("a while loop shows one problem row on its line with Add disabled and the canvas unchanged; fixed, Add puts it in the project and on the layer, and one Undo removes both", async () => {
        const { session, id } = await mount();
        const before = JSON.stringify(session.styles.get(id));
        const steps = session.history.position;

        const box = await openPaste();
        await userEvent.fill(box, WHILE_TEXT);
        const dialog = screen.getByRole("dialog", { name: "Paste shader" });
        const rows = await waitFor(
            () => {
                const found = within(dialog).getAllByRole("listitem");
                assert.lengthOf(found, 1, "one problem row");
                return found;
            },
            { timeout: TIMEOUT_MS },
        );
        assert.include(rows[0]?.textContent ?? "", "Line 7:5");
        assert.strictEqual(addButton().getAttribute("aria-disabled"), "true");

        // The row puts the cursor on its line.
        await userEvent.click(within(rows[0]).getByRole("button"));
        assert.strictEqual(document.activeElement, box);
        assert.strictEqual(box.selectionStart, WHILE_TEXT.indexOf("while"));

        assert.strictEqual(JSON.stringify(session.styles.get(id)), before);
        assert.strictEqual(session.history.position, steps);
        assert.lengthOf(session.shaders.list(), 0);

        await userEvent.fill(box, FIXED_TEXT);
        await pressAdd();
        await waitFor(
            () => {
                assert.deepEqual(session.styles.get(id)?.set?.["node.effects"], { "user/pulse-ring": true });
            },
            { timeout: TIMEOUT_MS },
        );
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Paste shader" }), "the dialog closed");
        });
        assert.deepEqual(
            session.shaders.list().map((each) => each.id),
            ["user/pulse-ring"],
        );
        assert.strictEqual(session.history.position, steps + 1, "one step");
        await userEvent.keyboard("{Escape}");

        const gallery = await openGallery();
        const own = within(gallery).getByRole("list", { name: "In this project" });
        assert.isNotNull(within(own).queryByRole("button", { name: /^Pulse ring/ }));
        await userEvent.keyboard("{Escape}");

        await session.undo();
        await waitFor(() => {
            assert.isUndefined(session.styles.get(id)?.set?.["node.effects"]);
        });
        assert.lengthOf(session.shaders.list(), 0);
    });

    it("Duplicate and edit on a preset, then Add, gives an equal shader under a user/ id", async () => {
        const { session, id } = await mount({ "node.effects": { "uncertainty-aura": true } });
        const row = await waitFor(() => {
            const found = effects().querySelector<HTMLElement>('[data-shader="uncertainty-aura"]');
            assert.isNotNull(found);
            return found;
        });

        await userEvent.click(row, { button: "right" });
        await userEvent.click(await screen.findByRole("menuitem", { name: "Duplicate and edit" }));
        await screen.findByRole("dialog", { name: "Edit shader" });
        const box = await codeBox();
        assert.include(box.value, '"user/uncertainty-aura"');
        assert.include(box.value, '"Aura copy"', "the copy is named apart");
        await pressAdd();

        await waitFor(
            () => {
                assert.deepEqual(
                    session.shaders.list().map((each) => each.id),
                    ["user/uncertainty-aura"],
                );
                assert.deepEqual(session.styles.get(id)?.set?.["node.effects"], {
                    "uncertainty-aura": true,
                    "user/uncertainty-aura": true,
                });
            },
            { timeout: TIMEOUT_MS },
        );
        const body = async (shader: string): Promise<string> => {
            const parsed = parseShaderText(await session.shaders.source(shader, { duplicate: true }));
            assert.isTrue(parsed.ok);
            return parsed.ok ? parsed.registration.glsl : "";
        };
        assert.strictEqual(await body("user/uncertainty-aura"), await body("uncertainty-aura"));
        assert.deepEqual(session.styles.get(id)?.set?.["node.effects"], {
            "uncertainty-aura": true,
            "user/uncertainty-aura": true,
        });
    });

    it("Escape closes the dialog from the code box and keeps the text as a draft", async () => {
        await mount();
        const box = await openPaste();
        await userEvent.fill(box, FIXED_TEXT);
        assert.strictEqual(document.activeElement, box);

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Paste shader" }));
        });

        const again = await openPaste();
        assert.strictEqual(again.value, FIXED_TEXT);
    });

    it("Copy shader puts its text on the clipboard; Control+V on the section opens it, and Add applies the preset instead of a copy", async () => {
        await commands.grantClipboard();
        const { session, id } = await mount({ "node.opacity": 1, "node.effects": { "uncertainty-aura": true } });
        const row = await waitFor(() => {
            const found = effects().querySelector<HTMLElement>('[data-shader="uncertainty-aura"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(row, { button: "right" });
        await userEvent.click(await screen.findByRole("menuitem", { name: "Copy code" }));
        const text = await session.shaders.source("uncertainty-aura");
        await waitFor(async () => {
            assert.strictEqual(await navigator.clipboard.readText(), text);
        });

        // Take the effect off with its minus, then paste it back with Control+V on the section's "+".
        await userEvent.click(within(effects()).getByRole("button", { name: "Remove aura" }));
        await waitFor(() => {
            assert.isUndefined(session.styles.get(id)?.set?.["node.effects"]);
        });
        const plus = within(effects()).getByRole("button", { name: "Add to node effects" });
        plus.focus();
        await userEvent.keyboard("{Control>}v{/Control}");
        const box = await codeBox();
        assert.strictEqual(box.value, text);
        await pressAdd();

        await waitFor(
            () => {
                assert.deepEqual(session.styles.get(id)?.set?.["node.effects"], { "uncertainty-aura": true });
            },
            { timeout: TIMEOUT_MS },
        );
        assert.lengthOf(session.shaders.list(), 0, "no copy was added");
    });

    it("Delete from project on a pasted tile removes it, undoably", async () => {
        const { session } = await mount();
        const added = await session.shaders.add(FIXED_TEXT);
        assert.isTrue(added.ok);

        const gallery = await openGallery();
        const tile = within(within(gallery).getByRole("list", { name: "In this project" })).getByRole("button", {
            name: /^Pulse ring/,
        });
        await userEvent.click(tile, { button: "right" });
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Delete from project/ }));
        await waitFor(() => {
            assert.lengthOf(session.shaders.list(), 0);
        });

        await session.undo();
        await waitFor(() => {
            assert.lengthOf(session.shaders.list(), 1);
        });
    });

    it("the live check finds a compile error before Add, marks the code box invalid and announces it", async () => {
        const { session, id, store } = await mount();
        const before = JSON.stringify(session.styles.get(id));
        const box = await openPaste();
        await userEvent.fill(box, COMPILE_TEXT);
        const dialog = screen.getByRole("dialog", { name: "Paste shader" });
        await waitFor(
            () => {
                assert.isNotNull(dialog.querySelector('[data-code="shader.compile"]'), "a compile problem row");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.strictEqual(box.getAttribute("aria-invalid"), "true");
        const problems = within(dialog).getByRole("list", { name: "Problems" });
        assert.include(box.getAttribute("aria-describedby") ?? "", problems.id);
        assert.strictEqual(addButton().getAttribute("aria-disabled"), "true");
        await waitFor(() => {
            assert.match(store.get().announcement ?? "", /problem/, "the problems are announced");
        });
        assert.strictEqual(JSON.stringify(session.styles.get(id)), before);
        assert.lengthOf(session.shaders.list(), 0);
    });

    it("a problem with no line is words, not a button", async () => {
        await mount();
        const box = await openPaste();
        await userEvent.fill(box, KEY_TEXT);
        const dialog = screen.getByRole("dialog", { name: "Paste shader" });
        const row = await waitFor(
            () => {
                const found = dialog.querySelector<HTMLElement>('[data-code="shader.header-key"]');
                assert.isNotNull(found);
                return found;
            },
            { timeout: TIMEOUT_MS },
        );
        assert.notStrictEqual(row.tagName, "BUTTON");
        assert.isNull(row.closest("button"));
    });

    it("a shader of a kind the section does not take keeps the dialog open and names the section that does", async () => {
        const { session, id } = await mount();
        const text = `${await session.shaders.source("pearl", { duplicate: true })}\n// pasted\n`;
        const box = await openPaste();
        await userEvent.fill(box, text);
        const dialog = screen.getByRole("dialog", { name: "Paste shader" });
        await waitFor(
            () => {
                assert.include(dialog.textContent ?? "", "Goes in Node > Rendering");
            },
            { timeout: TIMEOUT_MS },
        );
        const kind = within(dialog).getByRole<HTMLSelectElement>("combobox", { name: "Kind" });
        assert.strictEqual(kind.value, "node-surface", "the Kind follows the header");
        assert.include(kind.selectedOptions[0]?.textContent ?? "", "Node material");
        assert.strictEqual(addButton().getAttribute("aria-disabled"), "true");
        await userEvent.keyboard("{Enter}");
        assert.isNotNull(screen.queryByRole("dialog", { name: "Paste shader" }), "the dialog stays open");
        assert.isUndefined(session.styles.get(id)?.set?.["node.shader"]);
        assert.lengthOf(session.shaders.list(), 0);
    });
});
