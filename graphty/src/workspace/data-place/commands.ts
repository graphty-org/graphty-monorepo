import { sourceDescriptors } from "@graphty/graphty-element/catalog";
import type { GraphSession, LoadedSource } from "@graphty/graphty-element/session";

import { type CommandContext, defineRegistration, type SourceRowCommand } from "../commands/registry";

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
 * Whether a row's load has a next page its source can read: the source pages, and the load stopped
 * at a cap.
 * @param ctx - the command context.
 * @param source - the row's load.
 * @returns true when Load more applies.
 */
function hasMore(ctx: CommandContext, source: LoadedSource): boolean {
    const load = loadOf(ctx.session, source);
    return (
        load !== undefined &&
        load.next !== null &&
        sourceDescriptors().some((each) => each.id === load.source && each.features.more)
    );
}

/**
 * Runs a source verb, turning a refusal into one notice.
 * @param ctx - the command context.
 * @param verb - the verb.
 * @param failed - the notice's words.
 */
function attempt(ctx: CommandContext, verb: (session: GraphSession) => Promise<unknown>, failed: string): void {
    if (ctx.session === null) {
        return;
    }
    verb(ctx.session).catch(() => {
        ctx.workspace.set({ notice: { message: failed } });
    });
}

/** The Data place's own Sources row commands; other packages add theirs by registering more. */
export const SOURCE_ROW_COMMANDS: readonly SourceRowCommand[] = [
    {
        id: "source.load-more",
        label: "Load more",
        order: 10,
        icon: "more",
        shown: hasMore,
        run: (ctx, source) => {
            attempt(ctx, (session) => session.data.more({ load: source.loadKey }), "Nothing more loaded");
        },
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
                return;
            }
            attempt(
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
        id: "source.remove",
        label: "Remove",
        order: 90,
        run: (ctx, source) => {
            attempt(ctx, (session) => session.data.removeSource(source.key), "Not removed");
        },
    },
];

/**
 * The Data place package's registration: its Sources row commands. Its Fields rows act on the row
 * they are drawn for, so they are not commands.
 */
export const registration = defineRegistration({
    owner: "data-place",
    commands: [],
    sourceRow: SOURCE_ROW_COMMANDS,
});
