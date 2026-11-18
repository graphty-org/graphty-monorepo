/**
 * The Style sidebar draws only approved controls (owner, 2026-11-17; #8739), on the REAL graphty-element, opened by
 * real clicks: every element the sidebar draws is an approved control, sits inside one, or is a container the list
 * names, and every word it shows is a control's own or a control's name. A pill, chip, badge, caption, note or
 * warning fails. The approved list is src/workspace/style/approved-controls.json, shared with the lint rule
 * graphty/eslint-rules/style-sidebar-controls.js.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { findTreeRow } from "../../graph-place/rows";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import approved from "../approved-controls.json";
import { showKind } from "./kindTab";
import { openShapes } from "./modelHarness";

/** Every approved control's root: what is inside one is the control's. */
const CONTROLS = approved.controls.map((entry) => entry.dom).join(", ");
/** The library internals not drawn by the app: inside these nothing is checked. */
const INTERNALS = approved.controls
    .filter((entry) => !entry.from.startsWith("@mantine/"))
    .map((entry) => entry.dom)
    .join(", ");
/** Where words may sit: in a control, or in a container's own words (a section's header, a tab). */
const WORDS = [CONTROLS, ...approved.containers.flatMap((entry) => ("words" in entry ? [entry.words] : []))].join(", ");
/** The Mantine components the sidebar may draw. */
const MANTINE = new Set(
    [...approved.controls, ...approved.containers]
        .filter((entry) => entry.from.startsWith("@mantine/"))
        .map((entry) => entry.name),
);
/** What is information however it is drawn, even inside a button. */
const INFORMATION = new Set(["Badge", "Pill", "Chip", "Alert", "Text", "Notification", "Loader", "Code", "Mark"]);
/** An app's own class naming a pill, chip, badge, caption or note. */
const INFORMATION_CLASS = /(?:^|-)(?:chip|chips|pill|badge|caption|note|hint|covered|state-line)(?:-|$)/;

/**
 * Whether an element is drawn so a reader can see it: shown, and not shrunk or clipped to a point as a
 * screen-reader-only element is.
 * @param element - the element.
 * @param root - where to stop looking up.
 * @returns whether it is seen.
 */
function seen(element: Element, root: Element): boolean {
    if (!element.checkVisibility({ opacityProperty: true, visibilityProperty: true })) {
        return false;
    }
    for (let at: Element | null = element; at !== null && at !== root; at = at.parentElement) {
        const box = at.getBoundingClientRect();
        const style = getComputedStyle(at);
        if (box.width <= 1 || box.height <= 1 || style.clip !== "auto" || style.clipPath.startsWith("inset(50%")) {
            return false;
        }
    }
    return true;
}

/**
 * A short description of an element, for a failure message.
 * @param element - the element.
 * @returns its tag, classes and words.
 */
function described(element: Element): string {
    const classes = [...element.classList].filter((name) => !name.startsWith("m_")).join(".");
    return `<${element.tagName.toLowerCase()}${classes === "" ? "" : `.${classes}`}> "${(element.textContent ?? "").trim().slice(0, 40)}"`;
}

/**
 * Everything the sidebar draws that the approved list does not allow.
 * @param tab - the Style tab.
 * @returns each offending element, described.
 */
function outsideTheList(tab: HTMLElement): string[] {
    const found: string[] = [];
    for (const element of tab.querySelectorAll("*")) {
        if (element.parentElement?.closest(INTERNALS) || !seen(element, tab)) {
            continue;
        }
        const inControl = element.closest(CONTROLS) !== null;
        const ownControl = element.matches(CONTROLS);
        for (const name of element.classList) {
            const mantine = /^mantine-(\w+)-root$/.exec(name)?.[1];
            const refused =
                mantine === undefined
                    ? INFORMATION_CLASS.test(name)
                    : !ownControl && (INFORMATION.has(mantine) || (!inControl && !MANTINE.has(mantine)));
            if (refused) {
                found.push(`${name}: ${described(element)}`);
            }
        }
    }
    const walker = document.createTreeWalker(tab, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const holder = node.parentElement;
        if (holder === null || (node.textContent ?? "").trim() === "" || !seen(holder, tab)) {
            continue;
        }
        if (holder.closest(WORDS) === null) {
            found.push(`words outside a control: ${described(holder)}`);
        }
    }
    return [...new Set(found)];
}

/**
 * Checks the open Style tab, on each kind's tab when it has two.
 * @param where - what is open, for the message.
 */
async function checkSidebar(where: string): Promise<void> {
    const kinds = screen.queryByRole("tablist", { name: "Style for" }) === null ? [null] : (["node", "edge"] as const);
    for (const kind of kinds) {
        if (kind !== null) {
            await showKind(kind);
        }
        const tab = await screen.findByTestId("style-tab");
        assert.deepEqual(outsideTheList(tab), [], `${where}${kind === null ? "" : `, ${kind}s`}`);
    }
}

/**
 * Les Miserables with a hand-picked layer, Degree, Louvain and a route.
 * @returns the session and each row's name.
 */
async function openScene(): Promise<{ session: GraphSession; rows: string[] }> {
    await page.viewport(1440, 900);
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 } })} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true });
    const idOf = (name: string): string => String(session.data.nodes().find((n) => n.name === name)?.id);
    await session.styles.add({
        name: "Key people",
        target: "node",
        selector: { match: "ids", nodes: ["Valjean", "Javert"].map(idOf) },
        set: { "node.color": "#E8590C" },
    });
    const rowOf = async (algorithm: string, params: Record<string, unknown> = {}): Promise<string> => {
        const { runId } = await session.runs.start(algorithm, params);
        await session.styles.settled();
        const id = session.runs.bindings(runId).at(-1) ?? "";
        const layer = session.styles.get(id);
        return findTreeRow(session.styles.tree(), layer?.row ?? id)?.row.name ?? String(layer?.name);
    };
    const runs = [
        await rowOf("degree"),
        await rowOf("louvain"),
        await rowOf("shortest-path", { source: idOf("Myriel"), target: idOf("Marius") }),
    ];
    return { session, rows: ["Everything", "Key people", ...runs] };
}

/**
 * Opens a tree row's Style tab by a click on the row, or adds the row to those picked by a Control-click.
 * @param name - the row's name.
 * @param add - whether to add it to the rows already picked.
 */
async function clickRow(name: string, add = false): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    const row = await within(tree).findByRole("treeitem", {
        name: new RegExp(`^${name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}, `),
    });
    if (add) {
        await userEvent.keyboard("{Control>}");
        await userEvent.click(row);
        await userEvent.keyboard("{/Control}");
        // Several rows have one panel, with no Values tab beside it.
        return;
    }
    await userEvent.click(row);
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
}

describe("the Style sidebar draws only approved controls", () => {
    it("on a layer, a run's rows, the Everything row and several rows together", async () => {
        const { rows } = await openScene();
        for (const name of rows) {
            await clickRow(name);
            await checkSidebar(name);
        }
        await clickRow("Key people");
        await clickRow(rows[2], true);
        await checkSidebar("Key people and Degree together");
    });

    it("with the Which picker's cards open", async () => {
        await openScene();
        await clickRow("Key people");
        await showKind("node");
        const tab = await screen.findByTestId("style-tab");
        await userEvent.click(within(tab).getByRole("button", { name: /^Which nodes/ }));
        await screen.findByRole("group", { name: "Which nodes" });
        await checkSidebar("Key people, Which open");
    });

    it("on a model's Shape field", async () => {
        await openShapes();
        await checkSidebar("Shapes, node models on");
    });
});
