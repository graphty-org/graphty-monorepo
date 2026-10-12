/**
 * Disabled states, every control family (issue #2102).
 *
 * A disabled control must look disabled. Each family is rendered enabled and disabled, in light
 * and dark, in the Figma look and the AA option, and the disabled render must take the values
 * design/figma-spec.md gives it (the `--cm-*-disabled` tokens) and differ from the enabled one.
 * The second half drives real input: a disabled control ignores a real click and real typing.
 */
import { ActionIcon, Button, Checkbox, NumberInput, Select, Slider, Switch, TextInput } from "@mantine/core";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { ComboInput, PanelField, SegmentedControl, ToggleIconButton } from "../../src";
import { drive, hex, part, renderFigma, resetHarness } from "../figma/harness";

type Scheme = "light" | "dark";

/** The disabled tokens (design/figma-spec.md 2.1); the AA option leaves all of them as Figma. */
const TOKENS = {
    light: {
        bg: "#ffffff",
        bgDisabled: "#d9d9d9",
        borderDisabled: "#e6e6e6",
        textDisabled: "#0000004d",
        textOnDisabled: "#ffffff",
    },
    dark: {
        bg: "#2c2c2c",
        bgDisabled: "#757575",
        borderDisabled: "#444444",
        textDisabled: "#ffffff66",
        textOnDisabled: "#2c2c2c",
    },
} as const;

type Token = keyof (typeof TOKENS)["light"];

/** One measured value: the part, the property (`placeholder` reads the ::placeholder color), the token. */
type Check = readonly [selector: string, property: "placeholder" | keyof CSSStyleDeclaration, token: Token];

interface Family {
    name: string;
    ui: (disabled: boolean) => React.ReactElement;
    checks: readonly Check[];
}

const noop = (): void => undefined;

const FAMILIES: readonly Family[] = [
    {
        // The issue's own case: an empty number field showing its placeholder. PanelField sets
        // --input-placeholder-color inline, so the placeholder kept its enabled ink.
        name: "PanelField number, empty",
        ui: (d) => (
            <PanelField label="Lowest" kind="number" value={null} placeholder="Auto" disabled={d} onChange={noop} />
        ),
        checks: [
            [".cm-input-wrapper", "backgroundColor", "bg"],
            [".cm-input-wrapper", "outlineColor", "borderDisabled"],
            ["input", "placeholder", "textDisabled"],
        ],
    },
    {
        name: "TextInput, empty",
        ui: (d) => <TextInput aria-label="Name" placeholder="Auto" disabled={d} />,
        checks: [
            [".cm-input-wrapper", "backgroundColor", "bg"],
            [".cm-input-wrapper", "outlineColor", "borderDisabled"],
            ["input", "placeholder", "textDisabled"],
        ],
    },
    {
        name: "NumberInput, with a value",
        ui: (d) => <NumberInput aria-label="X" defaultValue={40} disabled={d} />,
        checks: [
            [".cm-input-wrapper", "backgroundColor", "bg"],
            ["input", "color", "textDisabled"],
        ],
    },
    {
        name: "Select",
        ui: (d) => <Select aria-label="Device" data={["No device"]} defaultValue="No device" disabled={d} />,
        checks: [
            ["input.cm-input", "color", "textDisabled"],
            [".cm-field-caret", "color", "textDisabled"],
        ],
    },
    {
        name: "ComboInput",
        ui: (d) => <ComboInput label="Shape" options={[{ value: "a", label: "Box" }]} value="a" disabled={d} />,
        checks: [
            [".cm-input-wrapper", "backgroundColor", "bg"],
            ["input", "color", "textDisabled"],
        ],
    },
    {
        name: "Checkbox",
        ui: (d) => <Checkbox label="Keep" disabled={d} />,
        checks: [
            ["input", "borderTopColor", "borderDisabled"],
            ["label", "color", "textDisabled"],
        ],
    },
    {
        name: "Checkbox, checked",
        ui: (d) => <Checkbox label="Keep" defaultChecked disabled={d} />,
        checks: [["input", "backgroundColor", "bgDisabled"]],
    },
    {
        name: "Switch, on",
        ui: (d) => <Switch label="Show" defaultChecked disabled={d} />,
        checks: [
            [".cm-switch-track", "backgroundColor", "bgDisabled"],
            [".cm-switch-label", "color", "textDisabled"],
        ],
    },
    {
        name: "Slider",
        ui: (d) => <Slider aria-label="Size" defaultValue={40} disabled={d} />,
        checks: [[".cm-slider-bar", "backgroundColor", "bgDisabled"]],
    },
    {
        name: "Button, default",
        ui: (d) => (
            <Button variant="default" disabled={d}>
                Cancel
            </Button>
        ),
        checks: [
            ["button", "color", "textDisabled"],
            ["button", "outlineColor", "borderDisabled"],
        ],
    },
    {
        name: "Button, filled",
        ui: (d) => <Button disabled={d}>Save</Button>,
        checks: [
            ["button", "backgroundColor", "bgDisabled"],
            ["button", "color", "textOnDisabled"],
        ],
    },
    {
        name: "ActionIcon",
        ui: (d) => (
            <ActionIcon aria-label="Add" disabled={d}>
                +
            </ActionIcon>
        ),
        checks: [["button", "color", "textDisabled"]],
    },
    {
        name: "SegmentedControl",
        ui: (d) => <SegmentedControl aria-label="Scale" data={["Linear", "Log"]} disabled={d} />,
        checks: [[".cm-sc-label", "color", "textDisabled"]],
    },
    {
        name: "ToggleIconButton, off",
        ui: (d) => (
            <ToggleIconButton label="Lock" icon={<span>L</span>} checked={false} disabled={d} withTooltip={false} />
        ),
        checks: [["button", "color", "textDisabled"]],
    },
    {
        name: "ToggleIconButton, on",
        ui: (d) => <ToggleIconButton label="Lock" icon={<span>L</span>} checked disabled={d} withTooltip={false} />,
        checks: [
            ["button", "color", "textDisabled"],
            ["button", "backgroundColor", "bgDisabled"],
        ],
    },
];

