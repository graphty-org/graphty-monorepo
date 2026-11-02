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
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

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
 * A layer's selection as the element holds it.
 * @param session - The session.
 * @param id - The layer.
 * @returns The union rule, or undefined.
 */
function unionOf(session: GraphSession, id: string): UnionLeaf | undefined {
    const selector = session.styles.get(id)?.selector;
    return selector?.match === "rule" && selector.where.kind === "union" ? selector.where : undefined;
}

/**
 * The sidebar outline's Edit button.
 * @returns it.
 */
const editButton = (): HTMLElement => screen.getByRole("button", { name: /^Edit Which nodes/ });

/**
 * Picks a value in the open value picker by typing its name.
 * @param name - what to type.
 */
async function pickValue(name: string): Promise<void> {
    await screen.findByRole("combobox", { name: "Find attributes, results" });
    await userEvent.keyboard(name);
    await userEvent.keyboard("{Enter}");
}

/**
 * Adds a step from the workspace's pane: Condition..., then a value.
 * @param name - the value.
 */
async function addStep(name: string): Promise<void> {
    const ws = await opened();
    await userEvent.click(await within(ws).findByRole("button", { name: "Condition..." }));
    await pickValue(name);
}

/** Two groups of degree steps, A and B. */
const TWO_GROUPS: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        {
            id: "a",
            name: "A",
            start: "none",
            steps: [{ id: "a1", op: "add", rule: { kind: "range", attribute: "graphty.degree", min: 10 } }],
        },
        {
            id: "b",
            name: "B",
            start: "none",
            steps: [{ id: "b1", op: "add", rule: { kind: "range", attribute: "graphty.degree", max: 1 } }],
        },
    ],
};

/**
 * Each node's core number over only the edges whose weight passes, by peeling (the textbook
 * k-core), from the records as loaded.
 * @param session - the session.
 * @param keep - whether an edge's shared_chapters counts.
 * @returns the core numbers, one per node.
 */
function coreNumbers(session: GraphSession, keep: (weight: number) => boolean): number[] {
    const nodes = session.data.nodePage({ limit: 1_000 }).records.map((record) => String(record.id));
    const neighbors = new Map<string, Set<string>>(nodes.map((id) => [id, new Set<string>()]));
    for (const edge of session.data.edgePage({ limit: 10_000 }).records) {
        const [a, b] = [String(edge.source), String(edge.target)];
        if (a !== b && keep(Number(edge.shared_chapters))) {
            neighbors.get(a)?.add(b);
            neighbors.get(b)?.add(a);
        }
    }
    const degree = new Map([...neighbors].map(([id, set]) => [id, set.size]));
    const core = new Map<string, number>();
    const left = new Set(nodes);
    for (let k = 0; left.size > 0; k++) {
        let peeled = true;
        while (peeled) {
            peeled = false;
            for (const node of left) {
                if ((degree.get(node) ?? 0) <= k) {
                    core.set(node, k);
                    left.delete(node);
                    peeled = true;
                    for (const other of neighbors.get(node) ?? []) {
                        degree.set(other, (degree.get(other) ?? 0) - 1);
                    }
                }
            }
        }
    }
    return nodes.map((id) => core.get(id) ?? 0);
}

