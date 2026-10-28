/**
 * The Style tab's one-line property rows on the REAL graphty-element, driven by real input: every
 * row starts at one left edge; the element's base layers are never named; a row a layer above
 * covers says by whom and on how many; a bound pill keeps its width and Stop varying keeps focus
 * on the field; several rows show every kind they paint.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { findTreeRow } from "../../graph-place/rows";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** The scene: the session, the store, and each run's tree row name. */
interface Scene {
    readonly session: GraphSession;
    readonly store: WorkspaceStore;
    readonly rows: Readonly<Record<"degree" | "louvain" | "route", string>>;
    readonly layers: Readonly<Record<"degree" | "louvain" | "routeEdges", string>>;
}

/**
 * Les Miserables with the starting rows, a "Key people" layer that sets only a color, Degree,
 * Louvain and a route, at the given window size.
 * @param width - the window's width.
 * @param height - the window's height.
 * @returns the scene.
 */
async function openScene(width = 1440, height = 900): Promise<Scene> {
    await page.viewport(width, height);
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
    await session.config.set({ startingRows: true, editableBase: true });
    const idOf = (name: string): string => String(session.data.nodes().find((n) => n.name === name)?.id);
    await session.styles.add({
        name: "Key people",
        target: "node",
        selector: { match: "ids", nodes: ["Valjean", "Javert"].map(idOf) },
        set: { "node.color": "#E8590C" },
    });
    const run = async (algorithm: string, params: Record<string, unknown> = {}): Promise<string[]> => {
        const { runId } = await session.runs.start(algorithm, params);
        await session.styles.settled();
        return [...session.runs.bindings(runId)];
    };
    const [degree] = await run("degree");
    const [louvain] = await run("louvain");
    const route = await run("shortest-path", { source: idOf("Myriel"), target: idOf("Marius") });
    await session.styles.settled();
    const routeEdges = route.find((id) => session.styles.get(id)?.target === "edge") ?? "";
    const rowName = (id: string): string => {
        const layer = session.styles.get(id);
        return findTreeRow(session.styles.tree(), layer?.row ?? id)?.row.name ?? String(layer?.name);
    };
    return {
        session,
        store,
        rows: { degree: rowName(degree), louvain: rowName(louvain), route: rowName(routeEdges) },
        layers: { degree, louvain, routeEdges },
    };
}

/**
 * Opens a tree row's Style tab by a click on the row, and on the Style tab when it opened on Values.
 * @param name - the row's visible name.
 * @returns the Style tab.
 */
