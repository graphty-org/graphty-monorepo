import { Checkbox, VisuallyHidden } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { forwardRef, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import { PANEL_GRID } from "../../constants/panel";
import { useLabels, useNumberFormatter } from "../../i18n";
import { UiGlyph } from "../../icons";
import { useCompactStyles } from "../../theme/useCompactStyles";
import { shieldDragSelection } from "../chrome/dragSelectionShield";
import { ContextMenu } from "../overlays/ContextMenu";
import { joinPress } from "../pressGesture";
import { EllipsizedName } from "../rows/EllipsizedName";
import { InlineRename } from "./InlineRename";
import {
    computeDrop,
    flattenTree,
    type FlatTreeRow,
    iconOffset,
    isValidMove,
    keyboardMove,
    locateTreeItem,
    movePlace,
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
/** The keys type-ahead takes: one letter or digit. */
const TYPEAHEAD_KEY = /^[\p{L}\p{N}]$/u;
/** How many rows to draw beyond the visible ones when virtualized. */
const OVERSCAN = 10;
/** How far a mouse or pen must move with the button down before a row lifts, in px. */
const DRAG_START_PX = 4;
/** How close to the scroller's top or bottom edge a drag scrolls it, in px. */
const AUTOSCROLL_EDGE = 24;
/** The fastest edge scroll, in px per frame. */
const AUTOSCROLL_MAX = 12;

/**
 * The element that scrolls the tree: the nearest ancestor that scrolls vertically.
 * @param from - the tree's root
 * @returns the scroller, or null when only the page scrolls
 */
function scrollerOf(from: HTMLElement): HTMLElement | null {
    for (let el: HTMLElement | null = from; el !== null; el = el.parentElement) {
        const { overflowY } = getComputedStyle(el);
        if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
            return el;
        }
    }
    return null;
}
/** The controls in a row's trailing slot that take focus. */
const ACTION_CONTROLS = ".cm-tree-actions :is(button, a[href], input, select, textarea, [tabindex]):not(:disabled)";

/**
 * Props for the TreeItem component: one row of a layer tree.
 */
export interface TreeItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
    /** The visible name. */
    name: string;
    /** The accessible name; defaults to `name`. */
    label?: string;
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
    /**
     * The trailing toggles, revealed on hover or focus. Inside a Tree they are out of the Tab
     * order and reached with ArrowRight (see Tree). A toggle marked `data-at-rest` is drawn on
     * every row at rest too (a layers panel's eye).
     */
    actions?: React.ReactNode;
    /** 1-based position among its siblings, for assistive technology. */
    posInSet?: number;
    /** How many siblings it has, for assistive technology. */
    setSize?: number;
    /** A swatch drawn between the glyph and the name. See TreeNodeData.swatch. */
    swatch?: React.ReactNode;
    /** An always-visible count before the toggles. See TreeNodeData.count. */
    count?: React.ReactNode;
    /** A progress line along the bottom of the row. See TreeNodeData.progress. */
    progress?: number | "indeterminate";
    /** The row's state in words, read after its name. See TreeNodeData.description. */
    description?: string;
    /** Draw the description as a second line. See TreeNodeData.descriptionVisible. */
    descriptionVisible?: boolean;
    /** Drawn in place of the name, e.g. an InlineRename. */
    nameSlot?: React.ReactNode;
    /** Draw a checkbox that shows `selected`, before the glyph (the Tree's `checkboxes` mode). */
    checkbox?: boolean;
    /** The checkbox reads "some": a row inside this one is selected while this one is not. */
    partlySelected?: boolean;
    /** Called when the caret is clicked. */
    onExpandToggle?: (event: React.MouseEvent) => void;
}

/**
 * Whether a slot's node draws anything: not undefined, null or false.
 * @param node - the node
 * @returns whether it draws
 */
function isDrawn(node: React.ReactNode): boolean {
    return node !== undefined && node !== null && node !== false;
}

/**
 * Join the ids a row is described by.
 * @param ids - the ids, null where there is none
 * @returns the ids space-separated, or undefined when there are none
 */
function joinIds(ids: readonly (string | null)[]): string | undefined {
    const joined = ids.filter((x) => x !== null).join(" ");
    return joined === "" ? undefined : joined;
}

/**
 * A row's data attributes, which the theme draws its states from.
 * @param states - the row's states
 * @param states.tint - the row's fill, if set
 * @param states.selected - whether the row is selected
 * @param states.tone - the row's tone
 * @param states.dimmed - whether the row is dimmed
 * @param states.isStrong - whether the name is drawn strong
 * @param states.twoLine - whether the description is drawn as a second line
 * @returns the attributes
 */
function rowDataAttributes(states: {
    tint: TreeRowTint | undefined;
    selected: boolean;
    tone: "default" | "component";
    dimmed: boolean;
    isStrong: boolean;
    twoLine: boolean;
}): Record<string, string | undefined> {
    return {
        "data-tint": states.tint ?? (states.selected ? "selected" : "none"),
        "data-tone": states.tone === "component" ? "component" : undefined,
        "data-dimmed": states.dimmed ? "" : undefined,
        "data-strong": states.isStrong ? "" : undefined,
        "data-two-line": states.twoLine ? "" : undefined,
    };
}