describe("the sidebar outline at rest and the workspace (check 39)", () => {
    it("Edit opens a non-modal workspace: no scrim, the inspector usable, the camera unchanged", async () => {
        const { session } = await openSample();
        const layer = await openLayer(session, "Calm", TWO_GROUPS);
        const element = document.querySelector("graphty-element");
        if (element === null) {
            throw new Error("no element");
        }
        // The drawing settles first: a layout still running moves the camera on its own.
        await element.waitForStableFrame();
        const before = element.getCameraState();
        // At rest the sidebar outline has one control: Edit.
        const rest = document.querySelector<HTMLElement>(".sel-rest");
        const controls = [...(rest?.querySelectorAll<HTMLElement>("button, input, [role=checkbox]") ?? [])];
        assert.deepEqual(
            controls.map((each) => each.getAttribute("aria-label") ?? each.textContent),
            ["Edit Which nodes"],
        );
        await userEvent.click(editButton());
        const ws = await opened();
        assert.strictEqual(ws.getAttribute("role"), "region");
        assert.isNull(document.querySelector(".mantine-Overlay-root, [data-scrim]"), "no scrim");
        assert.isNull(document.querySelector("[aria-modal='true']"), "not a dialog");
        // The inspector beside it is visible and takes a click: the layer's Fill changes.
        const inspector = screen.getByRole("complementary", { name: "Inspector" });
        assert.isFalse(inspector.closest("[inert]") !== null, "the inspector is not inert");
        const fill = within(inspector).getByDisplayValue(/d55e00/i);
        await userEvent.tripleClick(fill);
        await userEvent.keyboard("112233{Enter}");
        await waitFor(() => {
            assert.include(JSON.stringify(session.styles.get(layer.id)).toLowerCase(), "112233");
        });
        assert.isDefined(workspace(), "the workspace is still open");
        await element.waitForStableFrame();
        assert.deepEqual(element.getCameraState().position, before.position, "opening never re-frames");
        await userEvent.click(within(ws).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isUndefined(workspace());
        });
        await element.waitForStableFrame();
        assert.deepEqual(element.getCameraState().position, before.position, "closing never re-frames");
    });

    it("at 1280 x 800 the preview is 420 px wide, the strip 180 px tall, the properties 320 px", async () => {
        const { session } = await openSample({ width: 1280, height: 800 });
        await openLayer(session, "Sized", TWO_GROUPS);
        await userEvent.click(editButton());
        const ws = await opened();
        await userEvent.click(within(ws).getByRole("treeitem", { name: /^Add, Degree min 10/ }));
        await waitFor(() => {
            const preview = ws.querySelector(".sel-ws-preview")?.getBoundingClientRect();
            const strip = ws.querySelector(".sel-ws-strip")?.getBoundingClientRect();
            const props = ws.querySelector(".sel-ws-props")?.getBoundingClientRect();
            // 1280 less the rail, the 240 px inspector and the 320 px properties leaves 424 px of
            // canvas (spec check 39 asks 440: decided.md, "Workspace built").
            assert.isAtLeast(preview?.width ?? 0, 420, "preview width");
            assert.isAtLeast(strip?.height ?? 0, 180, "strip height");
            assert.strictEqual(Math.round(props?.width ?? 0), 320, "properties width");
        });
        // No field in the step pane is cut.
        for (const field of ws.querySelectorAll<HTMLElement>(".sel-ws-props .sel-field-text")) {
            assert.isAtMost(field.scrollWidth, field.clientWidth, field.textContent ?? "");
        }
    });
});

describe("one workspace for every rule (check 40)", () => {
    it("a layer opens it titled by the layer; leaving the place is Done; a card opens it titled by Filters", async () => {
        const { session } = await openSample();
        const layer = await openLayer(session, "Owner", TWO_GROUPS);
        await session.visibility.addCondition({
            id: "f1",
            effect: "keep",
            rule: {
                kind: "union",
                side: "nodes",
                within: "graph",
                branches: [
                    {
                        start: "all",
                        steps: [{ op: "keep", rule: { kind: "range", attribute: "graphty.degree", min: 2 } }],
                    },
                ],
            },
        });
        await userEvent.click(editButton());
        const ws = await screen.findByRole("region", { name: "Which nodes -- Owner" });
        // A step selected, its pane's Condition... adds to its group.
        await userEvent.click(within(ws).getByRole("treeitem", { name: /^Add, Degree min 10/ }));
        await addStep("Isolated");
        await waitFor(() => {
            assert.lengthOf(unionOf(session, layer.id)?.branches[0]?.steps ?? [], 2);
        });
        // Leaving the place closes it as Done: the step stays.
        await userEvent.click(page.getByRole("button", { name: "Data", exact: true }));
        await waitFor(() => {
            assert.isUndefined(workspace());
        });
        assert.lengthOf(unionOf(session, layer.id)?.branches[0]?.steps ?? [], 2, "the edit is kept");
        const card = await screen.findByRole("button", { name: /Degree min 2/ });
        await userEvent.click(card);
        await userEvent.click(await screen.findByRole("button", { name: /^Edit Degree min 2/ }));
        await screen.findByRole("region", { name: "Degree min 2 -- Filters" });
    });

    it("with one card's workspace open, a click on another card's row switches it to that card", async () => {
        const { session } = await openSample();
        const card = (id: string, min: number) =>
            session.visibility.addCondition({
                id,
                effect: "keep",
                rule: {
                    kind: "union",
                    side: "nodes",
                    within: "graph",
                    branches: [
                        {
                            start: "all",
                            steps: [{ op: "keep", rule: { kind: "range", attribute: "graphty.degree", min } }],
                        },
                    ],
                },
            });
        await card("f1", 2);
        await card("f2", 3);
        await userEvent.click(page.getByRole("button", { name: "Data", exact: true }));
        await userEvent.click(await screen.findByRole("button", { name: /Degree min 2/ }));
        await userEvent.click(await screen.findByRole("button", { name: /^Edit Degree min 2/ }));
        await screen.findByRole("region", { name: "Degree min 2 -- Filters" });
        await userEvent.click(await screen.findByRole("button", { name: /Degree min 3/ }));
        await screen.findByRole("region", { name: "Degree min 3 -- Filters" });
        assert.lengthOf(document.querySelectorAll(".sel-ws"), 1, "one workspace");
    });
});

