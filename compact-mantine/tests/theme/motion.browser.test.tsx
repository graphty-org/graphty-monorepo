/**
 * Motion (design/figma-spec.md 2.8): the few things that move take 100ms, overlays open in one
 * frame, and a reader who asks the system for reduced motion gets no movement at all.
 */
import { Button, Checkbox, Menu, Switch } from "@mantine/core";
import { commands, userEvent } from "@vitest/browser/context";
import { afterEach, describe, expect, it } from "vitest";

import { part, renderThemed, resetHarness } from "../harness/measure";

afterEach(async () => {
    await commands.emulateReducedMotion(false);
    await resetHarness();
});

/**
 * The transitions a checkbox and a switch run.
 * @param container - the rendered controls
 * @returns duration per moving part
 */
function durations(container: HTMLElement): Record<string, string> {
    const read = (selector: string): string => getComputedStyle(part(container, selector)).transitionDuration;
    return {
        checkbox: read(".mantine-Checkbox-input"),
        track: read(".mantine-Switch-track"),
        thumb: read(".mantine-Switch-thumb"),
    };
}

describe("motion", () => {
    it("a checkbox tick and a switch knob move for 100ms", async () => {
        const { container } = await renderThemed(
            <>
                <Checkbox label="Tick" defaultChecked />
                <Switch label="Knob" defaultChecked />
            </>,
        );
        expect(durations(container)).toEqual({ checkbox: "0.1s", track: "0.1s", thumb: "0.1s" });
    });

    it("under prefers-reduced-motion nothing moves", async () => {
        await commands.emulateReducedMotion(true);
        const { container } = await renderThemed(
            <>
                <Checkbox label="Tick" defaultChecked />
                <Switch label="Knob" defaultChecked />
            </>,
        );
        expect(durations(container)).toEqual({ checkbox: "0s", track: "0s", thumb: "0s" });
    });

    it("a menu opens in one frame, with no fade", async () => {
        const { getByRole } = await renderThemed(
            <Menu>
                <Menu.Target>
                    <Button>Open</Button>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item>Copy</Menu.Item>
                </Menu.Dropdown>
            </Menu>,
        );
        await userEvent.click(getByRole("button", { name: "Open" }));
        const menu = document.querySelector<HTMLElement>(".mantine-Menu-dropdown");
        expect(menu).not.toBeNull();
        const style = getComputedStyle(menu as HTMLElement);
        expect(style.opacity).toBe("1");
        expect(style.transitionDuration).toBe("0s");
    });
});
