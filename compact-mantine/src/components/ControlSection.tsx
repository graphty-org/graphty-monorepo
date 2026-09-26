import { ActionIcon, Box, UnstyledButton } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React, { useId } from "react";

import { PANEL_GRID } from "../constants/panel";
import { useLabels } from "../i18n";
import { UiGlyph } from "../icons";
import { useCompactStyles } from "../theme/useCompactStyles";
import type { ActivationHandler, DisclosureProps } from "../types/events";
import { useDevWarning } from "../utils/dev-warning";
import { isRtl, useDirection } from "../utils/rtl";
import { Caret } from "./chrome/Caret";
import { InfoCircle } from "./InfoCircle";
import { TrailingSlot } from "./rows/TrailingSlot";

// Figma's properties-panel section (design/figma-spec.md 9.2): a 40px header padded 0 8 0 16,
// an 11px weight-550 title on a 32px line, a 16px chevron slot in the left gutter where the
// section collapses, 24px actions 4 apart at the end, then the rows, 12px of bottom padding, and
// a 1px rule BELOW the section. The states (the empty section's dim title and its 100ms hover to
// the primary ink) live in src/theme/css/chrome.css.ts on the cm-section-* classes.

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
     * color, no chevron, and a single "+" in the trailing slot. It shows no
     * content and no empty-state sentence, and its children are not rendered.
     *
     * The dimmed name is never the only thing that says so. The chevron is
     * gone, the "+" is there, and the group holds nothing, so the state still
     * reads for someone who cannot tell the two text colors apart. Give
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
    /**
     * Whether the section folds away behind a chevron in the left gutter.
     *
     * Figma collapses only a few sections (Export, Styles); most are shown or hidden as a whole
     * by the app. Set it to false for a section that is always open: no chevron, no toggle
     * button, and its rows are always on screen.
     * @default true
     */
    collapsible?: boolean;
}

