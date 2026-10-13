import type { StyleRow, StyleRowPin } from "@graphty/graphty-element/session";

import { type Command, type CommandContext, defineRegistration } from "../commands/registry";
import { deleteRow, duplicateRow, openDraft, orNotice, selectWhatItPaints, ungroup } from "./actions";
import { FIND_BOX_ID } from "./FindBox";
import { findTreeRow } from "./rows";

/**
 * A command on one row of the style tree. Every door to it -- the row's context menu, the
 * inspector header's "...", the row's keys, Quick actions -- runs this one list, so they agree.
 * Every layer has the same list, whatever made it; a folder adds Ungroup.
 */
export interface RowCommand {
    readonly id: string;
    readonly label: string;
    /** The keys that run it on the focused row, the first shown in menus. */
    readonly rowKeys: readonly string[];
    /** Whether the row has it at all. */
    readonly applies: (row: StyleRow) => boolean;
    /** Why it cannot run on the row now, or null. */
    readonly disabled: (row: StyleRow) => string | null;
    /** Does it to the row. */
    readonly run: (ctx: CommandContext, row: StyleRow) => void | Promise<void>;
}

/** Longer than a closing menu takes to hand focus back to its opener. */
const MENU_FOCUS_RETURN_MS = 50;

/**
 * A Pin to top, Pin to bottom or Unpin command.
 * @param pin - where it pins.
 * @param label - its words.
 * @returns the command.
 */
function pinCommand(pin: StyleRowPin, label: string): RowCommand {
    return {
        id: `row.pin-${pin}`,
        label,
        rowKeys: [],
        applies: () => true,
        disabled: (row) => {
            if (row.pin !== pin) {
                return null;
            }
            return pin === "none" ? "Not pinned" : "Already pinned there";
        },
        run: async ({ session, workspace }, row) => {
            if (session !== null) {
                await orNotice(workspace, `pin ${row.name}`, session.styles.pinRow(row.id, pin));
            }
        },
    };
}

/** The row commands, in menu order. */
export const ROW_COMMANDS: readonly RowCommand[] = [
    {
        id: "row.rename",
        label: "Rename",
        rowKeys: ["F2"],
        applies: () => true,
        disabled: () => null,
        run: ({ workspace }, row) => {
            // A menu hands focus back to its opener 10 ms after it closes (Mantine's
            // useFocusReturn), which would blur the new field and close it at once.
            setTimeout(() => {
                workspace.set({ page: "panels", place: "graph", renamingRow: row.id });
            }, MENU_FOCUS_RETURN_MS);
        },
    },
    {
        id: "row.duplicate",
        label: "Duplicate",
        rowKeys: ["Mod+D"],
        applies: (row) => row.kind === "layer",
        disabled: () => null,
        run: async ({ session, workspace }, row) => {
            if (session === null) {
                return;
            }
            try {
                const id = await duplicateRow(session, row);
                if (id !== undefined) {
                    workspace.set({ inspected: { kind: "layer-row", id } });
                }
            } catch (error) {
                const why = error instanceof Error ? ` ${error.message}` : "";
                workspace.set({ notice: { message: `Could not duplicate ${row.name}.${why}`, error: true } });
            }
        },
    },
    pinCommand("top", "Pin to top"),
    pinCommand("bottom", "Pin to bottom"),
    pinCommand("none", "Unpin"),
    {
        id: "row.select-paints",
        label: "Select what it paints",
        rowKeys: [],
        applies: () => true,
        disabled: () => null,
        run: async ({ session, workspace }, row) => {
            if (session !== null) {
                await orNotice(workspace, `select what ${row.name} paints`, selectWhatItPaints(session, row));
            }
        },
    },
    {
        id: "row.ungroup",
        label: "Ungroup",
        rowKeys: [],
        applies: (row) => row.kind === "folder",
        disabled: () => null,
        run: async ({ session, workspace }, row) => {
            if (session !== null) {
                await orNotice(workspace, `ungroup ${row.name}`, ungroup(session, row));
                workspace.set({ inspected: null });
            }
        },
    },
    {
        id: "row.delete",
        label: "Delete",
        rowKeys: ["Delete", "Backspace"],
        applies: () => true,
        disabled: () => null,
        run: async ({ session, workspace }, row) => {
            if (session !== null) {
                await orNotice(workspace, `delete ${row.name}`, deleteRow(session, workspace, row));
            }
        },
    },
];

/**
 * The tree row the inspector shows, which a row command run from the inspector's "...", Quick
 * actions or the command list acts on.
 * @param ctx - the command context.
 * @returns the row, or undefined when no single row is inspected.
 */
function inspectedRow(ctx: CommandContext): StyleRow | undefined {
    const { inspected } = ctx.workspace.get();
    if (ctx.session === null || inspected?.id === undefined) {
        return undefined;
    }
    if (inspected.kind !== "layer-row" && inspected.kind !== "folder-row") {
        return undefined;
    }
    return findTreeRow(ctx.session.styles.tree(), inspected.id)?.row;
}

/**
 * A row command as a workspace command on the inspected row.
 * @param command - the row command.
 * @returns the workspace command.
 */
function onInspectedRow(command: RowCommand): Command {
    return {
        id: command.id,
        label: command.label,
        group: "Graph tree",
        rowKeys: command.rowKeys,
        disabled: (ctx) => {
            const row = inspectedRow(ctx);
            if (row === undefined) {
                return "Select a style layer first";
            }
            return command.applies(row) ? command.disabled(row) : `Not available for ${row.name}`;
        },
        run: async (ctx) => {
            const row = inspectedRow(ctx);
            if (row !== undefined) {
                await command.run(ctx, row);
            }
        },
    };
}

/**
 * The Graph place's commands and the kinds its tree opens in the inspector: a layer, a folder,
 * several rows at once, and the new layer not yet written.
 */
export const registration = defineRegistration({
    owner: "graph-place",
    commands: [
        {
            id: "find.focus",
            label: "Find",
            group: "Graph tree",
            keys: ["/"],
            keywords: ["search", "node", "name"],
            disabled: ({ session }) => (session === null ? "Nothing is open" : null),
            run: ({ workspace }) => {
                workspace.set({ page: "panels", place: "graph" });
                // The Graph place may only now be drawn; focus once it is.
                requestAnimationFrame(() => {
                    document.getElementById(FIND_BOX_ID)?.focus();
                });
            },
        },
        {
            // The tree's "+" > Add layer, from Quick actions too: a draft on what is selected.
            id: "row.add-layer",
            label: "Add layer",
            group: "Graph tree",
            keywords: ["style", "new layer"],
            disabled: ({ session }) => (session === null ? "Nothing is open" : null),
            run: ({ session, workspace }) => {
                if (session !== null) {
                    workspace.set({ page: "panels", place: "graph" });
                    openDraft(session, workspace);
                }
            },
        },
        ...ROW_COMMANDS.map(onInspectedRow),
    ],
    inspectedKinds: [
        { kind: "layer-row", tabs: ["style", "values"] },
        { kind: "folder-row", tabs: ["style", "values"] },
        { kind: "rows", tabs: [] },
        { kind: "draft-row", tabs: [] },
    ],
});
