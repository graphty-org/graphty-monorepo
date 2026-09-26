import { Box } from "@mantine/core";
import React, { useId } from "react";

import { PANEL_GRID } from "../constants/panel";
import { useCompactStyles } from "../theme/useCompactStyles";

// Figma's field row legend (design/figma-spec.md 9.3, right-sidebar-selection/s-al-full-panel
// #113-#116): a 16px band above the rows, its text a 9/14 weight-500 caption in the secondary
// ink. No rule: groups inside a section are not divided in Figma. The type lives on the
// cm-legend-text class in src/theme/css/chrome.css.ts.
//
// Why this is not superseded by ControlSection: a section always draws a header button and
// always collapses, and a group never claims to fold. Use a group for a named cluster of rows
// inside a section or a pop-out.

/**
 * Props for the ControlGroup component.
 */
export interface ControlGroupProps {
    /**
     * The group's name, drawn in its header.
     *
     * One to three words in sentence case. It is also the accessible name of
     * the group, so every control inside is announced as belonging to it.
     */
    label: string;
    /**
     * Buttons drawn at the end of the header row, such as add or reset.
     *
     * Give each one an accessible name of its own; they sit outside the
     * group's name and are not described by it.
     */
    actions?: React.ReactNode;
    /** The controls the group holds, stacked in the order you write them. */
    children: React.ReactNode;
    /**
     * Kept so existing callers compile. The group no longer draws a rule (Figma
     * does not divide groups inside a section), so there is nothing to bleed and
     * the prop has no effect.
     * @deprecated no effect since the Figma restyle
     */
    bleed?: boolean;
}

/**
 * A labelled group of controls: a 16px legend band carrying the group's name
 * as a small caption, then the rows.
 *
 * The group is always open. That is the whole difference between this and
 * `ControlSection`, and it is the question to ask when choosing between them:
 *
 * - Reach for `ControlSection` for a subject of the panel, with a 40px header,
 *   a rule below and, where it collapses, a chevron.
 * - Reach for `ControlGroup` for a named cluster of rows inside a section --
 *   Figma's "Alignment" or "Position" legends -- or inside a pop-out.
 *
 * A field row under a legend comes out at Figma's 48px: the 16px band, then the
 * 32px row with its 24px control centred. The legend shortens with an ellipsis
 * when the container is narrow, header buttons stay pinned to its end, and
 * everything is laid out in inline terms so the group mirrors right to left.
 * @param props - Component props
 * @param props.label - The group's name, which is also its accessible name
 * @param props.actions - Buttons drawn at the end of the legend band
 * @param props.children - The controls the group holds
 * @returns The control group
 * @example
 * ```tsx
 * <ControlGroup label="Position">
 *     <FieldRow>
 *         <PanelField label="X" glyph="X" value="100" />
 *         <PanelField label="Y" glyph="Y" value="40" />
 *     </FieldRow>
 * </ControlGroup>
 * ```
 */
export function ControlGroup({ label, actions, children }: ControlGroupProps): React.JSX.Element {
    useCompactStyles();
    // ARIA Authoring Practices: no widget pattern applies, because nothing
    // here is interactive -- this is the practices' plain grouping technique,
    // role="group" named by the legend text that is already on screen through
    // aria-labelledby.
    const labelId = useId();
    const hasActions = actions !== undefined && actions !== null;

    return (
        <Box data-testid="control-group" role="group" aria-labelledby={labelId}>
            <Box data-testid="control-group-header" className="cm-legend" style={{ minHeight: PANEL_GRID.LEGEND }}>
                {/* The name shortens rather than wrapping, so it carries a
                    title for a reader using a pointer. The full string stays
                    in the document either way. */}
                <Box
                    component="span"
                    id={labelId}
                    data-testid="control-group-label"
                    className="cm-legend-text"
                    title={label}
                    style={{ flex: "1 1 auto" }}
                >
                    {label}
                </Box>

                {hasActions && (
                    <Box
                        data-testid="control-group-actions"
                        style={{ display: "flex", alignItems: "center", gap: 4, flex: "0 0 auto" }}
                    >
                        {actions}
                    </Box>
                )}
            </Box>

            <Box data-testid="control-group-content">{children}</Box>
        </Box>
    );
}