describe("Done, Cancel and Escape (checks 41 and fix 4)", () => {
    it("three edits then Cancel restore the selection as one undo step; Mod+Z brings them back", async () => {
        const { session } = await openSample();
        const layer = await openLayer(session, "Cancel", TWO_GROUPS);
        const said = (): string =>
            JSON.stringify(
                unionOf(session, layer.id)?.branches.map((branch) =>
                    branch.steps.map((step) => [step.id, step.on ?? true, step.rule]),
                ),
            );
        const before = said();
        await userEvent.click(editButton());
        const ws = await opened();
        // 1 and 2: two steps turned off with Space on their rows; 3: a step added.
        for (const name of [/^Add, Degree min 10/, /^Add, Degree max 1/]) {
            await userEvent.click(within(ws).getByRole("treeitem", { name }));
            await userEvent.keyboard(" ");
        }
        await addStep("Isolated");
        await waitFor(() => {
            assert.notStrictEqual(said(), before);
            assert.lengthOf(unionOf(session, layer.id)?.branches[1]?.steps ?? [], 2);
        });
        const edited = said();
        await userEvent.click(within(ws).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isUndefined(workspace());
            assert.strictEqual(said(), before, "Cancel restores what was there at open");
        });
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.strictEqual(said(), edited, "one Undo brings the three edits back");
        });
    });

    it("Escape with a list open closes only the list; Escape in the pane goes to its row; then it is Done", async () => {
        const { session } = await openSample();
        const layer = await openLayer(session, "Escape", TWO_GROUPS);
        await userEvent.click(editButton());
        const ws = await opened();
        await userEvent.click(within(ws).getByRole("treeitem", { name: /^Add, Degree min 10/ }));
        // A list: the value picker of the step.
        await userEvent.click(await within(ws).findByRole("button", { name: /^Value: / }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("combobox", { name: "Find attributes, results" }));
        });
        assert.isDefined(workspace(), "the list closed, the workspace stayed");
        // The pane: its box, edited; Escape takes focus to its row and keeps the text.
        const from = await within(ws).findByRole("textbox", { name: "Degree from, number" });
        await userEvent.tripleClick(from);
        await userEvent.keyboard("12");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.match(document.activeElement?.getAttribute("aria-label") ?? "", /^Add, Degree min 12/);
        });
        assert.isDefined(workspace());
        // Nothing smaller open: Escape is Done, and the edit is kept.
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isUndefined(workspace());
        });
        const step = unionOf(session, layer.id)?.branches[0]?.steps[0]?.rule as { min?: number } | undefined;
        assert.strictEqual(step?.min, 12);
    });
});

