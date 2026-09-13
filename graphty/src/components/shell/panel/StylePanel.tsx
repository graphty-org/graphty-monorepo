import {
    AdvancedButton,
    DataRow,
    FieldRow,
    PANEL_GRID,
    PANEL_INK,
    PanelField,
    ToggleRow,
} from "@graphty/compact-mantine";
import { ActionIcon, Box, Menu } from "@mantine/core";
import React, { useState } from "react";

import { type LayerItem, LeftSidebar } from "../../layout/LeftSidebar";
import { RunLayoutsModal } from "../../RunLayoutsModal";
import { keyChipFor } from "../bindings";
import { MORE_LABEL, MoreGlyph } from "./PanelHeader";
import { COMING_GROUP_SENTENCE, ComingTag, PanelSection, SectionAddButton } from "./PanelSection";

/** The Arrangement section's plain name (StylePanel.dc.html:470). */
const ARRANGEMENT_LABEL = "Arrangement";

/**
 * The technical half of the same pair, drawn inside the header label in muted ink at
 * weight 400 -- which is exactly how the artboard draws it, and it does fit:
 * StylePanel.dc.html:470 is `Arrangement <span ...>(Layout)</span>`. Spec 04 section
 * 4.2 step 10 allows one drawing for the pair, and FLOOR-1.9 section 1 rules out the
 * wrapper `title` this used to hide in: "a `title` attribute, an HTML comment and the
 * far side of a door are all the same place: not on screen."
 */
const ARRANGEMENT_TECHNICAL_NAME = "Layout";

/** The Layers header's own plus (spec 04 line 4270, StylePanel.dc.html:385). */
const ADD_STYLE_LAYER_LABEL = "Add a style layer";

/** The Styles library's destination sentence (StylePanel.dc.html). */
const STYLES_INFO = "Style templates: saved in this browser on this computer. Export a file to move it.";

/** The five built-in styles, in the order spec 03 section 2.4 item 3 lists them. */
const BUILT_IN_STYLES: readonly string[] = ["Default", "High contrast", "Print", "Colorblind safe", "Presentation"];

/** The word every built-in row carries in its trailing slot (spec 03 section 2.4). */
const BUILT_IN_WORD = "built-in";

/** The Styles section's own overflow, which is where a saved-thing verb lives (6.8). */
const STYLES_OVERFLOW: readonly string[] = ["Import style...", "Export style (JSON)", "Reset styles to defaults"];

/** The gear that opens the re-homed layout picker and its options. */
const LAYOUT_PARAMETERS_LABEL = "Layout parameters";

/**
 * One layout quick pick: its name, what it will cost, and -- where it cannot be
 * chosen -- why (spec 03 section 2.4 item 2, floor item 4).
 *
 * Built by the caller and handed in through {@link StylePanelProps.layoutPicks}.
 * @public
 */
export interface LayoutQuickPick {
    /** The layout's id, as the layout registry knows it. */
    readonly value: string;
    /** The layout's plain name. */
    readonly label: string;
    /** What it will cost on this graph, e.g. "about 2 s". */
    readonly estimate?: string;
    /** Why it cannot be chosen. A pick with a reason is drawn disabled. */
    readonly disabledReason?: string;
}

/**
 * The quick picks spec 03 section 2.4 asks for, with 5.8's ship state applied:
 * only the force layout is registered in graphty-element today, so the other
 * three are drawn and disabled with their reason rather than omitted.
 */
const DEFAULT_LAYOUT_PICKS: readonly LayoutQuickPick[] = [
    { value: "ngraph", label: "Force directed" },
    { value: "sugiyama", label: "Hierarchical", disabledReason: "Coming" },
    { value: "radial", label: "Radial", disabledReason: "Coming" },
    { value: "grid", label: "Grid" },
];

/**
 * One pick's drawn words: its name, then whichever trailing clause it carries -- the
 * size estimate where it can be chosen, the reason where it cannot. A pick never
 * carries both: a layout that is not built has no cost to estimate.
 * @param pick - the quick pick.
 * @returns the option's label.
 */
function pickLabel(pick: LayoutQuickPick): string {
    if (pick.disabledReason !== undefined) {
        return `${pick.label} -- ${pick.disabledReason}`;
    }

    return pick.estimate === undefined ? pick.label : `${pick.label} -- ${pick.estimate}`;
}

/**
 * Props of the Style panel body.
 */
