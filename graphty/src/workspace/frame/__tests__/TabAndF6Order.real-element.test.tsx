/**
 * The order of F6 and Tab stops in the app, on the REAL graphty-element, by real keys: F6 rounds
 * the regions and never lands on a resize handle; the start page's "Open a file" comes before
 * the demo graph; Tab leaves the Analyze filter, the color picker, a list with letters typed and a
 * box that writes; Shift+Tab reaches a bound color's swatch; a run's result row is a Tab stop.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Two rings of six joined by one bridge; each node labeled and weighed. */
const NODES = Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}`, label: `Node ${String(i)}`, weight: i }));
const ring = (from: number): { source: string; target: string }[] =>
    Array.from({ length: 6 }, (_, i) => ({
        source: `n${String(from + i)}`,
        target: `n${String(from + ((i + 1) % 6))}`,
    }));
const EDGES = [...ring(0), ...ring(6), { source: "n0", target: "n6" }];

/**
 * The workspace holding the two rings, with the starting rows.
 * @returns the session and the store.
 */
async function openRings(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Two rings", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.config.set({
        startingRows: true,
        editableBase: true,
        data: { knownFields: { nodeLabelPath: "label" } },
    });
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    await session.styles.settled();
    return { session, store };
}

/**
 * The inspector region.
 * @returns queries scoped to it.
 */
const inspector = (): ReturnType<typeof within> => within(screen.getByRole("complementary", { name: "Inspector" }));

/**
 * A tree row, by the start of its name.
 * @param name - the row's name.
 * @returns the row.
 */
async function treeRow(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    return within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) });
}

/**
 * A property line of the Style tab.
 * @param channel - the line's channel.
 * @returns the line.
 */
async function line(channel: string): Promise<HTMLElement> {
    const tab = await screen.findByTestId("style-tab");
    return waitFor(() => {
        const found = tab.querySelector<HTMLElement>(`.ws-row[data-line="${channel}"]`);
        assert.isNotNull(found);
        return found;
    });
}

/**
 * What has focus, for a failure message.
 * @returns its role and name.
 */
function focused(): string {
    const active = document.activeElement;
    if (active === null || active === document.body) {
        return "the page";
    }
    const name = active.getAttribute("aria-label") ?? active.textContent.trim().slice(0, 60);
    return `${active.tagName.toLowerCase()}[${active.getAttribute("role") ?? ""}] "${name}"`;
}

/** The F6 regions, by what each is, in the order F6 visits them from the top bar. */
const RING: readonly (readonly [string, string])[] = [
    ["top bar", ".ws-header"],
    ["places rail", ".ws-rail"],
    ["left panel", ".ws-left"],
    ["inspector", ".ws-right"],
    ["drawing", ".ws-canvas graphty-element"],
    ["canvas toolbar", ".ws-toolbar-dock"],
    ["status bar", ".cm-status-bar"],
];

/**
 * Which F6 region holds focus.
 * @returns the region's name, or what has focus when none does.
 */
function region(): string {
    const active = document.activeElement;
    const found = RING.find(([, selector]) => {
        const element = document.querySelector(selector);
        return element !== null && active !== null && element.contains(active);
    });
    return found?.[0] ?? `none (${focused()})`;
}

describe("the start page's Tab order", () => {
    it("reaches Open a file before the demo graph and its buttons", async () => {
        await page.viewport(1440, 900);
        render(<Workspace store={createWorkspaceStore()} />);
        const open = await screen.findByRole("button", { name: /^Open a file/ });
        const hero = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(".ws-land-hero");
            assert.isNotNull(found);
            return found;
        });
        const demo = (): boolean => {
            const active = document.activeElement;
            return active !== null && hero.contains(active) && active.closest(".ws-land-over") === null;
        };
        (document.activeElement as HTMLElement | null)?.blur();
        for (let press = 0; press < 30 && document.activeElement !== open && !demo(); press++) {
            await userEvent.keyboard("{Tab}");
        }
        assert.strictEqual(document.activeElement, open, `Tab reached ${focused()} first`);
    });
});

describe("F6 and Tab order, on the real element", () => {
    it("F6 rounds the top bar, rail, left panel, inspector, drawing, toolbar and status bar, never a resize handle", async () => {
        await openRings();
        await userEvent.click(await treeRow("Everything"));
        // The left panel's last control was its resize handle: F6 still lands on a control in it.
        screen.getByRole("separator", { name: "Resize left panel" }).focus();
        screen.getByRole("button", { name: "Main menu" }).focus();
        const forward: string[] = [];
        for (const _ of RING) {
            await userEvent.keyboard("{F6}");
            assert.notStrictEqual(document.activeElement?.getAttribute("role"), "separator", `F6 on ${focused()}`);
            forward.push(region());
        }
        assert.deepEqual(forward, [...RING.slice(1).map(([name]) => name), "top bar"]);
        const back: string[] = [];
        for (const _ of RING) {
            await userEvent.keyboard("{Shift>}{F6}{/Shift}");
            assert.notStrictEqual(document.activeElement?.getAttribute("role"), "separator", `F6 on ${focused()}`);
            back.push(region());
        }
        assert.deepEqual(back, [...RING.map(([name]) => name)].reverse());
    });

    it("F6 into the open table lands in the table, not on its resize handle", async () => {
        await openRings();
        screen.getByRole("button", { name: "Main menu" }).focus();
        await userEvent.keyboard("{Shift>}T{/Shift}");
        const dock = await screen.findByRole("region", { name: "Table" });
        await waitFor(() => {
            assert.isTrue(dock.contains(document.activeElement));
        });
        screen.getByRole("separator", { name: "Resize table" }).focus();
        screen.getByRole("button", { name: "Main menu" }).focus();
        for (let press = 0; press < RING.length + 1 && !dock.contains(document.activeElement); press++) {
            await userEvent.keyboard("{F6}");
        }
        assert.isTrue(dock.contains(document.activeElement), "F6 never reached the table");
        assert.notStrictEqual(document.activeElement?.getAttribute("role"), "separator", `F6 on ${focused()}`);
    });

    it("Tab from the filtered Analyze list takes Degree and never lands on its disabled button", async () => {
        const { session } = await openRings();
        await act(async () => {
            await session.runs.start("degree");
            await session.styles.settled();
        });
        await userEvent.click(screen.getByRole("button", { name: "Analyze" }));
        const filter = await screen.findByRole("combobox", { name: "Filter analyses" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, filter);
        });
        // Tab with letters typed takes the highlighted analysis (decided.md); its layer is up to
        // date, so its button is dimmed, and focus lands on a control that does something.
        await userEvent.keyboard("deg{Tab}");
        const form = await screen.findByRole("form", { name: "Degree" });
        await waitFor(() => {
            assert.isTrue(form.contains(document.activeElement), `focus is not in the form: ${focused()}`);
        });
        assert.isFalse(
            document.activeElement?.matches(":disabled, [aria-disabled='true']") ?? true,
            `Tab landed on a dead stop: ${focused()}`,
        );
    });

    it("Shift+Tab from a bound color's field reaches Pick node color", async () => {
        const { session } = await openRings();
        await act(async () => {
            await session.styles.add({
                name: "By weight",
                target: "node",
                selector: { match: "everything" },
                // Color set for a few groups: the line keeps the color every other node paints.
                encode: {
                    "node.color": {
                        by: "data.weight",
                        scale: "ordinal",
                        map: { "1": "#ff0000", "2": "#00ff00" },
                        otherwise: "#888888",
                    },
                },
            });
            await session.styles.settled();
        });
        await userEvent.click(await treeRow("By weight"));
        const color = await line("node.color");
        const stops = [...color.querySelectorAll<HTMLElement>("button, input, [tabindex]")].filter(
            (element) => element.tabIndex >= 0 && !element.matches(":disabled"),
        );
        const swatch = within(color).getByRole("button", { name: /^Pick node color/ });
        const at = stops.indexOf(swatch);
        assert.isAtLeast(at, 0, "the swatch is a Tab stop");
        const after = stops[at + 1];
        assert.isDefined(after, "a control follows the swatch on the line");
        after.focus();
        await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
        assert.strictEqual(document.activeElement, swatch, `Shift+Tab reached ${focused()}`);
    });

    it("Tab walks out of the color picker and closes it", async () => {
        await openRings();
        await userEvent.click(await treeRow("Everything"));
        const color = await line("node.color");
        const swatch = within(color).getByRole("button", { name: /^Pick node color/ });
        await userEvent.click(swatch);
        const picker = await screen.findByTestId("color-picker-saturation");
        const panel = picker.closest<HTMLElement>("[role='dialog']");
        assert.isNotNull(panel);
        const seen = new Set<Element | null>();
        for (let press = 0; press < 40 && panel !== null && panel.contains(document.activeElement); press++) {
            seen.add(document.activeElement);
            await userEvent.keyboard("{Tab}");
        }
        assert.isFalse(
            panel?.isConnected ?? false,
            `the picker is still open on ${focused()} after ${String(seen.size)} stops`,
        );
        assert.notStrictEqual(document.activeElement, document.body, "focus fell to the page");
    });

    it("Tab out of Size from writes it and moves on to Size to", async () => {
        const { session } = await openRings();
        await act(async () => {
            await session.styles.add({
                name: "Sized",
                target: "node",
                selector: { match: "everything" },
                encode: { "node.size": { by: "data.weight" } },
            });
            await session.styles.settled();
        });
        await userEvent.click(await treeRow("Sized"));
        const size = await line("node.size");
        await userEvent.click(within(size).getByRole("button", { name: /^Node size: / }));
        const popover = await screen.findByRole("dialog", { name: /^Size by / });
        const from = within(popover).getByLabelText<HTMLInputElement>("Size from");
        await userEvent.click(from);
        await userEvent.keyboard("{Control>}a{/Control}2{Tab}");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, within(popover).getByLabelText("Size to"), focused());
        });
    });

    it("Tab in a list with letters typed takes the highlighted attribute and moves on", async () => {
        const { session } = await openRings();
        await userEvent.click(await treeRow("Everything"));
        await userEvent.click(await inspector().findByRole("tab", { name: /^Node/ }));
        const vary = await inspector().findByRole("button", { name: "Node size by attribute" });
        await userEvent.click(vary);
        const find = await screen.findByRole("combobox", { name: /^Find an? / });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, find);
        });
        await userEvent.keyboard("wei{Tab}");
        await waitFor(() => {
            const bound = session.styles
                .list()
                .map((layer) => layer.encode?.["node.size"] as { by?: string } | undefined)
                .find((binding) => binding !== undefined);
            assert.strictEqual(bound?.by, "data.weight", "Tab took nothing");
        });
        assert.isNull(screen.queryByRole("combobox", { name: /^Find an? / }), "the list stayed open");
        assert.notStrictEqual(document.activeElement, document.body, "focus fell to the page");
    });

    it("a node's run result row is a Tab stop and opens the run", async () => {
        const { session, store } = await openRings();
        await act(async () => {
            await session.runs.start("degree");
            await session.styles.settled();
            await session.selection.apply({ nodes: ["n0"] });
        });
        const results: HTMLElement = await inspector().findByRole("heading", { name: "Results" });
        const section = results.closest<HTMLElement>("section") ?? results.parentElement?.parentElement;
        assert.isDefined(section);
        const row = within(section as HTMLElement).getByText(/, #\d+ of 12$/);
        const stop = row.closest<HTMLElement>("[tabindex='0'], button");
        assert.isNotNull(stop, "the result row is no Tab stop");
        stop?.focus();
        await userEvent.keyboard("{Enter}");
        const runId = session.runs.list().find((run) => run.algorithm === "degree")?.id;
        await waitFor(() => {
            assert.deepEqual(store.get().inspected, { kind: "measure-row", id: runId });
        });
    });
});
