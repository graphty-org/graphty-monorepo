import { Box, DirectionProvider, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";

import { AdvancedButton, ControlSection, FieldRow, LabelsProvider, PANEL_GRID, PanelField, UiGlyph } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { StoryState, StoryStates } from "../../helpers/story-panel";

/**
 * A named, collapsible section of a property panel: a 40px header carrying the
 * section's name, the rows it holds, and a 1px rule below it.
 *
 * Naming a subject once in its header is what lets every row inside spend its
 * width on values instead of on a label of its own. A panel built from sections
 * reads as a short list of subjects -- Size, Color, Layout -- rather than as
 * forty controls.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | **ControlSection** | A subject of the panel: two or more rows that share a name, which the reader may fold away, or a subject the app supports but the reader has not set up yet (`empty`). |
 * | **ControlGroup** | A named cluster of rows that never folds, inside a section or inside a pop-out. |
 * | **ControlSubGroup** | A quieter fold one level below a section, for settings most readers never open. Prefer an `AdvancedButton` in `actions` that opens a pop-out. |
 *
 * **A section always expands.** The chevron is drawn only where there is
 * something behind it, and in development a section given neither children nor
 * `empty` warns in the console. An advanced settings button goes in `actions`,
 * beside the rows and never instead of them.
 *
 * ## Usage
 *
 * ```tsx
 * import { AdvancedButton, ControlSection, FieldRow, PanelField } from "@graphty/compact-mantine";
 *
 * <ControlSection
 *     label="Size"
 *     hasConfiguredValues={size !== defaultSize}
 *     info="How big each node is drawn."
 *     actions={<AdvancedButton label="Range and scale" onClick={openRange} />}
 * >
 *     <FieldRow groupLabel="Node size range">
 *         <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
 *         <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
 *     </FieldRow>
 * </ControlSection>
 *
 * <ControlSection label="Edge properties" empty onAdd={addEdgeProperties} />
 * ```
 *
 * Leave the open state alone and the section keeps its own, starting open
 * (`defaultOpened`). Pass `opened` with `onOpenChange` to drive it from your own
 * state; `onOpenChange` receives the new state and the event that caused it.
 *
 * ## Keyboard and accessibility
 *
 * - The header toggle is a real button carrying `aria-expanded` and
 *   `aria-controls`; Enter and Space fold and unfold it. Its name keeps the verb
 *   in front: "Collapse Size", "Expand Size".
 * - The section is a `group` named by its visible title. `info` becomes the
 *   group's accessible description, so a screen reader reads the explanation
 *   with the name whether or not the bubble is open.
 * - `hasConfiguredValues` draws a 6px accent dot that is announced as well as
 *   drawn ("Size has configured values").
 * - An empty section is never signaled by color alone: it loses its chevron
 *   and gains an "Add ..." button.
 * - Every string comes from `LabelsProvider` and can be translated; padding and
 *   chevron follow the text direction.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Header | 40px tall, padding 0 8px 0 16px |
 * | Title | 11px / 32px line, weight 550, primary ink (secondary when `empty`) |
 * | Chevron | 16px slot in the left gutter, 5 x 3 caret, only where the section collapses |
 * | Actions | 24 x 24 ghost icon buttons, 4px apart, ending at x 232 |
 * | Body | the rows on the 240px grid, then 12px of bottom padding |
 * | Rule | 1px `--cm-border` below the section, full panel width |
 * | Motion | opens and closes in one frame; an empty title warms to the primary ink over 100ms on hover |
 */
const meta: Meta<typeof ControlSection> = {
    title: "Components/Panels and rows/ControlSection",
    component: ControlSection,
    parameters: {
        layout: "padded",
    },
    argTypes: {
        children: { control: false },
        actions: { control: false },
        info: { control: "text" },
    },
    decorators: [
        // Every story sits in a 240px panel on the panel ground. The section draws its own
        // 16 | 8 padding, so the panel adds none. States lays out several panels side by
        // side, so it brings its own.
        (Story, context): React.JSX.Element =>
            context.name === "States" ? (
                <Story />
            ) : (
                <Box w={PANEL_GRID.WIDTH} bg="var(--cm-bg)">
                    <Story />
                </Box>
            ),
    ],
};

export default meta;
type Story = StoryObj<typeof ControlSection>;

/**
 * The pair of size fields a Size section keeps on the panel.
 * @returns One field row holding two fields
 */
function SizeRow(): React.JSX.Element {
    return (
        <FieldRow groupLabel="Node size range">
            <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
            <PanelField label="Largest node size" glyph="sizeLargest" value="2.0" />
        </FieldRow>
    );
}

/**
 * The attribute the size is read from, with its own advanced settings button.
 * @returns One field row and its trailing button
 */
function AttributeRow(): React.JSX.Element {
    return (
        <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={() => undefined} />}>
            <PanelField label="Size by attribute" glyph="attribute" value="Age" bound kind="select" />
        </FieldRow>
    );
}

