import { ToggleIconButton, Tree, type TreeNodeData } from "@graphty/compact-mantine";
import { Loader, Tooltip } from "@mantine/core";
import {
    ChartColumn,
    Circle,
    CircleAlert,
    CircleSlash,
    Eye,
    EyeOff,
    Layers,
    Paintbrush,
    SquareDashed,
    SquareStack,
    TriangleAlert,
} from "lucide-react";
import React, { useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { deleteRow, setRowHidden } from "./actions";
import { findRow, type PaintRow, type RowKind } from "./rows";

/** A group run with more groups than this opens collapsed (tier1-design.md section 2.5). */
const OPEN_UP_TO = 12;

/** The kind slot's icon for each row kind. */
const KIND_ICONS: Record<RowKind, React.ReactNode> = {
    selection: <SquareDashed size={14} />,
    "measure-row": <ChartColumn size={14} />,
    "run-row": <Layers size={14} />,
    "group-row": <Circle size={14} />,
    "layer-row": <Paintbrush size={14} />,
    everything: <SquareStack size={14} />,
};

/**
 * The kind slot: the kind's icon, or the run's state with its sentence in a tooltip.
 * @param row - the row.
 * @returns the icon.
 */
function kindSlot(row: PaintRow): React.ReactNode {
    switch (row.state) {
        case "running":
            return (
                <Tooltip label="Running">
                    <Loader size={12} />
                </Tooltip>
            );
        case "partial":
            return (
                <Tooltip label="Stopped early: the values are partial">
                    <TriangleAlert size={14} />
                </Tooltip>
            );
        case "failed":
            return (
                <Tooltip label={row.problem ?? "Failed"}>
                    <CircleAlert size={14} color="var(--cm-text-danger)" />
                </Tooltip>
            );
        case "canceled":
            return (
                <Tooltip label="Canceled">
                    <CircleSlash size={14} />
                </Tooltip>
            );
        default:
            if (row.kind === "group-row" && row.swatch !== undefined && "color" in row.swatch) {
                return <Circle size={14} fill={row.swatch.color} color={row.swatch.color} />;
            }
            return KIND_ICONS[row.kind];
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
            data-pinned=""
            aria-hidden="true"
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
 * disclosure, kind slot, name, then its swatch, its count where graphty-element publishes one,
 * and its eye. Clicking a row shows it in the inspector; Space toggles its eye; Delete deletes it
 * with an Undo notice.
 * @param props - Component props
 * @param props.rows - The rows
 * @returns The tree
 */
export function PaintTree({ rows }: PaintTreeProps): React.JSX.Element {
    const { session, store } = useWorkspace();
    const inspected = useWorkspaceState((state) => state.inspected);
    // The reader's own opening and closing of a group run, over the default (open when few).
    const [opened, setOpened] = useState<ReadonlyMap<string, boolean>>(new Map());

    const toItem = (row: PaintRow): TreeNodeData => {
        const eye =
            row.layerIds.length > 0 && session !== null ? (
                <ToggleIconButton
                    key="eye"
                    variant="swap"
                    label={`Hide ${row.name}`}
                    checked={row.hidden}
                    icon={<Eye size={14} />}
                    checkedIcon={<EyeOff size={14} />}
                    onChange={(hide) => {
                        void setRowHidden(session, row, hide);
                    }}
                />
            ) : null;
        const count =
            row.count === undefined ? null : (
                <span key="count" className="ws-paint-count" data-pinned="">
                    {row.count.toLocaleString()}
                </span>
            );
        return {
            id: row.id,
            name: row.name,
            icon: kindSlot(row),
            dimmed: row.hidden,
            strong: row.kind === "selection" || row.kind === "everything" ? false : undefined,
            children: row.children?.map(toItem),
            actions: (
                <>
                    {swatchOf(row)}
                    {count}
                    {eye}
                </>
            ),
        };
    };

    const expanded = rows
        .filter((row) => row.children !== undefined)
        .filter((row) => opened.get(row.id) ?? (row.children?.length ?? 0) <= OPEN_UP_TO)
        .map((row) => row.id);
    const selected =
        inspected !== null && findRow(rows, inspected.id ?? inspected.kind) !== undefined
            ? [inspected.id ?? inspected.kind]
            : [];

    const onKeyDownCapture = (event: React.KeyboardEvent): void => {
        // Only on a focused row: Space on the eye inside it presses the eye itself. Caught here
        // because Tree has no per-row key hook and reads Space as select (#908).
        const item = event.target as HTMLElement;
        const id = item.getAttribute("role") === "treeitem" ? item.dataset.id : undefined;
        const row = id === undefined ? undefined : findRow(rows, id);
        if (row === undefined || session === null) {
            return;
        }
        if (event.key === " " && row.layerIds.length > 0) {
            event.preventDefault();
            event.stopPropagation();
            void setRowHidden(session, row, !row.hidden);
        } else if (event.key === "Delete") {
            event.preventDefault();
            void deleteRow(session, store, row);
        }
    };

    return (
        // Space and Delete act on the focused row before the tree reads Space as select.
        <div className="ws-paint-tree" onKeyDownCapture={onKeyDownCapture}>
            <Tree
                label="Paint tree"
                items={rows.map(toItem)}
                multiselect={false}
                height="100%"
                selected={selected}
                onSelect={(ids) => {
                    const row = ids.length === 0 ? undefined : findRow(rows, ids[ids.length - 1]);
                    store.set({
                        inspected: row === undefined ? null : { kind: row.kind, id: row.id },
                    });
                }}
                expanded={expanded}
                onExpandedChange={(ids) => {
                    setOpened(
                        new Map(rows.filter((r) => r.children !== undefined).map((r) => [r.id, ids.includes(r.id)])),
                    );
                }}
            />
        </div>
    );
}
