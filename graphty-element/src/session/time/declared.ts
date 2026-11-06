/**
 * A file that declares time (a dynamic GEXF graph, an XGMML graph with `start` and `end`)
 * designates its time field as part of the load's own step, so undo takes back both together.
 */
import type { UndoableContext } from "../project/Dispatcher";
import type { TimeField, TimeSource } from "./TimeApi";

/**
 * The `data.knownFields` keys that hold one kind's designation.
 * @param prefix - `node` or `edge`.
 * @param source - The kind's source, or undefined for none.
 * @returns The keys, each null when unset.
 */
function knownFieldsOf(prefix: "node" | "edge", source: TimeSource | undefined): Record<string, string | null> {
    return {
        [`${prefix}TimePath`]: source?.start ?? null,
        [`${prefix}TimeUnit`]: source?.unit ?? null,
        [`${prefix}TimeParseZone`]: source?.parseZone ?? null,
        [`${prefix}TimeEndPath`]: source?.end ?? null,
        [`${prefix}TimeSpellsPath`]: source?.spells ?? null,
    };
}

/**
 * Designate the time field a load's file declared, in the load's step: only with the timeline
 * experiment on, and only when no time field is set already (saved in the project, or set by an
 * attribute), which then wins.
 * @param field - What the file declared, or null/undefined for nothing.
 * @param ctx - The load's context.
 */
export async function designateDeclaredTime(field: TimeField | null | undefined, ctx: UndoableContext): Promise<void> {
    if (field === null || field === undefined || ctx.services.timeline?.() !== true) {
        return;
    }

    const known = ctx.services.config?.().data.knownFields;
    if (known?.nodeTimePath !== null || known.edgeTimePath !== null) {
        return;
    }

    await ctx.inline({
        op: "config.set",
        values: {
            data: { knownFields: { ...knownFieldsOf("node", field.nodes), ...knownFieldsOf("edge", field.edges) } },
        },
    });
    ctx.after("time:field", () => {
        ctx.services.timeFieldChanged?.();
    });
}