export interface StylePanelProps {
    /** The style layers, in graphty-element's own order. */
    readonly layers: LayerItem[];
    /** Which layer is selected, or null. */
    readonly selectedLayerId: string | null;
    /** Reorder or rename. */
    readonly onLayersChange: (layers: LayerItem[]) => void;
    /** Selects a layer, which is what fills the inspector's Style layer surface. */
    readonly onLayerSelect: (layerId: string) => void;
    /** Adds a layer. */
    readonly onAddLayer: () => void;
    /** The layout quick picks. */
    readonly layoutPicks?: readonly LayoutQuickPick[];
    /** The layout in force. */
    readonly layout?: string;
    /** Applies a layout with its configuration. */
    readonly onApplyLayout?: (layoutType: string, config: Record<string, unknown>) => void;
    /** Whether the canvas is in 2D, which the re-homed layout dialog needs. */
    readonly is2DMode?: boolean;
    /** The configuration the layout in force is running with. */
    readonly layoutConfig?: Record<string, unknown>;
    /** Whether a layout parameter has been moved off its default (6.11's stub ink). */
    readonly layoutChanged?: boolean;
    /** The saved styles, newest first. Built-ins are drawn above them. */
    readonly savedStyles?: readonly { readonly id: string; readonly name: string; readonly savedAt?: string }[];
    /** Applies a style template. */
    readonly onApplyStyle?: (id: string) => void;
    /** Saves the current styling as a template. */
    readonly onSaveStyle?: () => void;
    /** Runs one of the Styles section's own overflow rows. */
    readonly onStylesOverflow?: (label: string) => void;
    /** Whether the canvas legend is shown. */
    readonly legendShown?: boolean;
    /** Shows or hides the canvas legend. */
    readonly onLegendShownChange?: (shown: boolean) => void;
}

/**
 * The Style panel body, in the order spec 03 section 2.4 freezes: the style
 * layers list, the layout selector, the Styles library, and the canvas legend
 * switch.
 *
 * The layers list is the app's existing `LeftSidebar`, re-homed rather than
 * rewritten -- but only its list. The `Layers` header is a section header like
 * any other, so `PanelSection` draws it at RT-8's 32px with the register's
 * `Add a style layer` plus in its actions slot (StylePanel.dc.html:353-388),
 * and the sidebar is asked, with `embedded`, to contribute the RT-6 rows and
 * nothing else -- no header of its own and no second 16px band inside the
 * section's own 16 | content | 8.
 *
 * Not here, by spec: the view mode control, which belongs to the canvas
 * toolbar, and per-layer encoding, which belongs to the inspector.
 * @param props - the Style panel's props.
 * @returns the Style panel body.
 */
