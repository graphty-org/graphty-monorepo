import { Box, DirectionProvider, Group, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";

import {
    AdvancedButton,
    ControlSection,
    LabelsProvider,
    PANEL_GRID,
    PanelField,
    TrailingSlot,
    UiGlyph,
} from "../src";
// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * A named, collapsible group of controls for a dense property panel: a 1px
 * rule, a 32px header carrying the section's name, the rows it holds, and 8px
 * of padding beneath them.
 *
 * **Why it exists.** Naming a group once in its header is what lets every row
 * inside it spend its width on values instead of on a label and a button of its
 * own. A panel built out of sections reads as a short list of subjects rather
 * than as forty controls.
 *
 * **When to use it**
 * - Around two or more rows that share a subject -- Size, Colour, Layout.
 * - As the resting place for a subject the app supports but the reader has not
 *   set up yet: `empty` dims the name and offers a single "+".
 * - Not around a single advanced settings button. A section that reveals
 *   nothing when you open it is a dead end.
 *
 * **What it guarantees**
 * - **A section always expands.** The chevron is drawn only where there is
 *   something behind it, so an open section never surprises the reader with an
 *   empty box. In development, a section given neither children nor `empty`
 *   warns in the console.
 * - The name is the accessible name of the whole group, and the header is a
 *   disclosure button carrying `aria-expanded` and `aria-controls`.
 * - `info` is announced as the section's description, so a screen reader reads
 *   the explanation together with the name.
 * - Every string it produces comes from `LabelsProvider` and can be
 *   translated, and its padding and its chevron follow the text direction.
 *
 * **Open state.** Leave it alone and the section keeps its own, starting open.
 * Pass `opened` with `onOpenChange` to drive it from your own state.
 */
const meta: Meta<typeof ControlSection> = {
    title: "Building a Panel/ControlSection",
    component: ControlSection,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story) => (
            <Box w={PANEL_GRID.WIDTH} p="md" bg="var(--mantine-color-body)">
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
        <Group gap={PANEL_GRID.GUTTER} wrap="nowrap" h={PANEL_GRID.ROW_PITCH}>
            <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
            <PanelField label="Largest node size" glyph="sizeLargest" value="2.0" />
            <TrailingSlot />
        </Group>
    );
}

/**
 * The attribute the size is read from, with its own advanced settings button.
 * @returns One field row and its trailing button
 */
function AttributeRow(): React.JSX.Element {
    return (
        <Group gap={PANEL_GRID.TRAIL_GAP} wrap="nowrap" h={PANEL_GRID.ROW_PITCH}>
            <PanelField
                label="Size by attribute"
                glyph="attribute"
                value="Age"
                bound
                kind="select"
                width={PANEL_GRID.BODY}
            />
            <TrailingSlot>
                <AdvancedButton label="Range and scale" onClick={() => undefined} />
            </TrailingSlot>
        </Group>
    );
}

/**
 * A section that holds something: the name in the primary text colour, a
 * chevron because there is something to expand, and the rows underneath it.
 */
export const Default: Story = {
    args: {
        label: "Size",
        children: (
            <>
                <SizeRow />
                <AttributeRow />
            </>
        ),
    },
};

/**
 * The same section closed, through `defaultOpened={false}`. The chevron turns
 * to its sideways form and the rows are still there: the header promises they
 * exist, and opening it keeps that promise.
 */
export const Collapsed: Story = {
    args: {
        label: "Size",
        defaultOpened: false,
        children: (
            <>
                <SizeRow />
                <AttributeRow />
            </>
        ),
    },
};

/**
 * A 6px accent dot after the name says the section holds settings the reader
 * changed from their defaults. The dot is announced as well as drawn, as
 * "Size has configured values", so the signal does not depend on seeing it.
 */
export const WithConfiguredValues: Story = {
    args: {
        label: "Size",
        hasConfiguredValues: true,
        children: (
            <>
                <SizeRow />
                <AttributeRow />
            </>
        ),
    },
};

/**
 * A section for a subject that is not set up yet: a dimmed name, no chevron in
 * the 16px slot, one "+" at the end of the header, and no content -- no "Not
 * set", no "None", no empty-state sentence.
 *
 * The dimming is a second signal rather than the only one, which is what keeps
 * the state readable for someone who cannot tell the two text colours apart:
 * the missing chevron and the "Add edge properties" button say the same thing
 * in shape and in words. `onAdd` should commit to a sensible default rather
 * than open a chooser, since the reader can change whatever it made once the
 * section exists.
 */
