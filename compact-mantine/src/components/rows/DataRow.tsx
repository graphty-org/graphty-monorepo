import { useUncontrolled } from "@mantine/hooks";
import React from "react";

import { PANEL_GRID } from "../../constants/panel";
import { useNumberFormatter } from "../../i18n";
import { UiGlyph } from "../../icons";
import { useCompactStyles } from "../../theme/useCompactStyles";
import {
    type ActivationEvent,
    type ActivationHandlerWithMeta,
    type ChangeHandler,
    getActivationMeta,
} from "../../types/events";
import { holdsSomething, TrailingSlot } from "./TrailingSlot";

/**
 * Props for the DataRow component.
 */
export interface DataRowProps {
    /** The reader's own string: an identifier, a node label, an attribute name, a filename. */
    name: string;
    /**
     * The trailing value, drawn small in the secondary text colour. Bare: the
     * repeated unit word belongs on `DataRowHeader`.
     *
     * It is drawn exactly as given. A number is not formatted for you, so pass
     * it through `useNumberFormatter().format(n)` first; handed the raw number
     * the row draws `1284` in every locale, rather than `1,284` for a reader in
     * en-US and `1.284` for one in de-DE.
     */
    value?: React.ReactNode;
    /** A 16px leading icon, worth drawing only when the rows differ in type. */
    icon?: React.ReactNode;
    /**
     * Whether this row is the current one: the item on screen, or the current
     * entry of a ranking. Draws the accent tint and reports it to a screen
     * reader as `aria-current`.
     */
    selected?: boolean;
    /**
     * Called when the row is activated, by a click or by Enter or Space.
     *
     * Open what the reading is about: the node a ranking names, the file a
     * recent-files row names. The second argument says whether the row was
     * activated with a pointer or from the keyboard.
     *
     * Giving a row this handler makes its name and value a real button, so the
     * row is reachable by Tab and answers Enter and Space. A row without one is
     * inert text and takes no focus.
     * @example
     * ```tsx
     * <DataRow
     *     name={node.id}
     *     value={formatter.format(node.degree)}
     *     selected={node.id === current}
     *     onClick={() => { setCurrent(node.id); }}
     * />
     * ```
     */
    onClick?: ActivationHandlerWithMeta;
    /**
     * Called when the row's body takes focus.
     *
     * The body takes focus only when the row has an `onClick`, which makes it a
     * `<button>`.
     */
    onFocus?: React.FocusEventHandler<HTMLElement>;
    /** Called when the row's body loses focus. */
    onBlur?: React.FocusEventHandler<HTMLElement>;
    /** The row's occasional control, in the 24px slot at its trailing edge. Drawn only when there is something to put there. */
    trailing?: React.ReactNode;
}

/**
 * A list row: one of the reader's own strings, with the number that describes
 * it at the trailing edge.
 *
 * This is the one row type in the library that keeps a text label beside its
 * value, and the reason is worth stating because every other row type exists to
 * replace that label with a glyph. An identifier, a node label, an attribute
 * name or a filename is *data*, and data cannot be drawn: there is no picture of
 * `Mr_Whiskers`. So the string stays, at 11px in the primary text colour, and
 * the number that describes it rides at the trailing edge in the smaller
 * secondary colour.
 *
 * The number is bare. A run of rows that all measure the same thing carries its
 * unit word once, on a `DataRowHeader` above the column, rather than repeating
 * it on every row -- "links" above the column and `4` on the rows. A rank is a
 * `RankChip` reading `#6`, not the sentence "Rank 6 of 318".
 *
 * A row is a reading, not an object in a list. Give it `onClick` to open what
 * the reading is about, and `selected` to mark the current row of a ranking
 * (reported as `aria-current`). A list the reader selects, renames or reorders
 * is a `Tree` (nested) or a `PageList` (flat); a find result is a `ResultRow`.
 * @param props - Component props
 * @param props.name - The reader's own string
 * @param props.value - The trailing value, bare and in the secondary text colour
 * @param props.icon - A 16px leading icon, worth drawing only when the rows differ in type
 * @param props.selected - Whether this row is the current one, reported as `aria-current`
 * @param props.onClick - Called when the row is activated, with the event and the activation source
 * @param props.onFocus - Called when the row's body takes focus
 * @param props.onBlur - Called when the row's body loses focus
 * @param props.trailing - The row's occasional control, in the 24px slot at its trailing edge
 * @returns The data row
 * @example
 * ```tsx
 * <DataRowHeader label="Most connected" unit="links" />
 * {nodes.map((node) => (
 *     <DataRow
 *         key={node.id}
 *         name={node.id}
 *         value={formatter.format(node.degree)}
 *         selected={node.id === current}
 *         onClick={() => { setCurrent(node.id); }}
 *     />
 * ))}
 * ```
 */
