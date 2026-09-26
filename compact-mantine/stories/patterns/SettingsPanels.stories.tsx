import { Box, Group, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import {
    AdvancedButton,
    CompactColorInput,
    ControlGroup,
    ControlSection,
    FieldRow,
    PANEL_GRID,
    PANEL_INK,
    PanelField,
    PanelLabelsProvider,
    Popout,
    PopoutButton,
    PopoutManager,
    RampRow,
    StyleNumberInput,
    ToggleRow,
    ToggleRowGroup,
    ToggleWithContent,
    TrailingSlot,
    UiGlyph,
} from "../../src";
import { BOTH_SCHEMES } from "../helpers/schemes";

// Imported from "../../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine`.

/**
 * Whole settings panels, built from the package's own pieces the way an application builds
 * them. Each story is a recipe: open "Show code" under it and copy the composition.
 *
 * ## What each panel is made of
 *
 * | Story | Composed from |
 * |---|---|
 * | Sidebar | a 240px column in a [Popout.Anchor](?path=/docs/components-overlays-popout--docs); one [ControlSection](?path=/docs/components-panels-and-rows-controlsection--docs) per subject; [FieldRow](?path=/docs/components-panels-and-rows-fieldrow--docs) of [PanelField](?path=/docs/components-inputs-panelfield--docs); a [RampRow](?path=/docs/components-color-ramprow--docs); [CompactColorInput](?path=/docs/components-color-compactcolorinput--docs); [ToggleWithContent](?path=/docs/components-selection-togglewithcontent--docs); an [AdvancedButton](?path=/docs/components-actions-advancedbutton--docs) in a section header opening a [Popout](?path=/docs/components-overlays-popout--docs) |
 * | PopOutPanel | rows ending in a [TrailingSlot](?path=/docs/components-panels-and-rows-trailingslot--docs) that holds a [PopoutButton](?path=/docs/components-overlays-popoutbutton--docs); each pop-out holds [ControlGroup](?path=/docs/components-panels-and-rows-controlgroup--docs)s under a [PanelLabelsProvider](?path=/docs/components-panels-and-rows-fieldrow--docs) |
 * | GroupedControls | two [ControlSection](?path=/docs/components-panels-and-rows-controlsection--docs)s, each holding named [ControlGroup](?path=/docs/components-panels-and-rows-controlgroup--docs)s of [FieldRow](?path=/docs/components-panels-and-rows-fieldrow--docs)s, and a [ToggleWithContent](?path=/docs/components-selection-togglewithcontent--docs) with a [StyleNumberInput](?path=/docs/components-inputs-stylenumberinput--docs) inside |
 * | InlineSettings | [FieldRow](?path=/docs/components-panels-and-rows-fieldrow--docs) with `labelPosition="inline"` under a [PanelLabelsProvider](?path=/docs/components-panels-and-rows-fieldrow--docs), and a [ToggleRowGroup](?path=/docs/components-selection-togglerowgroup--docs) |
 *
 * ## The rules every panel here keeps
 *
 * - **The panel is 240px wide** and every row spends it the same way:
 *   `16 + 88 + 8 + 88 + 8 + 24 + 8`. `PANEL_GRID` names each number, so a row of your own can
 *   match without retyping them. See [Spacing, radii and grid](?path=/docs/foundations-spacing-radii-and-grid--docs).
 * - **A section's name does the labeling.** Fields carry a glyph instead of a caption, so a
 *   row stays one line. Switch the words on with `PanelLabelsProvider` where there is no glyph
 *   to draw, as the pop-outs here do.
 * - **Rare settings go behind a gear.** A section or a row shows what is adjusted often; an
 *   `AdvancedButton` opens a pop-out with the rest. It is always beside something, never the
 *   only content of a section.
 * - **Every color is a token.** Use `PANEL_INK` roles (or the `--cm-*` custom properties) for
 *   your own surfaces, so the panel follows light and dark and the WCAG AA option.
 * - **Pop-outs need a `PopoutManager`** somewhere above them, once per application.
 *
 * ```tsx
 * import { PopoutManager } from "@graphty/compact-mantine";
 *
 * <MantineProvider theme={compactTheme}>
 *     <PopoutManager>
 *         <App />
 *     </PopoutManager>
 * </MantineProvider>;
 * ```
 */
const meta: Meta = {
    title: "Patterns/Settings panels",
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story): React.JSX.Element => (
            <PopoutManager>
                <Story />
            </PopoutManager>
        ),
    ],
};

export default meta;

type Story = StoryObj;

/** The 240px panel ground every story here draws on. */
const PANEL_STYLE: React.CSSProperties = {
    width: PANEL_GRID.WIDTH,
    background: PANEL_INK.PANEL,
    color: PANEL_INK.VALUE,
};

