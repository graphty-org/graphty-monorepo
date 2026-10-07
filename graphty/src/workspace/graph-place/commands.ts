import type { LayerId } from "@graphty/graphty-element/catalog";

import { type Command, type CommandContext, defineRegistration } from "../commands/registry";
import { deleteRow, moveRow } from "./actions";
import { FIND_BOX_ID } from "./FindBox";
import { findRow, isMovable, layerAbove, type PaintRow, paintRows, type RowKind } from "./rows";

/**
 * A command on one paint-tree row. Every door to it -- the row's context menu, the inspector
 * header's "...", the row's keys, Quick actions -- runs this one list, so they always agree.
 */
export interface RowCommand {
    readonly id: string;
    readonly label: string;
    /** The keys that run it on the focused row, the first shown in menus. */
    readonly rowKeys: readonly string[];
    /** Whether the row has it at all. A row with none draws no "..." and opens no menu. */
    readonly applies: (row: PaintRow) => boolean;
    /** Why it cannot run on the row now, among the tree's rows (top first), or null. */
    readonly disabled: (row: PaintRow, rows: readonly PaintRow[]) => string | null;
    /** Does it to the row. */
    readonly run: (ctx: CommandContext, row: PaintRow) => void | Promise<void>;
}

/** Longer than a closing menu takes to hand focus back to its opener. */
const MENU_FOCUS_RETURN_MS = 50;

/** A run still running has no verbs until it ends. */
const RUNNING = "Wait for the run to finish, or cancel it";

/**
 * A row's move one place up (-1) or down (1) among the top-level rows: the layer it would sit
 * below, or undefined at an end. Moving up past rows that do not paint changes nothing, so a row
 * with none that paints above it is at the top.
 * @param rows - the rows, top first.
 * @param row - the row.
 * @param step - -1 for up, 1 for down.
 * @returns the layer to sit below, null for the top, or undefined.
 */
function stepTarget(rows: readonly PaintRow[], row: PaintRow, step: -1 | 1): LayerId | null | undefined {
    const at = rows.findIndex((candidate) => candidate.id === row.id);
    if (step === -1 && !rows.slice(0, Math.max(at, 0)).some((other) => other.layerIds.length > 0)) {
        return undefined;
    }
    return at < 0 ? undefined : layerAbove(rows, row.id, null, at + step);
}

/**
 * A Move up or Move down command.
 * @param step - -1 for up, 1 for down.
 * @returns the command.
 */
function moveCommand(step: -1 | 1): RowCommand {
    const up = step === -1;
    return {
        id: up ? "row.move-up" : "row.move-down",
        label: up ? "Move up" : "Move down",
        rowKeys: [up ? "Alt+ArrowUp" : "Alt+ArrowDown"],
        applies: isMovable,
        disabled: (row, rows) => {
            if (row.state === "running") {
                return RUNNING;
            }
            if (stepTarget(rows, row, step) === undefined) {
                return up ? "Already at the top" : "Already at the bottom";
            }
            return null;
        },
        run: async ({ session, workspace }, row) => {
            if (session === null) {
                return;
            }
            const before = stepTarget(paintRows(session), row, step);
            if (before !== undefined) {
                await moveRow(session, workspace, row, before);
            }
        },
    };
}

/**
 * The row commands, in menu order. Selection, Everything and a group row have none. A run row
 * has no Rename: graphty-element has no verb that renames a run.
 */
export const ROW_COMMANDS: readonly RowCommand[] = [
    {
        id: "row.rename",
        label: "Rename",
        rowKeys: ["F2"],
        applies: (row) => row.kind === "layer-row",
        disabled: () => null,
        run: ({ workspace }, row) => {
            // The paint tree opens the name field; it may only now be drawn. A menu hands focus
            // back to its opener 10 ms after it closes (Mantine's useFocusReturn), which would blur
            // the new field and close it at once, so the field opens after that.
            setTimeout(() => {
                workspace.set({ page: "panels", place: "graph", renamingRow: row.id });
            }, MENU_FOCUS_RETURN_MS);
        },
    },
    moveCommand(-1),
    moveCommand(1),
    {
        id: "row.delete",
        label: "Delete",
        rowKeys: ["Delete", "Backspace"],
        applies: (row) =>
            row.kind === "layer-row" ||
            ((row.kind === "measure-row" || row.kind === "run-row") && row.runId !== undefined),
        disabled: (row) => (row.state === "running" ? RUNNING : null),
        run: async ({ session, workspace }, row) => {
            if (session !== null) {
                await deleteRow(session, workspace, row);
            }
        },
    },
];

const ROW_KINDS: ReadonlySet<string> = new Set<RowKind>([
    "selection-row",
    "measure-row",
    "run-row",
    "group-row",
    "layer-row",
    "everything-row",
]);

/**
 * The paint-tree row the inspector shows, which a row command run from the inspector's "...",
 * Quick actions or the command list acts on.
 * @param ctx - the command context.
 * @returns the row, or undefined when no row is inspected.
 */
function inspectedRow(ctx: CommandContext): { row: PaintRow; rows: PaintRow[] } | undefined {
    const { inspected } = ctx.workspace.get();
    if (ctx.session === null || inspected?.id === undefined || !ROW_KINDS.has(inspected.kind)) {
        return undefined;
    }
    const rows = paintRows(ctx.session);
    const row = findRow(rows, inspected.id);
    return row === undefined ? undefined : { row, rows };
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
            const found = inspectedRow(ctx);
            if (found === undefined) {
                return "Select a style row first";
            }
            const { row, rows } = found;
            return command.applies(row) ? command.disabled(row, rows) : `Not available for ${row.name}`;
        },
        run: async (ctx) => {
            const found = inspectedRow(ctx);
            if (found !== undefined) {
                await command.run(ctx, found.row);
            }
        },
    };
}

/**
 * The Graph place's commands. A click on a row sets `inspected` to `{ kind, id }` with the row's
 * kind and id; the inspector registers and draws those kinds, except a reader's own layer row,
 * which only the paint tree has.
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
        ...ROW_COMMANDS.map(onInspectedRow),
    ],
    inspectedKinds: [{ kind: "layer-row", tabs: [] }],
});
