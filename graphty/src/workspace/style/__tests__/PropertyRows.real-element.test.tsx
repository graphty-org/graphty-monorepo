/**
 * The Style tab's property rows on the REAL graphty-element, driven by real input: a field keeps
 * its width when it is set, cleared or focused (reserved vary and Clear columns); a paired color
 * shows its whole hex; the vary glyph is drawn at rest on every field that can vary and "=" opens
 * it; every layer shows Which elements; one Clear look (no reset "x"); a locked layer's controls
 * stay in the Tab order, each aria-disabled with the reason; no two controls of a both-kinds layer
 * share a name; Undo after Clear names what it restores.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import axe from "axe-core";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { historyTip } from "../../frame/historyWords";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** The scene's run rows, by the name the tree draws for each. */
interface Scene {
    readonly session: GraphSession;
    readonly runs: Readonly<Record<"degree" | "louvain" | "edge-betweenness" | "shortest-path", string>>;
}

/**
 * Les Miserables with the starting rows, a "Key people" layer that sets only a color, and four
 * runs (Degree, Edge betweenness, Louvain, a route), as the review stories build it.
 * @returns the scene.
 */
async function openScene(): Promise<Scene> {
    await page.viewport(1440, 900);
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 } })} />);
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
    await session.config.set({ startingRows: true });
    const idOf = (name: string): string => String(session.data.nodes().find((n) => n.name === name)?.id);
    await session.styles.add({
        name: "Key people",
        target: "node",
        selector: { match: "ids", nodes: ["Valjean", "Javert"].map(idOf) },
        set: { "node.color": "#E8590C" },
    });
    const run = async (algorithm: keyof Scene["runs"], params: Record<string, unknown> = {}): Promise<string> => {
        const { runId } = await session.runs.start(algorithm, params);
        await session.styles.settled();
        const layer = session.runs
            .bindings(runId)
            .map((id) => session.styles.get(id))
            .find((l) => l !== undefined);
        if (layer === undefined) {
            throw new Error(`${algorithm} painted no layer`);
        }
        return layer.name;
    };
    const degree = await run("degree");
    const betweenness = await run("edge-betweenness");
    const louvain = await run("louvain");
    const route = await run("shortest-path", { source: idOf("Myriel"), target: idOf("Marius") });
    await session.styles.settled();
    return { session, runs: { degree, louvain, "edge-betweenness": betweenness, "shortest-path": route } };
}

/**
 * Opens a tree row's Style tab by a click on the row, and on the Style tab when it opened on Values.
 * @param name - the row's visible name.
 * @returns the Style tab.
 */