export function StylePanel(props: StylePanelProps): React.JSX.Element {
    const {
        layers,
        selectedLayerId,
        onLayersChange,
        onLayerSelect,
        onAddLayer,
        layoutPicks = DEFAULT_LAYOUT_PICKS,
        layout,
        onApplyLayout,
        is2DMode = false,
        layoutConfig,
        layoutChanged = false,
        savedStyles = [],
        onApplyStyle,
        onSaveStyle,
        onStylesOverflow,
        legendShown = true,
        onLegendShownChange,
    } = props;

    const [layoutDialogOpen, setLayoutDialogOpen] = useState(false);

    const legendChip = keyChipFor("toggleLegend");
    const legendTitle = legendChip === null ? "Show legend" : `Show legend (${legendChip})`;

    return (
        <>
            {/*
                The plus rides in `actions`, never in `onAdd`: `ControlSection` draws its
                own "Add Layers" plus when `empty && onAdd !== undefined`, so passing both
                would put two pluses on a graph with no layers, and the register fixes this
                verb as "Add a style layer" rather than "Add <section>".
            */}
            <Box data-testid="style-layers">
                <PanelSection
                    sectionId="style.layers"
                    label="Layers"
                    defaultOpen
                    empty={layers.length === 0}
                    actions={
                        <SectionAddButton
                            tooltip={ADD_STYLE_LAYER_LABEL}
                            label={ADD_STYLE_LAYER_LABEL}
                            onClick={onAddLayer}
                        />
                    }
                >
                    <LeftSidebar
                        embedded
                        layers={layers}
                        selectedLayerId={selectedLayerId}
                        onLayersChange={onLayersChange}
                        onLayerSelect={onLayerSelect}
                        onAddLayer={onAddLayer}
                        style={{ width: "100%", minWidth: 0, height: "auto" }}
                    />
                </PanelSection>
            </Box>

            {/*
                Three of the four picks are unbuilt and contiguous, so 5.8's
                GROUP form applies: one tag on the header, one sentence behind
                the header's info circle, and the rows dimmed and disabled
                instead of tagged one by one.
            */}
            <Box data-testid="style-arrangement">
                <PanelSection
                    sectionId="style.layout"
                    label={ARRANGEMENT_LABEL}
                    technicalName={ARRANGEMENT_TECHNICAL_NAME}
                    defaultOpen
                    info={COMING_GROUP_SENTENCE}
                    actions={<ComingTag />}
                >
                    <FieldRow
                        groupLabel="Arrangement"
                        trailing={
                            <AdvancedButton
                                label={LAYOUT_PARAMETERS_LABEL}
                                title={LAYOUT_PARAMETERS_LABEL}
                                changed={layoutChanged}
                                onClick={() => {
                                    setLayoutDialogOpen(true);
                                }}
                            />
                        }
                    >
                        <PanelField
                            label="Layout"
                            kind="select"
                            value={layout}
                            /*
                                Floor item 4: a disabled pick states its reason, and an
                                option element cannot be hovered for a tooltip, so the
                                reason is drawn beside the name in the same words the
                                artboard's own segment titles use ("Hierarchical
                                (sugiyama). Coming" -> "Hierarchical -- Coming"). It
                                takes the trailing-clause shape the size estimate
                                already uses on this row.
                            */
                            data={layoutPicks.map((pick) => ({
                                value: pick.value,
                                label: pickLabel(pick),
                                disabled: pick.disabledReason !== undefined,
                            }))}
                            onChange={(value) => {
                                onApplyLayout?.(String(value), layoutConfig ?? {});
                            }}
                        />
                    </FieldRow>
                </PanelSection>
            </Box>

            <PanelSection
                sectionId="style.styles"
                label="Styles"
                info={STYLES_INFO}
                actions={
                    <>
                        <ComingTag />
                        <SectionAddButton
                            tooltip="Save as style..."
                            label="Save as style..."
                            onClick={onSaveStyle}
                        />
                        <Menu position="bottom-end" withinPortal shadow="md">
                            <Menu.Target>
                                <ActionIcon
                                    type="button"
                                    variant="subtle"
                                    size={PANEL_GRID.CONTROL_HEIGHT}
                                    radius="sm"
                                    c={PANEL_INK.CHROME}
                                    title={MORE_LABEL}
                                    aria-label={MORE_LABEL}
                                    data-testid="style-styles-more"
                                >
                                    <MoreGlyph />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                {STYLES_OVERFLOW.map((row) => (
                                    <Menu.Item
                                        key={row}
                                        onClick={() => {
                                            onStylesOverflow?.(row);
                                        }}
                                    >
                                        {row}
                                    </Menu.Item>
                                ))}
                            </Menu.Dropdown>
                        </Menu>
                    </>
                }
            >
                {BUILT_IN_STYLES.map((name) => (
                    <DataRow
                        key={name}
                        name={name}
                        value={BUILT_IN_WORD}
                        onClick={() => {
                            onApplyStyle?.(name);
                        }}
                    />
                ))}
                {savedStyles.map((style) => (
                    <DataRow
                        key={style.id}
                        name={style.name}
                        value={style.savedAt}
                        selected={false}
                        onClick={() => {
                            onApplyStyle?.(style.id);
                        }}
                    />
                ))}
            </PanelSection>

            <PanelSection sectionId="style.canvas" label="Canvas">
                <Box title={legendTitle} data-testid="style-legend-row">
                    <ToggleRow
                        label="Show legend"
                        control="switch"
                        checked={legendShown}
                        onChange={(checked) => {
                            onLegendShownChange?.(checked);
                        }}
                    />
                </Box>
            </PanelSection>

            <RunLayoutsModal
                opened={layoutDialogOpen}
                is2DMode={is2DMode}
                currentLayout={layout}
                currentLayoutConfig={layoutConfig}
                onClose={() => {
                    setLayoutDialogOpen(false);
                }}
                onApply={(layoutType, config) => {
                    onApplyLayout?.(layoutType, config);
                    setLayoutDialogOpen(false);
                }}
            />
        </>
    );
}
