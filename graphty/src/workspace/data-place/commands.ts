import { type AttributeDescriptor, sourceDescriptors } from "@graphty/graphty-element/catalog";
import type { ColumnRef, GraphSession, LoadedSource } from "@graphty/graphty-element/session";

import {
    type ColumnHeaderCommand,
    type CommandContext,
    defineRegistration,
    type SourceRowCommand,
} from "../commands/registry";
import type { WorkspaceStore } from "../state/store";
import { openFilterDraft, selectRule } from "./filterCards";
import { remap } from "./words";

/** One network load, as `data.loads()` records it. */
type LoadRecord = ReturnType<GraphSession["data"]["loads"]>[number];

/**
 * The network load a row's source came from, as `data.loads()` records it.
 * @param session - the element's session.
 * @param source - the row's load.
 * @returns the record, or undefined for a load from no network source.
 */
export function loadOf(session: GraphSession | null, source: LoadedSource): LoadRecord | undefined {
    return source.loadKey === undefined ? undefined : session?.data.loads().find((each) => each.key === source.loadKey);
}

/**
 * Picks one edge end of a load whose rows are still nodes (Fields' Source and Target after Rows
 * are: edges, or a node column's Role): held until both ends are picked, then the load is read
 * again as edges between them, one undo step.
 * @param workspace - the workspace store, which holds the end picked first.
 * @param session - the element's session.
 * @param load - the load.
 * @param end - which end.
 * @param column - the column, or null for none.
 */
export async function pickEnd(
    workspace: WorkspaceStore,
    session: GraphSession,
    load: LoadedSource,
    end: "source" | "target",
    column: string | null,
): Promise<void> {
    const held = workspace.get().ends;
    const before = held?.load === load.key ? held : { source: null, target: null };
    const ends = {
        load: load.key,
        source: end === "source" ? column : before.source,
        target: end === "target" ? column : before.target,
    };
    workspace.set({ ends });
    if (ends.source !== null && ends.target !== null) {
        await session.data.reloadSource(load.key, {
            mapping: remap(load, "nodes", { rowsAre: "edges", source: ends.source, target: ends.target }),
        });
        workspace.set({ ends: null });
    }
}

/**
 * Whether a row's load has a next page its source can read: the source pages, and the load stopped
 * at a cap.
 * @param ctx - the command context.
 * @param source - the row's load.
 * @returns true when Load more applies.
 */
function hasMore(ctx: CommandContext, source: LoadedSource): boolean {
    const load = loadOf(ctx.session, source);
    if (load === undefined) {
        return false;
    }
    return load.next !== null && sourceDescriptors().some((each) => each.id === load.source && each.features.more);
}

/**
 * Runs a source verb, turning a refusal into one notice.
 * @param ctx - the command context.
 * @param verb - the verb.
 * @param failed - the notice's words.
 * @returns settles once the verb has, so the row can show it busy until then.
 */
async function attempt(
    ctx: CommandContext,
    verb: (session: GraphSession) => Promise<unknown>,
    failed: string,
): Promise<void> {
    if (ctx.session === null) {
        return;
    }
    await verb(ctx.session).catch(() => {
        ctx.workspace.set({ notice: { message: failed } });
    });
}

/**
 * How many nodes a load supplies that the graph still holds.
 * @param session - the element's session.
 * @param key - the load's key.
 * @returns the count, 0 once the load is gone.
 */
function nodesOf(session: GraphSession, key: LoadedSource["key"]): number {
    return session.data.sources().find((each) => each.key === key)?.counts.nodes ?? 0;
}

/** The Data place's own Sources row commands; other packages add theirs by registering more. */
export const SOURCE_ROW_COMMANDS: readonly SourceRowCommand[] = [
    {
        id: "source.load-more",
        label: "Load more",
        order: 10,
        icon: "more",
        shown: hasMore,
        run: (ctx, source) =>
            attempt(
                ctx,
                async (session) => {
                    const before = nodesOf(session, source.key);
                    await session.data.more({ load: source.loadKey });
                    const added = nodesOf(session, source.key) - before;
                    ctx.workspace.set({ notice: { message: `+${String(added)} nodes` } });
                },
                "Nothing more loaded",
            ),
    },
    {
        id: "source.refresh",
        label: "Refresh",
        order: 20,
        icon: "refresh",
        shown: (ctx, source) => loadOf(ctx.session, source) !== undefined,
        run: (ctx, source) => {
            const load = source.loadKey;
            if (load === undefined) {
                return undefined;
            }
            return attempt(
                ctx,
                async (session) => {
                    const { added, removed, updated } = await session.data.refresh(load);
                    ctx.workspace.set({
                        notice: {
                            message: `+${String(added.nodes)} -${String(removed.nodes)} nodes, ${String(updated.nodes + updated.edges)} changed`,
                        },
                    });
                },
                "Not refreshed",
            );
        },
    },
    {
        id: "source.select-nodes",
        label: "Select nodes",
        order: 30,
        run: (ctx, source) =>
            attempt(
                ctx,
                (session) => selectRule(session, { kind: "source", sources: [source.key], side: "nodes" }),
                "Not selected",
            ),
    },
    {
        id: "source.remove",
        label: "Remove",
        order: 90,
        run: (ctx, source) => attempt(ctx, (session) => session.data.removeSource(source.key), "Not removed"),
    },
];

/**
 * The Data place package's registration: its Sources row commands. Its Fields rows act on the row
 * they are drawn for, so they are not commands.
 */
/**
 * A column's attribute, as `data.attributes()` describes it.
 * @param ctx - the workspace.
 * @param column - the column.
 * @returns the attribute, or undefined.
 */
function attributeOf(ctx: CommandContext, column: ColumnRef): AttributeDescriptor | undefined {
    return ctx.session?.data.attributes().find((a) => a.kind === column.kind && a.name === column.name);
}

/**
 * The table header's verbs on a column's attribute, now that the Data place lists no attributes:
 * Details opens the attribute's inspector (its values, Add label line, Show in table), and
 * Filter to... opens a new filter step on a number or category column.
 */
const COLUMN_HEADER_COMMANDS: readonly ColumnHeaderCommand[] = [
    {
        id: "column.filter",
        label: "Filter to...",
        shown: (ctx, column) => {
            const attribute = attributeOf(ctx, column);
            return (
                attribute !== undefined &&
                (attribute.type === "number" || attribute.type === "integer" || attribute.measurement === "categorical")
            );
        },
        run: (ctx, column) => {
            const attribute = attributeOf(ctx, column);
            if (attribute !== undefined) {
                openFilterDraft(ctx.workspace, `${attribute.kind}:${attribute.path}`);
            }
        },
    },
    {
        id: "column.details",
        label: "Details",
        shown: (ctx, column) => attributeOf(ctx, column) !== undefined,
        run: (ctx, column) => {
            const attribute = attributeOf(ctx, column);
            if (attribute !== undefined) {
                ctx.workspace.set({
                    page: "panels",
                    place: "data",
                    inspected: { kind: "attribute", id: attribute.path },
                });
            }
        },
    },
];

export const registration = defineRegistration({
    owner: "data-place",
    commands: [],
    sourceRow: SOURCE_ROW_COMMANDS,
    columnHeader: COLUMN_HEADER_COMMANDS,
});
