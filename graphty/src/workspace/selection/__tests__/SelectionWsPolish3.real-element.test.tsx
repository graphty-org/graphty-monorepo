/**
 * The selection workspace's third polish round (design/ui/studio/tier5/ws-polish-3-*.md) on the
 * REAL graphty-element and Les Miserables, driven by real clicks and keys: a click on the preview
 * canvas never closes the workspace; a style layer's workspace says its count as it changes; a new
 * or cleared rule opens on its value picker; the outline carries No match in place of a key over
 * the preview; the picker is as wide as its field; the outline's levels are the indent's; an edge
 * condition's pick goes on to its Min box and tags nothing until it tests; a long checklist says
 * how many values are not drawn; F6 goes from the workspace to its preview; the Filters header
 * keeps its total while a card is edited; a new card's Nodes | Edges keeps focus on a side switch;
 * a collapsed card's name says its count apart from its title. And round 1's gate
 * (design/ui/studio/tier5/report.md): the matches strip is searched first, the value picker's list
 * is itself the region that scrolls, and a disabled reference says it is unavailable.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, UnionLeaf } from "@graphty/graphty-element/session";
import axe from "axe-core";
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
 * @returns The layer's id.
 */
async function openLayer(session: GraphSession, name: string, where?: UnionLeaf): Promise<string> {
    const { id } = await session.styles.add({
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
    return id;
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

/** Opens the layer's workspace with the sidebar's Edit. */
async function edit(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: /^Style Nodes\.\.\./ }));
    return opened();
}

/** The layer's selection as the element holds it. */
function whereOf(session: GraphSession, id: string): UnionLeaf | undefined {
    const selector = session.styles.get(id)?.selector;
    return selector?.match === "rule" ? (selector.where as UnionLeaf) : undefined;
}

/** One step: degree at least `min`. */
const degreeAtLeast = (min: number): UnionLeaf => ({
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        {
            id: "a",
            start: "none",
            steps: [{ id: "deg", op: "add", rule: { kind: "range", attribute: "graphty.degree", min } }],
        },
    ],
});

/** Two groups: A, degree 10 or more; B, Valjean alone. */
const TWO: UnionLeaf = {
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
            steps: [{ id: "b1", op: "add", rule: { kind: "hops", of: { nodes: ["Valjean"] }, max: 0 } }],
        },
    ],
};

describe("the preview canvas", () => {
    it("a click on empty preview canvas or on a node keeps the workspace open, and Cancel still restores", async () => {
        const { session } = await openSample();
        const id = await openLayer(session, "Clicked", degreeAtLeast(6));
        const before = JSON.stringify(whereOf(session, id));
        const ws = await edit();
        await userEvent.click(within(ws).getByRole("button", { name: "Clear" }));
        await waitFor(() => {
            assert.notStrictEqual(JSON.stringify(whereOf(session, id)), before, "the edit is written");
        });
        const element = document.querySelector("graphty-element");
        if (element === null) {
            throw new Error("no element");
        }
        await userEvent.click(element, { position: { x: 4, y: 4 } });
        const at = await waitFor(() => {
            const found = element.nodeScreenPosition("Valjean");
            assert.isTrue(found?.visible, "Valjean is drawn in the preview");
            return found;
        });
        await userEvent.click(element, { position: { x: at?.x ?? 0, y: at?.y ?? 0 } });
        assert.isNotNull(document.querySelector(".sel-ws"), "the clicks kept the workspace open");
        await userEvent.click(within(await opened()).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"));
            assert.strictEqual(JSON.stringify(whereOf(session, id)), before, "Cancel restored the rule");
        });
    });

    it("draws no key over the preview: No match is the outline's last row", async () => {
        const { session } = await openSample();
        await openLayer(session, "Keyed", TWO);
        const ws = await edit();
        // From the workspace's first frame: no key is drawn over the preview.
        assert.isFalse(
            document.querySelector(".ws-legend-card")?.checkVisibility() ?? false,
            "no key over the preview",
        );
        const row = await waitFor(() => {
            const found = ws.querySelector<HTMLElement>(".sel-ws-outline [data-no-match]");
            assert.isNotNull(found);
            return found;
        });
        const total = Number((ws.querySelector(".sel-ws-head .sel-count")?.textContent ?? "").split(" of ")[0]);
        assert.include(row?.textContent ?? "", `No match${String(77 - total)}`);
    });

    it("F6 goes from the workspace to its preview, named for it", async () => {
        const { session } = await openSample();
        await openLayer(session, "Ringed", TWO);
        const ws = await edit();
        await waitFor(() => {
            assert.isTrue(ws.contains(document.activeElement));
        });
        await userEvent.keyboard("{F6}");
        await waitFor(() => {
            assert.strictEqual(document.activeElement?.tagName, "GRAPHTY-ELEMENT");
            assert.match(document.activeElement?.getAttribute("aria-label") ?? "", /^Preview: Which nodes/);
        });
    });
});

