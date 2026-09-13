import { PANEL_GRID, PANEL_INK } from "@graphty/compact-mantine";
import { Box } from "@mantine/core";
import React, { useCallback, useMemo, useRef, useState } from "react";

import { CANVAS_POPOUT_Z_INDEX } from "../constants";
import { RAIL_GLYPHS } from "../rail/railGlyphs";
import { useShell } from "../ShellContext";
import type { ActivityId, ActivityPanelProps, PanelOverflowItem } from "../types";
import { PanelHeader } from "./PanelHeader";
import { PanelHeaderSlotProvider } from "./panelHeaderSlot";
import { PanelResizeHandle } from "./PanelResizeHandle";
import { type PanelSectionScope, PanelSectionScopeContext } from "./PanelSection";

/**
 * The first row of every panel's overflow menu (spec 03 section 1.3).
 */
export const EXPAND_ALL_SECTIONS = "Expand all sections";

/**
 * The second row of every panel's overflow menu (spec 03 section 1.3).
 */
export const COLLAPSE_ALL_SECTIONS = "Collapse all sections";

/**
 * The panel's activity glyph, drawn at 14px in the header's 14px box.
 *
 * The glyph register of compact-mantine is closed and carries no activity
 * glyphs, so the rail's own drawings are the one source (spec 02 section 1.2);
 * the header draws the same glyph one size smaller rather than a second
 * drawing of the same thing (6.8, "one verb, one drawing").
 * @param activity - which activity's panel this is.
 * @returns the activity glyph sized for the header.
 */
function activityGlyph(activity: ActivityId): React.ReactNode {
    const glyph = RAIL_GLYPHS[activity];

    if (!React.isValidElement<{ width?: number | string; height?: number | string }>(glyph)) {
        return glyph;
    }

    return React.cloneElement(glyph, { width: PANEL_GRID.GLYPH, height: PANEL_GRID.GLYPH });
}

/**
 * The 280px activity panel: its chrome, its header, its boundary drag and the
 * section set its overflow and its alt-click rule sweep.
 *
 * The panel never floats and never overlays the canvas on desktop; below 1280px
 * it takes the overlay presentation, where it is painted over the canvas at the
 * pop-out rung so its own menus still paint above it (spec 03 section 1.1,
 * spec 01 section 7).
 *
 * The `More` overflow renders only when the panel has rows of its own beyond
 * the two universal ones; without them the header takes its narrower trailing
 * padding and the expand/collapse sweep is reached by alt-clicking any section
 * header, which is the pointer twin of those two rows (spec 03 sections 1.2,
 * 1.3 and 1.4).
 *
 * The header's `Keep open` latch is passed straight through to the store's own
 * `panelKeptOpen` by the shell (6.12): this component holds no latch state of its
 * own, because the rules the latch vetoes -- the narrow one-overlay rule and the
 * canvas tap -- are the store's and the shell's, not the panel's.
 * @param props - the panel's props.
 * @returns the activity panel column.
 */
export function ActivityPanel(props: ActivityPanelProps): React.JSX.Element {
    const {
        activity,
        width,
        presentation,
        title,
        overflowItems,
        keptOpen,
        onKeepOpenChange,
        onClose,
        onWidthChange,
        children,
    } = props;

    const { setSectionsOpen } = useShell();
    const registry = useRef<string[]>([]);

    /* The header's trailing slot, published to the body so a panel can draw its
       own control in the title row without lifting that control's state out of
       the panel that remembers it. See `panelHeaderSlot`. */
    const [headerActionsNode, setHeaderActionsNode] = useState<HTMLDivElement | null>(null);

    const scope = useMemo<PanelSectionScope>(
        () => ({
            registerSection: (sectionId: string): void => {
                if (!registry.current.includes(sectionId)) {
                    registry.current = [...registry.current, sectionId];
                }
            },
            unregisterSection: (sectionId: string): void => {
                registry.current = registry.current.filter((id) => id !== sectionId);
            },
            sectionIds: (): readonly string[] => registry.current,
        }),
        [],
    );

    const sweep = useCallback(
        (open: boolean): void => {
            setSectionsOpen(scope.sectionIds(), open);
        },
        [scope, setSectionsOpen],
    );

    // The two universal rows first, in this order, then the panel's own
    // (spec 03 section 1.3). They are stored as the individual section states
    // they set, so no new mode exists (6.5).
    const menuItems = useMemo<readonly PanelOverflowItem[]>(() => {
        const own = overflowItems ?? [];

        if (own.length === 0) {
            return [];
        }

        const universal: PanelOverflowItem[] = [
            {
                id: "expand-all-sections",
                label: EXPAND_ALL_SECTIONS,
                onSelect: () => {
                    sweep(true);
                },
            },
            {
                id: "collapse-all-sections",
                label: COLLAPSE_ALL_SECTIONS,
                onSelect: () => {
                    sweep(false);
                },
            },
        ];

        return [...universal, ...own.map((item, index) => (index === 0 ? { ...item, separatorBefore: true } : item))];
    }, [overflowItems, sweep]);

    const overlay = presentation === "overlay";
    const resizable = !overlay && onWidthChange !== undefined;

    return (
        <PanelSectionScopeContext.Provider value={scope}>
            <Box
                component="section"
                aria-label={title}
                data-testid="activity-panel"
                data-activity={activity}
                data-presentation={presentation}
                style={{
                    position: overlay ? "absolute" : "relative",
                    insetBlock: overlay ? 0 : undefined,
                    insetInlineStart: overlay ? 0 : undefined,
                    zIndex: overlay ? CANVAS_POPOUT_Z_INDEX : undefined,
                    flex: overlay ? undefined : `0 0 ${width}px`,
                    width,
                    minHeight: overlay ? undefined : 0,
                    display: "flex",
                    flexDirection: "column",
                    boxSizing: "border-box",
                    background: PANEL_INK.PANEL,
                    borderInlineEnd: `1px solid ${PANEL_INK.BORDER}`,
                    overflow: "hidden",
                }}
            >
                <PanelHeader
                    title={title}
                    glyph={activityGlyph(activity)}
                    overflowItems={menuItems}
                    actionsRef={setHeaderActionsNode}
                    keptOpen={keptOpen}
                    onKeepOpenChange={onKeepOpenChange}
                    onClose={onClose}
                />

                {/*
                    Content grid: `0 8px 8px 16px` in the artboards. The 16 and
                    the 8 are drawn by the rows themselves -- ControlSection and
                    PanelRows both lay the 16 | 224 | 8 | 24 | 8 band -- so the
                    region carries only the 8px foot. It is `overflow: hidden` at
                    rest and scrolls only once the content exceeds it.
                */}
                <Box
                    data-testid="activity-panel-content"
                    style={{
                        flex: "1 1 auto",
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                        paddingBottom: PANEL_GRID.SECTION_PAD_BOTTOM,
                        boxSizing: "border-box",
                        overflowX: "hidden",
                        overflowY: "auto",
                    }}
                >
                    <PanelHeaderSlotProvider node={headerActionsNode}>{children}</PanelHeaderSlotProvider>
                </Box>

                {resizable && <PanelResizeHandle width={width} onWidthChange={onWidthChange} />}
            </Box>
        </PanelSectionScopeContext.Provider>
    );
}
