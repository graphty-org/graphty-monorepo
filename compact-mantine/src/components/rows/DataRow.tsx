import { Badge, Box, UnstyledButton } from "@mantine/core";
import { useHover, useUncontrolled } from "@mantine/hooks";
import React from "react";

import { PANEL_GRID, PANEL_INK } from "../../constants/panel";
import { useNumberFormatter } from "../../i18n";
import { UiGlyph } from "../../icons";
import {
    type ActivationEvent,
    type ActivationHandlerWithMeta,
    type ChangeHandler,
    getActivationMeta,
} from "../../types/events";
import { holdsSomething, TrailingSlot } from "./TrailingSlot";

// The 8px inset VOCAB gives a list row -- section 3, "list row: 28px tall,
// padding 0 8px, radius 4px". It is the same 8 the grid spends between a pair
// of fields, so it is spelled from PANEL_GRID rather than typed as a literal.
const ROW_PADDING_X = PANEL_GRID.GUTTER;

// The 12px "body / list row text" role of VOCAB's type ramp. The compact
// font-size scale does not name it -- xs is 10, sm is 11 and md is 13 --
// because 12px is the reading size rather than a chrome size. A data row's name
// is the user's own string, so it is read rather than skimmed, and it is the one
// thing in a panel row drawn larger than the chrome around it.
const NAME_FONT_SIZE = 12;

// The line height VOCAB gives every 11px and 12px single-line label.
const LINE_HEIGHT = 1.2;

// The height of the column caption above a run of data rows. PANEL_GRID does
// not name it because RT-6 is the only row type that draws one: it is a caption
// rather than a row, and it is deliberately neither the 24px toggle pitch nor
// the 28px data pitch so a reader never mistakes it for either.
const HEADER_HEIGHT = 20;

// A rank chip's weight. Mantine's Badge is a status tag, so it draws at 700 in
// upper case with letter spacing; a rank is a number rather than a category, and
// upper-casing a caller's "top" would be a visible change to a published
// component. Everything else about the box -- 14px tall, 9px face, 4px padding,
// fully round -- is the compact theme's own Badge, which is where those numbers
// were already written.
const CHIP_FONT_WEIGHT = 500;

// The ground of a selected data row. VOCAB section 1 spells it #28364e and
// describes it as "accent at 20% over #1f2428". PANEL_INK has no entry for it
// because RT-6 is the only row type with a selected state, and Mantine's own
// light primary variable *is* the accent at a low alpha over the body -- the one
// spelling that stays correct when the scheme flips to light or the consumer
// changes the primary colour.
const SELECTED_GROUND = "var(--mantine-primary-color-light)";

/**
 * How a row reports being selected to a screen reader.
 *
 * - `"button"` marks the row `aria-current`, which is what a list with one
 *   selected item means: this row is the one on screen.
 * - `"option"` gives the row the `option` role and `aria-selected`. Use it only
 *   when the rows sit inside an element you have given `role="listbox"`, adding
 *   `aria-multiselectable` there when more than one row can be selected at once.
 */