describe("scoping by links inside the editor (check 42, fix 1)", () => {
    it("Core number at least 3 on links with shared_chapters min 2 is built in the workspace", async () => {
        const { session } = await openSample();
        const layer = await openLayer(session, "Core");
        const expected = coreNumbers(session, (weight) => weight >= 2).filter((core) => core >= 3).length;
        await userEvent.click(editButton());
        const ws = await opened();
        // A selection with no step opens on its new step's pane: its value field opens the picker.
        await userEvent.click(await within(ws).findByRole("button", { name: "Value" }));
        // "k-core" finds Core number by the catalog's own words.
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("k-core");
        await userEvent.keyboard("{Enter}");
        const pane = await waitFor(() => {
            const found = ws.querySelector<HTMLElement>("[data-step-pane]");
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(within(pane).getByRole("button", { name: /^Advanced/ }));
        const links = await within(pane).findByRole("radiogroup", { name: "Links" });
        await userEvent.click(within(links).getByText("Links where ..."));
        await userEvent.click(await within(pane).findByRole("button", { name: "Link value: none" }));
        await screen.findByRole("combobox", { name: "Find edge attributes" });
        await userEvent.keyboard("shared");
        await userEvent.keyboard("{Enter}");
        const linkBox = await within(pane).findByRole("textbox", { name: "shared_chapters from, number" });
        await userEvent.tripleClick(linkBox);
        await userEvent.keyboard("2{Enter}");
        await waitFor(() => {
            const step = unionOf(session, layer.id)?.branches[0]?.steps[0];
            assert.deepInclude(step?.links ?? {}, { kind: "range", min: 2 });
        });
        // The step's own test, set from the values its scoped computation gave.
        const coreBox = await waitFor(() => {
            const boxes = within(pane)
                .getAllByRole("textbox", { name: /from, number$/ })
                .filter((box) => !(box.getAttribute("aria-label") ?? "").startsWith("shared_chapters"));
            assert.isNotEmpty(boxes);
            return boxes[0];
        });
        await userEvent.tripleClick(coreBox);
        await userEvent.keyboard("3{Enter}");
        await waitFor(() => {
            assert.match(
                ws.querySelector(".sel-ws-head .sel-count")?.textContent ?? "",
                new RegExp(`^${String(expected)} of 77$`),
            );
        });
        const row = ws.querySelector<HTMLElement>(".sel-ws-outline .sel-step-row");
        // The row draws the bare word Links; its name and tooltip say the condition.
        assert.include(row?.textContent ?? "", "Links");
        assert.include(row?.getAttribute("aria-label") ?? "", "Links: shared_chapters min 2");
        assert.lengthOf(session.visibility.conditions, 0, "no Data filter was touched");
        assert.strictEqual(session.visibility.nodes.size, 77);
        // The scoped computation is the step's own: the only Core number run in Analyze is the one
        // the step read before its Links were set.
        assert.isAtMost(session.runs.list().filter((run) => run.algorithm === "k-core").length, 1);
    });
});

describe("starting over (check 44, fix 3)", () => {
    it("Clear starts the selection over at All nodes in one press; Mod+Z restores it exactly", async () => {
        const { session } = await openSample();
        const layer = await openLayer(session, "Clear", TWO_GROUPS);
        const before = JSON.stringify(unionOf(session, layer.id));
        await userEvent.click(editButton());
        const ws = await opened();
        await userEvent.click(within(ws).getByRole("button", { name: "Clear" }));
        await waitFor(() => {
            assert.isTrue(unionOf(session, layer.id)?.branches.every((branch) => branch.steps.length === 0));
        });
        await within(ws).findByRole("treeitem", { name: "All nodes" });
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.strictEqual(JSON.stringify(unionOf(session, layer.id)), before);
        });
    });

    it("deleting A leaves no row selected, B's group row under the pointer, and a second Delete deletes nothing", async () => {
        const { session } = await openSample();
        const layer = await openLayer(session, "Delete", TWO_GROUPS);
        await userEvent.click(editButton());
        const ws = await opened();
        const a = within(ws).getByRole("treeitem", { name: /^A, / });
        await userEvent.click(a);
        const box = a.getBoundingClientRect();
        await userEvent.keyboard("{Delete}");
        await waitFor(() => {
            assert.lengthOf(unionOf(session, layer.id)?.branches ?? [], 1);
        });
        assert.isNull(ws.querySelector("[aria-selected=true]"), "no row is selected");
        const under = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        assert.strictEqual(under?.closest<HTMLElement>("[data-row]")?.dataset.row, "b", "B's group row");
        await userEvent.keyboard("{Delete}");
        assert.lengthOf(unionOf(session, layer.id)?.branches ?? [], 1, "the second Delete deleted nothing");
        assert.lengthOf(unionOf(session, layer.id)?.branches[0]?.steps ?? [], 1);
    });
});