describe("a style layer's workspace", () => {
    it("says its new count as a test changes", async () => {
        const { session, heard } = await openSample();
        await openLayer(session, "Spoken", degreeAtLeast(10));
        const ws = await edit();
        const from = await within(ws).findByRole("textbox", { name: "Degree from, number" });
        await userEvent.click(from);
        await userEvent.keyboard("{Control>}a{/Control}5{Tab}");
        await waitFor(() => {
            assert.isTrue(
                heard.some((each) => /^\d+ of 77 nodes$/.test(each)),
                `the count was said: ${heard.join(" | ")}`,
            );
        });
    });

    // Tier 5 round 1 (design/ui/studio/tier5/rounds/round-1-void/insights.md, insight 1): with a
    // layer selected in the inspector, a filter card's workspace said its count, then the covered
    // inspector row said that layer's count over another base, which nothing on screen showed.
    it("a filter card's workspace says only its own count, never the covered inspector row's", async () => {
        const { session, heard } = await openSample();
        await openLayer(session, "Behind", degreeAtLeast(10));
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
        await userEvent.click(page.getByRole("button", { name: "Data", exact: true }));
        const inspector = screen.getByRole("complementary", { name: "Inspector" });
        await waitFor(() => {
            assert.isNotNull(inspector.querySelector(".ws-which"), "the layer's Which row is in the inspector");
        });
        await userEvent.click(await screen.findByRole("button", { name: /Degree min 2/ }));
        await userEvent.click(await screen.findByRole("button", { name: /^Edit Degree min 2/ }));
        const ws = await screen.findByRole("region", { name: "Degree min 2 -- Filters" });
        const said = heard.length;
        const counts = (): string[] => heard.slice(said).filter((each) => /^[\d,]+ of [\d,]+ nodes$/.test(each));
        await userEvent.click(within(ws).getByRole("textbox", { name: "Degree from, number" }));
        await userEvent.keyboard("{Control>}a{/Control}5{Tab}");
        await waitFor(() => {
            assert.isNotEmpty(counts(), `the workspace said its count: ${heard.join(" | ")}`);
        });
        // Done is a round trip through the browser: the covered row's count, due with the
        // workspace's, would have been said by the time the workspace has closed.
        await userEvent.click(within(ws).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"));
        });
        assert.lengthOf(new Set(counts()), 1, `one count was said: ${counts().join(" | ")}`);
    });

    it("a new rule opens with its value picker open, and so does Clear", async () => {
        const { session } = await openSample();
        await openLayer(session, "Fresh");
        await edit();
        const search = await screen.findByRole("combobox", { name: "Find attributes, results" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, search, "typing goes to the search");
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("combobox", { name: "Find attributes, results" }));
        });
        await userEvent.click(within(await opened()).getByRole("button", { name: "Done" }));
        await openLayer(session, "Cleared", TWO);
        const ws = await edit();
        await userEvent.click(within(ws).getByRole("button", { name: "Clear" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
    });

    it("its value picker is as wide as its field after Or...", async () => {
        const { session } = await openSample();
        await openLayer(session, "Wide", TWO);
        const ws = await edit();
        await userEvent.click(within(ws).getByRole("button", { name: "Or..." }));
        const search = await screen.findByRole("combobox", { name: "Find attributes, results" });
        const field = within(ws).getByRole("button", { name: "Value" });
        assert.strictEqual(field.getAttribute("aria-expanded"), "true");
        await waitFor(() => {
            const list = search.closest<HTMLElement>(".mantine-Combobox-dropdown");
            assert.isNotNull(list);
            assert.closeTo(
                list?.getBoundingClientRect().width ?? 0,
                field.getBoundingClientRect().width,
                1,
                "the list is the field's width",
            );
        });
    });

    it("its outline says a step of one of several groups is under its group", async () => {
        const { session } = await openSample();
        await openLayer(session, "Levels", TWO);
        const ws = await edit();
        const outline = ws.querySelector<HTMLElement>(".sel-ws-outline") as HTMLElement;
        assert.strictEqual(outline.querySelector('[data-row="title"]')?.getAttribute("aria-level"), "1");
        assert.strictEqual(outline.querySelector('[data-row="a"]')?.getAttribute("aria-level"), "2");
        assert.strictEqual(outline.querySelector('[data-row="a1"]')?.getAttribute("aria-level"), "3");
    });

    it("an edge condition's pick goes on to its Min box, and tags the step only once it tests", async () => {
        const { session } = await openSample();
        await openLayer(session, "Linked", degreeAtLeast(5));
        const ws = await edit();
        await userEvent.click(await within(ws).findByRole("button", { name: /^Advanced/ }));
        const where = await within(ws).findByRole("radio", { name: "Edges where ..." });
        await userEvent.click(ws.querySelector(`label[for="${where.id}"]`) ?? where);
        await userEvent.click(await within(ws).findByRole("button", { name: /^Edge value/ }));
        await screen.findByRole("combobox", { name: "Find edge attributes" });
        await userEvent.keyboard("shared{Enter}");
        await waitFor(() => {
            const active = document.activeElement;
            assert.isTrue(active instanceof HTMLInputElement && ws.contains(active), "focus is in a box");
            assert.match(active?.getAttribute("aria-label") ?? "", /^shared_chapters from/);
        });
        const row = ws.querySelector('.sel-ws-outline [data-row="deg"]');
        assert.isNull(row?.querySelector(".sel-tag") ?? null, "untouched, the step is tagged with nothing");
        assert.notInclude(ws.querySelector(".sel-advanced")?.textContent ?? "", "Edges:");
    });

    it("a long checklist says how many values are not drawn", async () => {
        const { session } = await openSample();
        await openLayer(session, "Listed", {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [
                {
                    id: "a",
                    start: "none",
                    steps: [{ id: "nm", op: "add", rule: { kind: "categories", attribute: "data.name", values: [] } }],
                },
            ],
        });
        const ws = await edit();
        const values = await within(ws).findByRole("group", { name: "name values" });
        const drawn = within(values).getAllByRole("checkbox").length;
        await waitFor(() => {
            assert.isNotNull(within(ws).queryByText(`${String(77 - drawn)} more`));
        });
    });
});

