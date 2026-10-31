/**
 * Where keyboard focus lands after a command that moves the reader, on the REAL graphty-element,
 * driven by real keys (issue #5163): every such command names its target, as a graph's open does
 * (the inspector's heading). Samples on the start page goes to the library's search; removing a
 * style line goes to its own section's "+"; Discard goes to the opened graph's heading; Filter
 * to... goes to the new card's value; the Graph place's title goes to the inspector's heading;
 * Enter on an unticked condition value ticks it; Escape on Back to analyses steps back; and Open
 * layer from Why this look lands on the line it names first.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import lesMiserables from "../../../public/samples/les-miserables.gml?raw";
import { openBy } from "../../test/open";
import { pickSample } from "../../test/samples-dialog";
import { render, screen, waitFor, within } from "../../test/test-utils";
import { GRAPH_FILE_GML } from "../data-place/fixtures";
import { INSPECTOR_TITLE_ID } from "../frame/focus";
import { clearRecent } from "../project/recent";
import { REGISTRATIONS } from "../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../state/store";
import { cardFields } from "../style/cards";
import { Workspace } from "../Workspace";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Answers the next file picker with this file (graphty/vitest.config.ts). */
        chooseNextFile: (name: string, mimeType: string, text: string) => Promise<void>;
    }
}

/**
 * The focused control, for messages.
 * @returns its tag and name.
 */
function focused(): string {
    const active = document.activeElement;
    return `${active?.tagName ?? "none"} ${active?.getAttribute("aria-label") ?? active?.textContent?.slice(0, 60) ?? ""}`;
}

/**
 * Waits until focus is on the inspector's heading.
 */
async function onInspectorTitle(): Promise<void> {
    await waitFor(() => {
        assert.strictEqual(document.activeElement?.id, INSPECTOR_TITLE_ID, focused());
    });
}

/**
 * Les Miserables in the workspace with its starting rows.
 * @param store - the workspace store.
 * @returns the session.
 */
async function openScene(store: WorkspaceStore): Promise<GraphSession> {
    await page.viewport(1440, 900);
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
    await session.styles.settled();
    return session;
}

/**
 * Opens a style tree row in the inspector with a click.
 * @param name - the row's name.
 */
async function openRow(name: string): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
}

beforeEach(async () => {
    await clearRecent();
});

afterEach(() => {
    document.documentElement.classList.remove("ws-land-page");
});