/**
 * One launcher row: a name at the panel's leading padding and a pop-out button in the trailing
 * slot, on the 32px row pitch.
 * @param props - Component props
 * @param props.name - The row's name, which is also the pop-out's title
 * @param props.icon - The glyph on the button
 * @param props.children - The pop-out's content
 * @returns One row and the pop-out it opens
 */
function PopoutRow({
    name,
    icon,
    children,
}: {
    name: string;
    icon: "gear" | "eye" | "settings";
    children: React.ReactNode;
}): React.JSX.Element {
    return (
        <Popout>
            <Group
                h={PANEL_GRID.ROW_PITCH}
                gap={PANEL_GRID.TRAIL_GAP}
                wrap="nowrap"
                style={{ paddingInlineStart: PANEL_GRID.PAD_LEFT, paddingInlineEnd: PANEL_GRID.PAD_RIGHT }}
            >
                <Text size="sm" style={{ flex: 1 }}>
                    {name}
                </Text>
                <TrailingSlot>
                    <Popout.Trigger>
                        <PopoutButton icon={<UiGlyph name={icon} size={12} />} aria-label={`Open ${name.toLowerCase()}`} />
                    </Popout.Trigger>
                </TrailingSlot>
            </Group>
            <Popout.Panel width={PANEL_GRID.POPOVER_WIDTH} header={{ variant: "title", title: name }} placement="right">
                <Popout.Content>
                    <PanelLabelsProvider showLabels>{children}</PanelLabelsProvider>
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/**
 * A node settings sidebar beside a canvas: a Size section with a pair of fields and the ramp
 * between them, a Color section, and a Labels section whose gear opens "Label settings" to the
 * left, flush with the sidebar's edge.
 */
export const Sidebar: Story = {
    render: (): React.JSX.Element => (
        <Box style={{ display: "flex", height: 520, border: `1px solid ${PANEL_INK.BORDER}` }}>
            <Box
                style={{
                    flex: 1,
                    minWidth: 240,
                    background: PANEL_INK.SURFACE,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Text size="sm" c={PANEL_INK.CHROME}>
                    Canvas
                </Text>
            </Box>

            {/* The anchor makes every pop-out opened from the sidebar line up with its edge. */}
            <Popout.Anchor>
                <Box
                    component="aside"
                    aria-label="Node settings"
                    style={{ ...PANEL_STYLE, borderInlineStart: `1px solid ${PANEL_INK.BORDER}`, overflowY: "auto" }}
                >
                    <ControlSection label="Size">
                        <FieldRow groupLabel="Node size">
                            <PanelField label="Smallest node size" glyph="sizeSmallest" kind="number" defaultValue={1} />
                            <PanelField label="Largest node size" glyph="sizeLargest" kind="number" defaultValue={4} />
                        </FieldRow>
                        <RampRow label="Size range" min="1.0" max="4.0" variant="size" scale="sqrt" />
                    </ControlSection>

                    <ControlSection label="Color">
                        <CompactColorInput label="Fill" defaultColor="#4A90D9" defaultOpacity={100} />
                        <CompactColorInput label="Border" defaultColor="#2D5A87" showOpacity={false} />
                    </ControlSection>

                    <Popout>
                        <ControlSection
                            label="Labels"
                            actions={
                                <Popout.Trigger>
                                    <AdvancedButton label="Label settings" />
                                </Popout.Trigger>
                            }
                        >
                            <ToggleWithContent label="Node labels" defaultChecked>
                                <StyleNumberInput label="Font size" defaultValue={12} min={8} max={24} suffix="px" />
                            </ToggleWithContent>
                        </ControlSection>
                        <Popout.Panel
                            width={PANEL_GRID.POPOVER_WIDTH}
                            header={{ variant: "title", title: "Label settings" }}
                            placement="left"
                        >
                            <Popout.Content>
                                <CompactColorInput label="Text color" defaultColor="#FFFFFF" showOpacity={false} />
                                <CompactColorInput label="Background" defaultColor="#000000" defaultOpacity={60} />
                                <ToggleRowGroup label="Label options">
                                    <ToggleRow label="Bold" />
                                    <ToggleRow label="Only on hover" />
                                </ToggleRowGroup>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </Box>
            </Popout.Anchor>
        </Box>
    ),
};

/**
 * Three rows, each opening its own floating panel: "General settings", "Appearance" and
 * "Advanced settings". A pop-out keeps the reader in place while they adjust something rarely
 * changed. The pop-outs show each field's word above it through `PanelLabelsProvider`, because
 * those fields have no glyph to stand in for the word.
 */
export const PopOutPanel: Story = {
    render: (): React.JSX.Element => (
        <Popout.Anchor>
            <Box style={{ ...PANEL_STYLE, border: `1px solid ${PANEL_INK.BORDER}`, paddingBlock: 4 }}>
                <PopoutRow name="General settings" icon="settings">
                    <FieldRow>
                        <PanelField label="Project name" defaultValue="My project" />
                    </FieldRow>
                    <FieldRow>
                        <PanelField label="Maximum items" kind="number" defaultValue={100} min={1} />
                    </FieldRow>
                    <ToggleRowGroup label="Behavior">
                        <ToggleRow label="Auto-save" defaultChecked />
                        <ToggleRow label="Tooltips" defaultChecked />
                    </ToggleRowGroup>
                </PopoutRow>

                <PopoutRow name="Appearance" icon="eye">
                    <CompactColorInput label="Background" defaultColor="#1A1B1E" showOpacity={false} />
                    <CompactColorInput label="Accent" defaultColor="#0D99FF" defaultOpacity={100} />
                </PopoutRow>

                <PopoutRow name="Advanced settings" icon="gear">
                    <ControlGroup label="Rendering">
                        <FieldRow>
                            <PanelField label="Render mode" data={["WebGL", "WebGPU", "Canvas"]} defaultValue="WebGL" />
                        </FieldRow>
                        <FieldRow>
                            <PanelField label="Frame rate limit" kind="number" defaultValue={60} min={30} max={144} unit="fps" />
                        </FieldRow>
                    </ControlGroup>
                    <ToggleRowGroup label="Diagnostics">
                        <ToggleRow label="Debug mode" />
                        <ToggleRow label="Performance overlay" />
                    </ToggleRowGroup>
                </PopoutRow>
            </Box>
        </Popout.Anchor>
    ),
};

/**
 * A panel organized into sections, and sections into named groups: a section is a subject that
 * folds, a group is a named cluster of rows inside it that never does. Shown in light and dark.
 */
export const GroupedControls: Story = {
    parameters: BOTH_SCHEMES,
    render: (): React.JSX.Element => (
        <Box style={PANEL_STYLE}>
            <ControlSection label="Node">
                <ControlGroup label="Size">
                    <FieldRow groupLabel="Node size">
                        <PanelField label="Smallest node size" glyph="sizeSmallest" kind="number" defaultValue={1} />
                        <PanelField label="Largest node size" glyph="sizeLargest" kind="number" defaultValue={4} />
                    </FieldRow>
                </ControlGroup>
                <ControlGroup label="Outline">
                    <FieldRow>
                        <PanelField label="Outline width" glyph="width" kind="number" defaultValue={1} unit="px" />
                        <PanelField label="Outline opacity" glyph="opacity" kind="number" defaultValue={100} unit="%" />
                    </FieldRow>
                </ControlGroup>
            </ControlSection>

            <ControlSection label="Effects">
                <ToggleWithContent label="Shadow">
                    <CompactColorInput label="Color" defaultColor="#000000" defaultOpacity={25} />
                    <StyleNumberInput label="Blur" defaultValue={4} min={0} max={64} suffix="px" />
                </ToggleWithContent>
                <ToggleWithContent label="Glow" defaultChecked>
                    <StyleNumberInput label="Radius" defaultValue={8} min={0} max={64} suffix="px" />
                </ToggleWithContent>
            </ControlSection>
        </Box>
    ),
};

/**
 * Quick settings with the word beside every field: `FieldRow labelPosition="inline"` under
 * `PanelLabelsProvider` puts each field's label in a 72px column, which suits a short list of
 * unrelated settings. Shown in light and dark.
 */
export const InlineSettings: Story = {
    parameters: BOTH_SCHEMES,
    render: (): React.JSX.Element => (
        <Box style={{ ...PANEL_STYLE, paddingInlineStart: PANEL_GRID.PAD_LEFT, paddingInlineEnd: PANEL_GRID.PAD_RIGHT }}>
            <PanelLabelsProvider showLabels>
                <FieldRow labelPosition="inline">
                    <PanelField label="Opacity" glyph="opacity" kind="number" defaultValue={100} min={0} max={100} unit="%" />
                </FieldRow>
                <FieldRow labelPosition="inline">
                    <PanelField label="Blend" data={["Normal", "Multiply", "Screen", "Overlay"]} defaultValue="Normal" />
                </FieldRow>
                <FieldRow labelPosition="inline">
                    <PanelField label="Scale" glyph="attribute" data={["Square root", "Linear", "Logarithmic"]} defaultValue="Linear" />
                </FieldRow>
                <ToggleRowGroup label="Visibility">
                    <ToggleRow label="Visible" defaultChecked />
                    <ToggleRow label="Locked" />
                </ToggleRowGroup>
            </PanelLabelsProvider>
        </Box>
    ),
};