describe("the Filters", () => {
    it("keep their header total while a card is edited, and a collapsed card says its count apart", async () => {
        const { session } = await openSample("data");
        await session.visibility.addCondition({
            id: "many",
            effect: "keep",
            rule: { kind: "range", attribute: "graphty.degree", min: 10 },
        });
        await session.visibility.addCondition({
            id: "few",
            effect: "keep",
            rule: { kind: "range", attribute: "graphty.degree", max: 3 },
        });
        const list = await screen.findByRole("list", { name: "Filters" });
        const name = await within(list).findByRole("button", { name: /^Degree min 10, \d+ of 77 nodes$/ });
        await waitFor(() => {
            assert.strictEqual(document.querySelector("[data-filters-count]")?.textContent, "Passes none");
        });
        await userEvent.click(name);
        // The card opens on its outline; its row opens the workspace.
        const card = await within(list).findByRole("group", { name: /^Degree min 10/ });
        await userEvent.click(await within(card).findByRole("treeitem", { name: /^Degree min 10, / }));
        await opened();
        assert.strictEqual(
            document.querySelector("[data-filters-count]")?.textContent,
            "Passes none",
            "the header keeps what the cards leave together",
        );
    });

    it("a new card's Nodes | Edges keeps focus on a side switch, the picker shut and nothing said", async () => {
        const { heard } = await openSample("data");
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        const label = (side: string): HTMLElement => {
            const radio = within(document.querySelector<HTMLElement>(".sel-ws") ?? document.body).getByRole("radio", {
                name: side,
            });
            return document.querySelector<HTMLElement>(`label[for="${radio.id}"]`) ?? radio;
        };
        // The first click closes the picker; the second puts focus on Nodes.
        await userEvent.click(label("Nodes"));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("combobox", { name: "Find attributes, results" }));
        });
        await userEvent.click(label("Nodes"));
        const said = heard.length;
        await userEvent.keyboard("{ArrowRight}");
        await waitFor(() => {
            const active = document.activeElement as HTMLInputElement | null;
            assert.strictEqual(active?.getAttribute("type"), "radio");
            assert.isTrue(active?.checked);
            assert.strictEqual(active?.value, "edge", "focus is on Edges");
        });
        assert.isNull(screen.queryByRole("combobox", { name: "Find attributes, results" }), "the picker stays shut");
        assert.strictEqual(
            within(await opened())
                .getByRole("button", { name: "Value" })
                .getAttribute("aria-expanded"),
            "false",
            "its Value field waits under the switch",
        );
        assert.isFalse(
            heard.slice(said).some((each) => each.startsWith("Editing")),
            `no Editing was said: ${heard.slice(said).join(" | ")}`,
        );
        await userEvent.keyboard("{ArrowLeft}");
        await waitFor(() => {
            const active = document.activeElement as HTMLInputElement | null;
            assert.strictEqual(active?.value, "node", "ArrowLeft goes back to Nodes");
            assert.isTrue(active?.checked);
        });
    });
});

