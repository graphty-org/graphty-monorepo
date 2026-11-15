/**
 * Menus follow the page's color scheme: a light menu with dark ink in the light app, a dark
 * one in the dark app, and variant="inverse" for a menu that is dark in both. Each menu is
 * opened by a real click, as a reader opens it.
 */
import { Button, Menu, Select } from "@mantine/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { drive, expectMeasured, part, renderThemed, resetHarness } from "../harness/measure";

afterEach(resetHarness);

/** WCAG relative luminance of an opaque rgb() color. */
function luminance(color: string): number {
    const [r, g, b] = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map((c) => {
        const v = Number(c) / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast of two opaque colors. */
function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/** Composite a translucent text color over an opaque ground, as the eye sees it. */
function over(text: string, ground: string): string {
    const [r, g, b, a = 1] = (text.match(/[\d.]+/g) ?? []).map(Number);
    const [gr, gg, gb] = (ground.match(/[\d.]+/g) ?? []).map(Number);
    return `rgb(${r * a + gr * (1 - a)}, ${g * a + gg * (1 - a)}, ${b * a + gb * (1 - a)})`;
}

function TestMenu({ variant }: { variant?: string }): React.JSX.Element {
    return (
        <Menu variant={variant}>
            <Menu.Target>
                <Button>Open</Button>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Item rightSection="Ctrl+K">Actions</Menu.Item>
                <Menu.Item rightSection="Ctrl+O">File</Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
}

/** The element `selector` finds once it is in the document. */
function appeared(selector: string): Promise<HTMLElement> {
    return vi.waitFor(() => {
        const el = document.querySelector<HTMLElement>(selector);
        if (!el) {
            throw new Error(`no ${selector} yet`);
        }
        return el;
    });
}

async function openMenu(container: HTMLElement): Promise<HTMLElement> {
    await userEvent.click(part(container, "button"));
    return appeared(".mantine-Menu-dropdown");
}

function item(text: string): HTMLElement {
    const found = [...document.querySelectorAll<HTMLElement>("[data-menu-item]")].find((el) =>
        el.textContent?.includes(text),
    );
    if (!found) {
        throw new Error(`no menu row ${text}`);
    }
    return found;
}

describe("menus follow the page's scheme", () => {
    const cases = [
        {
            name: "light app: light menu, dark ink",
            scheme: "light",
            variant: undefined,
            bg: "#ffffff",
            ink: "#000000e5",
        },
        { name: "dark app: dark menu, white ink", scheme: "dark", variant: undefined, bg: "#1e1e1e", ink: "#ffffff" },
        {
            name: "inverse in the light app: dark menu",
            scheme: "light",
            variant: "inverse",
            bg: "#1e1e1e",
            ink: "#ffffff",
        },
        {
            name: "inverse in the dark app: dark menu",
            scheme: "dark",
            variant: "inverse",
            bg: "#1e1e1e",
            ink: "#ffffff",
        },
    ] as const;

    for (const c of cases) {
        it(c.name, async () => {
            const { container } = await renderThemed(<TestMenu variant={c.variant} />, { scheme: c.scheme });
            const surface = await openMenu(container);
            expectMeasured(surface, { backgroundColor: c.bg });
            expectMeasured(item("File"), { color: c.ink });
        });
    }

    for (const scheme of ["light", "dark"] as const) {
        // Figma's own menu values miss AA in places; the AA option (highContrast) meets it.
        it(`${scheme}, AA option: text meets 4.5:1 and the highlight 3:1, at rest and under the pointer`, async () => {
            const { container } = await renderThemed(<TestMenu />, { scheme, highContrast: true });
            const surface = await openMenu(container);
            const ground = getComputedStyle(surface).backgroundColor;
            // A click opens it with no row highlighted, so "File" is at rest; then the pointer takes it.
            const file = item("File");
            const shortcut = part(file, '[data-position="right"]');
            expect(contrast(over(getComputedStyle(file).color, ground), ground)).toBeGreaterThanOrEqual(4.5);
            expect(contrast(over(getComputedStyle(shortcut).color, ground), ground)).toBeGreaterThanOrEqual(4.5);
            await drive(file, "hover");
            const pill = getComputedStyle(file, "::before").backgroundColor;
            expect(contrast(pill, ground)).toBeGreaterThanOrEqual(3);
            expect(contrast(over(getComputedStyle(file).color, pill), pill)).toBeGreaterThanOrEqual(4.5);
            expect(contrast(over(getComputedStyle(shortcut).color, pill), pill)).toBeGreaterThanOrEqual(4.5);
            // the keyboard-focused row gave its highlight up and is back to the menu's ink
            expectMeasured(item("Actions"), { backgroundColor: "#00000000" }, { pseudo: "::before" });
            expect(contrast(over(getComputedStyle(item("Actions")).color, ground), ground)).toBeGreaterThanOrEqual(4.5);
        });
    }

    it("a Select's listbox follows the page too", async () => {
        const { container } = await renderThemed(<Select aria-label="Pick" data={["One", "Two"]} />);
        await userEvent.click(part(container, "input"));
        const listbox = await appeared(".cm-listbox");
        expectMeasured(listbox, { backgroundColor: "#ffffff" });
        expectMeasured(part(listbox, "[role=option]"), { color: "#000000e5" });
    });

    it("a Select's listbox takes the inverse class through classNames", async () => {
        const { container } = await renderThemed(
            <Select aria-label="Pick" data={["One", "Two"]} classNames={{ dropdown: "cm-menu-inverse" }} />,
        );
        await userEvent.click(part(container, "input"));
        const listbox = await appeared(".cm-listbox");
        expectMeasured(listbox, { backgroundColor: "#1e1e1e" });
        expectMeasured(part(listbox, "[role=option]"), { color: "#ffffff" });
    });
});
