import type { ColumnRef, GraphSession } from "@graphty/graphty-element/session";

import { type CommandContext, defineRegistration } from "../commands/registry";
import { DEFAULT_NAME_KEY, selectionName } from "./cards";
import { addLabelLine, labelRow, selectionRow, topmostRow } from "./row";
import { madeWords } from "./words";

/**
 * The node attribute the inspector shows, when it shows one: the attribute kind's id is the
 * attribute's path (`data.<name>`), as `session.data.attributes()` publishes it.
 * @param ctx - the command context.
 * @returns the attribute, or undefined.
 */
function inspectedAttribute(ctx: CommandContext): ReturnType<GraphSession["data"]["attributes"]>[number] | undefined {
    const { inspected } = ctx.workspace.get();
    if (ctx.session === null || inspected?.kind !== "attribute") {
        return undefined;
    }
    return ctx.session.data.attributes().find((a) => a.kind === "node" && a.path === inspected.id);
}

/**
 * Adds a label line on the inspected layer row or Everything, the line Text "+" adds there, and
 * shows that row's Style tab: bound to the column when one is given (an attribute's menu, or the
 * attribute open in the inspector), else with the Text section's source list open, as Text "+"
 * opens it (or, when the row already labels, with focus on its label line).
 * @param session - the element's session.
 * @param workspace - the chrome store.
 * @param column - the node attribute, if one was chosen.
 * @returns when it is written.
 */
export async function labelLine(
    session: GraphSession,
    workspace: CommandContext["workspace"],
    column?: ColumnRef,
): Promise<void> {
    const state = workspace.get();
    const row = labelRow(session, state.inspected);
    if (column !== undefined) {
        await addLabelLine(session, row, column);
    }
    workspace.set({
        inspected: row.inspected,
        tabs: { ...workspace.get().tabs, [row.inspected.kind]: "style" },
        styleSide: "node",
        ...(column === undefined ? { textNext: "node.label" as const } : {}),
    });
}

/**
 * Makes the selection's own layer at once -- the rule that selected it, or the selected elements
 * picked by hand -- above the topmost row, as one undoable step, then selects it in the tree and
 * opens its Style tab with focus on the tab. A selection that already has its layer opens that one.
 * @param session - the element's session.
 * @param workspace - the chrome store.
 * @returns when the layer is made and opened.
 */
async function layerFromSelection(session: GraphSession, workspace: CommandContext["workspace"]): Promise<void> {
    const { nodes, edges } = session.selection;
    const name = selectionName(session);
    const had = selectionRow(session).at(-1);
    let id = had;
    if (id === undefined) {
        let target: "node" | "edge" | "both" = nodes.length > 0 ? "node" : "edge";
        if (nodes.length > 0 && edges.length > 0) {
            target = "both";
        }
        const base = topmostRow(session);
        const parts = await session.styles.addRow(
            {
                name,
                selector: session.selection.layerSelector,
                target,
                // The name is a default: it follows the layer's cards until the reader renames it.
                userData: { [DEFAULT_NAME_KEY]: name },
            },
            base === undefined ? undefined : { above: base.id },
        );
        ({ id } = parts);
    }
    const layerName = session.styles.get(id)?.name ?? name;
    workspace.set({
        inspected: { kind: "layer-row", id, tab: "style" },
        notice: {
            message: had === undefined ? madeWords(layerName, nodes.length, edges.length) : `Opened layer ${layerName}`,
        },
    });
    // The menu that ran this has given focus back to the canvas: the tab takes it once drawn.
    requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('[data-inspected="layer-row"] [role="tab"][aria-selected="true"]')?.focus();
    });
}

/**
 * The Style tab package's commands. "Add label line" (Quick actions, and the attribute menu's
 * door: Data > Attributes, the attribute inspector, a table column) adds the Text "+" label line
 * on the inspected layer row or Everything.
 */
export const registration = defineRegistration({
    owner: "style",
    commands: [
        {
            id: "style.add-label-line",
            label: "Add label line",
            group: "Graph tree",
            description: "Label every node on the selected layer or Everything, by the open attribute or one you pick",
            disabled: (ctx) => (ctx.session === null ? "Open a graph first" : null),
            run: async (ctx) => {
                if (ctx.session === null) {
                    return;
                }
                const column = inspectedAttribute(ctx);
                try {
                    await labelLine(ctx.session, ctx.workspace, column);
                } catch {
                    ctx.workspace.set({
                        notice: { message: `${column?.name ?? "That attribute"} could not label the nodes` },
                    });
                }
            },
        },
        {
            id: "style.layer-from-selection",
            label: "New layer from selection",
            group: "Graph tree",
            description: "A layer for what is selected: the rule that selected it, or the selected elements",
            disabled: (ctx) =>
                ctx.session === null || ctx.session.selection.nodes.length + ctx.session.selection.edges.length === 0
                    ? "Select something first"
                    : null,
            run: async (ctx) => {
                const { session, workspace } = ctx;
                if (session === null) {
                    return;
                }
                try {
                    await layerFromSelection(session, workspace);
                } catch {
                    workspace.set({ notice: { message: "The layer could not be made", error: true } });
                }
            },
        },
    ],
});
