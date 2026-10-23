/**
 * Shared controls in a space narrower than their usual size, in a real browser: a toolbar wraps
 * its tools onto more rows inside a container sized to its content (a zoomed page, a narrow
 * canvas), and a color field with its reset button stays inside a row narrower than the panel
 * grid's (a panel showing a scrollbar), so neither cuts a control off nor scrolls sideways.
 */
import { afterEach, describe, expect, it } from "vitest";

import { CompactColorInput, PopoutManager, Toolbar, ToolButton } from "../../../src";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

describe("controls in a narrow space", () => {
    it("wraps a toolbar's tools inside a content-sized container narrower than one row", async () => {
        const { container } = await renderThemed(
            <div style={{ position: "relative", width: 160, height: 300 }}>
                <div className="dock" style={{ position: "absolute", left: 0, right: 0, width: "fit-content" }}>
                    <Toolbar aria-label="Tools">
                        {["One", "Two", "Three", "Four", "Five", "Six", "Seven"].map((name) => (
                            <ToolButton key={name} icon={<span />} label={name} />
                        ))}
                    </Toolbar>
                </div>
            </div>,
        );
        const dock = container.querySelector<HTMLElement>(".dock")!.getBoundingClientRect();
        for (const tool of container.querySelectorAll<HTMLElement>(".cm-toolbar button")) {
            expect(tool.getBoundingClientRect().right).toBeLessThanOrEqual(dock.right);
        }
        expect(container.querySelector<HTMLElement>(".cm-toolbar")!.getBoundingClientRect().height).toBeGreaterThan(48);
    });

    it("keeps a color field's reset button inside a row narrower than the panel grid", async () => {
        const { container } = await renderThemed(
            <PopoutManager>
                <div className="row" style={{ width: 190 }}>
                    <CompactColorInput
                        label="Background color"
                        color="#112233"
                        defaultColor="#ffffff"
                        onChangeEnd={() => undefined}
                    />
                </div>
            </PopoutManager>,
        );
        const row = container.querySelector<HTMLElement>(".row")!.getBoundingClientRect();
        const reset = container.querySelector<HTMLElement>("[data-testid=compact-color-input-reset]")!;
        expect(reset.getBoundingClientRect().right).toBeLessThanOrEqual(row.right);
    });
});
