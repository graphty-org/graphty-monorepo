import { ToggleIconButton, Tree, type TreeNodeData } from "@graphty/compact-mantine";
import { Loader, Tooltip } from "@mantine/core";
import React, { useState } from "react";

import { CommandMenuItem } from "../frame/menus";
import { GLYPHS, KIND_GLYPHS } from "../glyphs";
import { staleWords } from "../inspector/words";
import { matchesKey } from "../keys/keys";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { moveRow, setRowHidden } from "./actions";
import { ROW_COMMANDS } from "./commands";
import { findRow, hasEye, isInspectedRow, isMovable, layerAbove, type PaintRow } from "./rows";

/** A group run with more groups than this opens collapsed (tier1-design.md section 2.5). */
const OPEN_UP_TO = 12;

/** A run row's state in words: its kind slot's tooltip and the row's description. */
const STATE_WORDS = {
    running: "Running",
    partial: "Stopped early: the values are partial",
    stale: "Out of date",
    failed: "Failed",
    canceled: "Canceled",
} as const;

/**
 * The words for a row's state, or undefined for a row that is ready.
 * @param row - the row.
 * @returns the words.
 */
function stateWords(row: PaintRow): string | undefined {
    if (row.state === "ready") {
        return undefined;
    }
    if (row.state === "stale" && row.stale !== undefined) {
        return staleWords(row.stale);
    }
    return row.state === "failed" ? (row.problem ?? STATE_WORDS.failed) : STATE_WORDS[row.state];
}

/**
 * The kind slot: the kind's icon, or the run's state with its words in a tooltip (the row's
 * description says them to a screen reader).
 * @param row - the row.
 * @returns the icon.
 */
function kindSlot(row: PaintRow): React.ReactNode {
    switch (row.state) {
        case "running":
            return (
                <Tooltip label={STATE_WORDS.running}>
                    <Loader size={12} />
                </Tooltip>
            );
        case "partial":
            return (
                <Tooltip label={STATE_WORDS.partial}>
                    <GLYPHS.warning size={14} />
                </Tooltip>
            );
        case "stale":
            return (
                <Tooltip label={stateWords(row)}>
                    <GLYPHS.outOfDate size={14} />
                </Tooltip>
            );
        case "failed":
            return (
                <Tooltip label={stateWords(row)}>
                    <GLYPHS.failed size={14} color="var(--cm-text-danger)" />
                </Tooltip>
            );
        case "canceled":
            return (
                <Tooltip label={STATE_WORDS.canceled}>
                    <GLYPHS.canceled size={14} />
                </Tooltip>
            );
        default: {
            if (row.kind === "group-row" && row.swatch !== undefined && "color" in row.swatch) {
                return <GLYPHS.group size={14} fill={row.swatch.color} color={row.swatch.color} />;
            }
            const KindIcon = KIND_GLYPHS[row.kind];
            return <KindIcon size={14} />;
        }
    }
}

/**
 * The swatch a measure or run row draws: its ramp. A group row's color is its kind icon.
 * @param row - the row.
 * @returns the swatch, or null.
 */
function swatchOf(row: PaintRow): React.ReactNode {
    if (row.swatch === undefined || !("ramp" in row.swatch)) {
        return null;
    }
    return (
        <span
            className="ws-paint-swatch"
            style={{
                background:
                    row.swatch.ramp.length === 1
                        ? row.swatch.ramp[0]
                        : `linear-gradient(to right, ${row.swatch.ramp.join(", ")})`,
            }}
        />
    );
}

/** Props for PaintTree. */
interface PaintTreeProps {
    /** The rows, top first. */
    readonly rows: readonly PaintRow[];
}

/**
 * The paint tree (tier1-design.md section 2.5): every row can paint the graph and a higher row
 * wins. Selection is pinned at the top and Everything at the bottom. A row reads, left to right:
 * disclosure, kind slot, swatch, name, then its count where graphty-element publishes one, and
 * its eye. Clicking a row shows it in the inspector; Space toggles its eye. Its commands
 * (ROW_COMMANDS: Rename, Move up, Move down, Delete) open from its context menu -- right-click,
 * Shift+F10, a touch held still -- and run from their keys on the focused row. A run, measure or
 * layer row drags to another place between Selection and Everything; nothing drops inside a row.
 * @param props - Component props
 * @param props.rows - The rows
 * @returns The tree
 */
