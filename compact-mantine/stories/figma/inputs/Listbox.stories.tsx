import { Autocomplete, ColorInput, MultiSelect, NativeSelect, Select, TagsInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import { StateGrid } from "./StateGrid";

/**
 * The select trigger and the dark listbox (design/figma-spec.md 6.4, 6.5), and the other themed
 * Mantine inputs that open it. The Select trigger is the one OUTLINED field; its list opens OVER
 * the trigger with the selected option exactly on it, 8px before it, and only one row is ever
 * filled. Autocomplete, MultiSelect and TagsInput open the same list below the field.
 */
const meta: Meta = {
    title: "Figma/Inputs/Select and listbox",
};

export default meta;
type Story = StoryObj;

const ALIGN = ["Center", "Inside", "Outside"];

/** The trigger's states side by side; switch light / dark and the contrast mode in the toolbar. */
export const TriggerStates: Story = {
    render: () => (
        <StateGrid
            cells={[
                { state: "rest", node: <Select aria-label="Stroke align" data={ALIGN} defaultValue="Inside" w={76} /> },
                {
                    state: "hover (no change)",
                    node: <Select aria-label="Stroke align" data={ALIGN} defaultValue="Inside" w={76} data-state="hover" />,
                },
                {
                    state: "keyboard focus",
                    node: <Select aria-label="Stroke align" data={ALIGN} defaultValue="Inside" w={76} data-state="focus" />,
                },
                { state: "disabled", node: <Select aria-label="Device" data={["No device"]} defaultValue="No device" w={208} disabled /> },
                { state: "208 wide", node: <Select aria-label="Device" data={["No device"]} defaultValue="No device" w={208} /> },
                { state: "filled variant", node: <Select aria-label="Font style" variant="filled" data={["Regular"]} defaultValue="Regular" w={88} /> },
                { state: "NativeSelect", node: <NativeSelect aria-label="Scale" data={["1x", "2x"]} w={88} /> },
                { state: "ColorInput", node: <ColorInput aria-label="Fill" defaultValue="#1a1a1a" w={156} /> },
            ]}
        />
    ),
};

/** The list open over its trigger, the selected option on top of it. */
export const OpenOverTrigger: Story = {
    render: () => (
        <div style={{ padding: "120px 40px" }}>
            <Select aria-label="Stroke align" data={ALIGN} defaultValue="Inside" w={76} defaultDropdownOpened />
        </div>
    ),
};

/** Groups, a disabled option and a long list clamped to the viewport, each shown open. */
export const GroupsAndLongLists: Story = {
    render: () => (
        <div style={{ display: "flex", gap: 120, padding: "80px 40px" }}>
            <Select
                aria-label="Shape"
                w={120}
                defaultDropdownOpened
                defaultValue="Rectangle"
                data={[
                    { group: "Shapes", items: ["Rectangle", { value: "Ellipse", label: "Ellipse", disabled: true }] },
                    { group: "Text", items: ["Heading", "Body"] },
                ]}
            />
            <Select
                aria-label="Font size"
                w={88}
                defaultDropdownOpened
                defaultValue="96"
                data={[10, 11, 12, 13, 14, 15, 16, 20, 24, 32, 36, 40, 48, 64, 96, 128].map(String)}
            />
            <Select
                aria-label="Long list"
                w={120}
                defaultDropdownOpened
                placeholder="60 options"
                data={Array.from({ length: 60 }, (_, i) => `Option ${String(i + 1)}`)}
            />
        </div>
    ),
};

/** Lists that open below: Autocomplete, MultiSelect (variable-pill shaped pills) and TagsInput; the first two shown open. */
export const BelowTheField: Story = {
    render: () => (
        <StateGrid
            cells={[
                { state: "Autocomplete", node: <Autocomplete aria-label="Layer" data={["Frame 1", "Frame 2"]} w={160} defaultDropdownOpened /> },
                { state: "MultiSelect", node: <MultiSelect aria-label="Tags" data={["Alpha", "Beta", "Gamma"]} defaultValue={["Alpha", "Beta"]} w={184} defaultDropdownOpened /> },
                { state: "TagsInput", node: <TagsInput aria-label="Keywords" defaultValue={["draft"]} w={184} /> },
            ]}
        />
    ),
};

/** Keyboard: Enter opens on the selected option, ArrowDown moves, Enter commits, Escape closes. */
export const Keyboard: Story = {
    render: () => (
        <div style={{ padding: "120px 40px" }}>
            <Select aria-label="Stroke align" data={ALIGN} defaultValue="Inside" w={76} />
        </div>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const trigger = canvas.getByRole("combobox", { name: "Stroke align" });
        await userEvent.tab();
        await expect(trigger).toHaveFocus();
        await userEvent.keyboard("{Enter}");
        const body = within(canvasElement.ownerDocument.body);
        const inside = await body.findByRole("option", { name: "Inside" });
        await waitFor(() => {
            const t = trigger.closest(".cm-input-wrapper")?.getBoundingClientRect().top ?? 0;
            return expect(Math.abs(inside.getBoundingClientRect().top - t)).toBeLessThanOrEqual(1);
        });
        await userEvent.keyboard("{ArrowDown}{Enter}");
        await expect(trigger).toHaveValue("Outside");
        await expect(trigger).toHaveFocus();
    },
};
