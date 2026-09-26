import { useUncontrolled } from "@mantine/hooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { forwardRef, useLayoutEffect, useMemo, useRef, useState } from "react";

import { PANEL_GRID } from "../../constants/panel";
import { UiGlyph } from "../../icons";
import { useCompactStyles } from "../../theme/useCompactStyles";
import { InlineRename } from "./InlineRename";
import {
    computeDrop,
    flattenTree,
    type FlatTreeRow,
    iconOffset,
    rowTints,
    type TreeDrop,
    type TreeMove,
    type TreeNodeData,
    type TreeRowTint,
} from "./treeModel";

/** Above this many visible rows the tree draws only the rows on screen. */
const VIRTUALIZE_AT = 200;
/** How long a type-ahead run lasts between keys. */
const TYPEAHEAD_MS = 500;
/** How many rows to draw beyond the visible ones when virtualized. */
const OVERSCAN = 10;

/**
 * Props for the TreeItem component: one row of a layer tree.
 */
export interface TreeItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
    /** The visible name. */
    name: string;
    /** The 16 x 16 type glyph. */
    icon?: React.ReactNode;
    /** Depth, 1 for a top-level row. Each level indents 24px. */
    level?: number;
    /** Whether the row has children (draws the caret). */
    hasChildren?: boolean;
    /** Whether its children are shown. */
    expanded?: boolean;
    /** Whether the row is selected. */
    selected?: boolean;
    /** The fill it draws; see Tree. Defaults to `selected` or `none`. */
    tint?: TreeRowTint;
    /** `"component"`: purple name and glyph. */
    tone?: "default" | "component";
    /** A hidden layer: tertiary name and glyph. */
    dimmed?: boolean;
    /** Weight 600 and a primary glyph. Defaults to true for a top-level row with children. */
    strong?: boolean;
    /** The trailing toggles, revealed on hover or focus. */
    actions?: React.ReactNode;
    /** 1-based position among its siblings, for assistive technology. */
    posInSet?: number;
    /** How many siblings it has, for assistive technology. */
    setSize?: number;
    /** Drawn in place of the name, e.g. an InlineRename. */
    nameSlot?: React.ReactNode;
    /** Called when the caret is clicked. */
    onExpandToggle?: (event: React.MouseEvent) => void;
}

/**
 * One row of a layer tree, as Figma draws it (design/figma-spec.md 10.1): 32 tall, a 16px caret
 * slot and a 16px type glyph indented 24px per level, the name at 11/32, and the trailing
 * toggles. Hover, selection and the selected-parent band are pseudo-element fills behind the
 * content. It is a `treeitem`; `Tree` renders it with the keyboard model, but it can be drawn on
 * its own (a static preview, a story).
 * @param props - Component props
 * @returns The row
 */