/**
 * Read every check's color from one render.
 * @param ui - the element
 * @param scheme - the color scheme
 * @param highContrast - the AA option
 * @param checks - what to read
 * @returns one hex color per check
 */
async function read(
    ui: React.ReactElement,
    scheme: Scheme,
    highContrast: boolean,
    checks: readonly Check[],
): Promise<string[]> {
    const { container, unmount } = await renderFigma(ui, { scheme, highContrast });
    const values = checks.map(([selector, property]) => {
        const el = part(container, selector);
        const style = property === "placeholder" ? getComputedStyle(el, "::placeholder") : getComputedStyle(el);
        return hex(String(style[property === "placeholder" ? "color" : property]));
    });
    unmount();
    return values;
}

afterEach(async () => {
    await resetHarness();
});

describe("disabled controls look disabled (spec tokens)", () => {
    for (const highContrast of [false, true]) {
        for (const scheme of ["light", "dark"] as const) {
            it.each(FAMILIES.map((f) => [f.name, f] as const))(
                `${scheme}${highContrast ? ", AA option" : ""}: %s`,
                async (_name, family) => {
                    const enabled = await read(family.ui(false), scheme, highContrast, family.checks);
                    const disabled = await read(family.ui(true), scheme, highContrast, family.checks);
                    expect(disabled).toEqual(family.checks.map(([, , token]) => TOKENS[scheme][token]));
                    expect(disabled).not.toEqual(enabled);
                },
            );
        }
    }
});

describe("disabled controls ignore real input", () => {
    /**
     * A real mouse press and release on the element.
     * @param el - the element
     */
    async function realClick(el: HTMLElement): Promise<void> {
        await drive(el, "press");
        await commands.mouseUp();
    }

    it("a disabled text field takes neither focus nor typing", async () => {
        const onChange = vi.fn();
        const { container } = await renderFigma(<TextInput aria-label="Name" disabled onChange={onChange} />);
        const input = part(container, "input") as HTMLInputElement;
        await realClick(input);
        await userEvent.keyboard("42");
        expect(document.activeElement).not.toBe(input);
        expect(input.value).toBe("");
        expect(onChange).not.toHaveBeenCalled();
    });

    it("a disabled PanelField number takes neither focus nor typing", async () => {
        const onChange = vi.fn();
        const { container } = await renderFigma(
            <PanelField label="Lowest" kind="number" value={null} placeholder="Auto" disabled onChange={onChange} />,
        );
        const input = part(container, "input") as HTMLInputElement;
        await realClick(input);
        await userEvent.keyboard("42");
        expect(document.activeElement).not.toBe(input);
        expect(input.value).toBe("");
        expect(onChange).not.toHaveBeenCalled();
    });

    it("a disabled checkbox and switch do not toggle", async () => {
        const onCheckbox = vi.fn();
        const onSwitch = vi.fn();
        const { container } = await renderFigma(
            <>
                <Checkbox label="Keep" disabled onChange={onCheckbox} />
                <Switch label="Show" disabled onChange={onSwitch} />
            </>,
        );
        const checkbox = part(container, ".cm-checkbox-input") as HTMLInputElement;
        const toggle = part(container, ".cm-switch-track");
        await realClick(checkbox);
        await realClick(toggle);
        expect(checkbox.checked).toBe(false);
        expect((part(container, ".cm-switch-input") as HTMLInputElement).checked).toBe(false);
        expect(onCheckbox).not.toHaveBeenCalled();
        expect(onSwitch).not.toHaveBeenCalled();
    });

    it("a disabled button does not fire", async () => {
        const onClick = vi.fn();
        const { container } = await renderFigma(
            <Button disabled onClick={onClick}>
                Save
            </Button>,
        );
        await realClick(part(container, "button"));
        expect(onClick).not.toHaveBeenCalled();
    });

    it("a disabled slider does not move", async () => {
        const onChange = vi.fn();
        const { container } = await renderFigma(
            <div style={{ width: 200 }}>
                <Slider aria-label="Size" defaultValue={40} disabled onChange={onChange} />
            </div>,
        );
        await realClick(part(container, ".cm-slider-track"));
        expect(part(container, '[role="slider"]').getAttribute("aria-valuenow")).toBe("40");
        expect(onChange).not.toHaveBeenCalled();
    });
});