export function DataRow({
    name,
    value,
    icon,
    selected = false,
    onClick,
    onFocus,
    onBlur,
    trailing,
}: DataRowProps): React.JSX.Element {
    useCompactStyles();
    const interactive = onClick !== undefined;
    const hasIcon = icon !== undefined && icon !== null;
    const hasValue = value !== undefined && value !== null;
    const hasTrailing = holdsSomething(trailing);
    // ARIA Authoring Practices, Button pattern: name from content, Enter and
    // Space activate it, and the current row of a set is marked aria-current.
    const ariaCurrent = selected ? true : undefined;


    /**
     * Reports an activation to the consumer, with the source stated separately.
     * @param event - The click, including the one a browser synthesises from Enter or Space
     */
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
        onClick?.(event, getActivationMeta(event));
    };

    const body = (
        <>
            {hasIcon && (
                <span className="cm-data-row-icon" data-testid="data-row-icon">
                    {icon}
                </span>
            )}

            {/* The reader's own string. It ellipsises when the row is too
                narrow, so it carries the whole string as a title for a pointer.
                Ellipsising is a drawing rather than a truncation: the full
                string is still the element's text, so it is still the whole
                accessible name of the row. */}
            <span className="cm-data-row-name" data-testid="data-row-name" title={name}>
                {name}
            </span>

            {hasValue && (
                <span className="cm-data-row-value" data-testid="data-row-value">
                    {value}
                </span>
            )}
        </>
    );

    // The fills (hover, selected) and the focus ring are the row's pseudo elements, a 24px pill
    // inset 4 8 4 12 in the 32px row (design/figma-spec.md 10.5), drawn by tree.css.ts.
    return (
        <div
            data-testid="data-row"
            className="cm-data-row"
            data-selected={selected ? "true" : undefined}
            data-interactive={interactive ? "" : undefined}
            data-trailing={hasTrailing ? "" : undefined}
        >
            {interactive ? (
                <button
                    type="button"
                    className="cm-data-row-body"
                    data-testid="data-row-button"
                    aria-current={ariaCurrent}
                    onClick={handleClick}
                    onFocus={onFocus}
                    onBlur={onBlur}
                >
                    {body}
                </button>
            ) : (
                <div
                    className="cm-data-row-body"
                    data-testid="data-row-body"
                    aria-current={ariaCurrent}
                    onFocus={onFocus}
                    onBlur={onBlur}
                >
                    {body}
                </div>
            )}

            {/* Drawn only when it holds something. The slot ends at x 232, the
                end of the row's pill and the grid's trailing column. */}
            {hasTrailing && <TrailingSlot>{trailing}</TrailingSlot>}
        </div>
    );
}

/**
 * Which way a sorted column is ordered, in the spelling ARIA uses.
 *
 * `"none"` means the list is not sorted by this column -- either nothing is
 * sorted, or another column is.
 */
export type DataRowSortDirection = "ascending" | "descending" | "none";

/**
 * Props for the DataRowHeader component.
 */
