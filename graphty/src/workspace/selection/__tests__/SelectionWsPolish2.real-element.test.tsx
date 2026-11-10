/**
 * The selection workspace's second polish round (design/ui/studio/tier5/ws-polish-2-*.md) on the
 * REAL graphty-element and Les Miserables, driven by real clicks and keys: the canvas takes the
 * preview cell's box while the workspace is open; the sidebar keeps only its title row; a
 * narrowing step says no verb and has one Except switch; Advanced says edges; an existing rule
 * reopens on a step's pane; the sidebar's Edit shows on hover; the value picker opens
 * below its field; Escape closes an open Advanced; a new filter card keeps Nodes | Edges over its
 * picker, its first Escape goes to the outline and a discarded one is announced; Redo names the
 * filter as it comes back.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// The outline-and-pane selection editor: the `selection-workspace` experiment stays off here.
withFeatures([]);

/**
 * Les Miserables in the workspace, and every announcement made.
 * @param place - the place it opens on.
 * @returns The session, the store and the announcements heard.
 */
async function openSample(
    place: "graph" | "data" = "graph",
): Promise<{ session: GraphSession; store: WorkspaceStore; heard: string[] }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place });
    const heard: string[] = [];
    const set = store.set.bind(store);
    store.set = (patch) => {
        const said = (patch as { announcement?: unknown }).announcement;
        if (typeof said === "string" && said !== "") {
            heard.push(said);
        }
        set(patch);
    };
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
 * A reader's layer, selected in the style tree.
 * @param session - The session.
 * @param name - Its name.
 * @param where - Its selection, or everything.
 */
async function openLayer(session: GraphSession, name: string, where?: UnionLeaf): Promise<void> {
    await session.styles.add({
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
}

/**
 * The open workspace, waited for.
 * @returns it.
 */
async function opened(): Promise<HTMLElement> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the workspace is open");
        assert.notStrictEqual(found?.style.visibility, "hidden", "and placed");
        return found;
    });
}

/**
 * Opens the layer's workspace with the sidebar's Edit. The sidebar draws Edit only while the
 * workspace is closed, and Done closes it once the canvas has painted, so Edit is waited for.
 * @returns the open workspace.
 */
async function edit(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: /^Edit Which nodes/ }));
    return opened();
}

/** Two groups: A, degree 10 or more, then Except name contains Val; B, Valjean alone. */
const TWO: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        {
            id: "a",
            name: "A",
            start: "none",
            steps: [
                { id: "a1", op: "add", rule: { kind: "range", attribute: "graphty.degree", min: 10 } },
                { id: "a2", op: "keep", rule: { kind: "range", attribute: "graphty.degree", max: 30 } },
            ],
        },
        {
            id: "b",
            name: "B",
            start: "none",
            steps: [{ id: "b1", op: "add", rule: { kind: "hops", of: { nodes: ["Valjean"] }, max: 0 } }],
        },
    ],
};

describe("the preview is the canvas", () => {
    it("takes the preview cell's box while the workspace is open, and the whole canvas again on close", async () => {
        const { session } = await openSample();
        await openLayer(session, "Framed", TWO);
        const element = document.querySelector<HTMLElement>("graphty-element");
        const before = element?.getBoundingClientRect();
        const ws = await edit();
        const cell = ws.querySelector<HTMLElement>(".sel-ws-preview");
        await waitFor(() => {
            const box = element?.getBoundingClientRect();
            const want = cell?.getBoundingClientRect();
            assert.isDefined(box);
            assert.isDefined(want);
            for (const side of ["left", "top", "right", "bottom"] as const) {
                assert.closeTo(box?.[side] ?? 0, want?.[side] ?? 0, 1, `the drawing's ${side} is the cell's`);
            }
        });
        await userEvent.click(within(ws).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"));
            assert.closeTo(element?.getBoundingClientRect().width ?? 0, before?.width ?? 0, 1, "the canvas again");
        });
    });
});

describe("one place for the rule while it is edited", () => {
    it("the sidebar keeps only its title row, marked as being edited, with no outline and no count", async () => {
        const { session } = await openSample();
        await openLayer(session, "Once", TWO);
        const rest = document.querySelector<HTMLElement>(".sel-rest");
        assert.isAbove(rest?.querySelectorAll(".sel-step-row").length ?? 0, 0, "at rest the outline is drawn");
        await edit();
        await waitFor(() => {
            assert.lengthOf(rest?.querySelectorAll(".sel-step-row, .sel-group-row") ?? [], 0, "no outline");
            assert.isNull(rest?.querySelector(".sel-count") ?? null, "no count");
            assert.strictEqual(rest?.querySelector("[data-editing]")?.textContent, "Editing");
        });
    });
});

