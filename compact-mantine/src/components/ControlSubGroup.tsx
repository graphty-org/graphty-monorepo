import { Accordion, Box } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React, { useCallback, useRef } from "react";

import { PANEL_GRID, PANEL_INK } from "../constants/panel";
import { useLabels } from "../i18n";
import { UiGlyph } from "../icons";
import type { DisclosureProps } from "../types/events";
import { isRtl, useDirection } from "../utils/rtl";

// Contract sections 1.4, 2.1, 2.3, 3, 4 and 7 were applied to this file: the
// disclosure event model, the strings, the logical properties, the ARIA, the
// Mantine rebase and the user-facing documentation.
//
// The rebase (contract 4) is the reason this file changed shape. The previous
// revision drew the header as a `Group` carrying role="button" and tabIndex={0}
// with an `ActionIcon` -- a real <button> -- inside it. A button inside a button
// is invalid HTML: the inner control is unreachable, and what a screen reader
// makes of the pair is undefined. Mantine's Accordion draws the header as one
// UnstyledButton with a <span> chevron, which removes the nesting and brings
// aria-controls, the region role and the id wiring with it.
//
// What survived the rebase: the label text, its 10px secondary-ink type, the
// smaller-than-a-section chevron, the 8px content indent, the animated reveal,
// and the "Expand X" / "Collapse X" accessible name the old revision hardcoded.

// Mantine's Accordion is a set of items and addresses each by a string. This
// component is one item, so the string is a constant; the ids built from it are
// still unique per instance, because Accordion prefixes them with a useId.
const ITEM_VALUE = "control-sub-group";

/**
 * The gap between the chevron and the label.
 */
const INLINE_GAP = 4;

/**
 * The drawn size of the chevron.
 *
 * A sub-group sits under a section, so its chevron is drawn smaller than the
 * 12px chevron of a section header.
 */
const SUB_GROUP_CHEVRON = 10;

/**
 * The label's line height, from the same row of the type ramp as every other
 * single-line label in the library.
 */
const LABEL_LINE_HEIGHT = 1.2;

/**
 * Props for the ControlSubGroup component.
 */
export interface ControlSubGroupProps extends DisclosureProps {
    /**
     * The sub-group's name, drawn beside its chevron.
     *
     * One to three words in sentence case. It is also the accessible name of
     * the header button, prefixed with "Expand" or "Collapse", and the name of
     * the region the header opens.
     */
    label: string;
    /**
     * Whether the sub-group starts open when it keeps its own open state.
     * Defaults to `false`.
     * @deprecated Use `defaultOpened`, the spelling every collapsible component
     * in this library shares. This name still works.
     */
    defaultOpen?: boolean;
    /** The controls the sub-group holds, stacked in the order you write them. */
    children: React.ReactNode;
}

/**
 * A collapsible sub-group of controls, lighter than a section.
 *
 * Use it inside a `ControlSection` for the settings most readers never open:
 * text effects under a label section, easing under an animation section. It is
 * deliberately quieter than a section -- no rule above it, a smaller chevron,
 * and its name drawn small in the secondary text colour -- so that a panel
 * still reads as a list of sections with a few foldaways inside them rather
 * than as two competing levels of heading.
 *
 * The header is one button carrying the open state, and the controls it reveals
 * are a labelled region that the button points at, so a screen reader announces
 * the group and can jump straight into it. The content stays in the document
 * while it is closed and animates open, and nothing inside a closed sub-group
 * can be reached by Tab.
 *
 * Drive it from your own state with `opened` and `onOpenChange`, or leave both
 * out and let it remember its own with `defaultOpened`.
 * @param props - Component props
 * @param props.label - The sub-group's name, drawn beside its chevron
 * @param props.opened - Whether the sub-group is open, when you drive it from your own state
 * @param props.defaultOpened - Whether it starts open when it keeps its own state, defaulting to false
 * @param props.defaultOpen - Deprecated spelling of `defaultOpened`
 * @param props.onOpenChange - Called when it opens or closes, with the new state first and the event second
 * @param props.children - The controls the sub-group holds
 * @returns The sub-group, its header and its controls
 * @example
 * ```tsx
 * <ControlSection label="Labels">
 *     <ToggleRow label="Labels" defaultChecked />
 *     <ControlSubGroup label="Text effects" defaultOpened={false}>
 *         <ToggleRow label="Outline" />
 *         <ToggleRow label="Shadow" />
 *     </ControlSubGroup>
 * </ControlSection>
 * ```
 */
