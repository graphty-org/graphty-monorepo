// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { freshStore } from "../../stories/freshStore";
import { Workspace } from "../Workspace";

/** Six nodes on a ring, laid out on a flat circle, which places them the same way every time. */
const NODES = Array.from({ length: 6 }, (_, i) => ({ id: `n${String(i)}` }));
const EDGES = NODES.map((node, i) => ({ source: node.id, target: NODES[(i + 1) % NODES.length].id }));

/** A shader the element refuses without compiling it: a loop with no fixed count, on line 3 of the body. */
const WHILE_TEXT = `/* graphty-shader 1
{ "id": "user/pulse-ring", "name": "Pulse ring", "place": "around", "reach": 2,
  "params": [ { "name": "tint", "type": "color", "default": "#FFAA00" } ] }
*/
vec4 shade(NodeInput n) {
    float ring = 0.0;
    while (ring < 0.5) { ring += 0.1; }
    return vec4(tint * ring, ring);
}
`;

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Shader Editor",
    component: Workspace,
    parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** The open editor: its dialog, its code box and the page it portals into. */
interface Editor {
    readonly dialog: HTMLElement;
    readonly box: HTMLElement;
    readonly page: ReturnType<typeof within>;
}

/**
 * Loads a small graph, then opens the editor as a reader does: Main menu, Add Shader....
 * @param canvasElement - the story's root.
 * @returns the open editor, with the code editor loaded.
 */
async function openEditor(canvasElement: HTMLElement): Promise<Editor> {
    await customElements.whenDefined("graphty-element");
    const element = canvasElement.ownerDocument.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the story rendered no <graphty-element>");
    }
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("circular", { options: { scale: 0.2 } });
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.waitForStableFrame();

    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(page.getByRole("button", { name: "Main menu" }));
    await userEvent.click(await page.findByRole("menuitem", { name: "Add Shader..." }));
    const dialog = await page.findByRole("dialog", { name: "New shader" });
    const box = await waitFor(() => {
        expect(dialog.querySelector('[data-editor="ready"]')).not.toBeNull();
        return within(dialog).getByRole("textbox", { name: "Shader code" });
    });
    return { dialog, box, page };
}

/**
 * The preview picture, once there is one and it has decoded.
 * @param dialog - the open dialog.
 * @returns the picture's address.
 */
async function preview(dialog: HTMLElement): Promise<string> {
    const picture = await within(dialog).findByRole<HTMLImageElement>("img", { name: "Preview" });
    await picture.decode();
    return picture.src;
}

/**
 * Waits for the check of the current text to finish and for the preview to draw it.
 * @param dialog - the open dialog.
 * @param before - the preview's address before the change, when the change draws a new one.
 */
async function drawn(dialog: HTMLElement, before?: string): Promise<void> {
    const add = within(dialog).getByRole("button", { name: "Add to project" });
    await waitFor(() => {
        expect(add).not.toHaveAttribute("aria-disabled");
    });
    await waitFor(async () => {
        expect(await preview(dialog)).not.toBe(before);
    });
}

/**
 * Takes focus off the field that holds it, so the picture has no blinking caret.
 * @param dialog - the open dialog.
 */
function restCaret(dialog: HTMLElement): void {
    const active = dialog.ownerDocument.activeElement;
    if (active instanceof HTMLElement) {
        active.blur();
    }
}

/**
 * Picks an entry of a select in the dialog.
 * @param editor - the open editor.
 * @param field - the select's input.
 * @param option - the entry's words.
 */
async function pick(editor: Editor, field: HTMLElement, option: string | RegExp): Promise<void> {
    await userEvent.click(field);
    await userEvent.click(await editor.page.findByRole("option", { name: option }));
}

/**
 * A story that presses one part of the Draws on switch.
 * @param label - the part's words.
 * @param input - the input type its starter reads.
 * @returns the story.
 */
function targetStory(label: string, input: string): Story {
    return {
        ...freshStore({ project: { name: "Ring", id: 1 } }),
        play: async ({ canvasElement }) => {
            const { dialog, box } = await openEditor(canvasElement);
            await drawn(dialog);
            const before = await preview(dialog);
            await userEvent.click(within(dialog).getByText(label));
            await waitFor(() => {
                expect(box.textContent).toContain(input);
            });
            await drawn(dialog, before);
            restCaret(dialog);
        },
    };
}