describe("verbs", () => {
    it("a narrowing step says no verb; its one choice is the Except switch; Add is in its menu", async () => {
        const { session } = await openSample();
        await openLayer(session, "Verbs", TWO);
        const ws = await edit();
        const row = await waitFor(() => {
            const found = ws.querySelector<HTMLElement>('.sel-ws-outline [data-row="a2"]');
            assert.isNotNull(found);
            return found;
        });
        assert.strictEqual(row?.querySelector(".sel-verb")?.textContent, "", "no Keep word");
        await userEvent.click(row ?? document.body);
        const pane = await waitFor(() => {
            const found = ws.querySelector<HTMLElement>('[data-step-pane="a2"]');
            assert.isNotNull(found);
            return found;
        });
        assert.isNull(within(pane ?? document.body).queryByRole("radiogroup", { name: "Verb" }), "no segment");
        await userEvent.click(within(pane ?? document.body).getByRole("switch", { name: /^Except/ }));
        await waitFor(() => {
            const rule = session.styles.list().find((each) => each.name === "Verbs")?.selector;
            const where = rule?.match === "rule" ? (rule.where as UnionLeaf) : undefined;
            assert.strictEqual(where?.branches[0]?.steps[1]?.op, "except");
            assert.strictEqual(row?.querySelector(".sel-verb")?.textContent, "Except");
        });
        await userEvent.click(within(pane ?? document.body).getByRole("button", { name: /^More for / }));
        await screen.findByRole("menuitem", { name: /Add instead/ });
    });
});

describe("words", () => {
    it("a step's Advanced says edges, not links", async () => {
        const { session } = await openSample();
        await openLayer(session, "Edges", TWO);
        const ws = await edit();
        await userEvent.click(ws.querySelector<HTMLElement>('.sel-ws-outline [data-row="a1"]') ?? document.body);
        const pane = await waitFor(() => {
            const found = ws.querySelector<HTMLElement>('[data-step-pane="a1"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(within(pane ?? document.body).getByRole("button", { name: /^Advanced/ }));
        const group = await within(pane ?? document.body).findByRole("radiogroup", { name: "Edges" });
        within(group).getByText("All edges");
        within(group).getByText("Edges where ...");
        assert.notInclude(pane?.textContent ?? "", "link");
        // The segment takes the column's full width, as every pane control does.
        const value = within(pane ?? document.body).getByRole("button", { name: /^Value: / });
        assert.closeTo(group.getBoundingClientRect().width, value.getBoundingClientRect().width, 2);
    });
});

describe("reopening", () => {
    it("an existing rule reopens on its first step's pane, never an empty title pane", async () => {
        const { session } = await openSample();
        await openLayer(session, "Reopen", TWO);
        const ws = await edit();
        await waitFor(() => {
            assert.isNotNull(ws.querySelector('[data-step-pane="a1"]'), "the first step's pane");
            assert.strictEqual(
                ws.querySelector('.sel-ws-outline [aria-selected="true"]')?.getAttribute("data-row"),
                "a1",
            );
        });
    });

    it("and on the step last edited, after Done and Edit again", async () => {
        const { session } = await openSample();
        await openLayer(session, "Again", TWO);
        let ws = await edit();
        await userEvent.click(ws.querySelector<HTMLElement>('.sel-ws-outline [data-row="b1"]') ?? document.body);
        const hops = await waitFor(() => {
            const pane = ws.querySelector<HTMLElement>('[data-step-pane="b1"]');
            assert.isNotNull(pane);
            return pane;
        });
        // An edit on b1's pane: its Except switch.
        await userEvent.click(within(hops ?? document.body).getByRole("button", { name: /^More for / }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /Turn off/ }));
        await userEvent.click(within(ws).getByRole("button", { name: "Done" }));
        ws = await edit();
        await waitFor(() => {
            assert.isNotNull(ws.querySelector('[data-step-pane="b1"]'), "the step last edited");
        });
    });
});

describe("the sidebar's title row", () => {
    it("draws no count at rest in a style layer, and Edit shows on hover inside the row", async () => {
        const { session } = await openSample();
        await openLayer(session, "Hover", TWO);
        const row = document.querySelector<HTMLElement>(".sel-rest .sel-title-row");
        assert.isNotNull(row);
        // The layer row and the canvas key say the layer's count; its outline does not (tier5 decided.md).
        assert.isNull(row?.querySelector(".sel-count") ?? null, "no count at rest");
        await userEvent.hover(row ?? document.body);
        const button = row?.querySelector<HTMLElement>("[data-edit]") ?? document.body;
        await waitFor(() => {
            assert.strictEqual(getComputedStyle(button).opacity, "1");
        });
        const inner = button.getBoundingClientRect();
        const outer = row?.getBoundingClientRect();
        assert.isAtMost(inner.right, outer?.right ?? 0, "Edit is drawn inside the row");
    });
});

describe("the new step", () => {
    it("its picker opens below its field; no All nodes row and no second lit row while it is added", async () => {
        const { session } = await openSample();
        await openLayer(session, "Fresh");
        const ws = await edit();
        const field = await waitFor(() => {
            const found = ws.querySelector<HTMLElement>(".sel-ws-props [data-first-focus]");
            assert.isNotNull(found);
            return found;
        });
        assert.isNull(ws.querySelector(".sel-ws-outline .sel-all-row"), "no All nodes row over the new step");
        assert.lengthOf(ws.querySelectorAll('.sel-ws-outline [aria-selected="true"]'), 0, "only the new row is lit");
        assert.strictEqual(ws.querySelector("[data-new-step] .sel-verb")?.textContent, "", "and it says no verb");
        await userEvent.click(field ?? document.body);
        const search = await screen.findByRole("combobox", { name: "Find attributes, results" });
        await waitFor(() => {
            assert.isAtLeast(
                search.getBoundingClientRect().top,
                (field?.getBoundingClientRect().bottom ?? 0) - 1,
                "the list opens below its field",
            );
        });
    });

    it("after an algorithm value is picked, focus goes to its test, not the Except switch", async () => {
        const { session } = await openSample();
        await openLayer(session, "Focus");
        const ws = await edit();
        await waitFor(() => {
            assert.isNotNull(ws.querySelector(".sel-ws-props [data-first-focus]"));
        });
        await userEvent.keyboard("{Enter}");
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Closeness");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isNotNull(
                document.activeElement?.closest(".sel-test-box"),
                `focus is in the test, not ${document.activeElement?.outerHTML.slice(0, 160) ?? "nothing"}`,
            );
        });
    });

    it("the outline draws no No match row while every node matches", async () => {
        const { session } = await openSample();
        await openLayer(session, "Key");
        const ws = await edit();
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        assert.isNull(ws.querySelector("[data-no-match]"));
        assert.isFalse(
            document.querySelector(".ws-legend-card")?.checkVisibility() ?? false,
            "no key over the preview (ws-polish 3)",
        );
    });
});