/**
 * A named, collapsible group of controls for a dense property panel.
 *
 * A section is drawn as a 40px header carrying the section's name, the rows it
 * holds, 12px of padding beneath them, and a 1px rule below. Naming the group once in
 * the header is what lets the rows inside it spend their width on values rather
 * than on labels and buttons of their own.
 *
 * **A section always expands**, and three rules follow from that:
 *
 * 1. The chevron is drawn only when there is something to expand. An `empty`
 *    section has no chevron at all and its trailing slot carries one "+".
 *    Hovering its header brings the name, and the "+", up to the primary
 *    ink; clicking the name adds, like the "+".
 * 2. In development it warns when it is given neither children nor `empty`,
 *    because a header that opens onto nothing is a dead end for the reader.
 * 3. There is no way to put the section's own content behind a pop-out. An
 *    advanced settings button belongs in `actions`, beside the rows rather than
 *    instead of them.
 *
 * The name is drawn in the primary text color when the section holds
 * something and in the secondary color when it is `empty`. That dimming is the
 * whole empty state -- no "Not set", no "None", no sentence -- so a column of
 * dim section names reads as an inventory of what has not been set up yet. It
 * is never the only signal: an empty section also loses its chevron and gains a
 * "+", so nothing about the state depends on telling two grays apart.
 *
 * The section draws the panel's own horizontal padding, 16px at the leading
 * edge and 8px at the trailing edge, so a section dropped straight into a 240px
 * panel lands its header and its rows on the same grid the rows expect. The
 * chevron sits in the 16px gutter before the name. The padding follows the
 * text direction, and so does the chevron -- a collapsed
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
 * @param props.collapsible - Whether the section folds away behind a chevron, defaulting to true
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
    useCompactStyles();
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
        collapsible = true,
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
    const toggles = hasContent && collapsible;
    const shown = hasContent && (!collapsible || isOpen);

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
     * @param event - The click, or the click a browser synthesizes from Enter or Space
     */
    const handleToggle = (event: React.MouseEvent<HTMLButtonElement>): void => {
        setOpen(!isOpen, event);
    };

    const toggleName = isOpen ? labels.collapseSection(label) : labels.expandSection(label);
    const addName = labels.addToSection(label);

    // The plain-then-technical pair, as one label. `fullName` is what a pointer
    // and a screen reader get; the drawn halves differ only in weight and ink.
    const fullName = technicalName === undefined ? label : `${label} (${technicalName})`;
    const name = (
        <Box
            component="span"
            id={nameId}
            title={fullName}
            data-testid="control-section-name"
            className="cm-section-title"
        >
            {label}
            {technicalName === undefined ? null : (
                <Box component="span" data-testid="control-section-technical-name" className="cm-section-technical">
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
    //
    // WCAG 1.4.1 (Use of Color): an empty section's dim name is a second
    // signal, never the only one. It also has no chevron and carries a "+",
    // and the "+" is what carries the state into the accessibility tree, as
    // the button named "Add <section>".
    return (
        <Box
            role="group"
            aria-labelledby={nameId}
            aria-describedby={hasInfo ? infoId : undefined}
            data-testid="control-section"
            data-empty={empty ? "true" : undefined}
            className="cm-section"
        >
            {/* 16 | title | info | flex | actions ending at x 232. The padding
                is inline (start 16, end 8), so it follows the text direction. */}
            <Box
                data-testid="control-section-header"
                className="cm-section-header"
                style={{
                    height: PANEL_GRID.SECTION_HEADER,
                    paddingInlineStart: PANEL_GRID.PAD_LEFT,
                    paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                }}
            >
                {toggles ? (
                    <UnstyledButton
                        type="button"
                        data-testid="control-section-toggle"
                        data-collapsible="true"
                        className="cm-section-lead cm-focus-inside"
                        aria-label={toggleName}
                        aria-expanded={isOpen}
                        aria-controls={contentId}
                        onClick={handleToggle}
                    >
                        {/* The 16px slot in the gutter at x 0..16. A closed
                            section's caret points the way text runs. */}
                        <Box data-testid="control-section-chevron-slot" className="cm-section-chevron">
                            <Caret open={isOpen} rtl={isRtl(direction)} />
                        </Box>
                        {name}
                    </UnstyledButton>
                ) : (
                    // An empty section's title adds, as Figma's does. The
                    // pointer route only: the "+" is the keyboard route and
                    // the named control, so the title stays out of the tab
                    // order rather than being a second button with one name.
                    <Box
                        className="cm-section-lead"
                        data-testid="control-section-lead"
                        onClick={empty && onAdd !== undefined ? onAdd : undefined}
                    >
                        {name}
                    </Box>
                )}

                {hasConfiguredValues && (
                    <Box
                        role="img"
                        aria-label={labels.sectionHasConfiguredValues(label)}
                        data-testid="control-section-dot"
                        className="cm-section-dot"
                    />
                )}

                {hasInfo && <InfoCircle label={label}>{info}</InfoCircle>}

                {actions !== undefined && actions !== null && (
                    <Box data-testid="control-section-actions" className="cm-section-actions">
                        {actions}
                    </Box>
                )}

                {empty && onAdd !== undefined && (
                    <TrailingSlot>
                        <ActionIcon
                            type="button"
                            variant="subtle"
                            size={PANEL_GRID.CONTROL_HEIGHT}
                            className="cm-section-add"
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
                or not the bubble is open. */}
            {hasInfo && (
                <Box id={infoId} data-testid="control-section-description" hidden>
                    {info}
                </Box>
            )}

            {/* The content rows, then 12px of bottom padding. It opens and
                closes in one frame (spec 2.8) and stays mounted while closed,
                so aria-controls always points at something and a half-typed
                field keeps its value. */}
            {hasContent && (
                <Box
                    id={contentId}
                    hidden={!shown}
                    data-testid="control-section-content"
                    className="cm-section-content"
                    style={{
                        paddingInlineStart: PANEL_GRID.PAD_LEFT,
                        paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                        paddingBottom: PANEL_GRID.SECTION_PAD_BOTTOM,
                    }}
                >
                    {children}
                </Box>
            )}
        </Box>
    );
}
