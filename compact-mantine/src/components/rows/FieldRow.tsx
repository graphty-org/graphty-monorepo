import { Box } from "@mantine/core";
import React, { forwardRef } from "react";

import { PANEL_GRID, PANEL_INK } from "../../constants/panel";
import { PanelLabelsProvider, usePanelLabels } from "../../context/PanelLabelsContext";
import { useDevWarning } from "../../utils/dev-warning";
import { PanelField, type PanelFieldProps } from "./PanelField";
import { holdsSomething, TrailingSlot } from "./TrailingSlot";

// RT-1 in VOCAB section 11. The row identity is
// 16 + 108 + 8 + 108 + 8 + 24 + 8 = 280, and every number in this file is a
// member of PANEL_GRID rather than a literal so that the identity keeps adding
// up when one of them moves.
//
// Every one of those numbers is spent along the INLINE axis, never the left or
// the right one. A flex row reverses itself under dir="rtl", so spacing written
// as marginLeft/marginRight keeps its size and loses its place: the gutter ends
// up outside the pair and the trail gap ends up between the two fields. The row
// then draws the right widths in the wrong order and the identity stops adding
// up. FieldRow.browser.test.tsx measures the result in a real layout engine in
// both directions, because a style declaration read on its own cannot tell the
// two apart.

/**
 * The most fields one row may hold.
 *
 * A row is one full-width field or two side by side. A third has nowhere to go:
 * the row's widths already spend the whole content band.
 */
const MAX_FIELDS = 2;

/**
 * The width of a field that is alone on its row with nothing in the trailing
 * slot.
 *
 * The 8px trail gap exists only to hold a field apart from a trailing control.
 * With no control to be held apart from, the field absorbs the gap --
 * `224 + 8 = 232` -- so the field plus the empty 24px slot is still the whole
 * 256px content band and the row still ends where every other row does.
 */
const SOLO_WIDTH = PANEL_GRID.BODY + PANEL_GRID.TRAIL_GAP;

/**
 * The row's children as a flat list of fields.
 *
 * `React.Children.toArray` flattens arrays but not fragments, and a conditional
 * pair is normally written as a fragment. Without this, such a row would arrive
 * as one child and be sized as a solo 232px field with two fields crammed into
 * it. One level is enough: a fragment inside a fragment inside a row is not a
 * shape a panel row has.
 * @param children - The row's children as they were given
 * @returns One entry per field
 */
function fieldsOf(children: React.ReactNode): React.ReactNode[] {
    return React.Children.toArray(children).flatMap((child) => {
        if (React.isValidElement<{ children?: React.ReactNode }>(child) && child.type === React.Fragment) {
            return React.Children.toArray(child.props.children);
        }

        return [child];
    });
}

/**
 * The React key for one field's slot.
 *
 * `React.Children.toArray` gives every element child a key of its own, derived
 * from whatever key the caller wrote. Reusing it here is what keeps a row whose
 * first field is conditional from tearing down and rebuilding the second field
 * each time the condition changes -- a rebuild that would take the surviving
 * field's focus and anything half-typed in it with it. A child that is not an
 * element carries no key and falls back to its position.
 * @param child - One child of the row
 * @param index - The child's position in the row, counting from zero
 * @returns A key that survives a sibling appearing or disappearing
 */
function slotKey(child: React.ReactNode, index: number): string {
    if (React.isValidElement<unknown>(child) && child.key !== null) {
        return child.key;
    }

    return `field-row-${String(index)}`;
}

/**
 * Read the label word off a child, for the label column.
 *
 * The word is the field's own `label` prop -- the word its glyph replaced -- so
 * a labelled row never invents a caption that the glyph-first row did not
 * already carry as its title and its accessible name.
 * @param child - One child of the row
 * @returns The child's label word, or undefined when it has none
 */
function fieldLabel(child: React.ReactNode): string | undefined {
    if (React.isValidElement<{ label?: unknown }>(child) && typeof child.props.label === "string") {
        return child.props.label;
    }

    return undefined;
}

/**
 * Stretch a `PanelField` to the width the row computed for its slot.
 *
 * The row owns the widths, not the field: 108 in a pair, 224 beside a trailing
 * control, `SOLO_WIDTH` alone, and whatever is left over when the label column
 * is shown. Only the first three are values of `PanelFieldProps["width"]`, so
 * the width is carried by the row's own sizing box and the field is simply told
 * to fill it.
 *
 * Anything that is not a `PanelField` is passed through untouched: the row sizes
 * the slot, but it does not inject props into a component it does not own.
 * @param child - One child of the row
 * @returns The child, filling its slot when it is a field
 */
function fillSlot(child: React.ReactNode): React.ReactNode {
    if (React.isValidElement<PanelFieldProps>(child) && child.type === PanelField) {
        return React.cloneElement(child, { width: "fill" });
    }

    return child;
}