/**
 * The caret's pointer target: 24 x 24 around the 16px glyph (WCAG 2.5.8). It draws nothing beyond
 * the glyph and has no tooltip, as in Figma; the row's aria-expanded says its state.
 * @param props - Component props
 * @param props.expanded - whether the row is open
 * @returns the target
 */
function CaretHit({ expanded }: Readonly<{ expanded: boolean }>): React.JSX.Element {
    return (
        <span className="cm-tree-caret-hit">
            <UiGlyph name={expanded ? "caretDown" : "caretRight"} size={PANEL_GRID.CHEVRON} />
        </span>
    );
}

/**
 * A row's name: the name (or what stands in for it), with the description as a second line
 * when it is drawn.
 * @param props - Component props
 * @param props.twoLine - whether the description is drawn as a second line
 * @param props.name - the row's name
 * @param props.nameSlot - drawn in place of the name
 * @param props.description - the row's state in words
 * @param props.descriptionId - the description's id
 * @param props.detail - the count drawn after a one-line name
 * @returns the name
 */
function RowName({
    twoLine,
    name,
    nameSlot,
    description,
    descriptionId,
    detail,
}: Readonly<{
    twoLine: boolean;
    name: string;
    nameSlot: React.ReactNode;
    description: string | undefined;
    descriptionId: string;
    detail: React.ReactNode;
}>): React.ReactNode {
    if (!twoLine) {
        return nameSlot ?? <EllipsizedName className="cm-tree-name" name={name} detail={detail} />;
    }
    return (
        <span className="cm-tree-lines">
            {nameSlot ?? <EllipsizedName className="cm-tree-name" name={name} />}
            <span className="cm-tree-description" id={descriptionId}>
                {description}
            </span>
        </span>
    );
}

/**
 * A progress line along the bottom of a row.
 * @param props - Component props
 * @param props.progress - the progress, 0 to 1, or "indeterminate"; undefined draws nothing
 * @param props.name - the row's name, which names the bar
 * @returns the bar, or null
 */
function RowProgress({
    progress,
    name,
}: Readonly<{ progress: number | "indeterminate" | undefined; name: string }>): React.JSX.Element | null {
    if (progress === undefined) {
        return null;
    }
    const fraction = typeof progress === "number" ? Math.min(1, Math.max(0, progress)) : undefined;
    return (
        <span // NOSONAR(S6819): a 2px bar inside the row, drawn the same when indeterminate
            className="cm-tree-progress"
            role="progressbar"
            aria-label={name}
            aria-valuemin={fraction === undefined ? undefined : 0}
            aria-valuemax={fraction === undefined ? undefined : 100}
            aria-valuenow={fraction === undefined ? undefined : Math.round(fraction * 100)}
            data-indeterminate={fraction === undefined ? "" : undefined}
            data-testid="tree-progress"
        >
            <span
                className="cm-tree-progress-fill"
                style={fraction === undefined ? undefined : { width: `${String(fraction * 100)}%` }}
            />
        </span>
    );
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
        label,
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
        swatch,
        count,
        progress,
        description,
        descriptionVisible = false,
        checkbox = false,
        partlySelected = false,
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
    const hasActions = isDrawn(actions);
    const hasSwatch = isDrawn(swatch);
    const hasCount = isDrawn(count) && count !== "";
    const hasDescription = description !== undefined && description !== "";
    const twoLine = hasDescription && descriptionVisible;
    const id = useId();
    const countId = `${id}-count`;
    const descriptionId = `${id}-description`;
    const describedBy = joinIds([hasCount ? countId : null, hasDescription ? descriptionId : null]);
    // The trailing toggles (eye, lock) leave the Tab order, so a tree stays one Tab stop however
    // many rows it has. A pointer still reaches them; the caller gives each a row key
    // (`onRowKeyDown`) and a row-menu item, as Figma does.
    const actionsRef = useRef<HTMLSpanElement>(null);
    useLayoutEffect(() => {
        actionsRef.current
            ?.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea, [tabindex]")
            .forEach((el) => {
                el.tabIndex = -1;
            });
    });
    // The caret and the toggles are parts of the row, not rows of their own: a click on the caret
    // opens or closes the row, and nothing that lands on a toggle selects or renames it. Passive
    // text in the trailing slot (a count) is part of the row.
    const partOf = (event: React.SyntheticEvent): "caret" | "actions" | "row" => {
        const target = event.target as Element;
        const control = target.closest("button, a, input, select, textarea, [role], [tabindex]");
        if (control !== null && control.closest(".cm-tree-actions") !== null) {
            return "actions";
        }
        return target.closest(".cm-tree-caret") ? "caret" : "row";
    };
    return (
        <div
            ref={ref}
            role="treeitem"
            // Named by the layer name alone, not by the toggles inside the row.
            aria-label={label ?? name}
            aria-level={level}
            aria-posinset={posInSet}
            aria-setsize={setSize}
            aria-expanded={hasChildren ? expanded : undefined}
            aria-selected={selected}
            aria-describedby={describedBy}
            {...rowDataAttributes({ tint, selected, tone, dimmed, isStrong, twoLine })}
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
                {hasChildren && <CaretHit expanded={expanded} />}
            </span>
            {checkbox && (
                <span className="cm-tree-check" aria-hidden="true" data-testid="tree-check">
                    <Checkbox
                        size="xs"
                        checked={selected}
                        indeterminate={!selected && partlySelected}
                        readOnly
                        tabIndex={-1}
                    />
                </span>
            )}
            <span className="cm-tree-icon" aria-hidden="true">
                {icon}
            </span>
            {hasSwatch && (
                <span className="cm-tree-swatch" aria-hidden="true" data-testid="tree-swatch">
                    {swatch}
                </span>
            )}
            <RowName
                twoLine={twoLine}
                name={name}
                nameSlot={nameSlot}
                description={description}
                descriptionId={descriptionId}
                detail={hasCount ? count : undefined}
            />
            {hasCount && (
                <span className="cm-tree-count" id={countId} data-testid="tree-count" data-row-detail="">
                    {count}
                </span>
            )}
            {hasActions && (
                <span ref={actionsRef} className="cm-tree-actions">
                    {actions}
                </span>
            )}
            {hasDescription && !descriptionVisible && (
                <span id={descriptionId} hidden>
                    {description}
                </span>
            )}
            <RowProgress progress={progress} name={name} />
            <span className="cm-tree-ring" aria-hidden="true" />
        </div>
    );
});

