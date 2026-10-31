/**
 * A Select inside a scrolling container, its list not portalled (`withinPortal: false`, as every
 * in-popover list in the graphty app): the list stays inside the container's visible part and the
 * viewport, lines its selected option up on the field, and its last option is reached by a click
 * on the list, not by scrolling the container under the pointer (#4484).
 */
import { MantineProvider, Select } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { compactTheme } from "../../../src";
import { untilPasses } from "../../../stories/helpers/settled";

const OPTIONS = Array.from({ length: 23 }, (_, i) => `Map ${String(i + 1)}`);

describe("a Select in a scrolling container (browser)", () => {
    afterEach(async () => {
        await page.viewport(1280, 800);
    });

    it("opens inside the container's visible part, on its field, and its last option is clicked", async () => {
        await page.viewport(1366, 768);
        render(
            <MantineProvider theme={compactTheme} forceColorScheme="light">
                <div
                    data-testid="body"
                    style={{ position: "fixed", top: 257, left: 400, width: 300, height: 427, overflowY: "auto" }}
                >
                    <div style={{ height: 30 }} />
                    <Select
                        aria-label="Map"
                        data={OPTIONS}
                        defaultValue="Map 1"
                        comboboxProps={{ withinPortal: false }}
                        style={{ width: 160 }}
                    />
                    <div style={{ height: 520 }} />
                </div>
            </MantineProvider>,
        );
        const body = screen.getByTestId("body");
        const field = body.querySelector<HTMLElement>(".cm-input-wrapper");
        const input = body.querySelector<HTMLElement>(".cm-input");
        expect(field).not.toBeNull();
        await userEvent.click(input as HTMLElement);
        let list: HTMLElement | undefined;
        await untilPasses(() => {
            list = [...body.querySelectorAll<HTMLElement>(".cm-listbox")].find((el) => el.checkVisibility());
            expect(list).toBeDefined();
        });
        const visible = body.getBoundingClientRect();
        await untilPasses(() => {
            const box = (list as HTMLElement).getBoundingClientRect();
            expect(box.top).toBeGreaterThanOrEqual(visible.top);
            expect(box.bottom).toBeLessThanOrEqual(visible.bottom);
            const selected = (list as HTMLElement).querySelector<HTMLElement>("[data-checked]");
            const on = (selected as HTMLElement).getBoundingClientRect().top;
            expect(Math.abs(on - (field as HTMLElement).getBoundingClientRect().top)).toBeLessThanOrEqual(1);
        });

        await userEvent.click(screen.getByRole("option", { name: "Map 23" }));
        await untilPasses(() => {
            expect((input as HTMLInputElement).value).toBe("Map 23");
        });
        // The list scrolled, not the container.
        expect(body.scrollTop).toBe(0);
    });
});