async function openStyle(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${escape(name)}, `) }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    return screen.findByTestId("style-tab");
}

/**
 * A name as a regular expression's literal text.
 * @param name - the name.
 * @returns the escaped text.
 */
function escape(name: string): string {
    return name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * A field's box by its channel.
 * @param tab - the Style tab.
 * @param channel - the channel.
 * @returns the field.
 */
function field(tab: HTMLElement, channel: string): HTMLElement {
    const found = tab.querySelector<HTMLElement>(`.ws-row[data-line="${channel}"]`);
    if (found === null) {
        throw new Error(`no ${channel} field`);
    }
    return found;
}

describe("one line per property", () => {
    it("starts every field of the tab at one left edge, its name in one column, 16 px in", async () => {
        await openScene();
        const tab = await openStyle("Key people");
        // A control drawn with `display: contents` (a color box, so its refusal can run under the
        // row) has no box of its own: its first child draws where it starts.
        const drawn = (el: Element): Element => {
            let at = el;
            while (getComputedStyle(at).display === "contents" && at.firstElementChild !== null) {
                at = at.firstElementChild;
            }
            return at;
        };
        const lefts = (selector: string): number[] => [
            ...new Set(
                [...tab.querySelectorAll<HTMLElement>(selector)]
                    .map(drawn)
                    .filter((el) => el.checkVisibility())
                    .map((el) => Math.round(el.getBoundingClientRect().left)),
            ),
        ];
        const fields = lefts(".ws-field[data-named] > .ws-field-control");
        assert.lengthOf(fields, 1, `every field starts at one x: ${fields.join(", ")}`);
        const names = lefts(".ws-field[data-named] > .ws-field-label");
        assert.lengthOf(names, 1, `every name starts at one x: ${names.join(", ")}`);
        const panel = tab.getBoundingClientRect().left;
        assert.equal(names[0] - Math.round(panel), 16, "the names sit on the 16 px gutter");
        const which = within(tab).getByTestId("which-picker").querySelector(".ws-which-head")?.getBoundingClientRect();
        assert.equal(Math.round((which?.left ?? 0) - panel), 16, "the Which picker sits on the same gutter");
        // One line each: no field is taller than its control's line.
        for (const line of tab.querySelectorAll<HTMLElement>(".ws-row > .ws-field")) {
            assert.isAtMost(line.getBoundingClientRect().height, 30, `${String(line.dataset.line)} is one line`);
        }
    });

    it("never names the element's base layers", async () => {
        await openScene();
        await openStyle("Everything");
        const words = [...document.querySelectorAll("[aria-label], [title]")]
            .flatMap((el) => [el.getAttribute("aria-label") ?? "", el.getAttribute("title") ?? ""])
            .join(" ");
        assert.notInclude(`${document.body.textContent} ${words}`, "Node defaults");
    });

    it("says a set row a layer above covers, naming it and how many elements it covers", async () => {
        const { session } = await openScene();
        // Key people colors Valjean and Javert; a layer added on top colors Valjean alone.
        const valjean = String(session.data.nodes().find((n) => n.name === "Valjean")?.id);
        await session.styles.add({
            name: "Valjean",
            target: "node",
            selector: { match: "ids", nodes: [valjean] },
            set: { "node.color": "#1971C2" },
        });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        await waitFor(() => {
            const caption = field(tab, "node.color").querySelector("[data-covered-caption]");
            assert.include(caption?.textContent ?? "", "Covered by Valjean");
            assert.match(caption?.textContent ?? "", /on 1 of 2$/);
        });
    });

    it("keeps a bound pill's width with its popover open, shows its colors, and Stop varying keeps focus", async () => {
        const { store, rows } = await openScene();
        const tab = await openStyle(rows.degree);
        const line = field(tab, "node.color");
        const pill = line.querySelector<HTMLElement>(".cm-var-fill");
        assert.isNotNull(pill);
        const chit = line.querySelector<HTMLElement>(".cm-var-chit");
        // Wider than a one-color chit (16), narrow enough that the source's name fits beside it.
        assert.isAtLeast(chit?.getBoundingClientRect().width ?? 0, 20, "a strip of its colors at rest");
        const before = pill?.getBoundingClientRect().width;
        await userEvent.click(within(line).getByRole("button", { name: /^Node color: / }));
        await screen.findByRole("dialog", { name: /^Color by / });
        assert.equal(pill?.getBoundingClientRect().width, before, "open, the pill keeps its width");
        await userEvent.keyboard("{Escape}");

        await userEvent.click(within(line).getByRole("button", { name: "Stop varying node color by data" }));
        await waitFor(() => {
            const fixed = field(screen.getByTestId("style-tab"), "node.color");
            assert.isFalse(fixed.hasAttribute("data-bound"), "one value now");
            assert.isTrue(
                fixed.querySelector(".ws-field-control")?.contains(document.activeElement) === true,
                "focus is on the field",
            );
        });
        const said = store.get().announcement ?? "";
        assert.match(said, /^Node color no longer varies by data, now [a-z ]+$/, said);
    });

    it("shows Edges, Text and Shaders for several rows when one of them paints edges", async () => {
        const { rows } = await openScene();
        const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
        const user = userEvent.setup();
        await user.click(within(tree).getByRole("treeitem", { name: /^Key people, / }));
        await user.keyboard("{Control>}");
        await user.click(within(tree).getByRole("treeitem", { name: new RegExp(`^${escape(rows.route)}, `) }));
        await user.keyboard("{/Control}");
        const tab = await screen.findByTestId("style-tab");
        await within(tab).findByRole("button", { name: "Add to node shaders" });
        await showKind("edge");
        await waitFor(() => {
            assert.isNotNull(tab.querySelector('[data-group="edge"]'), "an Edges section");
        });
        assert.isAbove(within(tab).getAllByText("Text").length, 0, "a Text section");
    });
});