/**
 * What a row menu can ask the tree to do for its row (see `TreeProps.rowMenu`).
 */
export interface TreeRowActions {
    /**
     * Move the row into a folder (an item with a `children` array), or to the top level with
     * `null`, at `index` among that folder's children (default 0, the first). The tree checks the
     * move as it checks a drop (`movable`, `canDrop`, never into the row's own subtree), reports it
     * through `onMove`, opens the folder, keeps focus on the row and announces where it went.
     * Returns false, doing nothing, for a move it refuses.
     */
    moveTo: (parentId: string | null, index?: number) => boolean;
}

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
     * Draw a checkbox on every row, and let a plain click, Enter or Space add a row to the
     * selection or take it out, with no modifier key: the way to select several rows by touch.
     * Needs `multiselect`.
     */
    checkboxes?: boolean;
    /**
     * Called with a new name. Giving it turns on renaming: F2 or a double-click opens an
     * InlineRename in place of the name.
     */
    onRename?: (id: string, name: string) => void;
    /**
     * The id of the row whose name is being edited (controlled), or null. Lets a caller open the
     * rename from elsewhere -- a menu's Rename -- or refuse one for a row that cannot be renamed.
     */
    renaming?: string | null;
    /** Called when a rename opens (F2, a double-click) or closes, with the row's id or null. */
    onRenamingChange?: (id: string | null) => void;
    /**
     * Called when a row is dropped somewhere new, moved from the keyboard, or moved by a row
     * menu's `moveTo`. Alt+ArrowUp / Alt+ArrowDown move the focused item one place among its
     * siblings, or into the neighboring folder (its last child going up, its first going down);
     * Alt+ArrowLeft moves it out of its folder to just after it. `index` counts the new parent's
     * children with the moved item already removed. Giving it makes rows draggable and turns on
     * the keyboard move; the tree never moves data itself, focus stays on the moved item once
     * the caller has moved it, and a live region says where it went (`labels.treeMoved`).
     */
    onMove?: (move: TreeMove) => void;
    /** Keep an expanded top-level row pinned while its children scroll (not while virtualized). */
    stickyRoots?: boolean;
    /** The scrolling height. Needed for virtualization (over 200 visible rows); default 480. */
    height?: number | string;
    /** The accessible name of the rename field. Defaults to "Layer name". */
    renameLabel?: string;
    /**
     * Called with the row's id for every key pressed on a focused row (not on a control inside
     * it), before the tree's own keys. Call `event.preventDefault()` to claim the key: the tree
     * then does nothing with it. Use it for the row's own shortcuts -- Space to toggle the row's
     * eye, Delete to delete the row.
     */
    onRowKeyDown?: (id: string, event: React.KeyboardEvent<HTMLDivElement>) => void;
    /**
     * Where an item may land. Called with each move a drag or Alt+Arrow would report; a `false`
     * means no drop there (no drop line, no `onMove`). Pair it with `TreeNodeData.movable` for
     * items that never move at all.
     */
    canDrop?: (move: TreeMove) => boolean;
    /**
     * The row's context menu: its `Menu.Item` rows (see ContextMenu), or null for a row with
     * none. It opens on a right-click, Shift+F10 or the ContextMenu key, and a touch held still
     * for half a second, always for the row it happened on. `actions.moveTo` moves the row, so a
     * menu can offer "Move to folder".
     */
    rowMenu?: (node: TreeNodeData, actions: TreeRowActions) => React.ReactNode;
    /**
     * Draw a band behind a selected, expanded parent's children (Figma's look). Default true. Pass
     * false when selecting a parent never selects its children, so the band would read as a
     * selection: the parent then draws like any selected row and its children stay plain.
     */
    childBand?: boolean;
    /**
     * When the selection changes from outside the tree (the caller opened a row from elsewhere),
     * open the folders around each selected row and scroll the first one into view, so the row
     * shown is the row marked. A folder the reader closes afterwards stays closed. Default false.
     */
    revealSelected?: boolean;
    /**
     * The row in the Tab order while no row is focused or selected, so Tab into the tree lands
     * there. Default: the first row.
     */
    restingId?: string;
}

