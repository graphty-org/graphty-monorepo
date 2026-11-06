import type { GraphSession, StyleRow, StyleRowPin } from "@graphty/graphty-element/session";

import { type Command, type CommandContext, defineRegistration } from "../commands/registry";
import { focusInspectorTitle, focusIsLost } from "../frame/focus";
import type { GLYPHS } from "../glyphs";
import { errorWords } from "../project/words";
import { addLayer, deleteRow, duplicateRow, orNotice, selectWhatItPaints, ungroup } from "./actions";
import { FIND_BOX_ID } from "./FindBox";
import { findTreeRow, isBaseRow } from "./rows";

/**
 * A command on one row of the style tree. Every door to it -- the row's context menu, the
 * inspector header's "...", the row's keys, Quick actions -- runs this one list, so they agree.
 * Every layer has the same list, whatever made it; a folder adds Ungroup.
 */
export interface RowCommand {
    readonly id: string;
    readonly label: string;
    /** Its words in a row's menu, where they can follow the row's state ("Hide" or "Show"). */
    readonly rowLabel?: (row: StyleRow) => string;
    /** Its icon in a row's menu. */
    readonly icon: keyof typeof GLYPHS | ((row: StyleRow) => keyof typeof GLYPHS);
    /** Its group in a row's menu: a divider falls between two groups. */
    readonly group: "edit" | "pin" | "view" | "remove";
    /** The keys that run it on the focused row, the first shown in menus. */
    readonly rowKeys: readonly string[];
    /** Whether the row has it at all. */
    readonly applies: (row: StyleRow) => boolean;
    /** Why it cannot run on the row now, or null. */
    readonly disabled: (row: StyleRow, session: GraphSession | null) => string | null;
    /** Does it to the row. */
    readonly run: (ctx: CommandContext, row: StyleRow) => void | Promise<void>;
}

/** Why the Everything row holding the base look never moves or goes. */
const BASE_STAYS = "Everything holds the base look and stays at the bottom";
/** Why the base layer cannot be deleted: its own reason, drawn under Delete. */
const BASE_KEPT = "Everything holds the base look, so it cannot be deleted";

/** Longer than a closing menu takes to hand focus back to its opener. */
const MENU_FOCUS_RETURN_MS = 50;

/**
 * A Pin to top, Pin to bottom or Unpin command.
 * @param pin - where it pins.
 * @param label - its words.
 * @param icon - its icon in a row's menu.
 * @returns the command.
 */