/**
 * Props for the FieldRow component.
 *
 * Every standard `div` prop is accepted as well and is forwarded to the row's
 * root element, so `className`, `style`, `id`, data attributes and DOM event
 * handlers all work. The handlers are the browser's own and are given the
 * event: `onClick`, `onDoubleClick` and `onContextMenu` carry the modifier keys
 * a consumer needs for things like shift-clicking a run of rows, and `onFocus`
 * and `onBlur` are passed straight through rather than being swallowed for the
 * row's own use.
 */
export interface FieldRowProps extends Omit<React.ComponentPropsWithoutRef<"div">, "children"> {
    /** One or two `PanelField` children. More than two is a mistake and warns in development. */
    children: React.ReactNode;
    /** The 24px slot at the end of the row: an advanced settings button, a reset control, or nothing. */
    trailing?: React.ReactNode;
    /**
     * Names the row as a group of related controls, for assistive technology
     * only. It is never drawn.
     *
     * Pass it when the fields are two ends of one property -- a smallest and a
     * largest size, a first and a last frame -- so that a screen reader
     * announces the pair as one named group before reading either field. Leave
     * it out when the two values are unrelated, and the row stays a plain
     * layout container that adds nothing to the accessibility tree.
     *
     * Pass `aria-labelledby` instead when the name is already written somewhere
     * on the page, such as in the section header above the row.
     */
    groupLabel?: string;
}

/**
 * A panel row holding one or two compact fields and a fixed trailing slot.
 *
 * This is the row a dense property panel is mostly made of. Rather than
 * stacking a caption above an input, each field carries a glyph inside its own
 * box, which is what lets the row stand 32px tall instead of 37 and a panel come
 * out around half its usual height.
 *
 * The row owns the widths and the gaps; each field owns everything inside its
 * own box. Three arrangements, all of them filling the same 256px band of a
 * 280px panel:
 *
 * - two fields side by side -- `108 + 8 + 108 + 8 + 24`
 * - one field beside a trailing control -- `224 + 8 + 24`
 * - one field alone -- `232 + 24`; with no control to be held apart from, the
 *   field takes the 8px gap for itself
 *
 * The trailing slot is drawn whether or not it holds anything, because the row
 * only keeps its shape if the slot keeps its width, and so every row in a panel
 * ends at the same place. Put the row's one rare control there -- an advanced
 * settings button that opens a pop-out, or a small reset. A select's chevron is
 * not one of those: it belongs inside the field's own box.
 *
 * **Right-to-left.** All of the row's spacing is written in CSS logical
 * properties, so the row lays itself out correctly under `dir="rtl"` with
 * nothing to configure: the gutter stays between the two fields, the trailing
 * slot stays at the end of the row rather than jumping to its start, and the
 * three arrangements above still spend exactly 256px. The row writes the same
 * style in both directions; only the browser resolves it differently.
 *
 * **When control labels are switched on.** `PanelLabelsProvider` turns on a
 * preference that writes each control's word beside it. A row holding two fields
 * then splits into two rows of one field each, each with its word in a 76px
 * column in the secondary text colour -- never into a two-line stack. The word
 * is printed once, by the column: the fields are handed a labels-off context so
 * that they do not repeat it inside their boxes, and the row's one trailing
 * control stays on the first of the two rows.
 * @example
 * ```tsx
 * <FieldRow
 *     groupLabel="Node size range"
 *     trailing={<AdvancedButton label="Range and scale" onClick={open} />}
 * >
 *     <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
 *     <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
 * </FieldRow>
 * ```
 */
