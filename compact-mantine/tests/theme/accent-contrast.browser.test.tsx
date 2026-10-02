/**
 * Text and glyphs on the accent fill, measured in a real browser.
 *
 * The compact theme uses a dark accent with white text in the light scheme and
 * a light accent with black text in the dark scheme. Mantine decides the text
 * colour of many controls once, in JavaScript, from the light-scheme shade, and
 * a few controls hard-code white. Either way the dark scheme would get white on
 * the light accent (2.99:1). These tests read the colours the browser actually
 * paints, in both schemes, so any control that slips back fails here.
 */
import {
    ActionIcon,
    Badge,
    Button,
    Checkbox,
    MantineProvider,
    Pagination,
    Radio,
    Select,
    Switch,
    ThemeIcon,
} from "@mantine/core";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

type Scheme = "light" | "dark";

function channels(color: string): [number, number, number] {
    const match = /rgba?\(([^)]+)\)/.exec(color);
    if (!match) {
        throw new Error(`unparsed colour ${color}`);
    }
    const [r, g, b] = match[1].split(/[ ,/]+/).map(Number);
    return [r, g, b];
}

function luminance(color: string): number {
    const [r, g, b] = channels(color).map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

function style(selector: string): CSSStyleDeclaration {
    const element = document.querySelector(selector);
    if (!element) {
        throw new Error(`no element for ${selector}`);
    }
    return getComputedStyle(element);
}

function renderIn(scheme: Scheme, ui: React.ReactElement): void {
    render(
        <MantineProvider theme={compactTheme} forceColorScheme={scheme}>
            {ui}
        </MantineProvider>,
    );
}

afterEach(() => {
    cleanup();
});

describe.each<Scheme>(["light", "dark"])("accent contrast (%s scheme)", (scheme) => {
    it("filled Button text passes 4.5:1", () => {
        renderIn(scheme, <Button>Apply</Button>);
        const root = style(".mantine-Button-root");
        expect(contrast(root.color, root.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    });

    it("filled Button in a non-primary colour passes 4.5:1", () => {
        renderIn(scheme, <Button color="red">Delete</Button>);
        const root = style(".mantine-Button-root");
        expect(contrast(root.color, root.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    });

    it("default ThemeIcon glyph passes 3:1", () => {
        renderIn(scheme, <ThemeIcon>x</ThemeIcon>);
        const root = style(".mantine-ThemeIcon-root");
        expect(contrast(root.color, root.backgroundColor)).toBeGreaterThanOrEqual(3);
    });

    it("active Pagination page passes 4.5:1", () => {
        renderIn(scheme, <Pagination total={3} defaultValue={1} />);
        const active = style(".mantine-Pagination-control[data-active]");
        expect(contrast(active.color, active.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    });

    it("filled ActionIcon glyph passes 3:1", () => {
        renderIn(scheme, <ActionIcon variant="filled">x</ActionIcon>);
        const root = style(".mantine-ActionIcon-root");
        expect(contrast(root.color, root.backgroundColor)).toBeGreaterThanOrEqual(3);
    });

    it("filled Badge text passes 4.5:1", () => {
        renderIn(scheme, <Badge>new</Badge>);
        const root = style(".mantine-Badge-root");
        expect(contrast(root.color, root.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    });

    it("checked Checkbox tick passes 3:1", () => {
        renderIn(scheme, <Checkbox defaultChecked label="On" />);
        const icon = style(".mantine-Checkbox-icon");
        const box = style(".mantine-Checkbox-input");
        expect(contrast(icon.color, box.backgroundColor)).toBeGreaterThanOrEqual(3);
    });

    it("checked Radio dot passes 3:1", () => {
        renderIn(scheme, <Radio defaultChecked label="On" />);
        const icon = style(".mantine-Radio-icon");
        const dot = style(".mantine-Radio-radio");
        expect(contrast(icon.color, dot.backgroundColor)).toBeGreaterThanOrEqual(3);
    });

    it("checked Switch thumb passes 3:1 and its on-label 4.5:1", () => {
        renderIn(scheme, <Switch defaultChecked onLabel="ON" offLabel="OFF" label="Auto" />);
        const track = style(".mantine-Switch-track");
        const thumb = style(".mantine-Switch-thumb");
        expect(contrast(thumb.backgroundColor, track.backgroundColor)).toBeGreaterThanOrEqual(3);
        expect(contrast(track.color, track.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    });

    it("the keyboard-selected Select option passes 4.5:1", async () => {
        renderIn(scheme, <Select data={["Alpha", "Beta"]} label="Pick" defaultDropdownOpened />);
        const input = document.querySelector<HTMLInputElement>(".mantine-Select-input");
        if (!input) {
            throw new Error("no select input");
        }
        input.focus();
        fireEvent.keyDown(input, { key: "ArrowDown", code: "ArrowDown" });
        const option = await waitFor(() => {
            const found = document.querySelector("[data-combobox-selected]");
            if (!found) {
                throw new Error("no selected option");
            }
            return found;
        });
        const computed = getComputedStyle(option);
        expect(contrast(computed.color, computed.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    });
});