export function PaintTree({ rows }: PaintTreeProps): React.JSX.Element {
    const workspace = useWorkspace();
    const { session, store } = workspace;
    const inspected = useWorkspaceState((state) => state.inspected);
    const renamingRow = useWorkspaceState((state) => state.renamingRow);
    // The reader's own opening and closing of a group run, over the default (open when few).
    const [opened, setOpened] = useState<ReadonlyMap<string, boolean>>(new Map());

    const toItem = (row: PaintRow): TreeNodeData => {
        const eye =
            hasEye(row) && session !== null ? (
                // Pinned: the eye shows at rest on every row that has one, not only on hover, so
                // which rows can be hidden and which are hidden reads at a glance.
                <ToggleIconButton
                    key="eye"
                    data-pinned=""
                    variant="swap"
                    label={`Hide ${row.name}`}
                    checked={row.hidden}
                    icon={<GLYPHS.show size={14} />}
                    checkedIcon={<GLYPHS.hide size={14} />}
                    onChange={(hide) => {
                        void setRowHidden(session, row, hide);
                    }}
                />
            ) : null;
        return {
            id: row.id,
            name: row.name,
            // The mark is a glyph; its words go in the accessible name (tier2-design.md section 7).
            ...(row.state === "stale" ? { label: `${row.name}, out of date` } : {}),
            icon: kindSlot(row),
            dimmed: row.hidden,
            strong: row.kind === "selection-row" || row.kind === "everything-row" ? false : undefined,
            swatch: swatchOf(row),
            count: typeof row.count === "number" ? row.count.toLocaleString() : row.count,
            description: stateWords(row),
            children: row.children?.map(toItem),
            actions: eye,
            movable: isMovable(row),
        };
    };

    const expanded = rows
        .filter((row) => row.children !== undefined)
        .filter((row) => opened.get(row.id) ?? (row.children?.length ?? 0) <= OPEN_UP_TO)
        .map((row) => row.id);
    const shown = inspected?.id === undefined ? undefined : findRow(rows, inspected.id);
    const selected = shown !== undefined && isInspectedRow(shown, inspected) ? [shown.id] : [];

    const rowMenu = (node: TreeNodeData): React.ReactNode => {
        const row = findRow(rows, node.id);
        const commands = row === undefined ? [] : ROW_COMMANDS.filter((command) => command.applies(row));
        if (row === undefined || commands.length === 0) {
            return null;
        }
        return commands.map((command) => (
            <CommandMenuItem
                key={command.id}
                label={command.label}
                shortcut={command.rowKeys[0]}
                reason={command.disabled(row, rows)}
                onRun={() => {
                    void command.run(workspace, row); // NOSONAR(S3735): a deliberately unawaited promise, marked as no-floating-promises asks
                }}
            />
        ));
    };

    const onRowKeyDown = (id: string, event: React.KeyboardEvent): void => {
        const row = findRow(rows, id);
        if (row === undefined || session === null) {
            return;
        }
        if (event.key === " " && hasEye(row)) {
            event.preventDefault();
            void setRowHidden(session, row, !row.hidden);
            return;
        }
        const command = ROW_COMMANDS.find(
            (candidate) => candidate.applies(row) && candidate.rowKeys.some((key) => matchesKey(event, key)),
        );
        if (command !== undefined) {
            event.preventDefault();
            if (command.disabled(row, rows) === null) {
                void command.run(workspace, row); // NOSONAR(S3735): a deliberately unawaited promise, marked as no-floating-promises asks
            }
        }
    };

    return (
        <Tree
            label="Paint tree"
            items={rows.map(toItem)}
            multiselect={false}
            childBand={false}
            height="100%"
            selected={selected}
            onSelect={(ids) => {
                const last = ids.at(-1);
                const row = last === undefined ? undefined : findRow(rows, last);
                store.set({
                    inspected: row === undefined ? null : { kind: row.kind, id: row.id },
                });
            }}
            expanded={expanded}
            onExpandedChange={(ids) => {
                setOpened(new Map(rows.filter((r) => r.children !== undefined).map((r) => [r.id, ids.includes(r.id)])));
            }}
            canDrop={(move) => layerAbove(rows, move.id, move.parentId, move.index) !== undefined}
            onMove={(move) => {
                const row = findRow(rows, move.id);
                const before = layerAbove(rows, move.id, move.parentId, move.index);
                if (session !== null && row !== undefined && before !== undefined) {
                    void moveRow(session, store, row, before);
                }
            }}
            rowMenu={rowMenu}
            onRowKeyDown={onRowKeyDown}
            renaming={renamingRow}
            onRenamingChange={(id) => {
                // Only the reader's own layers have a name to change.
                if (id === null || findRow(rows, id)?.kind === "layer-row") {
                    store.set({ renamingRow: id });
                }
            }}
            onRename={(id, name) => {
                void session?.styles.update(id, { name }); // NOSONAR(S3735): a deliberately unawaited promise, marked as no-floating-promises asks
            }}
        />
    );
}
