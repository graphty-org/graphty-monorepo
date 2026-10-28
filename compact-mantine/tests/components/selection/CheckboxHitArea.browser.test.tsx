import { Checkbox, MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { compactTheme, Tree } from "../../../src";

/**
 * The extra-small Checkbox draws a 12 px box and takes clicks over 24 x 24 (WCAG 2.5.8), so a
 * filter step's tick in a list row is not a 12 px aim.
 */
afterEach(() => {
    document.body.innerHTML = "";
});

function mount(ui: React.ReactElement): HTMLElement {
    const host = document.createElement("div");
    document.body.appendChild(host);
    render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>, { container: host });
    return host;
}

/** Click a page point through a real pointer: `within` is an element under which the point lies. */
async function clickAt(within: HTMLElement, x: number, y: number): Promise<void> {
    const box = within.getBoundingClientRect();
    await userEvent.click(within, { position: { x: x - box.left, y: y - box.top } });
}

describe("extra-small Checkbox hit area", () => {
    it("draws the box at 12 px and toggles on a click 6 px outside it", async () => {
        const host = mount(
            <div data-testid="pad" style={{ padding: 30, width: 100 }}>
                <Checkbox size="xs" aria-label="Apply" />
            </div>,
        );
        const pad = host.querySelector<HTMLElement>("[data-testid=pad]")!;
        const input = host.querySelector<HTMLInputElement>("input")!;
        const drawn = host.querySelector(".cm-checkbox-inner")!.getBoundingClientRect();
        expect([drawn.width, drawn.height]).toEqual([12, 12]);

        await clickAt(pad, drawn.left - 6, drawn.top + 6);
        expect(input.checked).toBe(true);
        await clickAt(pad, drawn.right + 5, drawn.bottom + 5);
        expect(input.checked).toBe(false);
        // Past the 24 px area, nothing.
        await clickAt(pad, drawn.left - 8, drawn.top + 6);
        expect(input.checked).toBe(false);
    });

    it("on 20 px rows, a click on the next row goes to the next row's box", async () => {
        const host = mount(
            <div data-testid="list" style={{ width: 200 }}>
                {[0, 1, 2].map((i) => (
                    <div key={i} style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
                        <span style={{ flex: 1 }}>Step {i}</span>
                        <Checkbox size="xs" aria-label={`Apply ${i}`} />
                    </div>
                ))}
            </div>,
        );
        const list = host.querySelector<HTMLElement>("[data-testid=list]")!;
        const inputs = [...host.querySelectorAll<HTMLInputElement>("input")];
        const rows = [...list.children].map((r) => r.getBoundingClientRect());
        const x = inputs[0].closest(".cm-checkbox-inner")!.getBoundingClientRect().left + 6;

        // The second row's first pixel row, where the first box's area overhangs it.
        await clickAt(list, x, rows[1].top);
        expect(inputs.map((i) => i.checked)).toEqual([false, true, false]);
        await clickAt(list, x, rows[2].top + 1);
        expect(inputs.map((i) => i.checked)).toEqual([false, true, true]);
    });

    it("passes axe target-size in a Tree row", async () => {
        const items = ["a", "b", "c"].map((id) => ({
            id,
            name: `Step ${id}`,
            description: "77 to 26 nodes",
            descriptionVisible: true,
            actions: (
                <span data-pinned="">
                    <Checkbox size="xs" aria-label={`Apply ${id}`} defaultChecked={id !== "b"} />
                </span>
            ),
        }));
        mount(
            <div style={{ width: 240 }}>
                <Tree label="Filters" items={items} />
            </div>,
        );
        const result = await axe.run(document.body, { runOnly: ["target-size"] });
        expect(result.violations.flatMap((v) => v.nodes.map((n) => n.failureSummary))).toEqual([]);
    });
});