export function ControlSubGroup(props: ControlSubGroupProps): React.JSX.Element {
    const { label, opened, defaultOpened, onOpenChange, children } = props;

    // The superseded `defaultOpen` still works. It is read through a plain
    // object type rather than destructured by name, so that keeping it alive
    // here does not itself count as using a deprecated API -- the same way
    // ControlSection keeps its own `defaultOpen` alive.
    const { defaultOpen } = props as { defaultOpen?: boolean };

    const labels = useLabels();
    const direction = useDirection();

    // Mantine's Accordion reports a change as a value alone, with no event.
    // The contract's disclosure handler hands the consumer the event that
    // caused the change (section 1.4), so the header's own click is caught on
    // the way past and read back here. Accordion.Control calls its onClick
    // immediately before it reports the change, synchronously, so the event
    // parked here is always the one that opened or closed this sub-group.
    const activationRef = useRef<React.SyntheticEvent | undefined>(undefined);

    const [isOpen, setOpen] = useUncontrolled<boolean>({
        value: opened,
        defaultValue: defaultOpened ?? defaultOpen,
        finalValue: false,
        onChange: onOpenChange,
    });

    /**
     * Parks the activating event so the change reported next can carry it.
     * @param event - The click, including the one a browser synthesises from Enter or Space
     */
    const handleControlClick = useCallback((event: React.MouseEvent<HTMLButtonElement>): void => {
        activationRef.current = event;
    }, []);

    /**
     * Reports the new open state, with the event that caused it.
     * @param value - The item Accordion now considers open, or null when none is
     */
    const handleAccordionChange = useCallback(
        (value: string | null): void => {
            const event = activationRef.current;
            activationRef.current = undefined;
            setOpen(value === ITEM_VALUE, event);
        },
        [setOpen],
    );

    // The verb stays in front of the name, which is what makes a column of
    // collapsed sub-groups navigable by name in a screen reader's element list.
    // Nothing is hidden by it: the accessible name still contains the whole
    // visible label, so it satisfies WCAG 2.5.3 (Label in Name), and the state
    // is also exposed properly as aria-expanded rather than only in words.
    const toggleName = isOpen ? labels.collapseSection(label) : labels.expandSection(label);

    // A closed chevron points the way the content will open, which is the way
    // text runs; an open one points down in both directions.
    let chevronName: "chevronDown" | "chevronLeft" | "chevronRight" = "chevronDown";
    if (!isOpen) {
        chevronName = isRtl(direction) ? "chevronLeft" : "chevronRight";
    }

    // Accordion's own layout is already written in logical properties -- the
    // control is a flex row with padding-inline, and the chevron takes
    // margin-inline-start and -end -- so the overrides here are logical too and
    // the sub-group mirrors correctly with no further work.
    const styles: Partial<Record<"item" | "control" | "label" | "chevron" | "content", React.CSSProperties>> = {
        // A section draws the only rule in a panel. A sub-group is quieter than
        // a section, so the item's own bottom border is taken off.
        item: {
            border: "none",
            background: "transparent",
        },
        control: {
            paddingInline: 0,
            paddingBlock: 0,
            // WCAG 2.2 target size (2.5.8): a 10px label on a 1.2 line height
            // gives a 12px pointer target, so the header is stretched to the
            // 24px pitch the library's toggle rows use.
            minHeight: PANEL_GRID.TOGGLE_PITCH,
            color: PANEL_INK.CHROME,
        },
        label: {
            paddingBlock: 0,
            fontSize: "var(--mantine-font-size-xs)",
            lineHeight: LABEL_LINE_HEIGHT,
            color: PANEL_INK.CHROME,
        },
        chevron: {
            marginInlineStart: 0,
            marginInlineEnd: INLINE_GAP,
            color: PANEL_INK.CHROME,
        },
        content: {
            paddingBlock: 0,
            paddingInlineStart: PANEL_GRID.GUTTER,
            paddingInlineEnd: 0,
        },
    };

    // Accessibility: the APG "Accordion" pattern, in Mantine's spelling of it.
    // The header is a real button carrying aria-expanded and aria-controls, and
    // the content is role="region" named by that button through aria-labelledby.
    // The chevron is a <span> rather than the button it used to be, which is
    // what removes the invalid button-inside-button of the previous revision.
    //   https://www.w3.org/WAI/ARIA/apg/patterns/accordion/
    return (
        <Accordion
            data-testid="control-sub-group"
            value={isOpen ? ITEM_VALUE : null}
            onChange={handleAccordionChange}
            chevronPosition="left"
            chevronSize={PANEL_GRID.GLYPH_SLOT}
            // The glyph is chosen from the open state rather than rotated,
            // because this library draws a closed disclosure as a chevron
            // pointing along the text direction and an open one pointing down.
            disableChevronRotation
            chevron={<UiGlyph name={chevronName} size={SUB_GROUP_CHEVRON} />}
            styles={styles}
        >
            <Accordion.Item value={ITEM_VALUE} data-testid="control-sub-group-item">
                <Accordion.Control
                    data-testid="control-sub-group-control"
                    aria-label={toggleName}
                    onClick={handleControlClick}
                >
                    {/* The name shortens rather than wrapping, so it carries a
                        title for a reader using a pointer. The whole string
                        stays in the document either way, and the header
                        button's own name repeats it, so a screen reader reads
                        all of it however narrow the panel is. */}
                    <Box
                        component="span"
                        data-testid="control-sub-group-label"
                        title={label}
                        style={{
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {label}
                    </Box>
                </Accordion.Control>

                <Accordion.Panel data-testid="control-sub-group-panel">
                    <Box
                        data-testid="control-sub-group-content"
                        style={{ display: "flex", flexDirection: "column", gap: INLINE_GAP }}
                    >
                        {children}
                    </Box>
                </Accordion.Panel>
            </Accordion.Item>
        </Accordion>
    );
}