/** Opened from the Main menu: Node, its starter, and Place holding focus. */
export const Node: Story = {
    ...freshStore({ project: { name: "Ring", id: 1 } }),
    play: async ({ canvasElement }) => {
        const { dialog, box } = await openEditor(canvasElement);
        expect(box.textContent).toContain("NodeInput");
        const place = within(dialog).getByLabelText(/^Place/);
        await waitFor(() => {
            expect(dialog.ownerDocument.activeElement).toBe(place);
        });
        await drawn(dialog);
        restCaret(dialog);
    },
};

/** Switched to Edge: its own draft, with the places an edge has. */
export const Edge: Story = targetStory("Edge", "EdgeInput");

/** Switched to Background: no Place. */
export const Background: Story = targetStory("Background", "BackgroundInput");

/** Place set to Around the group: the code turns to a group's. */
export const AroundTheGroup: Story = {
    ...freshStore({ project: { name: "Ring", id: 1 } }),
    play: async ({ canvasElement }) => {
        const editor = await openEditor(canvasElement);
        const { dialog, box } = editor;
        await drawn(dialog);
        const before = await preview(dialog);
        await pick(editor, within(dialog).getByLabelText(/^Place/), "Around the group");
        await waitFor(() => {
            expect(box.textContent).toContain("GroupInput");
        });
        await drawn(dialog, before);
        restCaret(dialog);
    },
};

/** One row of every type, added with the + and the Type select, with no JSON typed. */
export const EveryParameterType: Story = {
    ...freshStore({ project: { name: "Ring", id: 1 } }),
    play: async ({ canvasElement }) => {
        const editor = await openEditor(canvasElement);
        const { dialog } = editor;
        // The starter's own row is the Color; each other type gets a new row.
        for (const [at, type] of ["Number", "Integer", "Switch", "Choice"].entries()) {
            await userEvent.click(within(dialog).getByRole("button", { name: "Add to node parameters" }));
            const name = `param${String(at + 1)}`;
            const row = await within(dialog).findByRole("group", { name });
            if (type !== "Number") {
                await pick(editor, within(row).getByLabelText(`${name} type`), type);
                await waitFor(() => {
                    expect(within(row).getByLabelText<HTMLInputElement>(`${name} type`).value).toBe(type);
                });
            }
        }
        expect(dialog.querySelectorAll(".ws-param-row")).toHaveLength(5);
        await drawn(dialog);
        restCaret(dialog);
    },
};

/** A refused text: its problem row, its mark in the code, and Add held back. */
export const Problems: Story = {
    ...freshStore({ project: { name: "Ring", id: 1 } }),
    play: async ({ canvasElement }) => {
        const { dialog, box } = await openEditor(canvasElement);
        await drawn(dialog);
        await userEvent.click(box);
        await userEvent.keyboard("{Control>}a{/Control}");
        await userEvent.paste(WHILE_TEXT);
        const list = await within(dialog).findByRole("list", { name: "Problems" });
        await waitFor(() => {
            expect(within(list).getAllByRole("listitem")[0].textContent).toContain("Line 3:5");
            expect(box).toHaveAttribute("aria-invalid", "true");
            expect(dialog.querySelector(".cm-lint-marker-error")).not.toBeNull();
        });
        expect(within(dialog).getByRole("button", { name: "Add to project" })).toHaveAttribute("aria-disabled", "true");
        restCaret(dialog);
    },
};

/** Full text: the box holds the header too, and the form below Place steps aside. */
export const FullText: Story = {
    ...freshStore({ project: { name: "Ring", id: 1 } }),
    play: async ({ canvasElement }) => {
        const { dialog, box } = await openEditor(canvasElement);
        await drawn(dialog);
        await userEvent.click(within(dialog).getByRole("button", { name: "Full text" }));
        await waitFor(() => {
            expect(box.textContent).toContain("graphty-shader 1");
        });
        expect(within(dialog).queryByLabelText(/^Name/)).toBeNull();
        expect(within(dialog).getByLabelText(/^Place/)).toBeInTheDocument();
        await drawn(dialog);
        restCaret(dialog);
    },
};
