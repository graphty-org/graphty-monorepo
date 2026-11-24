/**
 * The stack a branches view (`styles.showBranches`) paints: the layers it draws for each branch,
 * the ghosts it draws faint, and the stack's own layers suspended beneath them.
 */
import type { LayerSpec, UnionLeaf } from "../../catalog/types";
import { DRAFT_PATH } from "../sources/steps/paths";
import { inertReason } from "../visibility/union";
import type { CompiledLayer, LayerCheck } from "./Layer";
import type { SelectorTarget } from "./predicate";
import { selectorStates } from "./selector";
import { badCommand } from "./styleErrors";
import type { BranchesView, DraftView, StylesSources } from "./StylesApi";
import { drawsOutsideWindow, hidesOutsideWindow } from "./tree";

/**
 * The faint layers a branches view draws a ghost with, a member keeping its branch's color.
 * @param state - The state the ghosts are in.
 * @param show - Whether the layers also draw the ghosts, which other layers hide.
 * @returns The node layer and the edge layer.
 */
function heldLayers(state: "ghosted" | "outsideWindow", show: boolean): LayerSpec[] {
    return [
        {
            name: "Held",
            target: "node",
            selector: { match: "state", state },
            set: show ? { "node.visible": true, "node.opacity": 0.2 } : { "node.opacity": 0.2 },
        },
        {
            name: "Held",
            target: "edge",
            selector: { match: "state", state },
            set: show ? { "edge.visible": true, "edge.opacity": 0.15 } : { "edge.opacity": 0.15 },
        },
    ];
}

/**
 * The layers a branches view draws what lies outside the time window with: the view suspends the
 * stack's layers, so what draws it faint, or hides it, is put back in their place.
 * @param stack - The stack.
 * @returns The layers; none while no layer of the stack draws or hides it.
 */
export function outsideInView(stack: readonly CompiledLayer[]): LayerSpec[] {
    if (drawsOutsideWindow(stack)) {
        return heldLayers("outsideWindow", true);
    }

    if (!hidesOutsideWindow(stack)) {
        return [];
    }

    return (["node", "edge"] as const).map((target) => ({
        name: "Held",
        target,
        selector: { match: "state", state: "outsideWindow" },
        set: { [`${target}.visible`]: false },
    }));
}

/**
 * Whether a layer draws the selection ring or the hover mark: a layer reading the state
 * `"selected"` or `"hovered"`, whoever made it.
 * @param entry - A layer in the stack.
 * @returns True for one.
 */
export function isStateMark(entry: CompiledLayer): boolean {
    return selectorStates(entry.layer.selector).some((state) => state === "selected" || state === "hovered");
}

/**
 * The layers one branch of a branches view draws: its own kind in its color, and for a node
 * branch the edges between its members too when the view asks for them.
 * @param rule - The union leaf the view draws.
 * @param branch - The branch.
 * @param target - What the leaf selects.
 * @param edges - Whether a node branch also draws the edges between its members.
 * @param faint - Whether the branch is drawn faint, under a marked view.
 * @returns The layers, bottom first.
 */
function branchSpecs(
    rule: UnionLeaf,
    branch: UnionLeaf["branches"][number],
    target: SelectorTarget,
    edges: boolean,
    faint: boolean,
): LayerSpec[] {
    const specs: LayerSpec[] = [];
    const faintOpacity = target === "node" ? 0.2 : 0.15;
    // What the branch holds, with the steps that change nothing (off, or no test yet) left
    // out: a step added with no test, or a name, leaves the layer the same, and the view
    // the same picture with no repaint.
    const { name: _name, color: _color, ...held } = branch;
    const steps = branch.steps.filter((step) => step.on !== false && inertReason(step.rule) === null);
    const selector = { match: "rule" as const, where: { ...rule, branches: [{ ...held, steps }] } };
    specs.push({
        name: branch.name ?? branch.id ?? "Branch",
        target,
        selector,
        set: {
            [`${target}.color`]: branch.color,
            [`${target}.opacity`]: faint ? faintOpacity : 1,
        },
    });
    // A node branch also draws the edges between its members in its color: the rule's
    // edge half is read `clipped`, the edges a filter of those nodes would leave.
    if (target === "node" && edges) {
        specs.push({
            name: branch.name ?? branch.id ?? "Branch",
            target: "edge",
            selector,
            set: { "edge.color": branch.color, "edge.opacity": faint ? 0.15 : 1 },
        });
    }

    return specs;
}

/**
 * The layers a branches view draws, bottom first: the rest faint, then each branch from the
 * last to the first, so the first branch wins, except that a marked branch is drawn on top.
 * @param view - The view.
 * @param sources - How the session admits the view's rule.
 * @param stack - The stack as project state holds it now.
 * @param check - Checks one layer specification against the session.
 * @returns The layers.
 */
