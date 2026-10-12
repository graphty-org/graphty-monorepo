import { MantineProvider, Tooltip } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Popout, PopoutAnchor, PopoutButton, PopoutManager } from "../../src/components/popout";
import { compactTheme } from "../../src/theme";

function renderPopout(ui: React.ReactElement): void {
    render(
        <MantineProvider theme={compactTheme}>
            <PopoutManager>{ui}</PopoutManager>
        </MantineProvider>,
    );
}

/**
 * A right-hand panel 240 wide with one row at `rowTop`, the arrangement of the app's style panel.
 * @param props - Component props
 * @param props.rowTop - How far down the panel the row with the trigger sits
 * @param props.fields - How many text fields the pop-out holds
 * @param props.tooltip - Whether the trigger button is wrapped in a Tooltip
 * @returns The panel with its row and pop-out
 */
function RightPanel({
    rowTop,
    fields,
    tooltip = false,
}: {
    rowTop: number;
    fields: number;
    tooltip?: boolean;
}): React.JSX.Element {
    const button = <button type="button">Open</button>;
    return (
        <PopoutAnchor>
            <div data-testid="right-panel" style={{ position: "fixed", top: 0, right: 0, width: 240, height: "100vh" }}>
                <div data-testid="row" style={{ position: "absolute", top: rowTop, left: 0, right: 0, height: 32 }}>
                    <Popout>
                        <Popout.Trigger>
                            {tooltip ? <Tooltip label="Settings">{button}</Tooltip> : button}
                        </Popout.Trigger>
                        <Popout.Panel width={240} header={{ variant: "title", title: "Settings" }}>
                            <Popout.Content>
                                {Array.from({ length: fields }, (_, i) => (
                                    <input
                                        key={i}
                                        aria-label={`Field ${i + 1}`}
                                        style={{ display: "block", height: 24 }}
                                    />
                                ))}
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </div>
            </div>
        </PopoutAnchor>
    );
}

async function openPanel(): Promise<HTMLElement> {
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const panel = await screen.findByRole("dialog");
    await waitFor(() => {
        expect(panel.style.visibility).not.toBe("hidden");
        expect(panel.hasAttribute("data-cm-repositioning")).toBe(false);
    });
    return panel;
}

describe("Popout fits the window, docks beside the panel, returns focus (browser)", () => {
    afterEach(async () => {
        await page.viewport(1280, 800);
    });

    it("is no taller than the window, and Tab to the last of 60 fields brings it into view", async () => {
        await page.viewport(900, 700);
        renderPopout(<RightPanel rowTop={100} fields={60} />);
        const panel = await openPanel();

        const rect = panel.getBoundingClientRect();
        expect(rect.top).toBeGreaterThanOrEqual(0);
        expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight + 0.5);

        await userEvent.click(screen.getByRole("textbox", { name: "Field 1" }));
        for (let i = 1; i < 60; i++) {
            await userEvent.keyboard("{Tab}");
        }
        const last = screen.getByRole("textbox", { name: "Field 60" });
        expect(document.activeElement).toBe(last);
        const lastRect = last.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        expect(lastRect.top).toBeGreaterThanOrEqual(panelRect.top);
        expect(lastRect.bottom).toBeLessThanOrEqual(Math.min(panelRect.bottom, window.innerHeight) + 0.5);
    });

    it("opens 240 wide with its right edge on the panel's left border, at the row's top", async () => {
        await page.viewport(900, 700);
        renderPopout(<RightPanel rowTop={200} fields={3} />);
        const panel = await openPanel();

        const rect = panel.getBoundingClientRect();
        const anchor = screen.getByTestId("right-panel").getBoundingClientRect();
        const row = screen.getByTestId("row").getBoundingClientRect();
        expect(Math.round(rect.width)).toBe(240);
        expect(Math.round(rect.left + rect.width)).toBe(Math.round(anchor.left));
        expect(Math.round(rect.top)).toBe(Math.round(row.top));
    });

    it("is shifted up to stay in the window when it would pass the bottom", async () => {
        await page.viewport(900, 700);
        renderPopout(<RightPanel rowTop={640} fields={10} />);
        const panel = await openPanel();

        const rect = panel.getBoundingClientRect();
        const row = screen.getByTestId("row").getBoundingClientRect();
        expect(rect.top).toBeLessThan(row.top);
        expect(Math.round(rect.bottom)).toBe(window.innerHeight);
    });

    it("returns focus to the button on Escape when the trigger is wrapped in a Tooltip", async () => {
        renderPopout(<RightPanel rowTop={100} fields={3} tooltip />);
        const trigger = screen.getByRole("button", { name: "Open" });
        await openPanel();
        await waitFor(() => {
            expect(document.activeElement).not.toBe(trigger);
        });

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).toBeNull();
        });
        await waitFor(() => {
            expect(document.activeElement).toBe(trigger);
        });
    });

    it("returns focus to the button on Close when the trigger is wrapped in a Tooltip", async () => {
        renderPopout(<RightPanel rowTop={100} fields={3} tooltip />);
        const trigger = screen.getByRole("button", { name: "Open" });
        await openPanel();

        await userEvent.click(screen.getByRole("button", { name: /close/i }));
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).toBeNull();
        });
        await waitFor(() => {
            expect(document.activeElement).toBe(trigger);
        });
    });

    it("returns focus to a Tooltip-wrapped button that is shown only on hover, focus or while open", async () => {
        // The style panel's vary glyph: hidden unless its field is hovered or focused, or its
        // pop-out is open. Focus is in the pop-out, so once the pop-out closes nothing keeps the
        // button shown -- focus has to reach it before it hides.
        function Field(): React.JSX.Element {
            const [open, setOpen] = useState(false);
            return (
                <div className="field">
                    <input aria-label="Value" />
                    <span className="vary">
                        <Popout opened={open} onOpenChange={setOpen}>
                            <Popout.Trigger>
                                <Tooltip label="Vary by">
                                    <PopoutButton icon="=" aria-label="Vary" />
                                </Tooltip>
                            </Popout.Trigger>
                            <Popout.Panel width={240} header={{ variant: "title", title: "Vary by" }}>
                                <Popout.Content>
                                    <input aria-label="Search" data-autofocus />
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    </span>
                </div>
            );
        }
        renderPopout(
            <>
                <style>{`.field:not(:hover, :focus-within) .vary:not(:has([aria-expanded="true"])) { display: none; }`}</style>
                <Field />
            </>,
        );
        await userEvent.click(screen.getByRole("textbox", { name: "Value" }));
        await userEvent.keyboard("{Tab}");
        const trigger = screen.getByRole("button", { name: "Vary" });
        expect(document.activeElement).toBe(trigger);
        await userEvent.keyboard("{Enter}");
        const search = await screen.findByRole("textbox", { name: "Search" });
        await waitFor(() => {
            expect(document.activeElement).toBe(search);
        });

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).toBeNull();
        });
        await waitFor(() => {
            expect(document.activeElement).toBe(trigger);
        });
        expect(trigger.getAttribute("aria-expanded")).toBe("false");
    });
});