async function openStyle(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    const escaped = name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${escaped}, `) }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    return screen.findByTestId("style-tab");
}

/**
 * A field's box by its channel.
 * @param tab - the Style tab.
 * @param channel - the channel.
 * @returns the field.
 */
function field(tab: HTMLElement, channel: string): HTMLElement {
    const found = tab.querySelector<HTMLElement>(`.ws-field[data-line="${channel}"]`);
    if (found === null) {
        throw new Error(`no ${channel} field`);
    }
    return found;
}

/**
 * A control's box as a comparable string.
 * @param element - the control.
 * @returns "x y width height".
 */
function box(element: Element): string {
    const r = element.getBoundingClientRect();
    return [r.x, r.y, r.width, r.height].map((n) => n.toFixed(1)).join(" ");
}

describe("the Style tab's property rows", () => {
    it("keeps Size's width when it is set, cleared and focused, and Undo names the clear", async () => {
        const { session } = await openScene();
        const tab = await openStyle("Key people");
        const sizeBox = (): string => box(field(tab, "node.size").querySelector(".ws-field-control") ?? tab);
        const rest = sizeBox();

        const size = within(field(tab, "node.size")).getByRole("combobox");
        await userEvent.click(size);
        assert.equal(sizeBox(), rest, "focus does not move the field");
        await userEvent.keyboard("3{Enter}");
        const clear = await within(tab).findByRole("button", { name: "Clear Node size" });
        assert.equal(sizeBox(), rest, "set: the minus has its own column");
        await userEvent.click(clear);
        await waitFor(() => {
            assert.isNull(within(tab).queryByRole("button", { name: "Clear Node size" }));
        });
        assert.equal(sizeBox(), rest, "cleared: the same width");

        assert.equal(historyTip(session, true), "Undo clearing node size on Key people");
    });

    it("draws the vary glyph at rest on Shape, Color, Size, Width, Head and Glow color, and '=' in Size opens it", async () => {
        const { runs } = await openScene();
        let tab = await openStyle("Key people");
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node effects" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Glow/ }));
        // The glow's color, with its vary glyph, is in the glow's settings.
        const glow = await screen.findByRole("dialog", { name: "Glow settings" });
        await within(glow).findByRole("textbox", { name: /^Node glow/ });
        await userEvent.keyboard("FF00AA{Enter}");
        const atRest = (scope: HTMLElement, name: string): void => {
            const button = within(scope).getByRole("button", { name });
            assert.isTrue(button.checkVisibility({ visibilityProperty: true }), `${name} is drawn at rest`);
        };
        atRest(glow, "Node glow by attribute");
        await userEvent.keyboard("{Escape}");
        for (const name of ["Node shape by attribute", "Node color by attribute", "Node size by attribute"]) {
            atRest(tab, name);
        }

        await userEvent.click(within(field(tab, "node.size")).getByRole("combobox"));
        await userEvent.keyboard("=");
        await screen.findByRole("dialog", { name: /Size by attribute/ });
        await userEvent.keyboard("{Escape}");

        tab = await openStyle(runs["shortest-path"]);
        atRest(tab, "Edge head by attribute");
        atRest(tab, "Edge width by attribute");
        atRest(tab, "Edge color by attribute");
    });

    it("shows Which elements on every layer, run or not, and draws no reset 'x' in the fields", async () => {
        const { runs } = await openScene();
        for (const name of ["Everything", runs.degree, runs.louvain, runs["edge-betweenness"], runs["shortest-path"]]) {
            const tab = await openStyle(name);
            await within(tab).findByTestId("which-elements");
            if (name === runs.degree) {
                // A varied value says which property it is before what it reads.
                await within(tab).findByRole("button", { name: /^Node (color|size): \w/ });
            }
            assert.lengthOf(
                tab.querySelectorAll('.ws-property-row [data-testid$="-reset"]'),
                0,
                `${name}: Clear is the row-end minus only`,
            );
        }
    });

    it("shows the route's whole edge hex beside its width, and no two of its controls share a name", async () => {
        const { runs } = await openScene();
        const tab = await openStyle(runs["shortest-path"]);
        const hex = field(tab, "edge.color").querySelector<HTMLInputElement>('input[aria-label^="Edge color"]');
        assert.isNotNull(hex);
        if (hex !== null) {
            const shown = hex.value === "" ? hex.placeholder : hex.value;
            assert.match(shown, /^#?[0-9A-F]{6}$/i, "a six-digit hex");
            // The box scrolls nothing out of sight: the whole value shows.
            assert.isAtMost(hex.scrollWidth, hex.clientWidth, `"${shown}" is not clipped`);
        }

        axe.setup(document);
        try {
            const names = [...tab.querySelectorAll<HTMLElement>("input:not([type=hidden]), button, [role=combobox]")]
                .filter((control) => control.checkVisibility() && control.tabIndex >= 0)
                .map((control) => axe.commons.text.accessibleText(control));
            assert.isAbove(names.length, 10, "the names were read");
            assert.notInclude(names, "", "every control has a name");
            const repeated = names.filter((name, i) => names.indexOf(name) !== i);
            assert.deepEqual(repeated, [], "every control's name is its own");
        } finally {
            axe.teardown();
        }
    });

    it("keeps a locked layer's controls in the Tab order, each aria-disabled and described by the reason", async () => {
        const { session } = await openScene();
        const tab = await openStyle("Key people");
        const tree = screen.getByRole("tree", { name: "Style layers" });
        const keyRow = within(tree).getByRole("treeitem", { name: /^Key people, / });
        await userEvent.hover(keyRow);
        await userEvent.click(within(keyRow).getByRole("button", { name: "Lock Key people" }));
        await screen.findByText("This layer is locked");
        const before = JSON.stringify(session.styles.list());

        await userEvent.click(within(tab).getByTestId("which-elements"));
        let reached: HTMLElement | null = null;
        for (let i = 0; i < 4 && reached === null; i++) {
            await userEvent.keyboard("{Tab}");
            const active = document.activeElement as HTMLElement | null;
            reached = active !== null && screen.getByTestId("style-tab").contains(active) ? active : null;
        }
        assert.isNotNull(reached, "Tab reaches a control of the locked layer");
        const controls = [
            ...screen.getByTestId("style-tab").querySelectorAll<HTMLElement>("input:not([type=hidden]), button"),
        ];
        for (const control of controls) {
            assert.equal(control.getAttribute("aria-disabled"), "true", control.outerHTML.slice(0, 80));
            const described = (control.getAttribute("aria-describedby") ?? "")
                .split(" ")
                .map((id) => document.getElementById(id)?.textContent ?? "")
                .join(" ");
            assert.include(described, "This layer is locked");
        }
        await userEvent.keyboard("7{Enter}");
        assert.equal(JSON.stringify(session.styles.list()), before, "a locked layer takes no edit");
    });
});