export const Empty: Story = {
    args: {
        label: "Edge properties",
        empty: true,
        onAdd: () => undefined,
    },
};

/**
 * An explanation, put behind a circled "i" one hover, tap or focus away,
 * instead of spending a line of the panel on it. It is also wired as the
 * section's accessible description, so a screen reader reads it with the
 * section's name whether or not the bubble is open.
 */
export const WithInfo: Story = {
    args: {
        label: "Betweenness",
        info: "How often a cat sits on the shortest path between two others. Mr_Whiskers scores highest in this graph.",
        children: (
            <Group gap={PANEL_GRID.TRAIL_GAP} wrap="nowrap" h={PANEL_GRID.ROW_PITCH}>
                <PanelField label="Nodes to rank" glyph="N" value="20" width={PANEL_GRID.BODY} />
                <TrailingSlot />
            </Group>
        ),
    },
};

/**
 * The section's own buttons live in the header, so no row inside spends width
 * on one. An advanced settings button -- a gear that opens the settings most
 * people never change -- is an addition to the rows on the panel, never a
 * replacement for them: the controls a reader commonly adjusts stay in front of
 * them, and only the rarer parameters go behind the gear.
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
                <Group gap={PANEL_GRID.TRAIL_GAP} wrap="nowrap" h={PANEL_GRID.ROW_PITCH}>
                    <PanelField label="Layout" value="Force directed" kind="select" width={PANEL_GRID.BODY} />
                    <TrailingSlot />
                </Group>
                <Group gap={PANEL_GRID.GUTTER} wrap="nowrap" h={PANEL_GRID.ROW_PITCH}>
                    <PanelField label="Link distance" glyph="D" value="60" />
                    <PanelField label="Repulsion" glyph="K" value="0.9" />
                    <TrailingSlot />
                </Group>
            </>
        ),
    },
};

/**
 * The open state driven from outside, through `opened` and `onOpenChange`.
 * `onOpenChange` is handed the new state first and the event that caused it
 * second, so a consumer can read modifier keys from it -- here, holding Shift
 * opens a section without closing the other one.
 */
export const Controlled: Story = {
    render: (): React.JSX.Element => {
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
                    <Group gap={PANEL_GRID.TRAIL_GAP} wrap="nowrap" h={PANEL_GRID.ROW_PITCH}>
                        <PanelField
                            label="Color by attribute"
                            glyph="attribute"
                            value="Bridges"
                            bound
                            kind="select"
                            width={PANEL_GRID.BODY}
                        />
                        <TrailingSlot />
                    </Group>
                </ControlSection>
            </Stack>
        );
    },
};

/**
 * How the component reads in a panel. Sections that hold something carry their
 * rows and their name in the primary text colour; the dim names below them are
 * a scannable inventory of what has not been set up yet.
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
                info="Cats are coloured by the attribute chosen here. Age and Betweenness both carry a ramp."
            >
                <Group gap={PANEL_GRID.TRAIL_GAP} wrap="nowrap" h={PANEL_GRID.ROW_PITCH}>
                    <PanelField
                        label="Color by attribute"
                        glyph="attribute"
                        value="Betweenness"
                        bound
                        kind="select"
                        width={PANEL_GRID.BODY}
                    />
                    <TrailingSlot>
                        <AdvancedButton label="Ramp and domain" changed onClick={() => undefined} />
                    </TrailingSlot>
                </Group>
            </ControlSection>
            <ControlSection label="Edge properties" empty onAdd={() => undefined} />
            <ControlSection label="Labels" empty onAdd={() => undefined} />
        </Stack>
    ),
};

/**
 * The same panel in a right-to-left interface. The 16px and 8px padding follow
 * the text direction rather than the left and right edges, so the header and
 * the rows still land on one grid; the collapsed section's chevron points the
 * way the text runs.
 *
 * Wrap your app in Mantine's `DirectionProvider` and this comes free -- there
 * is nothing to configure on the section itself.
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

/**
 * Every string the section produces -- the expand and collapse verbs, the "Add"
 * button, the configured-values dot and the "About" circle -- comes from
 * `LabelsProvider`, so nothing it says to a screen reader is stuck in English.
 * Entries you leave out keep their English defaults, and a consumer who does
 * not translate anything needs no provider at all.
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