/**
 * A section that holds something: the name in the primary ink, a chevron
 * because there is something to fold, and the rows underneath. Edit the props
 * in the Controls table.
 */
export const Default: Story = {
    args: {
        label: "Size",
        hasConfiguredValues: false,
        empty: false,
        collapsible: true,
        children: (
            <>
                <SizeRow />
                <AttributeRow />
            </>
        ),
    },
};

/**
 * Every state of the section header, light and dark: open with header actions,
 * closed (the chevron turns sideways and the rows are still there behind it),
 * empty at rest and under the pointer (title, chevron and "+" come up to the
 * primary ink over 100ms), the keyboard focus ring on the toggle, a section that
 * does not collapse, and one with configured values and a technical name.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => {
        const rows = (
            <FieldRow>
                <PanelField label="X" value="100" />
                <PanelField label="Y" value="40" />
            </FieldRow>
        );
        return (
            <StoryStates>
                <StoryState name="Open, with actions">
                    <ControlSection label="Fill" actions={<AdvancedButton label="Apply styles" />}>
                        {rows}
                    </ControlSection>
                </StoryState>
                <StoryState name="Closed">
                    <ControlSection label="Export" defaultOpened={false}>
                        {rows}
                    </ControlSection>
                </StoryState>
                <StoryState name="Empty">
                    <ControlSection label="Stroke" empty onAdd={() => undefined} />
                </StoryState>
                <StoryState name="Empty, hover" force="hover">
                    <ControlSection label="Stroke" empty onAdd={() => undefined} />
                </StoryState>
                <StoryState name="Focus (keyboard)" force="focus">
                    <ControlSection label="Export">{rows}</ControlSection>
                </StoryState>
                <StoryState name="Not collapsible">
                    <ControlSection label="Position" collapsible={false}>
                        {rows}
                    </ControlSection>
                </StoryState>
                <StoryState name="Configured, technical name">
                    <ControlSection label="Arrangement" technicalName="Layout" hasConfiguredValues>
                        {rows}
                    </ControlSection>
                </StoryState>
            </StoryStates>
        );
    },
};

/**
 * An explanation behind a circled "i", one hover, tap or focus away, instead of
 * a line of the panel. It is also the section's accessible description.
 */
export const WithInfo: Story = {
    args: {
        label: "Betweenness",
        info: "How often a cat sits on the shortest path between two others. Mr_Whiskers scores highest in this graph.",
        children: (
            <FieldRow>
                <PanelField label="Nodes to rank" glyph="N" value="20" />
            </FieldRow>
        ),
    },
};

/**
 * The section's own buttons live in the header, so no row inside spends width
 * on one. An advanced settings button is an addition to the rows, never a
 * replacement for them.
 */
export const WithActions: Story = {
    args: {
        label: "Layout",
        actions: (
            <>
                <AdvancedButton
                    label="Recompute layout"
                    icon={<UiGlyph name="refresh" size={PANEL_GRID.GLYPH} />}
                    onClick={() => undefined}
                />
                <AdvancedButton label="Advanced layout parameters" changed onClick={() => undefined} />
            </>
        ),
        children: (
            <>
                <FieldRow>
                    <PanelField label="Layout" value="Force directed" kind="select" />
                </FieldRow>
                <FieldRow>
                    <PanelField label="Link distance" glyph="D" value="60" />
                    <PanelField label="Repulsion" glyph="K" value="0.9" />
                </FieldRow>
            </>
        ),
    },
};

