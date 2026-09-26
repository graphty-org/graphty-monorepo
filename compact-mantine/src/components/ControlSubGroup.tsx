import { Box, UnstyledButton } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React, { useId } from "react";

import { PANEL_GRID } from "../constants/panel";
import { useLabels } from "../i18n";
import { useCompactStyles } from "../theme/useCompactStyles";
import type { DisclosureProps } from "../types/events";
import { isRtl, useDirection } from "../utils/rtl";
import { Caret } from "./chrome/Caret";

// Figma never folds settings away inside the panel; it opens a light popover from an
// AdvancedButton. This component is kept for compatibility, restyled as Figma's row
// (design/figma-spec.md 9.4): a 32px row, a 16px chevron in the left gutter, an 11/16 weight-450
// label in the secondary ink that turns primary on hover over 100ms, and content that opens in
// one frame. The header is one UnstyledButton with an inert caret inside it, so there is no
// button nested in a button, and the content stays mounted (hidden) while closed so a
// half-typed value survives a fold.

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
    /** The controls the sub-group holds, stacked in the order you write them. */
    children: React.ReactNode;
}

/**
 * A collapsible sub-group of controls, lighter than a section.
 *
 * Prefer an `AdvancedButton` that opens a pop-out: that is how Figma keeps rare
 * settings off the panel. Where a fold inside the section is still wanted, this
 * draws it the Figma way: a 32px row whose chevron hangs in the 16px gutter to
 * the left of the section's content edge, and a label in the secondary text
 * colour that comes up to the primary one under the pointer. The content opens
 * in one frame, on the same grid as the rows around it.
 *
 * The header is one button carrying the open state, and the controls it reveals
 * are a labelled region that the button points at. Nothing inside a closed
 * sub-group can be reached by Tab.
 *
 * Drive it from your own state with `opened` and `onOpenChange`, or leave both
 * out and let it remember its own with `defaultOpened`.
 * @param props - Component props
 * @param props.label - The sub-group's name, drawn beside its chevron
 * @param props.opened - Whether the sub-group is open, when you drive it from your own state
 * @param props.defaultOpened - Whether it starts open when it keeps its own state, defaulting to false
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
    useCompactStyles();
    const { label, opened, defaultOpened, onOpenChange, children } = props;

    const labels = useLabels();
    const direction = useDirection();
    const controlId = useId();
    const panelId = useId();

    const [isOpen, setOpen] = useUncontrolled<boolean>({
        value: opened,
        defaultValue: defaultOpened,
        finalValue: false,
        onChange: onOpenChange,
    });

    // The verb stays in front of the name, which is what makes a column of
    // collapsed sub-groups navigable by name in a screen reader's element list.
    // The accessible name still contains the whole visible label, so it
    // satisfies WCAG 2.5.3 (Label in Name), and the state is also exposed as
    // aria-expanded rather than only in words.
    const toggleName = isOpen ? labels.collapseSection(label) : labels.expandSection(label);

    // Accessibility: the APG "Accordion" pattern. The header is a real button
    // carrying aria-expanded and aria-controls, and the content is
    // role="region" named by that button through aria-labelledby.
    //   https://www.w3.org/WAI/ARIA/apg/patterns/accordion/
    return (
        <Box data-testid="control-sub-group">
            <UnstyledButton
                type="button"
                id={controlId}
                data-testid="control-sub-group-control"
                className="cm-subgroup-control cm-focus-inside"
                aria-label={toggleName}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                    setOpen(!isOpen, event);
                }}
                style={{ height: PANEL_GRID.ROW_PITCH }}
            >
                {/* The 16px slot in the gutter at x 0..16; the label starts on
                    the section's content edge. */}
                <Box component="span" aria-hidden="true" className="cm-subgroup-chevron">
                    <Caret open={isOpen} rtl={isRtl(direction)} />
                </Box>
                {/* The name shortens rather than wrapping, so it carries a
                    title for a reader using a pointer. The header button's own
                    name repeats it, so a screen reader reads all of it. */}
                <Box
                    component="span"
                    data-testid="control-sub-group-label"
                    title={label}
                    style={{
                        display: "block",
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {label}
                </Box>
            </UnstyledButton>

            {/* Opens in one frame (spec 2.8), on the section's own grid. */}
            <Box
                id={panelId}
                role="region"
                aria-labelledby={controlId}
                aria-hidden={isOpen ? undefined : true}
                hidden={!isOpen}
                data-testid="control-sub-group-panel"
            >
                <Box data-testid="control-sub-group-content">{children}</Box>
            </Box>
        </Box>
    );
}