describe("plain words (check 45, fix 5)", () => {
    it("Degree says links at a node and is found by links and connections; While says what it holds", async () => {
        const { session } = await openSample();
        await openLayer(session, "Words");
        await userEvent.click(editButton());
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
        await screen.findByText("Links at a node");
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

describe("By position switches only on an explicit choice (check 46, fix 6)", () => {
    it("a click on the bars keeps the mode; By position starts untouched; By value brings the range back", async () => {
        const { session } = await openSample();
        const layer = await openLayer(session, "Mode", {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [
                {
                    start: "all",
                    steps: [{ id: "d", op: "keep", rule: { kind: "range", attribute: "graphty.degree", min: 3 } }],
                },
            ],
        });
        await userEvent.click(editButton());
        const ws = await opened();
        await userEvent.click(within(ws).getByRole("treeitem", { name: /Degree min 3/ }));
        const mode = await within(ws).findByRole("combobox", { name: "Degree test" });
        assert.strictEqual((mode as HTMLInputElement).value, "By value");
        const bars = await waitFor(() => {
            const found = ws.querySelector<HTMLElement>('.sel-ws-props [data-testid="histogram-chart"]');
            assert.isNotNull(found, "the step's bars are drawn");
            return found;
        });
        await userEvent.click(bars);
        assert.strictEqual((mode as HTMLInputElement).value, "By value", "a click on the bars never switches");
        const ranged = unionOf(session, layer.id)?.branches[0]?.steps[0]?.rule as { min?: number; max?: number };
        await userEvent.click(mode);
        await userEvent.click(await screen.findByRole("option", { name: "By position" }));
        await waitFor(() => {
            const rule = unionOf(session, layer.id)?.branches[0]?.steps[0]?.rule as { min?: number; top?: number };
            assert.isUndefined(rule.min);
            assert.isUndefined(rule.top);
            assert.match(
                ws.querySelector('.sel-ws-outline [data-row="d"]')?.getAttribute("aria-label") ?? "",
                /No test/,
            );
        });
        await userEvent.click(within(ws).getByRole("combobox", { name: "Degree test" }));
        await userEvent.click(await screen.findByRole("option", { name: "By value" }));
        await waitFor(() => {
            const rule = unionOf(session, layer.id)?.branches[0]?.steps[0]?.rule as { min?: number; max?: number };
            assert.deepEqual([rule.min, rule.max], [ranged.min, ranged.max], "the range came back");
        });
    });
});

describe("the workspace as a region (check 47)", () => {
    it("is named by its title, sits in the F6 ring, is announced, and Cancel is a Tab from Clear", async () => {
        const { session, heard } = await openSample();
        await openLayer(session, "Ring", TWO_GROUPS);
        await userEvent.click(editButton());
        const ws = await screen.findByRole("region", { name: "Which nodes -- Ring" });
        await waitFor(() => {
            assert.isTrue(ws.contains(document.activeElement), "focus is in the workspace");
        });
        assert.include(heard, "Editing Which nodes, Ring");
        await userEvent.keyboard("{F6}");
        const inspector = screen.getByRole("complementary", { name: "Inspector" });
        await waitFor(() => {
            assert.isTrue(inspector.contains(document.activeElement), "F6 reached the inspector");
        });
        await userEvent.keyboard("{Shift>}{F6}{/Shift}");
        await waitFor(() => {
            assert.isTrue(ws.contains(document.activeElement), "Shift+F6 came back");
        });
        within(ws).getByRole("button", { name: "Clear" }).focus();
        await userEvent.keyboard("{Tab}");
        assert.strictEqual(document.activeElement?.textContent, "Cancel");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isUndefined(workspace());
            assert.strictEqual(document.activeElement, editButton(), "focus is back on Edit");
        });
        assert.include(heard, "Cancelled");
        assert.lengthOf(
            heard.filter((each) => each.startsWith("Editing ")),
            1,
            "opening is said once",
        );
    });
});
