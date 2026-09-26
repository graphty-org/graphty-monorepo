import { Box, DirectionProvider, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import React from "react";

import {
    AdvancedButton,
    LabelsProvider,
    PANEL_GRID,
    PanelField,
    Popout,
    PopoutManager,
    TrailingSlot,
    UiGlyph,
} from "../../../src";
import { expectStatesApply } from "../../helpers/assert-states";
import { BOTH_SCHEMES, OPEN_OVERLAY } from "../../helpers/schemes";

/**
 * A 24px gear button that opens the rarely-changed settings of a row or a section, and shows
 * whether any of them has been changed from its default.
 *
 * A panel row shows the one or two controls people adjust often. Everything rarer goes behind
 * this button, usually into a pop-out, which keeps the row to one line without losing the rest.
 * Because the button hides what is behind it, its `changed` flag is the only signal a reader
 * gets that something back there is no longer standard: a changed button draws its glyph in the
 * brand ink instead of the icon ink, and says so in its accessible name.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | `AdvancedButton` | a row or a section has extra settings behind a button, and the reader must see whether they were changed |
 * | `PopoutButton` | an icon button opens a pop-out that is not "more settings for this row" (a tool, a panel), so it needs no changed state |
 * | Mantine `ActionIcon` | a one-off icon action that opens nothing |
 *
 * Always give it something to sit beside: a section whose only content is this button hides
 * everything it does.
 *
 * ## Usage
 *
 * ```tsx
 * import { AdvancedButton, Popout, TrailingSlot } from "@graphty/compact-mantine";
 *
 * <TrailingSlot>
 *     <Popout>
 *         <Popout.Trigger>
 *             <AdvancedButton label="Range and scale" changed={domain !== defaultDomain} />
 *         </Popout.Trigger>
 *         <Popout.Panel width={240} header={{ variant: "title", title: "Range and scale" }}>
 *             <Popout.Content>...</Popout.Content>
 *         </Popout.Panel>
 *     </Popout>
 * </TrailingSlot>
 * ```
 *
 * Inside `Popout.Trigger` the trigger supplies the click handler and `aria-expanded`, and the
 * theme draws the open look from it. Outside a pop-out, pass `onClick`. A pop-out must sit inside
 * a `PopoutManager`, usually once at the root of the app.
 *
 * ## Keyboard and accessibility
 *
 * - A real `<button>` built on Mantine `ActionIcon`: Tab reaches it, Enter and Space activate it,
 *   and a disabled button is skipped.
 * - Its accessible name and its tooltip (`title`) are both `label`. When `changed` is true the
 *   name becomes "<label> has configured values" (from `LabelsProvider`, so it translates), so
 *   the change is heard as well as seen (WCAG 1.4.1).
 * - `loading` replaces the glyph with a spinner, refuses activation and sets `aria-busy`.
 * - The box is exactly 24 x 24, the WCAG 2.2 minimum target size.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Box | 24 x 24, radius 5px, in the row's 24px trailing slot |
 * | Glyph | the settings gear at `PANEL_GRID.GLYPH` |
 * | Rest / changed ink | `--cm-icon` / `--cm-icon-brand` |
 * | Hover / press | `--cm-bg-transparent-hover` / `--cm-bg-transparent-pressed` |
 * | Open (`aria-expanded`) | `--cm-bg-selected` ground, brand glyph |
 */
const meta: Meta<typeof AdvancedButton> = {
    title: "Components/Actions/AdvancedButton",
    component: AdvancedButton,
    tags: ["autodocs"],
    argTypes: {
        icon: { control: false },
    },
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story) => (
            // A panel-wide ground that grows for the wider States grid.
            <Box miw={PANEL_GRID.WIDTH} w="fit-content" p="md" bg="var(--cm-bg)">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof AdvancedButton>;

/**
 * Everything behind the button is at its default: the gear draws in the icon ink and the button
 * is named after what it opens. Turn on `changed` in Controls to see the difference.
 */
export const Default: Story = {
    args: {
        label: "Image export options",
        changed: false,
        disabled: false,
        loading: false,
        onClick: () => undefined,
    },
};

const STATES = ["rest", "hover", "press", "focus"] as const;
const COLUMNS = [...STATES, "disabled", "loading", "open"] as const;

/**
 * Unchanged and changed, each in every state: rest, hover, press and focus (forced with
 * `data-state`), disabled, loading, and open -- the look it takes inside a `Popout.Trigger` while
 * its pop-out is up, read from `aria-expanded`. Light and dark side by side.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: (): React.JSX.Element => (
        <Stack gap={8}>
            <Group gap={8} wrap="nowrap">
                <Text size="xs" w={56} />
                {COLUMNS.map((c) => (
                    <Text key={c} size="xs" w={40}>
                        {c}
                    </Text>
                ))}
            </Group>
            {[false, true].map((changed) => (
                <Group key={String(changed)} gap={8} wrap="nowrap">
                    <Text size="xs" w={56}>
                        {changed ? "changed" : "default"}
                    </Text>
                    {COLUMNS.map((c) => (
                        <Group key={c} w={40}>
                            <AdvancedButton
                                label={`Image export options, ${c}`}
                                changed={changed}
                                data-state={STATES.includes(c as (typeof STATES)[number]) && c !== "rest" ? c : undefined}
                                disabled={c === "disabled"}
                                loading={c === "loading"}
                                aria-haspopup={c === "open" ? "dialog" : undefined}
                                aria-expanded={c === "open" ? true : undefined}
                            />
                        </Group>
                    ))}
                </Group>
            ))}
        </Stack>
    ),
    // Loading draws the spinner instead of the disabled look, and the changed ink gives way to disabled, loading and open.
    play: ({ canvasElement }) => expectStatesApply(canvasElement, { unchanged: ["[data-loading]", '[data-changed="true"]:is(:disabled, [aria-expanded="true"])'] }),
};

/**
 * The job it exists for: inside `Popout.Trigger` it opens a pop-out of settings, and takes the
 * open look while the pop-out is up. The trigger reports the open state as `aria-expanded`.
 */
export const OpensAPopout: Story = {
    parameters: OPEN_OVERLAY,
    render: (): React.JSX.Element => (
        <PopoutManager>
            <Group gap={PANEL_GRID.TRAIL_GAP} wrap="nowrap" h={PANEL_GRID.ROW_PITCH}>
                <PanelField label="Node size" value="1.0" width={PANEL_GRID.BODY} />
                <TrailingSlot>
                    <Popout>
                        <Popout.Trigger>
                            <AdvancedButton label="Range and scale" changed />
                        </Popout.Trigger>
                        <Popout.Panel width={240} header={{ variant: "title", title: "Range and scale" }}>
                            <Popout.Content>
                                <Text size="xs">The rarely-changed settings go here.</Text>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </TrailingSlot>
            </Group>
        </PopoutManager>
    ),
    play: async ({ canvasElement }) => {
        const button = within(canvasElement).getByRole("button", { name: /Range and scale/ });
        await userEvent.click(button);
        await waitFor(() => expect(button).toHaveAttribute("aria-expanded", "true"));
        await expect(within(document.body).getByRole("dialog")).toBeInTheDocument();
    },
};

/**
 * A button with its own glyph rather than the gear, for a section whose extra settings have a
 * shape of their own.
 */
export const CustomIcon: Story = {
    args: {
        label: "Range and scale",
        icon: <UiGlyph name="chevronRight" size={PANEL_GRID.CHEVRON} />,
        onClick: () => undefined,
    },
};

/** Where the button lives: the fixed 24px trailing slot at the end of a row. */
export const InARow: Story = {
    render: (): React.JSX.Element => (
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
                <AdvancedButton label="Range and scale" changed onClick={() => undefined} />
            </TrailingSlot>
        </Group>
    ),
};

/**
 * The slot keeps its width whether or not it holds anything, so the last control of every row
 * lines up in one column. The middle row has no button and still ends level with the two that do.
 */
export const EmptySlotKeepsTheColumn: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={PANEL_GRID.GUTTER}>
            {[
                { label: "Node size", value: "1.0", trailing: true },
                { label: "Edge width", value: "0.5", trailing: false },
                { label: "Label size", value: "12", trailing: true },
            ].map((row) => (
                <Group key={row.label} gap={PANEL_GRID.TRAIL_GAP} wrap="nowrap" h={PANEL_GRID.CONTROL_HEIGHT}>
                    <PanelField label={row.label} value={row.value} width={PANEL_GRID.BODY} />
                    <TrailingSlot>
                        {row.trailing ? <AdvancedButton label={`${row.label} options`} onClick={() => undefined} /> : null}
                    </TrailingSlot>
                </Group>
            ))}
        </Stack>
    ),
};

