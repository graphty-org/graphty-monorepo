/**
 * The selection workspace (design/ui/selection-groups/spec.md, sections 3.0 and 3.5, checks 39 to
 * 47) on the REAL graphty-element and Les Miserables, driven by real clicks and keys: the sidebar
 * keeps a read-only outline and Edit opens one non-modal workspace over the canvas column; the
 * inspector beside it stays usable and the camera never moves; one workspace edits every rule;
 * Done keeps, Cancel restores as one undo step, Escape closes the innermost thing and is Done on
 * the workspace; Links scopes a step inside the editor; a checklist never re-sorts under the
 * pointer; Clear starts over with undo and a delete never re-shapes the row under the pointer;
 * plain-word tooltips and search words; By position switches only on an explicit choice; the
 * workspace is a named region in the F6 ring, announced as it opens and closes.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// Every experiment stays off here.
withFeatures([]);

/** The open workspace, or undefined. */
const workspace = (): HTMLElement | undefined => document.querySelector<HTMLElement>(".sel-ws") ?? undefined;

/**
 * The open workspace, waited for.
 * @returns it.
 */
async function opened(): Promise<HTMLElement> {
    return waitFor(() => {
        const found = workspace();
        assert.isDefined(found, "the workspace is open");
        return found;
    });
}

/**
 * Les Miserables in the workspace, and every announcement made.
 * @param size - the window.
 * @param size.width - its width.
 * @param size.height - its height.
 * @returns The session, the store and the announcements heard.
 */
async function openSample(
    size = { width: 1440, height: 900 },
): Promise<{ session: GraphSession; store: WorkspaceStore; heard: string[] }> {
    await page.viewport(size.width, size.height);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    const heard: string[] = [];
    store.subscribe(() => {
        const said = store.get().announcement;
        if (typeof said === "string" && said !== "" && heard.at(-1) !== said) {
            heard.push(said);
        }
    });
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
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    return { session, store, heard };
}

/**
 * A reader's layer, selected in the style tree: its Which nodes outline is in the inspector.
 * @param session - The session.
 * @param name - Its name.
 * @param where - Its selection, or everything.
 * @returns The layer.
 */
async function openLayer(session: GraphSession, name: string, where?: UnionLeaf): Promise<Layer> {
    const layer = await session.styles.add({
        name,
        target: "node",
        selector: where === undefined ? { match: "everything" } : { match: "rule", where },
        set: { "node.color": "#d55e00" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-rest"));
    });
    return layer;
}

/**
 * The sidebar outline's Edit button, waited for: the sidebar draws it only while the workspace is
 * closed, and Done or Cancel closes it once the canvas has painted.
 * @returns it.
 */
const editButton = (): Promise<HTMLElement> => screen.findByRole("button", { name: /^Style Nodes\.\.\./ });

describe("plain words (check 45, fix 5)", () => {
    it("Degree says edges at a node and is found by links and connections; While says what it holds", async () => {
        const { session } = await openSample();
        await openLayer(session, "Words");
        await userEvent.click(await editButton());
        const ws = await opened();
        await userEvent.click(await within(ws).findByRole("button", { name: "Value" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        for (const word of ["links", "connections"]) {
            await userEvent.keyboard(word);
            await screen.findByRole("option", { name: /^Degree/ });
            await userEvent.keyboard("{Control>}a{/Control}{Backspace}");
        }
        await userEvent.keyboard("Degree");
        await userEvent.hover(await screen.findByRole("option", { name: /^Degree/ }));
        await screen.findByText("Edges at a node");
        await userEvent.keyboard("{Control>}a{/Control}{Backspace}while");
        await userEvent.hover(await screen.findByRole("option", { name: /^While/ }));
        await screen.findByText("Everything while it holds a node, else nothing");
        await userEvent.keyboard("{Escape}");
        // No sentence is drawn in the workspace.
        const texts = [...ws.querySelectorAll<HTMLElement>("p, span, label")]
            .filter((each) => each.children.length === 0)
            .map((each) => each.textContent ?? "");
        assert.isEmpty(
            texts.filter((text) => /[a-z]\.$/u.test(text.trim())),
            texts.join(" | "),
        );
    });
});