export function branchLayers(
    view: BranchesView,
    sources: Pick<StylesSources, "admitRule">,
    stack: readonly CompiledLayer[],
    check: (spec: LayerSpec, id: string) => LayerCheck,
): { layers: CompiledLayer[]; keys: string[] } {
    const rule = (sources.admitRule?.(view.rule) ?? view.rule) as UnionLeaf;
    if (typeof rule !== "object" || (rule as { kind?: unknown }).kind !== "union") {
        throw badCommand("showBranches draws a union leaf.", { rule: view.rule });
    }

    const target: SelectorTarget = rule.side === "nodes" ? "node" : "edge";
    const specs: LayerSpec[] = [];
    if (view.rest === "faint") {
        specs.push(
            { name: "Rest", target: "node", selector: { match: "everything" }, set: { "node.opacity": 0.2 } },
            { name: "Rest", target: "edge", selector: { match: "everything" }, set: { "edge.opacity": 0.15 } },
        );
    }

    // A marked view draws every branch but the marked one faint, and the marked one last, so
    // a member it shares with an earlier branch shows in its color at full strength.
    const marked = view.mark !== undefined && rule.branches.some((each) => each.id === view.mark);
    const order = [...rule.branches].reverse();
    if (marked) {
        order.sort((a, b) => Number(a.id === view.mark) - Number(b.id === view.mark));
    }

    for (const branch of order) {
        if (branch.on === false || branch.color === undefined) {
            continue;
        }

        specs.push(...branchSpecs(rule, branch, target, view.edges === true, marked && branch.id !== view.mark));
    }

    // A ghost (what a held condition would remove, and what lies outside the time window
    // while the stack draws it) is drawn faint, a member keeping its branch's color. Over the
    // full graph a ghost that a branch holds is a member like any other, so the branches are
    // drawn over the ghosts.
    const restLayers = view.rest === "faint" ? 2 : 0;
    const ghostAt = view.base === "full" ? restLayers : specs.length;
    const outside = outsideInView(stack);
    specs.splice(ghostAt, 0, ...heldLayers("ghosted", false), ...outside);

    const layers = compiled(specs, "branches", check);
    // What each layer draws, by which it is the same layer as the one a view drew before.
    const keys = specs.map(({ name: _name, ...drawn }) => JSON.stringify(drawn));
    return { layers, keys };
}

/**
 * Compile a view's layers.
 * @param specs - The layers.
 * @param kind - The view, for the layers' ids.
 * @param check - Checks one layer specification against the session.
 * @returns The layers, compiled.
 */
function compiled(
    specs: readonly LayerSpec[],
    kind: "branches" | "draft",
    check: (spec: LayerSpec, id: string) => LayerCheck,
): CompiledLayer[] {
    return specs.map((spec, at) => {
        const checked = check(spec, `graphty-${kind}-${String(at)}`);
        if (checked.layer === null) {
            const message =
                kind === "draft"
                    ? "showDraft could not draw this draft."
                    : "showBranches could not draw this selection.";
            throw badCommand(message, { errors: checked.result.errors });
        }

        return checked.layer;
    });
}

/**
 * The layers a draft view (`styles.showDraft`) draws, bottom first: a ring on each node the
 * commit would merge, a dashed border on each node it would add, and each edge it would add drawn
 * dashed, read from `graphty.draft`; the ghosts drawn faint as under a branches view.
 * @param view - The colors.
 * @param stack - The stack as project state holds it now.
 * @param check - Checks one layer specification against the session.
 * @returns The layers.
 */
export function draftLayers(
    view: DraftView,
    stack: readonly CompiledLayer[],
    check: (spec: LayerSpec, id: string) => LayerCheck,
): CompiledLayer[] {
    const marked = (mark: "merged" | "new"): { match: "expression"; where: string } => ({
        match: "expression",
        where: `${DRAFT_PATH} == '${mark}'`,
    });
    return compiled(
        [
            ...heldLayers("ghosted", false),
            ...outsideInView(stack),
            {
                name: "Merged",
                target: "node",
                selector: marked("merged"),
                set: { "node.haloColor": view.merged, "node.haloScale": 1.4, "node.haloOpacity": 1 },
            },
            {
                name: "New",
                target: "node",
                selector: marked("new"),
                set: { "node.borderColor": view.new, "node.borderStyle": "dashed", "node.borderWidth": 0.1 },
            },
            {
                name: "New",
                target: "edge",
                selector: marked("new"),
                set: { "edge.color": view.new, "edge.style": "dash" },
            },
        ],
        "draft",
        check,
    );
}