/**
 * A layer tree with Figma's rows and the WAI-ARIA tree-view keyboard model
 * (design/figma-spec.md 10.1).
 *
 * The tree renders; the caller owns the data. Selection and expansion are controlled or
 * uncontrolled; renaming and moving are reported through `onRename` and `onMove`.
 *
 * Keyboard (one Tab stop, roving focus; a row's own toggles are not Tab stops): ArrowUp / ArrowDown move; ArrowRight opens a closed
 * parent or moves to its first child; ArrowLeft closes an open parent or moves to the parent;
 * Home / End; type-ahead; Enter or Space selects (Shift extends, Control / Command toggles); `*`
 * opens every sibling; F2 renames; Alt+L closes everything; with `onMove`, Alt+ArrowUp /
 * Alt+ArrowDown move the focused item one place among its siblings or into the folder next to
 * it, and Alt+ArrowLeft moves it out of its folder. `onRowKeyDown` sees every key first and can
 * claim one with `preventDefault()`.
 * Row toggles (`actions`) are out of the Tab order: ArrowRight on a row without children, or
 * Alt+ArrowRight on any row, focuses the row's first toggle; there ArrowLeft / ArrowRight walk the
 * toggles, Enter / Space press one, ArrowLeft on the first or Escape returns to the row, and
 * ArrowUp / ArrowDown go to the row above or below.
 * Pointer: click selects (Shift range, Control / Command toggle); a right-click on a row that is
 * not selected selects it alone before its menu opens; the caret opens one row;
 * double-click renames; drag a row to move it (a mouse or pen after 4px of movement, a finger
 * after holding the row half a second; a quicker swipe scrolls). Escape cancels a drag, and the
 * list scrolls when a drag nears its edge.
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
 * @param props.checkboxes - A checkbox per row, and plain clicks that add or take out a row
 * @param props.onRename - Called with a new name; turns renaming on
 * @param props.renaming - The row being renamed (controlled)
 * @param props.onRenamingChange - Called when a rename opens or closes
 * @param props.onMove - Called when a row is dropped somewhere new or moved from the keyboard
 * @param props.stickyRoots - Pin expanded top-level rows while scrolling
 * @param props.revealSelected - Open the folders around a newly selected row and scroll it into view
 * @param props.restingId - The row in the Tab order while none is focused or selected
 * @param props.height - The scrolling height when virtualized
 * @param props.renameLabel - The rename field's accessible name
 * @param props.onRowKeyDown - Called first for a key pressed on a focused row; preventDefault claims it
 * @param props.canDrop - Where an item may land
 * @param props.rowMenu - The row's context menu
 * @param props.childBand - Band a selected parent's children (default true)
 * @returns The tree
 * @example
 * A row with a swatch, a count, a running line and its state in words, and a row shortcut.
 * ```tsx
 * <Tree
 *     items={[{ id: "pr", name: "PageRank", swatch: <Ramp />, count: 77, progress: 0.4, description: "Running" }]}
 *     onRowKeyDown={(id, event) => {
 *         if (event.key === "Delete") {
 *             event.preventDefault();
 *             remove(id);
 *         }
 *     }}
 * />
 * ```
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
    checkboxes = false,
    onRename,
    renaming: renamingProp,
    onRenamingChange,
    onMove,
    stickyRoots = false,
    height = 480,
    renameLabel = "Layer name",
    onRowKeyDown,
    canDrop,
    rowMenu,
    childBand = true,
    revealSelected = false,
    restingId,
}: TreeProps): React.JSX.Element {
    useCompactStyles();
    const labels = useLabels();
    const numbers = useNumberFormatter();
    const [announcement, setAnnouncement] = useState("");
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
    // The rows with a selected row somewhere inside them, expanded or not: their checkbox says so.
    const holdsSelected = useMemo(() => {
        const holders = new Set<string>();
        const walk = (node: TreeNodeData): boolean => {
            let holds = false;
            for (const child of node.children ?? []) {
                if (walk(child) || selectedSet.has(child.id)) {
                    holds = true;
                }
            }
            if (holds) {
                holders.add(node.id);
            }
            return holds;
        };
        items.forEach(walk);
        return holders;
    }, [items, selectedSet]);
    const rows = useMemo(() => flattenTree(items, openSet), [items, openSet]);
    const tints = useMemo(() => rowTints(rows, selectedSet, childBand), [rows, selectedSet, childBand]);
    const indexOf = useMemo(() => new Map(rows.map((r, i) => [r.node.id, i])), [rows]);

    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [renaming, setRenaming] = useUncontrolled<string | null>({
        value: renamingProp,
        finalValue: null,
        onChange: onRenamingChange,
    });
    const [drop, setDrop] = useState<TreeDrop | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [menuNode, setMenuNode] = useState<TreeNodeData | null>(null);
    const anchor = useRef<string | null>(null);
    // The press that may become a drag. Its listeners live on the document from pointerdown to
    // pointerup; `started` turns true once the row has lifted.
    const drag = useRef<{
        id: string;
        pointerId: number;
        row: HTMLElement;
        x: number;
        y: number;
        started: boolean;
        stop: () => void;
    } | null>(null);
    const dropRef = useRef<TreeDrop | null>(null);
    const suppressClick = useRef(false);
    // The latest rows and rules, for the document listeners a drag installs.
    // Says where a move put an item, in the live region. Read before the caller applies it.
    const announce = (move: TreeMove): void => {
        const place = movePlace(items, move);
        setAnnouncement(
            labels.treeMoved(place.name, place.parent, numbers.format(place.position), numbers.format(place.count)),
        );
    };
    const latest = useRef({ rows, canDrop, onMove, announce });
    latest.current = { rows, canDrop, onMove, announce };
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

    // The one row in the tab order: the focused row, else the first selected, else the resting
    // row, else the first.
    const tabId =
        (focusedId !== null && indexOf.has(focusedId) ? focusedId : null) ??
        rows.find((r) => selectedSet.has(r.node.id))?.node.id ??
        (restingId !== undefined && indexOf.has(restingId) ? restingId : undefined) ??
        rows[0]?.node.id ??
        null;

    // A row's toggles are reached with ArrowRight, never with Tab: keep them out of the Tab order
    // so the whole tree is one Tab stop. Runs after every render, since a caller's toggle can
    // re-render its own button.
    useLayoutEffect(() => {
        rootRef.current?.querySelectorAll<HTMLElement>(ACTION_CONTROLS).forEach((el) => {
            el.tabIndex = -1;
        });
    });

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

    // A focused row that goes away (its delete command ran) takes focus with it: focus goes to
    // the row now in its place, or to the new last row, rather than to the page (WCAG 2.4.3).
    const focusedIndex = useRef(0);
    useLayoutEffect(() => {
        if (focusedId === null) {
            return;
        }
        const at = indexOf.get(focusedId);
        if (at !== undefined) {
            focusedIndex.current = at;
            return;
        }
        const lost = document.activeElement === null || document.activeElement === document.body;
        const next = rows[Math.min(focusedIndex.current, rows.length - 1)]?.node.id;
        if (lost && next !== undefined) {
            moveFocus(next);
        } else {
            setFocusedId(null);
        }
    });

    // Reveal a selection made elsewhere once per change: open its folders, then scroll it in.
    const revealed = useRef("");
    useLayoutEffect(() => {
        const key = selection.join("\n");
        if (!revealSelected || key === revealed.current) {
            return;
        }
        revealed.current = key;
        const closed = new Set<string>();
        for (const id of selection) {
            for (
                let parent = locateTreeItem(items, id)?.parentId;
                parent;
                parent = locateTreeItem(items, parent)?.parentId
            ) {
                if (!openSet.has(parent)) {
                    closed.add(parent);
                }
            }
        }
        if (closed.size > 0) {
            setOpen([...open, ...closed]);
        }
        // After the opened folders are drawn.
        requestAnimationFrame(() => {
            const first = latest.current.rows.findIndex((row) => selection.includes(row.node.id));
            const id = latest.current.rows[first]?.node.id;
            const el = id === undefined ? null : rootRef.current?.querySelector(`[data-id="${CSS.escape(id)}"]`);
            if (el) {
                el.scrollIntoView({ block: "nearest" });
            } else if (first >= 0 && virtual) {
                virtualizer.scrollToIndex(first);
            }
        });
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

    // Report a keyboard or menu move: open the folder it goes into, keep focus on the item and
    // say where it went.
    const commitMove = (move: TreeMove): boolean => {
        if (!onMove || !isValidMove(items, move, canDrop)) {
            return false;
        }
        announce(move);
        onMove(move);
        if (move.parentId !== null) {
            setExpanded(move.parentId, true);
        }
        moveFocus(move.id);
        return true;
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
        return event.metaKey || event.ctrlKey || (checkboxes && multiselect) ? "toggle" : "replace";
    };

    const actionsOf = (rowEl: Element | null): HTMLElement[] =>
        rowEl === null ? [] : [...rowEl.querySelectorAll<HTMLElement>(ACTION_CONTROLS)];

    // Keys on a row's toggle: ArrowLeft / ArrowRight walk the toggles, ArrowLeft on the first or
    // Escape returns to the row, ArrowUp / ArrowDown go to the row above or below. Enter and
    // Space stay the toggle's own.
    const handleActionKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, rowEl: HTMLElement): void => {
        const actions = actionsOf(rowEl);
        const at = actions.indexOf(event.target as HTMLElement);
        const i = indexOf.get(rowEl.dataset.id ?? "");
        if (at === -1 || i === undefined || event.defaultPrevented || event.altKey) {
            return;
        }
        if (event.key === "ArrowRight") {
            actions[at + 1]?.focus();
        } else if ((event.key === "ArrowLeft" && at === 0) || event.key === "Escape") {
            rowEl.focus();
        } else if (event.key === "ArrowLeft") {
            actions[at - 1].focus();
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            moveFocus(rows[i + (event.key === "ArrowDown" ? 1 : -1)]?.node.id ?? rows[i].node.id);
        } else {
            return;
        }
        event.preventDefault();
    };

    // ArrowRight on a row with nothing to open, or Alt+ArrowRight on any row: into its toggles.
    const enterToggles = (
        event: React.KeyboardEvent<HTMLDivElement>,
        target: HTMLElement,
        row: FlatTreeRow,
    ): boolean => {
        const firstAction = actionsOf(target)[0] as HTMLElement | undefined;
        if (event.key === "ArrowRight" && firstAction && (event.altKey || !row.hasChildren)) {
            event.preventDefault();
            firstAction.focus();
            return true;
        }
        return false;
    };

    // Alt+ArrowUp / Alt+ArrowDown: move the focused item one place, into the folder next to it
    // when there is one; Alt+ArrowLeft: out of its folder. Reported through onMove like a drop;
    // focus stays on the item wherever the caller puts it.
    const moveWithAlt = (event: React.KeyboardEvent<HTMLDivElement>, row: FlatTreeRow): boolean => {
        const direction = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "out" } as const;
        if (!onMove || !event.altKey || !(event.key in direction)) {
            return false;
        }
        event.preventDefault();
        const move = keyboardMove(items, row.node.id, direction[event.key as keyof typeof direction], canDrop);
        if (move) {
            commitMove(move);
        }
        return true;
    };

    // ArrowDown / ArrowUp: the next or previous row; Shift extends the selection from its anchor,
    // as Shift+click does.
    const stepFocus = (event: React.KeyboardEvent<HTMLDivElement>, i: number, row: FlatTreeRow): void => {
        const next = rows[event.key === "ArrowDown" ? i + 1 : i - 1]?.node.id;
        moveFocus(next);
        if (!event.shiftKey || !multiselect || next === undefined) {
            return;
        }
        if (anchor.current === null || !selectedSet.has(anchor.current)) {
            anchor.current = row.node.id;
        }
        select(next, "range", event);
    };

    // ArrowRight opens a closed row, or goes to the first child of an open one.
    const openOrEnter = (i: number, row: FlatTreeRow): void => {
        if (row.hasChildren && !row.expanded) {
            setExpanded(row.node.id, true);
        } else if (row.expanded) {
            moveFocus(rows[i + 1]?.node.id);
        }
    };

    // ArrowLeft closes an open row, or goes to its parent.
    const closeOrLeave = (row: FlatTreeRow): void => {
        if (row.expanded) {
            setExpanded(row.node.id, false);
        } else if (row.parentId !== null) {
            moveFocus(row.parentId);
        }
    };

    // Alt+L collapses the whole tree; a collapsed tree keeps focus on the top-level row that held it.
    const collapseAll = (row: FlatTreeRow): void => {
        setOpen([]);
        let top = row;
        while (top.parentId !== null) {
            top = rows[indexOf.get(top.parentId) ?? 0];
        }
        moveFocus(top.node.id);
    };

    // Type-ahead: letters and digits only, so "/", other punctuation and Shift+letter chords stay
    // free for the page's shortcuts (type-ahead ignores case, so Shift adds nothing).
    const isTypeAhead = (event: React.KeyboardEvent<HTMLDivElement>): boolean =>
        TYPEAHEAD_KEY.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;

    const typeAhead = (event: React.KeyboardEvent<HTMLDivElement>, i: number): void => {
        const now = Date.now();
        const t = typeahead.current;
        t.text = now - t.at > TYPEAHEAD_MS ? event.key : t.text + event.key;
        t.at = now;
        const needle = t.text.toLocaleLowerCase();
        const start = t.text.length === 1 ? i + 1 : i;
        const ordered = [...rows.slice(start), ...rows.slice(0, start)];
        moveFocus(ordered.find((r) => r.node.name.toLocaleLowerCase().startsWith(needle))?.node.id);
    };

    // The keys with no case of their own: Alt+L and type-ahead.
    const answerOtherKey = (event: React.KeyboardEvent<HTMLDivElement>, i: number, row: FlatTreeRow): boolean => {
        if (event.altKey && event.code === "KeyL") {
            collapseAll(row);
            return true;
        }
        if (isTypeAhead(event)) {
            typeAhead(event, i);
            return true;
        }
        return false;
    };

    // The tree's own keys on a focused row; returns whether the key was answered.
    const answerRowKey = (event: React.KeyboardEvent<HTMLDivElement>, i: number, row: FlatTreeRow): boolean => {
        switch (event.key) {
            case "ArrowDown":
            case "ArrowUp":
                stepFocus(event, i, row);
                return true;
            case "ArrowRight":
                openOrEnter(i, row);
                return true;
            case "ArrowLeft":
                closeOrLeave(row);
                return true;
            case "Home":
                moveFocus(rows[0]?.node.id);
                return true;
            case "End":
                moveFocus(rows.at(-1)?.node.id);
                return true;
            case "Enter":
            case " ":
                select(row.node.id, modeOf(event), event);
                return true;
            case "*": {
                const siblings = rows.filter((r) => r.parentId === row.parentId && r.hasChildren).map((r) => r.node.id);
                setOpen([...new Set([...open, ...siblings])]);
                return true;
            }
            case "F2":
                if (!onRename) {
                    return false;
                }
                setRenaming(row.node.id);
                return true;
            default:
                return answerOtherKey(event, i, row);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const target = event.target as HTMLElement;
        const rowEl = target.closest<HTMLElement>("[role='treeitem']");
        if (rowEl !== null && rowEl !== target && target.closest(".cm-tree-actions") !== null) {
            handleActionKeyDown(event, rowEl);
            return;
        }
        if (target.getAttribute("role") !== "treeitem" || tabId === null) {
            return;
        }
        const i = indexOf.get(tabId) ?? 0;
        const row = rows[i];
        onRowKeyDown?.(row.node.id, event);
        if (event.defaultPrevented || enterToggles(event, target, row) || moveWithAlt(event, row)) {
            return;
        }
        if (answerRowKey(event, i, row)) {
            event.preventDefault();
        }
    };

    const showDrop = (next: TreeDrop | null): void => {
        if (JSON.stringify(next) !== JSON.stringify(dropRef.current)) {
            dropRef.current = next;
            setDrop(next);
        }
    };

    // The drop under a point: the row there, and how far down it the point is.
    const dropAt = (id: string, x: number, y: number): TreeDrop | null => {
        const el = document.elementFromPoint(x, y)?.closest<HTMLElement>(".cm-tree-row[data-index]");
        if (!el || !rootRef.current?.contains(el)) {
            return null;
        }
        const box = el.getBoundingClientRect();
        const { rows: now, canDrop: rule } = latest.current;
        return computeDrop(now, id, Number(el.dataset.index), (y - box.top) / box.height, rule);
    };

    // Stops a drag that is under way when the tree unmounts.
    useEffect(() => () => drag.current?.stop(), []);

    // A press on a movable row: it may become a drag. A mouse or pen lifts the row after
    // DRAG_START_PX of movement; a finger only once the press has been held (pressGesture), so a
    // quick swipe still scrolls.
    const startPress = (id: string, event: React.PointerEvent<HTMLDivElement>): void => {
        suppressClick.current = false;
        drag.current?.stop();
        const touch = event.pointerType === "touch";
        const row = event.currentTarget;
        const { pointerId } = event;
        let frame = 0;
        let unshield: (() => void) | undefined;
        const state = {
            id,
            pointerId,
            row,
            x: event.clientX,
            y: event.clientY,
            started: false,
            stop: (): void => {
                document.removeEventListener("pointermove", move, true);
                document.removeEventListener("pointerup", up, true);
                document.removeEventListener("pointercancel", cancel, true);
                document.removeEventListener("keydown", key, true);
                cancelAnimationFrame(frame);
                unshield?.();
                if (drag.current === state) {
                    drag.current = null;
                }
                showDrop(null);
                setDraggingId(null);
            },
        };
        // Scroll the list while a drag holds the pointer near its top or bottom edge.
        const autoScroll = (): void => {
            const root = rootRef.current;
            const scroller = root && scrollerOf(root);
            if (scroller) {
                const box = scroller.getBoundingClientRect();
                const above = box.top + AUTOSCROLL_EDGE - state.y;
                const below = state.y - (box.bottom - AUTOSCROLL_EDGE);
                const by = above > 0 ? -above : Math.max(below, 0);
                if (by !== 0) {
                    scroller.scrollTop += Math.sign(by) * Math.min(AUTOSCROLL_MAX, Math.abs(by) / 2);
                    showDrop(dropAt(id, state.x, state.y));
                }
            }
            frame = requestAnimationFrame(autoScroll);
        };
        const begin = (x: number, y: number): void => {
            state.started = true;
            unshield = shieldDragSelection();
            state.x = x;
            state.y = y;
            try {
                row.setPointerCapture(pointerId);
            } catch {
                // The pointer is already gone (a synthetic or ended press); the document listeners
                // still see every move.
            }
            setDraggingId(id);
            showDrop(dropAt(id, x, y));
            frame = requestAnimationFrame(autoScroll);
        };
        const move = (e: PointerEvent): void => {
            if (e.pointerId !== pointerId) {
                return;
            }
            if (!state.started) {
                if (!touch && Math.hypot(e.clientX - state.x, e.clientY - state.y) > DRAG_START_PX) {
                    begin(e.clientX, e.clientY);
                }
                return;
            }
            state.x = e.clientX;
            state.y = e.clientY;
            showDrop(dropAt(id, e.clientX, e.clientY));
        };
        const up = (e: PointerEvent): void => {
            if (e.pointerId !== pointerId) {
                return;
            }
            const done = state.started ? dropRef.current : null;
            // A mouse fires a click on the row after the button is released; it is the drag's.
            suppressClick.current = state.started;
            state.stop();
            if (done) {
                latest.current.announce(done.move);
                latest.current.onMove?.(done.move);
            }
        };
        const cancel = (e: PointerEvent): void => {
            if (e.pointerId === pointerId) {
                state.stop();
            }
        };
        const key = (e: KeyboardEvent): void => {
            if (e.key === "Escape" && state.started) {
                e.preventDefault();
                e.stopPropagation();
                state.stop();
            }
        };
        drag.current = state;
        document.addEventListener("pointermove", move, true);
        document.addEventListener("pointerup", up, true);
        document.addEventListener("pointercancel", cancel, true);
        document.addEventListener("keydown", key, true);
        if (touch) {
            joinPress(event.nativeEvent, {
                onLift: (e) => {
                    if (drag.current === state) {
                        begin(e.clientX, e.clientY);
                    }
                },
            });
        }
    };

    const renderRow = (row: FlatTreeRow, i: number, style?: React.CSSProperties): React.JSX.Element => {
        const { id } = row.node;
        const isRenaming = renaming === id;
        return (
            <TreeItem
                key={id}
                data-id={id}
                data-index={i}
                name={row.node.name}
                label={row.node.label}
                icon={row.node.icon}
                level={row.level}
                hasChildren={row.hasChildren}
                expanded={row.expanded}
                selected={selectedSet.has(id)}
                checkbox={checkboxes && multiselect}
                partlySelected={holdsSelected.has(id)}
                tint={tints[i]}
                tone={row.node.tone}
                dimmed={row.node.dimmed}
                // A container is any node with a `children` array, empty or not; Figma bolds every
                // top-level container and leaves top-level leaves at 400.
                strong={row.node.strong ?? (row.level === 1 && row.node.children !== undefined)}
                actions={row.node.actions}
                swatch={row.node.swatch}
                count={row.node.count}
                progress={row.node.progress}
                description={row.node.description}
                descriptionVisible={row.node.descriptionVisible}
                posInSet={row.posInSet}
                setSize={row.setSize}
                tabIndex={id === tabId ? 0 : -1}
                style={style}
                data-dragging={draggingId === id ? "" : undefined}
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
                    if (suppressClick.current) {
                        suppressClick.current = false;
                        return;
                    }
                    setFocusedId(id);
                    select(id, modeOf(event), event);
                }}
                onDoubleClick={() => {
                    if (onRename) {
                        setRenaming(id);
                    }
                }}
                onPointerDown={(event) => {
                    const onControl = (event.target as Element).closest(
                        ".cm-tree-caret, .cm-tree-actions, input, textarea",
                    );
                    if (
                        onMove !== undefined &&
                        !isRenaming &&
                        row.node.movable !== false &&
                        event.button === 0 &&
                        onControl === null
                    ) {
                        startPress(id, event);
                    }
                }}
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
    const menuFor = (target: EventTarget): TreeNodeData | undefined => {
        const id = (target as Element).closest<HTMLElement>(".cm-tree-row[data-id]")?.dataset.id;
        return id === undefined ? undefined : rows[indexOf.get(id) ?? -1]?.node;
    };
    const rowActions = (node: TreeNodeData): TreeRowActions => ({
        moveTo: (parentId, index = 0) => commitMove({ id: node.id, parentId, index }),
    });
    const hasMenu = (node: TreeNodeData | undefined): node is TreeNodeData => {
        const content = node && rowMenu?.(node, rowActions(node));
        return content !== undefined && content !== null && content !== false;
    };
    const tree = (
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
            onKeyDown={(event) => {
                if (rowMenu && ((event.shiftKey && event.key === "F10") || event.key === "ContextMenu")) {
                    const node = tabId === null ? undefined : rows[indexOf.get(tabId) ?? -1]?.node;
                    if (hasMenu(node)) {
                        setMenuNode(node);
                    } else {
                        // No commands for this row: the menu stays closed.
                        event.preventDefault();
                    }
                    return;
                }
                handleKeyDown(event);
            }}
            onContextMenu={(event) => {
                if (!rowMenu) {
                    return;
                }
                const node = menuFor(event.target);
                if (hasMenu(node)) {
                    // The menu acts on the row it opened on, so that row is the selection first
                    // (Figma); a right-click inside the selection keeps it whole.
                    if (!selectedSet.has(node.id)) {
                        setFocusedId(node.id);
                        select(node.id, "replace", event);
                    }
                    setMenuNode(node);
                } else {
                    event.preventDefault();
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
                    <div
                        className="cm-tree-drop-box"
                        data-testid="tree-drop-box"
                        style={{ top: drop.boxRow * pitch }}
                    />
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
    return (
        <>
            {rowMenu ? (
                <ContextMenu target={tree}>{menuNode ? rowMenu(menuNode, rowActions(menuNode)) : null}</ContextMenu>
            ) : (
                tree
            )}
            {onMove && (
                <VisuallyHidden role="status" aria-live="polite" data-testid="tree-status">
                    {announcement}
                </VisuallyHidden>
            )}
        </>
    );
}
