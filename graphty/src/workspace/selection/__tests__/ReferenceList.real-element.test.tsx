/**
 * The reference picker's search-first list (design/ui/selection-groups/spec.md, section 4.3) on
 * the REAL graphty-element and Les Miserables, driven by real clicks and keys: a Within hops of
 * card's Reference opens the live references (So far unavailable on a group's first step), the
 * reader's sets and a Nodes heading with the node count and no rows; typing finds nodes by name,
 * says when nothing matches, and a picked set or node is the step's reference as the element
 * holds it.
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
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// Every experiment stays off here.
withFeatures([]);

/**
 * Les Miserables in the workspace with a set named Friends and a reader's layer selected.
 * @returns the session, the layer and the set's id.
 */
async function openLayer(): Promise<{ session: GraphSession; layer: Layer; set: string }> {
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
    const set = session.sets.create(
        { kind: "fixed", nodes: ["Valjean", "Myriel"], reading: "induced" },
        { name: "Friends" },
    );
    const layer = await session.styles.add({
        name: "Near",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#d55e00" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Near, / }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-rest"));
    });
    return { session, layer, set };
}

/**
 * The first step's rule, as the element holds it.
 * @param session - the session.
 * @param id - the layer.
 * @returns the rule as JSON, or "" with no step.
 */
function firstRule(session: GraphSession, id: string): string {
    const selector = session.styles.get(id)?.selector;
    const where: UnionLeaf | undefined =
        selector?.match === "rule" && selector.where.kind === "union" ? selector.where : undefined;
    const step = where?.branches[0]?.steps[0];
    return step === undefined ? "" : JSON.stringify(step.rule);
}

/**
 * The option names in the open list.
 * @returns them, in order.
 */
function optionNames(): string[] {
    const list = screen.getByRole("listbox", { name: "References" });
    return within(list)
        .queryAllByRole("option")
        .map((each) => each.textContent ?? "");
}

describe("the reference picker's list", () => {
    it("opens on the live references, the sets and the node count, finds nodes by name and takes a set or a node", async () => {
        const { session, layer, set } = await openLayer();
        await userEvent.click(await screen.findByRole("button", { name: /^Style Nodes\.\.\./ }));
        await waitFor(() => {
            assert.isNotNull(document.querySelector(".sel-ws"), "the workspace is open");
        });
        const empty = [...document.querySelectorAll<HTMLElement>(".sel-ws [data-new-step] [data-first-focus]")].at(-1);
        assert.isDefined(empty, "an empty card's Value");
        await userEvent.click(empty);
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Within hops of{Enter}");
        const card = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(".sel-ws .sel-card");
            assert.isNotNull(found);
            return found;
        });
        if (card === null) {
            return;
        }

        // Nothing typed: the live references, the sets and the Nodes heading with no rows.
        await userEvent.click(await within(card).findByRole("button", { name: /^Reference/ }));
        await screen.findByRole("listbox", { name: "References" });
        const live = optionNames();
        assert.includeMembers(live, ["Hovered or selected", "Selected (0)", "So far", "Friends"]);
        assert.lengthOf(live, 4, "no node rows until something is typed");
        const soFar = screen.getByRole("option", { name: "So far" });
        assert.strictEqual(soFar.getAttribute("aria-disabled"), "true", "So far holds nothing on a first step");
        assert.isNotNull(screen.getByText(`Nodes ${String(session.data.statistics().nodeCount)}`));

        // The set is the reference.
        await userEvent.click(screen.getByRole("option", { name: "Friends" }));
        await waitFor(() => {
            assert.include(firstRule(session, layer.id), JSON.stringify({ set }), "the set is the reference");
        });
        await within(card).findByRole("button", { name: "Reference: Friends" });

        // Typed: what matches nothing says Nodes 0, and a name finds its node.
        await userEvent.click(within(card).getByRole("button", { name: "Reference: Friends" }));
        await screen.findByRole("listbox", { name: "References" });
        assert.strictEqual(
            screen.getByRole("option", { name: "Friends" }).getAttribute("data-combobox-active"),
            "true",
            "the chosen set is marked in the list",
        );
        await userEvent.keyboard("zzqx");
        await screen.findByText("Nodes 0");
        assert.lengthOf(optionNames(), 0, "nothing matches");
        await userEvent.keyboard("{Control>}a{/Control}Valj");
        await waitFor(() => {
            assert.include(optionNames(), "Valjean");
        });
        await userEvent.click(screen.getByRole("option", { name: "Valjean" }));
        await waitFor(() => {
            assert.include(firstRule(session, layer.id), '"nodes":["Valjean"]', "the node is the reference");
        });
        await within(card).findByRole("button", { name: /^Reference: Valjean/ });
    });
});