/**
 * Axe's serious and critical violations of some rules inside an element.
 * @param root - where to look.
 * @param rules - the rules to run.
 * @returns each violation's rule and first target.
 */
async function violations(root: Element, rules: string[]): Promise<string[]> {
    const result = await axe.run(root, { runOnly: { type: "rule", values: rules } });
    return result.violations.map((each) => `${each.id} ${String(each.nodes[0]?.target ?? "")}`);
}

describe("round 1's gate", () => {
    it("the matches strip is searched first, and typing finds a match among its rows", async () => {
        const { session } = await openSample();
        await openLayer(session, "Searched", degreeAtLeast(1));
        const ws = await edit();
        const strip = await within(ws).findByRole("region", { name: "Matches" });
        const rows = (): number =>
            Number(strip.querySelector("[aria-rowcount]")?.getAttribute("aria-rowcount") ?? Number.NaN);
        await waitFor(() => {
            assert.isAbove(rows(), 20, "every match is in the strip's table");
        });
        const search = within(strip).getByRole("searchbox", { name: "Search matches" });
        assert.isTrue(
            Boolean(search.compareDocumentPosition(strip.querySelector("table, [role=grid]") ?? strip) & 4),
            "the search comes before the table",
        );
        await userEvent.click(search);
        await userEvent.keyboard("Valjean");
        await waitFor(() => {
            assert.isAtMost(rows(), 3, "the table holds what the search found");
            assert.include(strip.textContent ?? "", "Valjean");
        });
    });

    it("the value picker's list is the region that scrolls, so no key-less scroller is left", async () => {
        const { session } = await openSample();
        await openLayer(session, "Scrolled");
        await edit();
        const search = await screen.findByRole("combobox", { name: "Find attributes, results" });
        const dropdown = search.closest(".mantine-Combobox-dropdown") ?? document.body;
        const scroller = await waitFor(() => {
            const found = [...dropdown.querySelectorAll<HTMLElement>("*")].find(
                (each) =>
                    each.scrollHeight > each.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(each).overflowY),
            );
            assert.isDefined(found, "the list holds more than it shows");
            return found;
        });
        assert.strictEqual(scroller?.getAttribute("role"), "listbox", "what scrolls is the list");
        assert.strictEqual(scroller?.id, search.getAttribute("aria-controls"), "the search's own list");
        assert.deepEqual(await violations(dropdown, ["scrollable-region-focusable"]), []);
    });

    it("a reference that cannot be taken yet says so, as its dimmed ink shows", async () => {
        const { session } = await openSample();
        await openLayer(session, "Referred", TWO);
        const ws = await edit();
        const row = await waitFor(() => {
            const found = ws.querySelector<HTMLElement>('[data-row="b1"] .sel-value');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(row ?? ws);
        await userEvent.click(await within(ws).findByRole("button", { name: /^Reference/ }));
        const soFar = await screen.findByRole("option", { name: "So far" });
        assert.strictEqual(soFar.getAttribute("aria-disabled"), "true");
        assert.deepEqual(await violations(soFar.closest("[role=listbox]") ?? soFar, ["color-contrast"]), []);
    });
});