export type DataRowRole = "button" | "option";

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
    /** Whether this row is the selected one. Draws the accent tint and reports the selection to a screen reader. */
    selected?: boolean;
    /**
     * How the row reports being selected. Defaults to `"button"`.
     *
     * Leave it alone for a list with one selected row. Set `"option"` when you
     * have wrapped a run of rows in an element with `role="listbox"`, which is
     * what lets a screen reader announce several rows as selected at once.
     */
    role?: DataRowRole;
    /**
     * The row's position in the tab order.
     *
     * A clickable row is reachable by Tab on its own. Pass `-1` on every row but
     * one when you are managing focus yourself, as a listbox does when the arrow
     * keys move between rows and Tab enters and leaves the list.
     */
    tabIndex?: number;
    /**
     * Called when the row is activated, by a click or by Enter or Space.
     *
     * Read the event for the modifier keys a selection needs: Shift to extend a
     * range, and Control or Command to add and remove one row. The second
     * argument says whether the row was activated with a pointer or from the
     * keyboard, which is worth branching on because a keyboard activation
     * carries no click count and no modifiers to extend a range with.
     *
     * Giving a row this handler makes its name and value a real button, so the
     * row is reachable by Tab and answers Enter and Space. A row without one is
     * inert text and takes no focus.
     * @example
     * ```tsx
     * <DataRow
     *     name={node.id}
     *     selected={selection.has(node.id)}
     *     onClick={(event, meta) => {
     *         if (event.shiftKey && meta.source === "pointer") {
     *             extendSelectionTo(node.id);
     *         } else if (event.metaKey || event.ctrlKey) {
     *             toggleSelection(node.id);
     *         } else {
     *             replaceSelectionWith(node.id);
     *         }
     *     }}
     * />
     * ```
     */
    onClick?: ActivationHandlerWithMeta;
    /**
     * Called when the row is double-clicked, anywhere along it.
     *
     * Open the thing the row names, or start renaming it. The browser delivers
     * two `onClick` activations before this, which is how a double click is
     * defined rather than something this component adds; `event.detail` on
     * those clicks counts them, so a consumer that must act on a single click
     * alone can wait for the count to settle.
     */
    onDoubleClick?: (event: React.MouseEvent) => void;
    /**
     * Called when a context menu is asked for on the row, anywhere along it.
     *
     * Call `preventDefault` on the event to replace the browser's own menu with
     * yours. The keyboard's context-menu key and Shift+F10 raise it as well as a
     * right click, so a menu opened from here is reachable without a pointer --
     * as long as the row can hold focus, which it can as soon as it has an
     * `onClick`, or when you give it a `tabIndex` of its own.
     */
    onContextMenu?: (event: React.MouseEvent) => void;
    /**
     * Called when the row's body takes focus.
     *
     * The element is typed as a plain `HTMLElement` because the body is a
     * `<button>` on a row that can be activated and a `<div>` on one that
     * cannot.
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
 * `Mr_Whiskers`. So the string stays, at 12px in the primary text colour, and
 * the number that describes it rides at the trailing edge in the smaller
 * secondary colour.
 *
 * The number is bare. A run of rows that all measure the same thing carries its
 * unit word once, on a `DataRowHeader` above the column, rather than repeating
 * it on every row -- "links" above the column and `4` on the rows. A rank is a
 * `RankChip` reading `#6`, not the sentence "Rank 6 of 318".
 *
 * Rows are selectable, and the handler is given the event, so the selection
 * gestures a list is expected to answer -- Shift to extend, Control or Command
 * to toggle, a right click for a menu -- are all yours to implement. Selection
 * is reported to a screen reader as well as drawn, either as `aria-current` for
 * a single selected row or, inside a listbox, as `aria-selected`.
 * @param props - Component props
 * @param props.name - The reader's own string
 * @param props.value - The trailing value, bare and in the secondary text colour
 * @param props.icon - A 16px leading icon, worth drawing only when the rows differ in type
 * @param props.selected - Whether this row is the selected one
 * @param props.role - How the row reports being selected: `"button"` for one selected row, `"option"` inside a listbox
 * @param props.tabIndex - The row's position in the tab order, for a list that manages focus itself
 * @param props.onClick - Called when the row is activated, with the event and the activation source
 * @param props.onDoubleClick - Called when the row is double-clicked, anywhere along it
 * @param props.onContextMenu - Called when a context menu is asked for on the row, by pointer or from the keyboard
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
    role = "button",
    tabIndex,
    onClick,
    onDoubleClick,
    onContextMenu,
    onFocus,
    onBlur,
    trailing,
}: DataRowProps): React.JSX.Element {
    // Hover is read with a hook: this package ships no stylesheet to put a
    // `:hover` rule in.
    const { hovered, ref } = useHover<HTMLDivElement>();

    const interactive = onClick !== undefined;
    const hasIcon = icon !== undefined && icon !== null;
    const hasValue = value !== undefined && value !== null;
    const hasTrailing = holdsSomething(trailing);

    // ARIA Authoring Practices: the default row follows the Button pattern --
    // name from content, Enter and Space activate it, and the selected row of a
    // set is marked aria-current. Given role="option" it follows the Listbox
    // pattern instead, where selection is aria-selected and the container the
    // consumer supplies owns the arrow keys. aria-selected is meaningless
    // outside a listbox, so the two states are never both written.
    const isOption = role === "option";
    const ariaSelected = isOption ? selected : undefined;
    const ariaCurrent = !isOption && selected ? true : undefined;

    /**
     * Reports an activation to the consumer, with the source stated separately.
     * @param event - The click, including the one a browser synthesises from Enter or Space
     */
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
        onClick?.(event, getActivationMeta(event));
    };

    let ground = "transparent";
    if (selected) {
        ground = SELECTED_GROUND;
    } else if (interactive && hovered) {
        ground = PANEL_INK.SURFACE;
    }

    const body = (
        <>
            {hasIcon && (
                <Box
                    component="span"
                    data-testid="data-row-icon"
                    style={{
                        flex: "0 0 auto",
                        width: PANEL_GRID.GLYPH_SLOT,
                        height: PANEL_GRID.GLYPH_SLOT,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: PANEL_INK.CHROME,
                    }}
                >
                    {icon}
                </Box>
            )}

            {/* The reader's own string. It ellipsises when the row is too
                narrow, so it carries the whole string as a title for a pointer.
                Ellipsising is a drawing rather than a truncation: the full
                string is still the element's text, so it is still the whole
                accessible name of the row. */}
            <Box
                component="span"
                data-testid="data-row-name"
                title={name}
                style={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
            >
                {name}
            </Box>

            {hasValue && (
                <Box
                    component="span"
                    data-testid="data-row-value"
                    style={{
                        flex: "0 0 auto",
                        fontSize: "var(--mantine-font-size-sm)",
                        color: PANEL_INK.CHROME,
                    }}
                >
                    {value}
                </Box>
            )}
        </>
    );

    const bodyStyle = {
        display: "flex",
        alignItems: "center",
        gap: PANEL_GRID.GUTTER,
        flex: "1 1 auto",
        minWidth: 0,
        height: "100%",
        background: "transparent",
        color: "inherit",
        font: "inherit",
        textAlign: "start",
        cursor: interactive ? "pointer" : "default",
    } as const;

    return (
        <Box
            ref={ref}
            data-testid="data-row"
            data-selected={selected ? "true" : undefined}
            // Both sit on the whole row rather than on its body, so a right
            // click or a double click lands wherever the pointer is -- including
            // the trailing slot and the padding. The keyboard's context-menu key
            // fires on whatever holds focus and bubbles to here, so a menu opened
            // from onContextMenu is reachable without a pointer on any row that
            // can take focus: an interactive one, or one given a tabIndex.
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
            style={{
                display: "flex",
                alignItems: "center",
                gap: PANEL_GRID.TRAIL_GAP,
                boxSizing: "border-box",
                width: "100%",
                height: PANEL_GRID.DATA_PITCH,
                paddingInline: ROW_PADDING_X,
                borderRadius: "var(--mantine-radius-sm)",
                background: ground,
                color: PANEL_INK.VALUE,
                fontSize: NAME_FONT_SIZE,
                lineHeight: LINE_HEIGHT,
            }}
        >
            {interactive ? (
                <UnstyledButton
                    type="button"
                    data-testid="data-row-button"
                    role={isOption ? "option" : undefined}
                    aria-current={ariaCurrent}
                    aria-selected={ariaSelected}
                    tabIndex={tabIndex}
                    onClick={handleClick}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={bodyStyle}
                >
                    {body}
                </UnstyledButton>
            ) : (
                <Box
                    data-testid="data-row-body"
                    role={isOption ? "option" : undefined}
                    aria-current={ariaCurrent}
                    aria-selected={ariaSelected}
                    tabIndex={tabIndex}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={bodyStyle}
                >
                    {body}
                </Box>
            )}

            {/* Drawn only when it holds something: a data row is a list row,
                not a field row on the 16 + 108 + 8 + 108 + 8 + 24 + 8 grid.

                The slot therefore lands at x 240 of a 280px panel rather than
                the x 248 every other row type puts it at, and that is
                deliberate: a list row carries its own 8px padding so its
                selected tint is inset from the panel edge, and the whole row --
                name, value and slot -- moves in with it. Do not "fix" the 8px
                difference; trailing-slot-grid.browser.test.tsx measures it. */}
            {hasTrailing && <TrailingSlot>{trailing}</TrailingSlot>}
        </Box>
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
 * The 20px caption above a run of data rows, optionally sortable.
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
            <Box
                component="span"
                data-testid="data-row-header-label"
                title={label}
                style={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: sorted ? PANEL_INK.VALUE : undefined,
                }}
            >
                {label}
            </Box>

            {unit !== undefined && (
                <Box
                    component="span"
                    data-testid="data-row-header-unit"
                    style={{ flex: "0 0 auto", whiteSpace: "nowrap" }}
                >
                    {unit}
                </Box>
            )}

            {sortPriority !== undefined && sorted && (
                // Redundant to a screen reader: the position of this column in a
                // multi-column sort is drawn for the eye, and every column
                // announces its own direction through aria-sort.
                <Box component="span" aria-hidden="true" style={{ flex: "0 0 auto", display: "flex" }}>
                    <RankChip>{numberFormatter.format(sortPriority)}</RankChip>
                </Box>
            )}

            {sorted && (
                <Box
                    component="span"
                    data-testid="data-row-header-sort-glyph"
                    data-direction={direction}
                    style={{
                        flex: "0 0 auto",
                        display: "flex",
                        alignItems: "center",
                        color: PANEL_INK.VALUE,
                        // The glyph register holds one chevron, and ascending is
                        // the same drawing turned over. A vertical turn means the
                        // same thing whichever way the text runs, so there is
                        // nothing here to mirror for right-to-left.
                        transform: direction === "ascending" ? "rotate(180deg)" : undefined,
                    }}
                >
                    <UiGlyph name="chevronDown" size={PANEL_GRID.CHEVRON} />
                </Box>
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
        <Box
            data-testid="data-row-header"
            role={describesSort ? "columnheader" : undefined}
            aria-sort={describesSort ? direction : undefined}
            style={{
                display: "flex",
                alignItems: "center",
                gap: PANEL_GRID.GUTTER,
                boxSizing: "border-box",
                width: "100%",
                height: HEADER_HEIGHT,
                paddingInline: ROW_PADDING_X,
                fontSize: "var(--mantine-font-size-sm)",
                lineHeight: LINE_HEIGHT,
                color: PANEL_INK.CHROME,
            }}
        >
            {sortable ? (
                <UnstyledButton
                    type="button"
                    data-testid="data-row-header-sort"
                    onClick={handleSort}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: PANEL_GRID.GUTTER,
                        flex: "1 1 auto",
                        minWidth: 0,
                        height: "100%",
                        background: "transparent",
                        color: "inherit",
                        font: "inherit",
                        textAlign: "start",
                        cursor: "pointer",
                    }}
                >
                    {caption}
                </UnstyledButton>
            ) : (
                caption
            )}
        </Box>
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
 * changes and drops the words that do not. It is Mantine's `Badge` at the size
 * this library's theme gives it: 14px tall on a 9px face, fully round, on a
 * surface one step lighter than the panel. That is small enough to read as an
 * annotation of the row rather than as a second value competing with the row's
 * own.
 * @param props - Component props
 * @param props.children - The rank, already spelled the short way
 * @returns The rank chip
 */
export function RankChip({ children }: RankChipProps): React.JSX.Element {
    // ARIA Authoring Practices: no pattern applies, and that is the point. A
    // rank chip is a short piece of text with a box drawn round it, so it needs
    // no role: it is read in its place in the row, and giving it a role or a
    // label of its own would take it out of that reading. It is drawn as a span
    // so that it is valid inside the row's own button and inside a caption.
    //
    // Mantine's Badge, so the 14px height, 9px face and 4px padding come from
    // the compact theme instead of being retyped here. What the theme does not
    // decide is overridden below: a badge is a status tag, drawn upper case at
    // 700 on the accent, and a rank is neither a status nor a shout.
    //
    // The label is the primary text colour rather than the secondary one: on
    // this raised surface the secondary colour measures 4.43:1, just under the
    // 4.5:1 WCAG AA asks of text, while the primary colour measures 7.33:1.
    return (
        <Badge
            component="span"
            data-testid="rank-chip"
            style={{
                flex: "0 0 auto",
                background: PANEL_INK.RAISED,
                color: PANEL_INK.VALUE,
                fontWeight: CHIP_FONT_WEIGHT,
                textTransform: "none",
                letterSpacing: "normal",
            }}
        >
            {children}
        </Badge>
    );
}
