/**
 * Every dropdown is capped at the visual viewport's height less 16px, its contents scrolling inside
 * (design/rendering/shader-studio/decisions.md 6.2): a long list on an iPad never runs off the
 * screen, and an on-screen keyboard, which shrinks only the visual viewport, shrinks the cap.
 */
import { MantineProvider, Popover } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { ComboInput, compactTheme } from "../../../src";
import { untilPasses } from "../../../stories/helpers/settled";

const WIDTH = 1180;
const HEIGHT = 820;

const OPTIONS = Array.from({ length: 60 }, (_, i) => ({
    value: `shape-${String(i + 1)}`,
    label: `Shape ${String(i + 1)}`,
}));

/**
 * Render with the compact theme.
 * @param ui - the element
 */
function renderThemed(ui: React.ReactElement): void {
    render(
        <MantineProvider theme={compactTheme} forceColorScheme="light">
            {ui}
        </MantineProvider>,
    );
}

/**
 * The cap the package keeps on `<html>`, in px.
 * @returns the cap
 */
function cap(): number {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cm-viewport-cap"));
}

/**
 * Open the 60-option list and wait until floating-ui has placed it.
 * @returns the open list
 */
async function openList(): Promise<HTMLElement> {
    await userEvent.click(screen.getByRole("button", { name: "Open list" }));
    let list: HTMLElement | undefined;
    await untilPasses(() => {
        list = [...document.querySelectorAll<HTMLElement>(".cm-listbox")].find((el) => el.checkVisibility());
        expect(list).toBeDefined();
        expect(list?.getBoundingClientRect().height).toBeGreaterThan(0);
    });
    return list as HTMLElement;
}

describe("dropdowns are capped at the visual viewport (browser)", () => {
    afterEach(async () => {
        await page.viewport(1280, 800);
    });

    it("a 60-option list stays inside a 1180 x 820 viewport and its last option is reached by wheel", async () => {
        await page.viewport(WIDTH, HEIGHT);
        renderThemed(
            <div style={{ padding: "300px 400px" }}>
                <ComboInput label="Shape" options={OPTIONS} defaultValue="shape-30" width={160} />
            </div>,
        );
        const list = await openList();
        await untilPasses(() => {
            const box = list.getBoundingClientRect();
            expect(box.top).toBeGreaterThanOrEqual(0);
            expect(box.bottom).toBeLessThanOrEqual(HEIGHT - 8);
            expect(box.height).toBeLessThanOrEqual(HEIGHT - 16);
        });
        expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);

        const last = screen.getByRole("option", { name: "Shape 60" });
        for (
            let turn = 0;
            turn < 20 && last.getBoundingClientRect().bottom > list.getBoundingClientRect().bottom;
            turn++
        ) {
            await userEvent.wheel(list, { delta: { y: 400 } });
        }
        await untilPasses(() => {
            const row = last.getBoundingClientRect();
            const box = list.getBoundingClientRect();
            expect(row.top).toBeGreaterThanOrEqual(box.top);
            expect(row.bottom).toBeLessThanOrEqual(box.bottom + 0.5);
        });
        // The list scrolled, not the page.
        expect(document.scrollingElement?.scrollTop ?? 0).toBe(0);
    });

    it("shrinking the visual viewport shrinks the cap, and an open list with it", async () => {
        await page.viewport(WIDTH, HEIGHT);
        renderThemed(
            <div style={{ padding: "300px 400px" }}>
                <ComboInput label="Shape" options={OPTIONS} width={160} />
            </div>,
        );
        await untilPasses(() => {
            expect(cap()).toBe(Math.floor((window.visualViewport?.height ?? 0) - 16));
        });
        const full = cap();
        expect(full).toBe(HEIGHT - 16);
        const list = await openList();
        expect(list.getBoundingClientRect().height).toBeLessThanOrEqual(full + 0.5);

        // The test runs in a frame, whose visual viewport is the frame: shrinking it is what an
        // on-screen keyboard does to the page's visual viewport. That the cap reads the visual
        // viewport and not the window is tested in viewportCap.test.ts.
        await page.viewport(WIDTH, 500);
        await untilPasses(() => {
            expect(window.visualViewport?.height).toBe(500);
            expect(cap()).toBe(500 - 16);
        });
        expect(cap()).toBeLessThan(full);
        await untilPasses(() => {
            expect(list.getBoundingClientRect().height).toBeLessThanOrEqual(cap() + 0.5);
        });
    });

    it("a Mantine Popover taller than the cap scrolls inside it", async () => {
        await page.viewport(WIDTH, HEIGHT);
        renderThemed(
            <div style={{ padding: "100px 400px" }}>
                <Popover opened withinPortal>
                    <Popover.Target>
                        <button type="button">Gallery</button>
                    </Popover.Target>
                    <Popover.Dropdown data-testid="gallery">
                        {OPTIONS.map((option) => (
                            <div key={option.value} style={{ height: 32 }}>
                                {option.label}
                            </div>
                        ))}
                    </Popover.Dropdown>
                </Popover>
            </div>,
        );
        const dropdown = await screen.findByTestId("gallery");
        await untilPasses(() => {
            const box = dropdown.getBoundingClientRect();
            expect(box.height).toBeLessThanOrEqual(HEIGHT - 16 + 0.5);
            expect(box.top).toBeGreaterThanOrEqual(0);
            expect(box.bottom).toBeLessThanOrEqual(HEIGHT);
        });
        expect(dropdown.scrollHeight).toBeGreaterThan(dropdown.clientHeight);
        const last = screen.getByText("Shape 60");
        for (
            let turn = 0;
            turn < 20 && last.getBoundingClientRect().bottom > dropdown.getBoundingClientRect().bottom;
            turn++
        ) {
            await userEvent.wheel(dropdown, { delta: { y: 400 } });
        }
        await untilPasses(() => {
            expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(
                dropdown.getBoundingClientRect().bottom + 0.5,
            );
        });
    });
});
