/**
 * A step's "Edges where ..." in its settings (spec 3.5), on the REAL graphty-element and Les
 * Miserables, driven by real clicks and keys: a Degree card's settings choose "Edges where ...",
 * which closes them and draws the card's edge value; picking an edge value and typing its
 * Min scopes the step to the edges that pass, as the element holds it; "All edges" takes the
 * condition away again. The settings' Test switches a Degree card between By position and By value.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, RuleTree, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// Every experiment stays off here.
withFeatures([]);

/**
 * Les Miserables in the workspace with a reader's layer selected in the style tree.
 * @returns the session and the layer.
 */
async function openLayer(): Promise<{ session: GraphSession; layer: Layer }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
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
    const layer = await session.styles.add({
        name: "Linked",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#d55e00" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Linked, / }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-rest"));
    });
    return { session, layer };
}

/**
 * The first step of the layer's selection, as the element holds it.
 * @param session - the session.
 * @param id - the layer.
 * @returns the step's links condition, and whether there is a step at all.
 */
function firstStep(
    session: GraphSession,
    id: string,
): { found: boolean; links: RuleTree | undefined; mode: string | undefined } {
    const selector = session.styles.get(id)?.selector;
    const where: UnionLeaf | undefined =
        selector?.match === "rule" && selector.where.kind === "union" ? selector.where : undefined;
    const step = where?.branches[0]?.steps[0];
    return { found: step !== undefined, links: step?.links, mode: step?.mode };
}

/**
 * Opens the selection workspace on the layer and picks Degree in its empty card.
 * @param session - the session.
 * @param id - the layer.
 */
async function pickDegree(session: GraphSession, id: string): Promise<void> {
    await userEvent.click(await screen.findByRole("button", { name: /^Select nodes\.\.\./ }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-ws"), "the workspace is open");
    });
    // An empty card's Value opens its picker.
    const empty = [...document.querySelectorAll<HTMLElement>(".sel-ws [data-new-step] [data-first-focus]")].at(-1);
    assert.isDefined(empty, "an empty card's Value");
    await userEvent.click(empty);
    await screen.findByRole("combobox", { name: "Find attributes, results" });
    await userEvent.keyboard("Degree{Enter}");
    await waitFor(() => {
        assert.isTrue(firstStep(session, id).found, "the Degree step is in the selection");
    });
}

describe("a number card's Test", () => {
    it("switches a Degree card to By position and back to By value", async () => {
        const { session, layer } = await openLayer();
        await pickDegree(session, layer.id);
        await userEvent.click(await screen.findByRole("button", { name: "Settings for Degree" }));
        const settings = await screen.findByRole("dialog", { name: "Degree" });
        await userEvent.click(within(settings).getByText("By position"));
        await waitFor(() => {
            assert.strictEqual(firstStep(session, layer.id).mode, "top", "the step keeps By position");
        });
        const again = await screen.findByRole("dialog", { name: "Degree" });
        await userEvent.click(within(again).getByText("By value"));
        await waitFor(() => {
            assert.strictEqual(firstStep(session, layer.id).mode, "range", "the step is By value again");
        });
    });
});

describe("a step's Edges where ...", () => {
    it("scopes a Degree card to the edges whose value passes, and All edges takes the scope away", async () => {
        const { session, layer } = await openLayer();
        await pickDegree(session, layer.id);
        assert.isNull(document.querySelector("[data-card-links]"), "no edge condition while every edge counts");

        // Settings: Edges where ... closes them, draws the card's edge value and hands it focus. The
        // option switches on mouse-down, so the mouse-up lands on the drawing behind the closed
        // settings, and must not take the focus (issue #8920).
        await userEvent.click(await screen.findByRole("button", { name: "Settings for Degree" }));
        const settings = await screen.findByRole("dialog", { name: "Degree" });
        await userEvent.click(within(settings).getByText("Edges where ..."));
        const field = await screen.findByRole("button", { name: "Edge value: none" });
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Degree" }), "the settings close");
        });
        assert.strictEqual(document.activeElement, field, "the edge value's field takes focus");
        assert.isUndefined(firstStep(session, layer.id).links, "nothing is scoped until a value is picked");

        // The edge value's list holds the edges' own data: Les Miserables' "shared_chapters".
        await userEvent.click(field);
        await screen.findByRole("combobox", { name: /^Find edge attributes/ });
        await userEvent.keyboard("shared{Enter}");
        await screen.findByRole("button", { name: /^Edge value: shared/ });
        await waitFor(() => {
            assert.isDefined(firstStep(session, layer.id).links, "the step reads only the edges that pass");
        });

        // Its Min takes focus; 5 keeps only the edges sharing 5 chapters or more.
        const links = document.querySelector<HTMLElement>("[data-card-links]");
        assert.isNotNull(links);
        const min = await within(links).findByRole("textbox", { name: /from, number$/ });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, min, "the test's first box takes focus");
        });
        await userEvent.keyboard("{Control>}a{/Control}5{Enter}");
        await waitFor(() => {
            const condition = firstStep(session, layer.id).links as { attribute?: string; min?: number } | undefined;
            assert.strictEqual(condition?.min, 5, "the element holds the edge test");
        });

        // The settings button says a setting is changed; All edges takes the condition away, from
        // the element and from the card.
        await userEvent.click(await screen.findByRole("button", { name: "Settings for Degree has configured values" }));
        await userEvent.click(within(await screen.findByRole("dialog", { name: "Degree" })).getByText("All edges"));
        await waitFor(() => {
            assert.isUndefined(firstStep(session, layer.id).links, "every edge counts again");
            assert.isNull(document.querySelector("[data-card-links]"), "and the card draws no edge condition");
        });
        await waitFor(() => {
            assert.isNotNull(screen.queryByRole("button", { name: "Settings for Degree" }), "nothing is changed");
        });
    });
});