describe("focus after a command that moves the reader", () => {
    it("Enter on the start page's Samples puts focus in the library's search", async () => {
        render(<Workspace store={createWorkspaceStore()} />);
        const samples = await screen.findByRole("button", { name: "Samples" });
        samples.focus();
        await userEvent.keyboard("{Enter}");
        const search = screen.getByRole("searchbox", { name: "Search samples" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, search, focused());
        });
    });

    it("Enter on Remove puts focus on that line's own section's +", async () => {
        const session = await openScene(createWorkspaceStore({ project: { name: "Untitled", id: 1 } }));
        await session.styles.add({
            name: "Picked",
            target: "node",
            selector: { match: "rule", where: { kind: "text", reads: "data.name", mode: "substring", text: "M" } },
            set: { "node.color": "#d55e00", "node.size": 3, "node.glow": "#ff9900" },
        });
        await session.styles.settled();
        await openRow("Picked");
        const remove = await screen.findByRole("button", { name: "Remove node color" });
        const section = remove.closest<HTMLElement>("[data-section]")?.dataset.section;
        assert.isDefined(section);
        remove.focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            const active = document.activeElement as HTMLElement | null;
            assert.isTrue(active?.hasAttribute("data-plus") === true, focused());
            assert.strictEqual(active?.closest<HTMLElement>("[data-section]")?.dataset.section, section);
        });
    });

    it("Discard, from a project opened over unsaved changes, puts focus on the opened graph's heading", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        const session = await openBy(store, () => pickSample("Florentine families"));
        const { text } = await session.project.save();
        await session.styles.add({
            name: "Unsaved",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 3 },
        });
        assert.isTrue(session.project.dirty);
        // The reader is in the drawing when they open a project over their unsaved work.
        const canvas = document.querySelector<HTMLElement>("graphty-element:not([data-start-page])");
        for (let press = 0; press < 8 && document.activeElement !== canvas; press++) {
            await userEvent.keyboard("{F6}");
        }
        assert.strictEqual(document.activeElement, canvas, focused());
        await commands.chooseNextFile("Florentine families.graphty.json", "application/json", text);
        await userEvent.keyboard("{Control>}o{/Control}");
        const ask = await screen.findByRole("dialog", { name: "Discard unsaved changes?" });
        const discard = within(ask).getByRole("button", { name: "Discard" });
        await waitFor(() => {
            assert.isTrue(ask.contains(document.activeElement), focused());
        });
        for (let press = 0; press < 4 && document.activeElement !== discard; press++) {
            await userEvent.keyboard("{Tab}");
        }
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.match(store.get().notice?.message ?? "", /^Opened /);
        });
        await onInspectorTitle();
    });

    it("Filter to... from a column's menu puts focus in the new card's value", async () => {
        const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 }, place: "data" });
        render(<Workspace store={store} registrations={REGISTRATIONS} />);
        const session = await waitFor(() => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        });
        await session?.data.import({ type: "gml", name: "les-miserables.gml", config: { data: GRAPH_FILE_GML } });
        await userEvent.click(screen.getByRole("button", { name: /^Table/ }));
        const dock = await screen.findByRole("region", { name: "Table" });
        await userEvent.click(await within(dock).findByRole("tab", { name: "Edges" }));
        await userEvent.click(await within(dock).findByRole("button", { name: "Options for value" }));
        const menu = await screen.findByRole("menu");
        const item = within(menu).getByRole("menuitem", { name: "Filter to..." });
        for (let press = 0; press < 8 && document.activeElement !== item; press++) {
            await userEvent.keyboard("{ArrowDown}");
        }
        await userEvent.keyboard("{Enter}");
        const from = await screen.findByRole("textbox", { name: "value from, number" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, from, focused());
        });
    });

    it("Enter on the Graph place's title, with the graph already inspected, puts focus on the inspector's heading", async () => {
        await openScene(createWorkspaceStore({ project: { name: "Untitled", id: 1 }, inspected: { kind: "graph" } }));
        const place = await screen.findByRole("region", { name: "Graph place" });
        const title = within(place).getByRole("button", { name: /^Graph les-miserables/ });
        await waitFor(() => {
            assert.isNotNull(document.querySelector(`[data-inspected="graph"] #${INSPECTOR_TITLE_ID}`));
        });
        title.focus();
        await userEvent.keyboard("{Enter}");
        await onInspectorTitle();
    });

    it("Enter on an unticked condition value ticks it and keeps the cards open; the next Enter is Done", async () => {
        const session = await openScene(createWorkspaceStore({ project: { name: "Untitled", id: 1 } }));
        await session.runs.start("louvain", undefined, { style: false, seed: 1 });
        await session.styles.add({
            name: "Groups",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#d55e00" },
        });
        await session.styles.settled();
        await openRow("Groups");
        const group = cardFields(session, "node").find((field) => field.path.endsWith(".group"));
        const name = group?.name ?? "";
        await userEvent.click(await screen.findByRole("button", { name: /^Which nodes, / }));
        const region = await screen.findByRole("group", { name: "Which nodes" });
        await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
        await userEvent.click(await screen.findByRole("option", { name: new RegExp(`^${name}(,|$)`) }));
        const card = await waitFor(() => within(region).getByRole("group", { name: new RegExp(`^${name}(,|$)`) }));
        const [first] = within(card).getAllByRole<HTMLInputElement>("checkbox");
        assert.isFalse(first.checked);
        first.focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isTrue(first.checked, "Enter did not tick the value");
        });
        assert.isNotNull(screen.queryByRole("group", { name: "Which nodes" }), "Enter closed the cards");
        assert.strictEqual(document.activeElement, first, focused());
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("group", { name: "Which nodes" }), "Enter on a ticked value is Done");
        });
    });

    it("Escape on Back to analyses steps back to the list", async () => {
        await openScene(createWorkspaceStore({ project: { name: "Untitled", id: 1 } }));
        await userEvent.click(screen.getByRole("button", { name: /^Analyze/ }));
        const filter = await screen.findByRole("combobox", { name: "Filter analyses" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, filter, focused());
        });
        await userEvent.keyboard("deg{Enter}");
        const back = await screen.findByRole("button", { name: "Back to analyses" });
        for (let press = 0; press < 12 && document.activeElement !== back; press++) {
            await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
        }
        assert.strictEqual(document.activeElement, back, focused());
        await userEvent.keyboard("{Escape}");
        const list = await screen.findByRole("combobox", { name: "Filter analyses" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, list, focused());
        });
    });

    it("Open layer from Why this look lands on the line it names first", async () => {
        const session = await openScene(createWorkspaceStore({ project: { name: "Untitled", id: 1 } }));
        const [node] = session.data.nodes();
        await session.selection.apply({ nodes: [node.id] });
        await userEvent.click(await screen.findByRole("tab", { name: "Style" }));
        const why = await waitFor(() => {
            const found = [...document.querySelectorAll<HTMLElement>('[data-testid="why-line"]')].find(
                (line) => within(line).queryByRole("button", { name: "Open layer Everything" }) !== null,
            );
            assert.isDefined(found);
            return found;
        });
        if (why === undefined) {
            return;
        }
        const words = why.querySelector<HTMLElement>(".mantine-Text-root:last-child")?.textContent ?? "";
        const first = words.split(",")[0]?.trim().toLowerCase() ?? "";
        within(why).getByRole("button", { name: "Open layer Everything" }).focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            const line = document.activeElement?.closest<HTMLElement>("[data-line]");
            assert.isDefined(line ?? undefined, focused());
            const label = line?.querySelector(".ws-field-label, label")?.textContent?.trim().toLowerCase() ?? "";
            assert.isTrue(label.startsWith(first), `focus is on ${label}, the link names ${first} first`);
        });
    });
});