/**
 * The sentence a changed button adds to its name comes from `LabelsProvider`, so a translated app
 * gets a translated name; hover the second button to read it.
 */
export const Translated: Story = {
    render: (): React.JSX.Element => (
        <LabelsProvider
            locale="fr-FR"
            labels={{ sectionHasConfiguredValues: (label: string): string => `${label} : valeurs modifiees` }}
        >
            <Group gap={PANEL_GRID.TRIPLE_GAP}>
                <AdvancedButton label="Exportation d'image" onClick={() => undefined} />
                <AdvancedButton label="Exportation d'image" changed onClick={() => undefined} />
            </Group>
        </LabelsProvider>
    ),
};

/**
 * The same row right to left. The slot writes no left or right property of its own, so the row
 * reverses and the button lands on the other side without a style changing.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Box dir="rtl">
                <Group gap={PANEL_GRID.TRAIL_GAP} wrap="nowrap" h={PANEL_GRID.ROW_PITCH}>
                    <PanelField label="Size by attribute" glyph="attribute" value="Age" width={PANEL_GRID.BODY} />
                    <TrailingSlot>
                        <AdvancedButton label="Range and scale" changed onClick={() => undefined} />
                    </TrailingSlot>
                </Group>
            </Box>
        </DirectionProvider>
    ),
};