export const TreeItem = forwardRef<HTMLDivElement, TreeItemProps>(function TreeItem(
    {
        name,
        icon,
        level = 1,
        hasChildren = false,
        expanded = false,
        selected = false,
        tint,
        tone = "default",
        dimmed = false,
        strong,
        actions,
        posInSet,
        setSize,
        nameSlot,
        onExpandToggle,
        className,
        onClick,
        onDoubleClick,
        onKeyDown,
        tabIndex = -1,
        ...rest
    },
    ref,
) {
    useCompactStyles();
    const isStrong = strong ?? (level === 1 && hasChildren);
    const hasActions = actions !== undefined && actions !== null && actions !== false;
    // The caret and the toggles are parts of the row, not rows of their own: a click on the caret
    // opens or closes the row, and nothing that lands on the toggles selects or renames it.
    const partOf = (event: React.SyntheticEvent): "caret" | "actions" | "row" => {
        const target = event.target as Element;
        if (target.closest(".cm-tree-actions")) {
            return "actions";
        }
        return target.closest(".cm-tree-caret") ? "caret" : "row";
    };
    return (
        <div
            ref={ref}
            role="treeitem"
            // Named by the layer name alone, not by the toggles inside the row.
            aria-label={name}
            aria-level={level}
            aria-posinset={posInSet}
            aria-setsize={setSize}
            aria-expanded={hasChildren ? expanded : undefined}
            aria-selected={selected}
            data-tint={tint ?? (selected ? "selected" : "none")}
            data-tone={tone === "component" ? "component" : undefined}
            data-dimmed={dimmed ? "" : undefined}
            data-strong={isStrong ? "" : undefined}
            className={className ? `cm-tree-row ${className}` : "cm-tree-row"}
            tabIndex={tabIndex}
            onKeyDown={onKeyDown}
            onClick={(event) => {
                const part = partOf(event);
                if (part === "caret" && hasChildren) {
                    onExpandToggle?.(event);
                } else if (part === "row") {
                    onClick?.(event);
                }
            }}
            onDoubleClick={(event) => {
                if (partOf(event) === "row") {
                    onDoubleClick?.(event);
                }
            }}
            {...rest}
        >
            <span className="cm-tree-indent" style={{ width: iconOffset(level) - 16 }} />
            <span className="cm-tree-caret" aria-hidden="true" data-testid="tree-caret">
                {hasChildren && <UiGlyph name={expanded ? "caretDown" : "caretRight"} size={PANEL_GRID.CHEVRON} />}
            </span>
            <span className="cm-tree-icon" aria-hidden="true">
                {icon}
            </span>
            {nameSlot ?? (
                <span className="cm-tree-name" title={name}>
                    {name}
                </span>
            )}
            {hasActions && <span className="cm-tree-actions">{actions}</span>}
            <span className="cm-tree-ring" aria-hidden="true" />
        </div>
    );
});

/**
 * Props for the Tree component.
 */
export interface TreeProps {
    /** The items, nested through `children`. */
    items: readonly TreeNodeData[];
    /** The tree's accessible name. Defaults to "Layers". */
    label?: string;
    /** Selected ids (controlled). */
    selected?: readonly string[];
    /** Selected ids to start with (uncontrolled). */
    defaultSelected?: readonly string[];
    /** Called with the new selection. */
    onSelect?: (ids: string[], event?: React.SyntheticEvent) => void;
    /** Expanded ids (controlled). */
    expanded?: readonly string[];
    /** Expanded ids to start with (uncontrolled). */
    defaultExpanded?: readonly string[];
    /** Called with the new set of expanded ids. */
    onExpandedChange?: (ids: string[]) => void;
    /** Allow several selected rows (Shift and Control/Command). Default true. */
    multiselect?: boolean;
    /**
     * Called with a new name. Giving it turns on renaming: F2 or a double-click opens an
     * InlineRename in place of the name.
     */
    onRename?: (id: string, name: string) => void;
    /**
     * Called when a row is dropped somewhere new. `index` counts the new parent's children with
     * the moved item already removed. Giving it makes rows draggable; the tree never moves data
     * itself.
     */
    onMove?: (move: TreeMove) => void;
    /** Keep an expanded top-level row pinned while its children scroll (not while virtualized). */
    stickyRoots?: boolean;
    /** The scrolling height. Needed for virtualization (over 200 visible rows); default 480. */
    height?: number | string;
    /** The accessible name of the rename field. Defaults to "Layer name". */
    renameLabel?: string;
}

/**
 * A layer tree with Figma's rows and the WAI-ARIA tree-view keyboard model
 * (design/figma-spec.md 10.1).
 *
 * The tree renders; the caller owns the data. Selection and expansion are controlled or
 * uncontrolled; renaming and moving are reported through `onRename` and `onMove`.
 *
 * Keyboard (one Tab stop, roving focus): ArrowUp / ArrowDown move; ArrowRight opens a closed
 * parent or moves to its first child; ArrowLeft closes an open parent or moves to the parent;
 * Home / End; type-ahead; Enter or Space selects (Shift extends, Control / Command toggles); `*`
 * opens every sibling; F2 renames; Alt+L closes everything.
 * Pointer: click selects (Shift range, Control / Command toggle); the caret opens one row;
 * double-click renames; drag a row to move it.
 * @param props - Component props
 * @param props.items - The items or pages
 * @param props.label - The accessible name
 * @param props.selected - Selected ids (controlled)
 * @param props.defaultSelected - Selected ids to start with
 * @param props.onSelect - Called with the new selection
 * @param props.expanded - Expanded ids (controlled)
 * @param props.defaultExpanded - Expanded ids to start with
 * @param props.onExpandedChange - Called with the expanded ids
 * @param props.multiselect - Allow several selected rows
 * @param props.onRename - Called with a new name; turns renaming on
 * @param props.onMove - Called when a row is dropped somewhere new
 * @param props.stickyRoots - Pin expanded top-level rows while scrolling
 * @param props.height - The scrolling height when virtualized
 * @param props.renameLabel - The rename field's accessible name
 * @returns The tree
 */
