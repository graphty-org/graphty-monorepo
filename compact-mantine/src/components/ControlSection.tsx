import { ActionIcon, Box, Collapse, Divider, Stack, UnstyledButton } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React, { useId } from "react";

import { PANEL_GRID, PANEL_INK } from "../constants/panel";
import { useLabels } from "../i18n";
import { UiGlyph } from "../icons";
import type { ActivationHandler, DisclosureProps } from "../types/events";
import { useDevWarning } from "../utils/dev-warning";
import { isRtl, useDirection } from "../utils/rtl";
import { InfoCircle } from "./InfoCircle";
import { TrailingSlot } from "./rows/TrailingSlot";

// RT-8. VOCAB section 2 sets the header type; DECISIONS-1.8 A6 is the
// always-expands rule. Contract sections 1.4, 2.1, 2.3, 3 and 7 were applied to
// this file: the disclosure event model, the strings, the logical properties,
// the ARIA and the user-facing documentation.

/**
 * The 4px gap between the parts of one header: between the chevron slot and the
 * name, between the name and its explanation button, and between two actions.
 */
const INLINE_GAP = 4;

/**
 * The height of the rule drawn above every section header.
 */
const DIVIDER_HEIGHT = 1;

/**
 * The side of the square dot that marks a section as holding settings the
 * reader changed from their defaults.
 */
const CONFIGURED_DOT = 6;

/**
 * The section name's type size, in pixels.
 *
 * 12px falls between the compact theme's `sm` (11px) and `md` (13px) tokens, so
 * it has no variable of its own.
 */
const NAME_FONT_SIZE = 12;

/**
 * The section name's line height, from the same row of the type ramp.
 */
const NAME_LINE_HEIGHT = 1.2;

/**
 * Props for the ControlSection component.
 */
export interface ControlSectionProps extends DisclosureProps {
    /** The section's name, drawn in its header. One to three words, sentence case. */
    label: string;
    /**
     * The technical name for the same thing, WITHOUT its parentheses -- `"Layout"`
     * beside `"Arrangement"`, `"Node and edge table"` beside `"Data table"`.
     *
     * One drawing only: plain name, space, technical name in parentheses in the
     * secondary ink, inside this one label. It joins the header's tooltip and the
     * group's accessible name as well, so the pair is never something only a pointer
     * can reach.
     */
    technicalName?: string;
    /**
     * Whether the section holds settings the reader changed from their
     * defaults. A 6px accent dot follows the name, announced to a screen reader
     * as well as drawn.
     */
    hasConfiguredValues?: boolean;
    /**
     * Whether the section is set up at all.
     *
     * An empty section is drawn as one 32px row: the name in the secondary text
     * colour, no chevron, and a single "+" in the trailing slot. It shows no
     * content and no empty-state sentence, and its children are not rendered.
     *
     * The dimmed name is never the only thing that says so. The chevron is
     * gone, the "+" is there, and the group holds nothing, so the state still
     * reads for someone who cannot tell the two text colours apart. Give
     * `onAdd` whenever a section can be empty: its "Add ..." button is what
     * states the section is waiting to be set up, in words, to a screen reader.
     */
    empty?: boolean;
    /**
     * Sets the section up, from the "+" an empty section carries.
     *
     * It should commit to a sensible default rather than open a chooser: the
     * reader can change what it made once the section exists. The activating
     * event is passed so you can read modifier keys or call `preventDefault`.
     */
    onAdd?: ActivationHandler;
    /**
     * An explanation of what the section is for.
     *
     * It is put behind a circled "i" beside the name, one hover, tap or focus
     * away, instead of spending a line of the panel on it, and it becomes the
     * section's accessible description so a screen reader reads it with the
     * section's name.
     *
     * Keep it to text. To be readable as a description whether or not the
     * bubble is open, the same content is also rendered into an element that
     * nothing draws, so anything here with state or side effects of its own
     * would run twice.
     */
    info?: React.ReactNode;
    /**
     * The section's own buttons, drawn at the end of the header, 24px each on a
     * 4px gap.
     *
     * An advanced settings button -- a gear that opens the settings most people
     * never change -- goes here, as an addition to the rows in `children` and
     * never as a replacement for them.
     */
    actions?: React.ReactNode;
    /** The rows the section holds: the controls commonly adjusted for its subject. */
    children?: React.ReactNode;
}