export interface DataRowHeaderProps {
    /** What the column is: "Most connected", "Highest betweenness", "Attributes". */
    label: string;
    /** The unit word the rows below would otherwise repeat: "links", "hops", "%". */
    unit?: string;
    /**
     * Which way the column is sorted. Pass this to drive the caption from your
     * own state; it is the value a screen reader is given as `aria-sort`.
     */
    sortDirection?: DataRowSortDirection;
    /** Which way the column is sorted before anyone has changed it, when the caption keeps its own state. */
    defaultSortDirection?: DataRowSortDirection;
    /**
     * Called with the direction the column should be sorted in next, and the
     * event that asked for it.
     *
     * Passing this makes the caption a button: clicking it, or pressing Enter or
     * Space on it, cycles the direction. Read the event's `shiftKey` to sort by
     * several columns at once -- the usual reading is that Shift adds this
     * column to the existing sort while a plain activation replaces it.
     *
     * The caption offers ascending and descending. Unsorted is a state you set
     * yourself, because a list in a panel is always in some order and a click
     * that scrambles it is a surprise.
     * @example
     * ```tsx
     * const [sort, setSort] = useState<DataRowSortDirection>("descending");
     * const collator = useCollator({numeric: true});
     * const rows = useMemo(
     *     () => [...nodes].sort((a, b) =>
     *         sort === "descending"
     *             ? collator.compare(b.id, a.id)
     *             : collator.compare(a.id, b.id)),
     *     [nodes, sort, collator],
     * );
     *
     * <DataRowHeader
     *     label="Most connected"
     *     unit="links"
     *     sortDirection={sort}
     *     onSortChange={(direction, event) => {
     *         setSort(direction);
     *         if (event?.shiftKey === true) { keepPreviousSortAsWell(); }
     *     }}
     * />
     * ```
     */
    onSortChange?: ChangeHandler<DataRowSortDirection>;
    /**
     * Where this column comes in a sort by several columns, counting from one.
     *
     * Drawn as a small chip beside the direction arrow, so a reader can see that
     * the list is ordered by this column second. Leave it out when only one
     * column is sorted. The number is formatted for the active locale.
     */
    sortPriority?: number;
}

/**
 * The 32px caption above a run of data rows (11/16 at 550), optionally sortable.
 *
 * It exists to carry the one word the rows below must not repeat. Three or more
 * rows measuring the same thing put their unit here once -- "links" above the
 * column -- so each row prints a bare `4` instead of `4 links`, and the column's
 * trailing edge becomes a number a reader can compare down rather than a ragged
 * phrase they have to re-read.
 *
 * Both halves are drawn small in the secondary text colour, because a caption is
 * chrome rather than content. The name of the sorted column is drawn in the
 * primary colour instead, which is how a reader sees at a glance which column
 * the list is in the order of.
 *
 * Give it `onSortChange` and the caption becomes a button that cycles between
 * ascending and descending, drawing the direction as an arrow and reporting it
 * as `aria-sort`.
 *
 * `aria-sort` is defined only on a column header inside a table or a grid, so
 * that is the one place a screen reader reads it out: wrap the caption and the
 * rows it heads in an element with `role="table"`, each row in a `role="row"`
 * of its own. Above a plain list the arrow stays a drawing, and a reader who
 * cannot see it learns the order changed only if you say so yourself -- with a
 * live region, or by moving focus to the reordered list.
 * @param props - Component props
 * @param props.label - What the column is
 * @param props.unit - The unit word the rows below would otherwise repeat
 * @param props.sortDirection - Which way the column is sorted, when you drive the caption from your own state
 * @param props.defaultSortDirection - Which way the column is sorted before anyone has changed it
 * @param props.onSortChange - Called with the direction to sort in next and the event that asked for it, which also makes the caption a button
 * @param props.sortPriority - Where this column comes in a sort by several columns, counting from one
 * @returns The column caption
 */
