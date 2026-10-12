import type { GraphSession } from "@graphty/graphty-element/session";

import { type CommandContext, defineRegistration } from "../commands/registry";
import { resolveInspected } from "../inspector/inspected";
import { addLabelRow } from "./row";

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
 * The Style tab package's commands. "Add label line" is the attribute menu's door (Data >
 * Attributes, the attribute inspector, a table column; tier1-design.md 5.T10): it makes a row on
 * top whose label line is bound to that attribute, selects it, and the canvas draws it.
 */
export const registration = defineRegistration({
    owner: "style",
    commands: [
        {
            id: "style.add-label-line",
            label: "Add label line",
            group: "Graph tree",
            description: "Label every node with this attribute, on a new row on top",
            disabled: (ctx) => (inspectedAttribute(ctx) === undefined ? "Pick a node attribute first" : null),
            run: async (ctx) => {
                const column = inspectedAttribute(ctx);
                if (ctx.session === null || column === undefined) {
                    return;
                }
                try {
                    const layer = await addLabelRow(ctx.session, column);
                    ctx.workspace.set({ inspected: { kind: "layer-row", id: layer.id } });
                } catch {
                    ctx.workspace.set({ notice: { message: `${column.name} could not label the nodes` } });
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
            run: (ctx) => {
                const { session, workspace } = ctx;
                if (session === null) {
                    return;
                }
                // The selection's Style tab is the new layer: it paints what the selection's rule
                // holds, or the selected elements, and the first value set makes it a layer.
                const { nodes, edges } = session.selection;
                const { kind } = resolveInspected(null, { nodes, edges });
                workspace.set({ inspected: null, tabs: { ...workspace.get().tabs, [kind]: "style" } });
            },
        },
    ],
});