/**
 * The open state driven from outside through `opened` and `onOpenChange`. The
 * handler gets the event second, so a consumer can read modifier keys: here,
 * holding Shift opens a section without closing the other one.
 */
export const Controlled: Story = {
    render: function ControlledSections(): React.JSX.Element {
        const [open, setOpen] = useState<string[]>(["Size"]);

        /**
         * Opens one section, closing the other unless Shift was held.
         * @param name - The section being opened or closed
         * @returns A handler for that section's `onOpenChange`
         */
        function toggle(name: string) {
            return (opened: boolean, event?: React.SyntheticEvent): void => {
                const additive = event !== undefined && "shiftKey" in event && event.shiftKey === true;

                setOpen((current) => {
                    if (!opened) {
                        return current.filter((item) => item !== name);
                    }
                    return additive ? [...current, name] : [name];
                });
            };
        }

        return (
            <Stack gap={0}>
                <ControlSection label="Size" opened={open.includes("Size")} onOpenChange={toggle("Size")}>
                    <SizeRow />
                </ControlSection>
                <ControlSection label="Color" opened={open.includes("Color")} onOpenChange={toggle("Color")}>
                    <FieldRow>
                        <PanelField label="Color by attribute" glyph="attribute" value="Bridges" bound kind="select" />
                    </FieldRow>
                </ControlSection>
            </Stack>
        );
    },
};

/**
 * A panel of sections. Sections that hold something carry their rows and their
 * name in the primary ink; the dim names below are a scannable inventory of what
 * has not been set up yet.
 */
export const APanelOfSections: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={0}>
            <ControlSection label="Size">
                <SizeRow />
                <AttributeRow />
            </ControlSection>
            <ControlSection
                label="Color"
                hasConfiguredValues
                info="Cats are colored by the attribute chosen here. Age and Betweenness both carry a ramp."
            >
                <FieldRow trailing={<AdvancedButton label="Ramp and domain" changed onClick={() => undefined} />}>
                    <PanelField label="Color by attribute" glyph="attribute" value="Betweenness" bound kind="select" />
                </FieldRow>
            </ControlSection>
            <ControlSection label="Edge properties" empty onAdd={() => undefined} />
            <ControlSection label="Labels" empty onAdd={() => undefined} />
        </Stack>
    ),
};

/**
 * Every string the section produces -- the expand and collapse verbs, the "Add"
 * button, the configured-values dot and the "About" circle -- comes from
 * `LabelsProvider`. Entries you leave out keep their English defaults.
 */
export const Translated: Story = {
    render: (): React.JSX.Element => (
        <LabelsProvider
            locale="fr-FR"
            labels={{
                expandSection: (label: string): string => `Afficher ${label}`,
                collapseSection: (label: string): string => `Masquer ${label}`,
                addToSection: (label: string): string => `Ajouter ${label}`,
                sectionHasConfiguredValues: (label: string): string => `${label} a des valeurs definies`,
                about: (label: string): string => `A propos de ${label}`,
            }}
        >
            <Stack gap={0}>
                <ControlSection label="Taille" hasConfiguredValues info="La taille de chaque noeud.">
                    <SizeRow />
                </ControlSection>
                <ControlSection label="Proprietes des aretes" empty onAdd={() => undefined} />
            </Stack>
        </LabelsProvider>
    ),
};

/**
 * The same panel right to left. The 16px and 8px padding follow the text
 * direction, and a collapsed section's chevron points the way the text runs.
 * Wrap your app in Mantine's `DirectionProvider`; there is nothing to set on
 * the section.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Box dir="rtl">
                <Stack gap={0}>
                    <ControlSection label="Size">
                        <SizeRow />
                        <AttributeRow />
                    </ControlSection>
                    <ControlSection label="Color" defaultOpened={false} hasConfiguredValues>
                        <SizeRow />
                    </ControlSection>
                    <ControlSection label="Edge properties" empty onAdd={() => undefined} />
                </Stack>
            </Box>
        </DirectionProvider>
    ),
};