export function DataRowHeader({
    label,
    unit,
    sortDirection,
    defaultSortDirection,
    onSortChange,
    sortPriority,
}: DataRowHeaderProps): React.JSX.Element {
    useCompactStyles();
    // Controlled and uncontrolled, the way every value-holding component in this
    // package works. The payload passed to the setter reaches onSortChange as
    // its second argument in both modes.
    const [direction, setDirection] = useUncontrolled<DataRowSortDirection>({
        value: sortDirection,
        defaultValue: defaultSortDirection,
        finalValue: "none",
        onChange: onSortChange,
    });
    const numberFormatter = useNumberFormatter();

    const sortable = onSortChange !== undefined;
    const sorted = direction !== "none";

    /**
     * Cycles the sort direction and reports it, with the event that asked.
     * @param event - The click, including the one a browser synthesises from Enter or Space
     */
    const handleSort = (event: ActivationEvent): void => {
        // Ascending and descending only. A third state that returns the list to
        // no order at all is the consumer's to set, because a panel's list is
        // always in some order.
        setDirection(direction === "ascending" ? "descending" : "ascending", event);
    };

    const caption = (
        <>
            {/* The caption ellipsises when the column name is long, so it
                carries the whole name as a title for a pointer. */}
            <span className="cm-data-row-header-label" data-testid="data-row-header-label" title={label}>
                {label}
            </span>

            {unit !== undefined && (
                <span data-testid="data-row-header-unit" style={{ flex: "0 0 auto", whiteSpace: "nowrap" }}>
                    {unit}
                </span>
            )}

            {sortPriority !== undefined && sorted && (
                // Redundant to a screen reader: the position of this column in a
                // multi-column sort is drawn for the eye, and every column
                // announces its own direction through aria-sort.
                <span aria-hidden="true" style={{ flex: "0 0 auto", display: "flex" }}>
                    <RankChip>{numberFormatter.format(sortPriority)}</RankChip>
                </span>
            )}

            {sorted && (
                // The 5 x 3 caret; ascending is the same drawing turned over, which
                // means the same thing whichever way the text runs.
                <span className="cm-sort-caret" data-testid="data-row-header-sort-glyph" data-direction={direction}>
                    <UiGlyph name="caretDown" size={PANEL_GRID.CHEVRON} />
                </span>
            )}
        </>
    );

    // ARIA Authoring Practices, Table pattern (sortable column headers): the
    // sort state rides on the columnheader as aria-sort while the activation
    // lives in a button inside it, so the caption keeps a name taken from its own
    // content. A caption that neither sorts nor is sorted stays a plain
    // <div> -- an orphan columnheader with aria-sort="none" tells a reader
    // nothing and adds a row of table furniture to a list that has none.
    //
    // The caption cannot supply the table itself: it heads rows it does not
    // render, and a table with a header row and no data rows would announce a
    // structure that is not there. So aria-sort is written here and the JSDoc
    // says plainly that it is read only once the consumer wraps the run.
    const describesSort = sortable || sorted;

    return (
        <div
            data-testid="data-row-header"
            className="cm-data-row-header"
            data-sorted={sorted ? "" : undefined}
            role={describesSort ? "columnheader" : undefined}
            aria-sort={describesSort ? direction : undefined}
        >
            {sortable ? (
                <button
                    type="button"
                    className="cm-data-row-header-sort"
                    data-testid="data-row-header-sort"
                    onClick={handleSort}
                >
                    {caption}
                </button>
            ) : (
                caption
            )}
        </div>
    );
}

/**
 * Props for the RankChip component.
 */
export interface RankChipProps {
    /** The rank, already spelled the short way: `#6`, not `Rank 6 of 318`. */
    children: React.ReactNode;
}

/**
 * A small chip for a rank: `#6`, where a sentence used to say `Rank 6 of 318`.
 *
 * The denominator is not information the reader is missing -- the panel above it
 * already says how many nodes there are -- so the chip keeps the number that
 * changes and drops the words that do not. It draws Figma's "Beta" badge look
 * (design/figma-spec.md 9.8): 16 tall, radius 5, a 1px border-colour outline drawn
 * inside, transparent, 11/16 in the primary text colour (bottom-toolbar/mode-metronome-full #296).
 * @param props - Component props
 * @param props.children - The rank, already spelled the short way
 * @returns The rank chip
 */
export function RankChip({ children }: RankChipProps): React.JSX.Element {
    useCompactStyles();
    // ARIA Authoring Practices: no pattern applies, and that is the point. A
    // rank chip is a short piece of text with a box drawn round it, so it needs
    // no role: it is read in its place in the row, and giving it a role or a
    // label of its own would take it out of that reading. It is drawn as a span
    // so that it is valid inside the row's own button and inside a caption.
    return (
        <span className="cm-rank-chip" data-testid="rank-chip">
            {children}
        </span>
    );
}