/**
 * A named, collapsible group of controls for a dense property panel.
 *
 * A section is drawn as a 1px rule, a 32px header carrying the section's name,
 * the rows it holds, and 8px of padding beneath them. Naming the group once in
 * the header is what lets the rows inside it spend their width on values rather
 * than on labels and buttons of their own.
 *
 * **A section always expands**, and three rules follow from that:
 *
 * 1. The chevron is drawn only when there is something to expand. An `empty`
 *    section has no chevron at all: its 16px slot is left blank and its
 *    trailing slot carries one "+".
 * 2. In development it warns when it is given neither children nor `empty`,
 *    because a header that opens onto nothing is a dead end for the reader.
 * 3. There is no way to put the section's own content behind a pop-out. An
 *    advanced settings button belongs in `actions`, beside the rows rather than
 *    instead of them.
 *
 * The name is drawn in the primary text colour when the section holds
 * something and in the secondary colour when it is `empty`. That dimming is the
 * whole empty state -- no "Not set", no "None", no sentence -- so a column of
 * dim section names reads as an inventory of what has not been set up yet. It
 * is never the only signal: an empty section also loses its chevron and gains a
 * "+", so nothing about the state depends on telling two greys apart.
 *
 * The section draws the panel's own horizontal padding, 16px at the leading
 * edge and 8px at the trailing edge, so a section dropped straight into a 280px
 * panel lands its header and its rows on the same grid the rows expect. The
 * padding follows the text direction, and so does the chevron -- a collapsed
 * section points towards the left in a right-to-left interface -- so the
 * section is correct in either direction with nothing to configure.
 * @param props - Component props
 * @param props.label - The section's name, drawn in its header
 * @param props.technicalName - The technical half of the 6.3 pair, drawn in the secondary ink inside the same label
 * @param props.opened - Whether the section is expanded, when you drive it from your own state
 * @param props.defaultOpened - Whether the section starts expanded when it keeps its own state, defaulting to true
 * @param props.onOpenChange - Called when the section expands or collapses, with the new state first and the event second
 * @param props.hasConfiguredValues - Whether the section holds settings changed from their defaults, which adds an accent dot after the name
 * @param props.empty - Whether the section is set up at all: a dimmed name, no chevron, one "+", and no content
 * @param props.onAdd - Sets the section up, from the "+" an empty section carries
 * @param props.info - An explanation, put behind a circled "i" and used as the section's accessible description
 * @param props.actions - The section's own buttons, drawn at the end of the header
 * @param props.children - The rows the section holds
 * @returns The section, its header and its rows
 * @example
 * ```tsx
 * <ControlSection
 *     label="Size"
 *     hasConfiguredValues={size !== defaultSize}
 *     info="How big each node is drawn."
 *     onOpenChange={(opened) => { remember("size", opened); }}
 * >
 *     <FieldRow groupLabel="Node size range">
 *         <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
 *         <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
 *     </FieldRow>
 * </ControlSection>
 * ```
 * @example
 * A section for a subject that has not been set up yet.
 * ```tsx
 * <ControlSection label="Edge properties" empty onAdd={() => { addEdgeProperties(); }} />
 * ```
 */
