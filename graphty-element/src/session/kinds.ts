/**
 * A file that declares what kind each node or edge is designates the column holding it as the
 * `kind` role, in the load's own step, so undo takes back both together.
 */
import { declaredKindsOf } from "../data/declaredKinds";
import type { UndoableContext } from "./project/Dispatcher";

/**
 * Designate the kind columns a load's file declared, in the load's step: each only when no kind
 * column of its element is set already (saved in the project, or set by `data.setRole`), which
 * then wins.
 * @param reader - The data source the load read, or null.
 * @param ctx - The load's context.
 */
export async function designateDeclaredKinds(reader: object | null | undefined, ctx: UndoableContext): Promise<void> {
    if (reader === null || reader === undefined) {
        return;
    }

    const declared = declaredKindsOf(reader);
    const known = ctx.services.config?.().data.knownFields;
    const patch: Record<string, string> = {};
    if (declared.node !== undefined && (known?.nodeKindPath ?? null) === null) {
        patch.nodeKindPath = declared.node;
    }

    if (declared.edge !== undefined && (known?.edgeKindPath ?? null) === null) {
        patch.edgeKindPath = declared.edge;
    }

    if (Object.keys(patch).length > 0) {
        await ctx.inline({ op: "config.set", values: { data: { knownFields: patch } } });
    }
}