export function Tree({
    items,
    label = "Layers",
    selected,
    defaultSelected,
    onSelect,
    expanded,
    defaultExpanded,
    onExpandedChange,
    multiselect = true,
    onRename,
    onMove,
    stickyRoots = false,
    height = 480,
    renameLabel = "Layer name",
}: TreeProps): React.JSX.Element {
    useCompactStyles();
    const [selection, setSelection] = useUncontrolled<readonly string[]>({
        value: selected,
        defaultValue: defaultSelected,
        finalValue: [],
        onChange: (ids: readonly string[], event?: React.SyntheticEvent) => {
            onSelect?.([...ids], event);
        },
    });
    const [open, setOpen] = useUncontrolled<readonly string[]>({
        value: expanded,
        defaultValue: defaultExpanded,
        finalValue: [],
        onChange: (ids: readonly string[]) => {
            onExpandedChange?.([...ids]);
        },
    });
    const openSet = useMemo(() => new Set(open), [open]);
    const selectedSet = useMemo(() => new Set(selection), [selection]);
    const rows = useMemo(() => flattenTree(items, openSet), [items, openSet]);
    const tints = useMemo(() => rowTints(rows, selectedSet), [rows, selectedSet]);
    const indexOf = useMemo(() => new Map(rows.map((r, i) => [r.node.id, i])), [rows]);

    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [renaming, setRenaming] = useState<string | null>(null);
    const [drop, setDrop] = useState<TreeDrop | null>(null);
    const anchor = useRef<string | null>(null);
    const dragId = useRef<string | null>(null);
    const pendingFocus = useRef(false);
    const typeahead = useRef({ text: "", at: 0 });
    const rootRef = useRef<HTMLDivElement>(null);

    const virtual = rows.length > VIRTUALIZE_AT;
    const virtualizer = useVirtualizer({
        count: virtual ? rows.length : 0,
        getScrollElement: () => rootRef.current,
        estimateSize: () => PANEL_GRID.DATA_PITCH,
        overscan: OVERSCAN,
    });

    // The one row in the tab order: the focused row, else the first selected, else the first.
    const tabId =
        (focusedId !== null && indexOf.has(focusedId) ? focusedId : null) ??
        rows.find((r) => selectedSet.has(r.node.id))?.node.id ??
        rows[0]?.node.id ??
        null;

    useLayoutEffect(() => {
        if (!pendingFocus.current || tabId === null) {
            return;
        }
        const el = rootRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(tabId)}"]`);
        if (el) {
            pendingFocus.current = false;
            el.focus();
        } else if (virtual) {
            virtualizer.scrollToIndex(indexOf.get(tabId) ?? 0);
        }
    });

    const moveFocus = (id: string | undefined): void => {
        if (id === undefined) {
            return;
        }
        pendingFocus.current = true;
        setFocusedId(id);
        if (virtual) {
            virtualizer.scrollToIndex(indexOf.get(id) ?? 0);
        }
    };

    const setExpanded = (id: string, value: boolean): void => {
        if (openSet.has(id) === value) {
            return;
        }
        setOpen(value ? [...open, id] : open.filter((x) => x !== id));
    };

    const select = (id: string, mode: "replace" | "toggle" | "range", event: React.SyntheticEvent): void => {
        if (!multiselect || mode === "replace" || (mode === "range" && anchor.current === null)) {
            anchor.current = id;
            setSelection([id], event);
            return;
        }
        if (mode === "toggle") {
            anchor.current = id;
            setSelection(selectedSet.has(id) ? selection.filter((x) => x !== id) : [...selection, id], event);
            return;
        }
        const a = indexOf.get(anchor.current ?? id) ?? 0;
        const b = indexOf.get(id) ?? 0;
        setSelection(
            rows.slice(Math.min(a, b), Math.max(a, b) + 1).map((r) => r.node.id),
            event,
        );
    };

    const modeOf = (event: React.MouseEvent | React.KeyboardEvent): "replace" | "toggle" | "range" => {
        if (event.shiftKey) {
            return "range";
        }
        return event.metaKey || event.ctrlKey ? "toggle" : "replace";
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const target = event.target as HTMLElement;
        if (target.getAttribute("role") !== "treeitem" || tabId === null) {
            return;
        }
        const i = indexOf.get(tabId) ?? 0;
        const row = rows[i];
        let handled = true;
        switch (event.key) {
            case "ArrowDown":
                moveFocus(rows[i + 1]?.node.id);
                break;
            case "ArrowUp":
                moveFocus(rows[i - 1]?.node.id);
                break;
            case "ArrowRight":
                if (row.hasChildren && !row.expanded) {
                    setExpanded(row.node.id, true);
                } else if (row.expanded) {
                    moveFocus(rows[i + 1]?.node.id);
                }
                break;
            case "ArrowLeft":
                if (row.expanded) {
                    setExpanded(row.node.id, false);
                } else if (row.parentId !== null) {
                    moveFocus(row.parentId);
                }
                break;
            case "Home":
                moveFocus(rows[0]?.node.id);
                break;
            case "End":
                moveFocus(rows[rows.length - 1]?.node.id);
                break;
            case "Enter":
            case " ":
                select(row.node.id, modeOf(event), event);
                break;
            case "*": {
                const siblings = rows.filter((r) => r.parentId === row.parentId && r.hasChildren).map((r) => r.node.id);
                setOpen([...new Set([...open, ...siblings])]);
                break;
            }
            case "F2":
                if (onRename) {
                    setRenaming(row.node.id);
                } else {
                    handled = false;
                }
                break;
            default:
                if (event.altKey && event.code === "KeyL") {
                    setOpen([]);
                    // A collapsed tree keeps focus on the top-level row that held it.
                    let top = row;
                    while (top.parentId !== null) {
                        top = rows[indexOf.get(top.parentId) ?? 0];
                    }
                    moveFocus(top.node.id);
                } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                    const now = Date.now();
                    const t = typeahead.current;
                    t.text = now - t.at > TYPEAHEAD_MS ? event.key : t.text + event.key;
                    t.at = now;
                    const needle = t.text.toLocaleLowerCase();
                    const start = t.text.length === 1 ? i + 1 : i;
                    const ordered = [...rows.slice(start), ...rows.slice(0, start)];
                    moveFocus(ordered.find((r) => r.node.name.toLocaleLowerCase().startsWith(needle))?.node.id);
                } else {
                    handled = false;
                }
        }
        if (handled) {
            event.preventDefault();
        }
    };

    const endDrag = (): void => {
        dragId.current = null;
        setDrop(null);
    };

    const renderRow = (row: FlatTreeRow, i: number, style?: React.CSSProperties): React.JSX.Element => {
        const {id} = row.node;
        const isRenaming = renaming === id;
        return (
            <TreeItem
                key={id}
                data-id={id}
                data-index={i}
                name={row.node.name}
                icon={row.node.icon}
                level={row.level}
                hasChildren={row.hasChildren}
                expanded={row.expanded}
                selected={selectedSet.has(id)}
                tint={tints[i]}
                tone={row.node.tone}
                dimmed={row.node.dimmed}
                // A container is any node with a `children` array, empty or not; Figma bolds every
                // top-level container and leaves top-level leaves at 400.
                strong={row.node.strong ?? (row.level === 1 && row.node.children !== undefined)}
                actions={row.node.actions}
                posInSet={row.posInSet}
                setSize={row.setSize}
                tabIndex={id === tabId ? 0 : -1}
                style={style}
                draggable={onMove !== undefined && !isRenaming}
                nameSlot={
                    isRenaming ? (
                        <InlineRename
                            value={row.node.name}
                            label={renameLabel}
                            onCommit={(name) => {
                                setRenaming(null);
                                if (name !== "" && name !== row.node.name) {
                                    onRename?.(id, name);
                                }
                            }}
                            onCancel={() => {
                                setRenaming(null);
                            }}
                        />
                    ) : undefined
                }
                onFocus={(event) => {
                    if (event.target === event.currentTarget && focusedId !== id) {
                        setFocusedId(id);
                    }
                }}
                onExpandToggle={() => {
                    setExpanded(id, !row.expanded);
                }}
                onClick={(event) => {
                    setFocusedId(id);
                    select(id, modeOf(event), event);
                }}
                onDoubleClick={() => {
                    if (onRename) {
                        setRenaming(id);
                    }
                }}
                onDragStart={(event) => {
                    dragId.current = id;
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", row.node.name);
                }}
                onDragOver={(event) => {
                    if (dragId.current === null) {
                        return;
                    }
                    const box = event.currentTarget.getBoundingClientRect();
                    const next = computeDrop(rows, dragId.current, i, (event.clientY - box.top) / box.height);
                    if (next) {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                    }
                    if (JSON.stringify(next) !== JSON.stringify(drop)) {
                        setDrop(next);
                    }
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    if (drop) {
                        onMove?.(drop.move);
                    }
                    endDrag();
                }}
                onDragEnd={endDrag}
            />
        );
    };

    let body: React.ReactNode;
    if (virtual) {
        body = virtualizer.getVirtualItems().map((item) =>
            renderRow(rows[item.index], item.index, {
                position: "absolute",
                top: 0,
                left: 0,
                transform: `translateY(${String(item.start)}px)`,
            }),
        );
    } else {
        // Each top-level row and its descendants share a block, so a sticky root stops at the end
        // of its own subtree.
        const blocks: { id: string; rows: React.JSX.Element[] }[] = [];
        rows.forEach((row, i) => {
            if (row.level === 1) {
                blocks.push({ id: row.node.id, rows: [] });
            }
            blocks[blocks.length - 1].rows.push(renderRow(row, i));
        });
        body = blocks.map((block) => (
            <div key={block.id} role="none" className="cm-tree-block">
                {block.rows}
            </div>
        ));
    }

    const pitch = PANEL_GRID.DATA_PITCH;
    return (
        <div
            ref={rootRef}
            role="tree"
            aria-label={label}
            aria-multiselectable={multiselect || undefined}
            className="cm-tree"
            data-virtual={virtual ? "" : undefined}
            data-sticky-roots={stickyRoots && !virtual ? "" : undefined}
            style={virtual ? { height } : undefined}
            // Focusable only so a click on bare tree area lands somewhere; focus is handed on to the
            // row in the tab order at once.
            tabIndex={-1}
            onFocus={(event) => {
                if (event.target === event.currentTarget && tabId !== null) {
                    moveFocus(tabId);
                }
            }}
            onKeyDown={handleKeyDown}
            onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setDrop(null);
                }
            }}
        >
            <div
                className="cm-tree-content"
                role="none"
                style={virtual ? { height: virtualizer.getTotalSize() } : undefined}
            >
                {body}
                {drop?.boxRow !== null && drop?.boxRow !== undefined && (
                    <div className="cm-tree-drop-box" data-testid="tree-drop-box" style={{ top: drop.boxRow * pitch }} />
                )}
                {drop?.line && (
                    <div
                        className="cm-tree-drop-line"
                        data-testid="tree-drop-line"
                        style={{ top: drop.line.boundary * pitch - 1, insetInlineStart: iconOffset(drop.line.level) }}
                    />
                )}
            </div>
        </div>
    );
}