export const FieldRow = forwardRef<HTMLDivElement, FieldRowProps>(function FieldRow(
    {
        children,
        trailing,
        groupLabel,
        role,
        style,
        "aria-label": ariaLabel,
        "aria-labelledby": ariaLabelledBy,
        ...rest
    },
    ref,
): React.JSX.Element {
    const showLabels = usePanelLabels();
    const fields = fieldsOf(children);
    const count = fields.length;

    // A development-only diagnostic, printed in a consumer's own devtools by
    // people who have never seen this project. Plain English, no in-house
    // shorthand, and it says what to do rather than only what is wrong.
    useDevWarning(
        count === 0 || count > MAX_FIELDS
            ? `FieldRow was given ${String(count)} ${count === 1 ? "field" : "fields"}, and it holds one field, ` +
                  "or two side by side. A row with none is an empty 32px gap, and a third field has nowhere to " +
                  "go in the 280px panel the row is measured for. Put the extra fields on rows of their own."
            : undefined,
    );

    // Accessibility: a field row is a layout container rather than a widget, so
    // no ARIA Authoring Practices widget pattern applies to it. Where the caller
    // names the row it takes the WAI-ARIA `group` role instead -- the technique
    // the APG's naming guidance and the WAI forms tutorial "Grouping Controls"
    // use to gather related controls under one name. An unnamed group is
    // deliberately not emitted: `aria-label` is not allowed on a generic div,
    // and a group role with nothing to announce is a boundary a screen reader
    // has to step over for no gain.
    const groupName = groupLabel ?? ariaLabel;
    const named = groupName !== undefined || ariaLabelledBy !== undefined;
    const rowRole = role ?? (named ? "group" : undefined);

    // The slot is still drawn when it holds nothing: what changes is that the
    // row then has no control to keep the trail gap for.
    const hasTrailing = holdsSomething(trailing);

    // The showLabels preference: more than one field becomes one labelled row
    // per field. Never a two-line stack.
    //
    // The identity in this mode is 76 + 8 + <field> + 8 + 24 = 256, so the
    // field takes what is left rather than a fixed width. The trail gap is kept
    // on every one of the split rows, including the ones with an empty trailing
    // slot, so that the two rows a pair became line up with each other and with
    // every other row of the panel.
    if (showLabels && count > 1) {
        return (
            <Box
                ref={ref}
                data-testid="field-row-labelled"
                data-fields={count}
                role={rowRole}
                aria-label={groupName}
                aria-labelledby={ariaLabelledBy}
                {...rest}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    ...style,
                }}
            >
                {fields.map((child, index) => {
                    const word = fieldLabel(child);

                    return (
                        <Box
                            key={slotKey(child, index)}
                            data-testid="field-row"
                            data-labelled="true"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                height: PANEL_GRID.ROW_PITCH,
                            }}
                        >
                            <Box
                                component="span"
                                data-testid="field-row-label"
                                // The column is narrow and a translated word is
                                // often longer than an English one, so the word
                                // ellipsises. Clipping it is a paint-time
                                // effect only: the whole word stays in the DOM
                                // and therefore in the accessibility tree, the
                                // title serves a mouse, and the field beside it
                                // carries the same word as its own accessible
                                // name for a keyboard or a touch screen, none
                                // of which can reach a title.
                                title={word}
                                style={{
                                    flex: `0 0 ${String(PANEL_GRID.LABEL_COLUMN)}px`,
                                    minWidth: 0,
                                    fontSize: "var(--mantine-font-size-sm)",
                                    lineHeight: 1.2,
                                    color: PANEL_INK.CHROME,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {word}
                            </Box>
                            <Box
                                data-testid="field-row-slot"
                                data-width="fill"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    flex: "1 1 auto",
                                    minWidth: 0,
                                    // Logical, not marginLeft/marginRight: the
                                    // gutter has to stay between the word and
                                    // the field, and the trail gap between the
                                    // field and the slot, whichever way the
                                    // text runs.
                                    marginInlineStart: PANEL_GRID.GUTTER,
                                    marginInlineEnd: PANEL_GRID.TRAIL_GAP,
                                }}
                            >
                                {/* The column has already printed the word, so
                                    the field must not print it again. */}
                                <PanelLabelsProvider showLabels={false}>{fillSlot(child)}</PanelLabelsProvider>
                            </Box>
                            {/* The row's one trailing control belongs to the
                                row, so it stays on the first of the rows the row
                                became. */}
                            <TrailingSlot>{index === 0 ? trailing : null}</TrailingSlot>
                        </Box>
                    );
                })}
            </Box>
        );
    }

    const solo = count <= 1;
    // With one field and nothing trailing, the field eats the trail gap: 232.
    const absorbsTrailGap = solo && !hasTrailing;

    let fieldWidth: number = PANEL_GRID.FIELD;
    if (solo) {
        fieldWidth = absorbsTrailGap ? SOLO_WIDTH : PANEL_GRID.BODY;
    }

    // Undefined rather than 0 where there is no gap, so the row writes only the
    // spacing it actually spends. React renders a numeric 0 as an unqualified
    // `margin-inline-start: 0`, which is a declaration that reads like a
    // deliberate override of something and overrides nothing.
    const trailGap = absorbsTrailGap ? undefined : PANEL_GRID.TRAIL_GAP;

    return (
        <Box
            ref={ref}
            data-testid="field-row"
            data-fields={count}
            role={rowRole}
            aria-label={groupName}
            aria-labelledby={ariaLabelledBy}
            {...rest}
            style={{
                display: "flex",
                alignItems: "center",
                height: PANEL_GRID.ROW_PITCH,
                ...style,
            }}
        >
            {fields.map((child, index) => (
                <Box
                    key={slotKey(child, index)}
                    data-testid="field-row-slot"
                    // Which arm of the identity this row chose: 108 in a pair,
                    // 224 beside a trailing control, 232 alone.
                    data-width={fieldWidth}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        flex: `0 0 ${String(fieldWidth)}px`,
                        minWidth: 0,
                        // Logical, not marginLeft/marginRight. See the note at
                        // the top of this file: a physical gutter escapes the
                        // pair under dir="rtl" and a physical trail gap lands
                        // inside it.
                        marginInlineStart: index === 0 ? undefined : PANEL_GRID.GUTTER,
                        marginInlineEnd: index === count - 1 ? trailGap : undefined,
                    }}
                >
                    {fillSlot(child)}
                </Box>
            ))}
            <TrailingSlot>{trailing}</TrailingSlot>
        </Box>
    );
});
