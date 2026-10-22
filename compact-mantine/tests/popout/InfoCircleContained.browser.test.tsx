/**
 * An info bubble inside a side panel as narrow as the bubble stays inside the panel: inset from
 * both of its edges and narrowed to fit, never reaching the window's edge.
 */
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { InfoCircle } from "../../src/components/InfoCircle";
import { PopoutAnchor, PopoutManager } from "../../src/components/popout";
import { compactTheme } from "../../src/theme";

describe("InfoCircle in a narrow side panel (browser)", () => {
    it("keeps the bubble inside the panel, off both edges", async () => {
        render(
            <MantineProvider theme={compactTheme}>
                <PopoutManager>
                    <PopoutAnchor>
                        <div
                            data-testid="panel"
                            style={{ position: "fixed", top: 0, right: 0, width: 240, height: "100vh" }}
                        >
                            <div style={{ display: "flex", justifyContent: "flex-end", padding: "100px 8px 0" }}>
                                <InfoCircle label="Degree">
                                    A node&apos;s degree is how many edges touch it. On a directed graph, in-degree
                                    counts the edges that arrive and out-degree the edges that leave.
                                </InfoCircle>
                            </div>
                        </div>
                    </PopoutAnchor>
                </PopoutManager>
            </MantineProvider>,
        );
        await userEvent.click(screen.getByRole("button", { name: "About Degree" }));
        const bubble = await screen.findByRole("dialog");
        const panel = screen.getByTestId("panel").getBoundingClientRect();
        await waitFor(() => {
            expect(bubble.style.visibility).not.toBe("hidden");
            expect(bubble.hasAttribute("data-cm-repositioning")).toBe(false);
            const box = bubble.getBoundingClientRect();
            expect(box.left).toBeGreaterThanOrEqual(panel.left + 8);
            expect(box.right).toBeLessThanOrEqual(panel.right - 8);
        });
        // The text wraps inside the narrowed bubble rather than running past it.
        const text = bubble.querySelector<HTMLElement>(".cm-info-bubble")!;
        expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth);
    });
});