export function ControlSection(props: ControlSectionProps): React.JSX.Element {
    const {
        label,
        technicalName,
        opened,
        defaultOpened,
        onOpenChange,
        hasConfiguredValues = false,
        empty = false,
        onAdd,
        info,
        actions,
        children,
    } = props;

    const labels = useLabels();
    const direction = useDirection();
    const nameId = useId();
    const contentId = useId();
    const infoId = useId();

    // Controlled and uncontrolled, the way every state-holding component in
    // this package works. The uncontrolled default is open.
    const [isOpen, setOpen] = useUncontrolled<boolean>({
        value: opened,
        defaultValue: defaultOpened,
        finalValue: true,
        onChange: onOpenChange,
    });

    // An empty section renders no children at all. `toArray` is what tells a
    // section that holds rows from one whose children collapsed to nothing:
    // it drops the nulls and the `false` arms a conditional row leaves behind.
    const hasContent = !empty && React.Children.toArray(children).length > 0;
    const hasInfo = info !== undefined && info !== null;

    // The defect this revision exists to remove: a chevron that reveals
    // nothing. A section with no rows is either empty -- and says so by dimming
    // its name -- or it should not have rendered at all.
    useDevWarning(
        empty || hasContent
            ? undefined
            : `ControlSection "${label}" was given no children, and it holds the rows of a section. ` +
                  'Pass the rows, set "empty" to draw it as a single row with a "+", or do not render it: ' +
                  "a section header whose chevron opens onto nothing is a dead end for the reader.",
    );

    /**
     * Expand or collapse the section from its header.
     * @param event - The click, or the click a browser synthesises from Enter or Space
     */
    const handleToggle = (event: React.MouseEvent<HTMLButtonElement>): void => {
        setOpen(!isOpen, event);
    };

    const toggleName = isOpen ? labels.collapseSection(label) : labels.expandSection(label);
    const addName = labels.addToSection(label);

    // A chevron is a drawing rather than a box, so no logical CSS property
    // turns it round. A collapsed section points the way its text runs, which
    // is towards the left in a right-to-left interface; an open one points down
    // in both. Mantine's DirectionProvider is what says which, and says "ltr"
    // when a consumer has set none.
    const collapsedChevron = isRtl(direction) ? "chevronLeft" : "chevronRight";

    /** The 16px slot the chevron lives in, drawn blank when there is nothing to expand. */
    const slotStyle: React.CSSProperties = {
        flex: "0 0 auto",
        width: PANEL_GRID.GLYPH_SLOT,
        height: PANEL_GRID.GLYPH_SLOT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: PANEL_INK.CHROME,
    };

    /** The chevron slot and the name, which together are the expand target. */
    const leadStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        gap: INLINE_GAP,
        flex: "0 1 auto",
        minWidth: 0,
        height: "100%",
        background: "transparent",
        // "start" rather than "left", so a right-to-left section aligns its own
        // name to the edge its reader starts from.
        textAlign: "start",
    };

    // The name is the accessible name of the whole group, and `title` puts the
    // full text within reach of a pointer when the column is too narrow for it.
    // A screen reader is not relying on the title: CSS ellipsis does not
    // truncate the text it reads, and the expand button repeats the whole name.
    // The plain-then-technical pair of 6.3, as one label. `fullName` is what a pointer
    // and a screen reader get; the drawn halves differ only in weight and ink.
    const fullName = technicalName === undefined ? label : `${label} (${technicalName})`;
    const name = (
        <Box
            component="span"
            id={nameId}
            title={fullName}
            data-testid="control-section-name"
            style={{
                minWidth: 0,
                fontSize: NAME_FONT_SIZE,
                fontWeight: 500,
                lineHeight: NAME_LINE_HEIGHT,
                // WCAG 1.4.1 (Use of Colour): the dim name is a second signal,
                // not the only one. An empty section is also the only shape
                // with no chevron in its 16px slot and the only one carrying a
                // "+", and both of those survive for a reader who cannot tell
                // the two inks apart. The "+" is what carries the state into
                // the accessibility tree, as the button named "Add <section>".
                color: empty ? PANEL_INK.CHROME : PANEL_INK.VALUE,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
            }}
        >
            {label}
            {technicalName === undefined ? null : (
                <Box
                    component="span"
                    data-testid="control-section-technical-name"
                    style={{ fontWeight: 400, color: PANEL_INK.CHROME }}
                >
                    {` (${technicalName})`}
                </Box>
            )}
        </Box>
    );

    // Accessibility: the APG "Disclosure (Show/Hide)" pattern. The header is a
    // button carrying aria-expanded and aria-controls, and the section around
    // it is a group named by the header's own text -- so the name is announced
    // once for the group and is never replaced by an aria-label that would hide
    // it. The expand button's own name keeps the verb in front of that text,
    // which is what makes a list of collapsed sections navigable by name.
    return (
        <Box
            role="group"
            aria-labelledby={nameId}
            aria-describedby={hasInfo ? infoId : undefined}
            data-testid="control-section"
            data-empty={empty ? "true" : undefined}
        >
            {/* The 1px rule above the header, full bleed and unmargined: the
                section rhythm is 1px divider / 32px header / 32n content /
                8px pad, and a margin here would break it. */}
            <Divider
                data-testid="control-section-divider"
                color={PANEL_INK.DIVIDER}
                size={DIVIDER_HEIGHT}
                my={0}
                mx={0}
            />

            {/* 16 | 16px chevron | 4 | name | 4 | info circle | flex | actions
                ending at x 272. PAD_LEFT and PAD_RIGHT are named for the
                left-to-right case they were measured in; the 16 is the panel's
                leading pad and the 8 its trailing one, so they are written here
                as inline padding and follow the text direction. */}
            <Box
                data-testid="control-section-header"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: INLINE_GAP,
                    boxSizing: "border-box",
                    height: PANEL_GRID.SECTION_HEADER,
                    paddingInlineStart: PANEL_GRID.PAD_LEFT,
                    paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                }}
            >
                {hasContent ? (
                    <UnstyledButton
                        type="button"
                        data-testid="control-section-toggle"
                        aria-label={toggleName}
                        aria-expanded={isOpen}
                        aria-controls={contentId}
                        onClick={handleToggle}
                        style={{ ...leadStyle, cursor: "pointer" }}
                    >
                        <Box data-testid="control-section-chevron-slot" style={slotStyle}>
                            <UiGlyph name={isOpen ? "chevronDown" : collapsedChevron} size={PANEL_GRID.CHEVRON} />
                        </Box>
                        {name}
                    </UnstyledButton>
                ) : (
                    <Box style={leadStyle}>
                        {/* Nothing to expand, so the slot holds the grid and
                            draws no glyph at all. */}
                        <Box data-testid="control-section-chevron-slot" style={slotStyle} />
                        {name}
                    </Box>
                )}

                {hasConfiguredValues && (
                    <Box
                        role="img"
                        aria-label={labels.sectionHasConfiguredValues(label)}
                        data-testid="control-section-dot"
                        style={{
                            flex: "0 0 auto",
                            width: CONFIGURED_DOT,
                            height: CONFIGURED_DOT,
                            borderRadius: "50%",
                            background: PANEL_INK.ACCENT,
                        }}
                    />
                )}

                {hasInfo && <InfoCircle label={label}>{info}</InfoCircle>}

                {/* The flex that carries the actions to x 272. */}
                <Box style={{ flex: "1 1 auto" }} />

                {actions !== undefined && actions !== null && (
                    <Box
                        data-testid="control-section-actions"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: INLINE_GAP,
                            flex: "0 0 auto",
                        }}
                    >
                        {actions}
                    </Box>
                )}

                {empty && onAdd !== undefined && (
                    <TrailingSlot>
                        {/* An ActionIcon rather than a bare button, so the "+"
                            picks up the theme's 24px hover, active and disabled
                            states and the focus ring, instead of drawing
                            nothing back when it is pressed. */}
                        <ActionIcon
                            type="button"
                            variant="subtle"
                            size={PANEL_GRID.CONTROL_HEIGHT}
                            radius="sm"
                            c={PANEL_INK.CHROME}
                            title={addName}
                            aria-label={addName}
                            data-testid="control-section-add"
                            onClick={onAdd}
                        >
                            <UiGlyph name="plus" size={PANEL_GRID.GLYPH} />
                        </ActionIcon>
                    </TrailingSlot>
                )}
            </Box>

            {/* The explanation, mirrored where nothing draws it, so that
                aria-describedby on the group has something to point at whether
                or not the bubble is open. A directly referenced element is read
                by a screen reader even while it is hidden, and hiding it is
                what keeps anything interactive inside the explanation from
                being reachable twice. */}
            {hasInfo && (
                <Box id={infoId} data-testid="control-section-description" hidden>
                    {info}
                </Box>
            )}

            {/* The content rows, then 8px of bottom padding. Resident, never
                behind a pop-out. */}
            {hasContent && (
                <Collapse id={contentId} in={isOpen}>
                    <Box
                        data-testid="control-section-content"
                        style={{
                            paddingInlineStart: PANEL_GRID.PAD_LEFT,
                            paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                            paddingBottom: PANEL_GRID.SECTION_PAD_BOTTOM,
                        }}
                    >
                        <Stack gap={0}>{children}</Stack>
                    </Box>
                </Collapse>
            )}
        </Box>
    );
}