function pinCommand(pin: StyleRowPin, label: string, icon: keyof typeof GLYPHS): RowCommand {
    return {
        id: `row.pin-${pin}`,
        label,
        icon,
        group: "pin",
        rowKeys: [],
        // Unpin only where there is a pin to take off.
        applies: (row) => pin !== "none" || row.pin !== "none",
        disabled: (row, session) => {
            if (isBaseRow(session, row.id)) {
                return BASE_STAYS;
            }
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

/**
 * The run whose layers a folder holds, when one run made them (a grouping run's folder of
 * groups), read from each layer's source.
 * @param session - the element's session.
 * @param row - the folder.
 * @returns the run's id, or undefined.
 */
function runOfFolder(session: GraphSession | null, row: StyleRow): string | undefined {
    if (session === null) {
        return undefined;
    }
    // A layer the reader added to the folder belongs to no run and does not count.
    const runs = new Set(
        session.styles.layersUnder([row.id]).flatMap((reach) =>
            reach.layers.flatMap((id) => {
                const source = session.styles.get(id)?.source;
                return source?.by === "run" ? [source.runId] : [];
            }),
        ),
    );
    const [only] = runs;
    return runs.size === 1 ? only : undefined;
}

/** The row commands, in menu order. */
export const ROW_COMMANDS: readonly RowCommand[] = [
    {
        id: "row.rename",
        label: "Rename",
        icon: "rename",
        group: "edit",
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
        icon: "duplicate",
        group: "edit",
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
                workspace.set({
                    notice: { message: errorWords(`Could not duplicate ${row.name}`, error), error: true },
                });
            }
        },
    },
    {
        // A run's group folder: its settings and Rerun are on the run's own page.
        id: "row.open-run",
        label: "Run settings",
        icon: "analyze",
        group: "edit",
        rowKeys: [],
        applies: (row) => row.kind === "folder",
        disabled: (row, session) => (runOfFolder(session, row) === undefined ? "Not made by a run" : null),
        run: ({ session, workspace }, row) => {
            const runId = runOfFolder(session, row);
            if (runId !== undefined) {
                // On its Values tab, where its settings and Rerun are.
                workspace.set((state) => ({
                    inspected: { kind: "run-row", id: runId },
                    tabs: { ...state.tabs, "run-row": "values" },
                }));
            }
        },
    },
    pinCommand("top", "Pin to top", "pinTop"),
    pinCommand("bottom", "Pin to bottom", "pinBottom"),
    pinCommand("none", "Unpin", "unpin"),
    {
        id: "row.select-paints",
        label: "Select what it paints",
        icon: "selection",
        group: "view",
        rowKeys: [],
        applies: () => true,
        disabled: () => null,
        run: async ({ session, workspace }, row) => {
            if (session === null) {
                return;
            }
            await orNotice(
                workspace,
                `select what ${row.name} paints`,
                selectWhatItPaints(session, row).then(({ nodes, edges }) => {
                    if (nodes + edges === 0) {
                        workspace.set({ notice: { message: `${row.name} paints nothing, so nothing was selected` } });
                    }
                }),
            );
            // The header button that ran it goes as the inspector turns to the selection: focus
            // goes to the inspector's title, which names what was selected.
            requestAnimationFrame(() => {
                if (focusIsLost()) {
                    focusInspectorTitle();
                }
            });
        },
    },
    // Figma's Show/Hide and Lock/Unlock: the row's eye and lock are pointer-only (the tree is one
    // Tab stop), so the keyboard reaches them here, by these keys and in the row menu.
    {
        id: "row.hide",
        label: "Show/Hide",
        rowLabel: (row) => (row.hidden ? "Show" : "Hide"),
        icon: (row) => (row.hidden ? "show" : "hide"),
        group: "view",
        rowKeys: ["Shift+Mod+H"],
        applies: () => true,
        disabled: () => null,
        run: async ({ session, workspace }, row) => {
            if (session !== null) {
                await orNotice(workspace, `hide ${row.name}`, session.styles.hideRow(row.id, !row.hidden));
            }
        },
    },
    {
        id: "row.lock",
        label: "Lock/Unlock",
        rowLabel: (row) => (row.locked ? "Unlock" : "Lock"),
        icon: (row) => (row.locked ? "unlock" : "lock"),
        group: "view",
        rowKeys: ["Shift+Mod+L"],
        applies: () => true,
        disabled: () => null,
        run: async ({ session, workspace }, row) => {
            if (session !== null) {
                await orNotice(workspace, `lock ${row.name}`, session.styles.lockRow(row.id, !row.locked));
            }
        },
    },
    {
        id: "row.ungroup",
        label: "Ungroup",
        icon: "ungroup",
        group: "remove",
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
        icon: "delete",
        group: "remove",
        rowKeys: ["Delete", "Backspace"],
        applies: () => true,
        disabled: (row, session) => (isBaseRow(session, row.id) ? BASE_KEPT : null),
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
            return command.applies(row) ? command.disabled(row, ctx.session) : `Not available for ${row.name}`;
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
            // Mod+F as well as "/": the find key of every application, from anywhere in the
            // workspace, a field or a toolbar button included.
            keys: ["/", "Mod+F"],
            keywords: ["search", "node", "name"],
            disabled: ({ session }) => (session === null ? "Nothing is open" : null),
            run: ({ workspace }) => {
                workspace.set({ page: "panels", place: "graph" });
                // The Graph place may only now be drawn; focus once it is. Text already in the box
                // is selected, so the next search replaces it, as every find key does.
                requestAnimationFrame(() => {
                    const box = document.getElementById(FIND_BOX_ID);
                    box?.focus();
                    if (box instanceof HTMLInputElement) {
                        box.select();
                    }
                });
            },
        },
        {
            // The tree's "+" > Layer, from Quick actions too: a real layer, named and ready to rename.
            id: "row.add-layer",
            label: "Add layer",
            group: "Graph tree",
            keywords: ["style", "new layer"],
            disabled: ({ session }) => (session === null ? "Nothing is open" : null),
            run: ({ session, workspace }) => {
                if (session !== null) {
                    void orNotice(workspace, "add a layer", addLayer(session, workspace, MENU_FOCUS_RETURN_MS));
                }
            },
        },
        ...ROW_COMMANDS.map(onInspectedRow),
    ],
    inspectedKinds: [
        { kind: "layer-row", tabs: ["style", "values"] },
        { kind: "folder-row", tabs: ["style", "values"] },
        { kind: "rows", tabs: [] },
    ],
});