describe("Escape", () => {
    it("on an open Advanced closes it and keeps focus on it", async () => {
        const { session } = await openSample();
        await openLayer(session, "Esc", TWO);
        const ws = await edit();
        const pane = await waitFor(() => {
            const found = ws.querySelector<HTMLElement>('[data-step-pane="a1"]');
            assert.isNotNull(found);
            return found;
        });
        const advanced = within(pane ?? document.body).getByRole("button", { name: /^Advanced/ });
        advanced.focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.strictEqual(advanced.getAttribute("aria-expanded"), "true");
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.strictEqual(advanced.getAttribute("aria-expanded"), "false");
            assert.strictEqual(document.activeElement, advanced);
            assert.isNotNull(document.querySelector(".sel-ws"), "the workspace stays open");
        });
    });
});

describe("a new filter card", () => {
    it("keeps Nodes | Edges over its picker; Edges lists edge values", async () => {
        await openSample("data");
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        const ws = await opened();
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        const edges = within(ws).getByRole("radio", { name: "Edges" });
        // The segment's radio is visually hidden: the pointer clicks its label.
        await userEvent.click(document.querySelector(`label[for="${edges.id}"]`) ?? edges);
        await waitFor(() => {
            const open = document.querySelector<HTMLElement>(".sel-ws");
            assert.isNotNull(open);
            const radio = within(open ?? document.body).getByRole("radio", { name: "Edges" });
            assert.isTrue((radio as HTMLInputElement).checked, "the card is on edges");
        });
        // The switch keeps its picker shut (ws-polish 3): the Value field under it opens it.
        await waitFor(() => {
            assert.isNull(screen.queryByRole("combobox", { name: "Find attributes, results" }));
        });
        await userEvent.click(within(await opened()).getByRole("button", { name: "Value" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await screen.findByRole("option", { name: /shared_chapters/ });
    });

    it("the first Escape after its pick goes to the outline, not Done", async () => {
        await openSample("data");
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await opened();
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Degree");
        await userEvent.keyboard("{Enter}");
        const ws = await opened();
        await waitFor(() => {
            assert.isNotNull(ws.querySelector("[data-step-pane]"));
        });
        const box = ws.querySelector<HTMLElement>("[data-step-pane] input:not([type=hidden])");
        box?.focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNotNull(document.querySelector(".sel-ws"), "the workspace stays open");
            assert.strictEqual(document.activeElement?.getAttribute("data-row"), "title");
        });
    });

    it("Escape on its picker takes it back and says so", async () => {
        const { heard } = await openSample("data");
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await opened();
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"));
            assert.include(heard, "Filter not added");
        });
    });
});

describe("Redo", () => {
    it("names the filter as it comes back", async () => {
        const { session, store } = await openSample("data");
        await session.visibility.addCondition({
            id: "c1",
            effect: "keep",
            rule: { kind: "range", attribute: "graphty.degree", min: 10 },
        });
        await session.visibility.updateCondition("c1", {
            rule: { kind: "range", attribute: "graphty.degree", min: 12 },
        });
        const toolbar = await screen.findByRole("button", { name: /^Undo/ });
        await userEvent.click(toolbar);
        await userEvent.click(await screen.findByRole("button", { name: /^Redo/ }));
        await waitFor(() => {
            const said = store.get().announcement ?? "";
            assert.match(said, /^Redid /);
            assert.include(said, "12");
        });
    });
});
