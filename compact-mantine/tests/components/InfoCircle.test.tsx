import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../src";
import { InfoCircle } from "../../src/components/InfoCircle";
import { Popout, PopoutManager } from "../../src/components/popout";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderCircle(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

const EXPLANATION = "How often a node sits on the shortest path between two others.";

describe("InfoCircle", () => {
    it("names what it explains", () => {
        renderCircle(<InfoCircle label="Betweenness">{EXPLANATION}</InfoCircle>);

        expect(screen.getByRole("button", { name: "About Betweenness" })).toBeInTheDocument();
    });

    it("keeps the explanation closed until it is asked for", () => {
        renderCircle(<InfoCircle label="Betweenness">{EXPLANATION}</InfoCircle>);

        expect(screen.queryByText(EXPLANATION)).not.toBeInTheDocument();
    });

    it("opens on click", async () => {
        const user = userEvent.setup();
        renderCircle(<InfoCircle label="Betweenness">{EXPLANATION}</InfoCircle>);

        await user.click(screen.getByRole("button", { name: "About Betweenness" }));

        await waitFor(() => {
            expect(screen.getByText(EXPLANATION)).toBeInTheDocument();
        });
    });

    it("opens from the keyboard", async () => {
        const user = userEvent.setup();
        renderCircle(<InfoCircle label="Betweenness">{EXPLANATION}</InfoCircle>);

        await user.tab();

        expect(screen.getByRole("button", { name: "About Betweenness" })).toHaveFocus();
        await waitFor(() => {
            expect(screen.getByText(EXPLANATION)).toBeInTheDocument();
        });
    });

    it("closes on Escape", async () => {
        const user = userEvent.setup();
        renderCircle(<InfoCircle label="Betweenness">{EXPLANATION}</InfoCircle>);

        await user.tab();
        await waitFor(() => {
            expect(screen.getByText(EXPLANATION)).toBeInTheDocument();
        });

        await user.keyboard("{Escape}");

        await waitFor(() => {
            expect(screen.queryByText(EXPLANATION)).not.toBeInTheDocument();
        });
    });

    it("wires the explanation as the trigger's accessible description", async () => {
        const user = userEvent.setup();
        renderCircle(<InfoCircle label="Betweenness">{EXPLANATION}</InfoCircle>);

        const trigger = screen.getByRole("button", { name: "About Betweenness" });
        expect(trigger).not.toHaveAttribute("aria-describedby");

        await user.click(trigger);

        await waitFor(() => {
            const describedBy = trigger.getAttribute("aria-describedby") ?? "";
            expect(describedBy).not.toBe("");
            expect(document.getElementById(describedBy)).toHaveTextContent(EXPLANATION);
        });
    });

    it("reports whether the bubble is open", async () => {
        const user = userEvent.setup();
        renderCircle(<InfoCircle label="Betweenness">{EXPLANATION}</InfoCircle>);

        const trigger = screen.getByRole("button", { name: "About Betweenness" });
        expect(trigger).toHaveAttribute("aria-expanded", "false");

        await user.click(trigger);

        await waitFor(() => {
            expect(trigger).toHaveAttribute("aria-expanded", "true");
        });
    });

    it("closes on Escape after being opened with the mouse", async () => {
        // The published component documented this and did not do it: its
        // Escape handler was on the trigger, so a bubble opened by hovering was
        // not closed by Escape at all. Dismissal now belongs to the floating
        // layer, which listens on the document.
        const user = userEvent.setup();
        renderCircle(<InfoCircle label="Betweenness">{EXPLANATION}</InfoCircle>);

        await user.click(screen.getByRole("button", { name: "About Betweenness" }));
        await waitFor(() => {
            expect(screen.getByText(EXPLANATION)).toBeInTheDocument();
        });

        await user.keyboard("{Escape}");

        await waitFor(() => {
            expect(screen.queryByText(EXPLANATION)).not.toBeInTheDocument();
        });
    });

    it("closes when something else on the page is clicked", async () => {
        const user = userEvent.setup();
        renderCircle(
            <div>
                <button data-testid="elsewhere">Elsewhere</button>
                <InfoCircle label="Betweenness">{EXPLANATION}</InfoCircle>
            </div>,
        );

        await user.click(screen.getByRole("button", { name: "About Betweenness" }));
        await waitFor(() => {
            expect(screen.getByText(EXPLANATION)).toBeInTheDocument();
        });

        await user.click(screen.getByTestId("elsewhere"));

        await waitFor(() => {
            expect(screen.queryByText(EXPLANATION)).not.toBeInTheDocument();
        });
    });

    it("leaves focus where it was when the bubble opens", async () => {
        const user = userEvent.setup();
        renderCircle(
            <div>
                <button data-testid="elsewhere">Elsewhere</button>
                <InfoCircle label="Betweenness">{EXPLANATION}</InfoCircle>
            </div>,
        );

        const elsewhere = screen.getByTestId("elsewhere");
        elsewhere.focus();

        await user.hover(screen.getByRole("button", { name: "About Betweenness" }));
        await waitFor(() => {
            expect(screen.getByText(EXPLANATION)).toBeInTheDocument();
        });

        // An explanation that opens on hover must not take the keyboard with it.
        expect(document.activeElement).toBe(elsewhere);
    });

    it("can be driven from the page's own state", async () => {
        const user = userEvent.setup();

        function Controlled(): React.JSX.Element {
            const [opened, setOpened] = useState(false);
            return (
                <div>
                    <button
                        data-testid="external"
                        onClick={() => {
                            setOpened(true);
                        }}
                    >
                        Explain
                    </button>
                    <InfoCircle label="Betweenness" opened={opened} onOpenChange={setOpened}>
                        {EXPLANATION}
                    </InfoCircle>
                </div>
            );
        }

        renderCircle(<Controlled />);

        expect(screen.queryByText(EXPLANATION)).not.toBeInTheDocument();

        await user.click(screen.getByTestId("external"));
        await waitFor(() => {
            expect(screen.getByText(EXPLANATION)).toBeInTheDocument();
        });
    });

    it("reports opening and closing through onOpenChange", async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();

        renderCircle(
            <InfoCircle label="Betweenness" onOpenChange={onOpenChange}>
                {EXPLANATION}
            </InfoCircle>,
        );

        await user.click(screen.getByRole("button", { name: "About Betweenness" }));
        await waitFor(() => {
            expect(screen.getByText(EXPLANATION)).toBeInTheDocument();
        });
        // Read the recorded arguments rather than matching on them: the second
        // one is a React event, and a failed deep match on it would try to
        // serialise half the DOM.
        expect(onOpenChange.mock.calls[0]?.[0]).toBe(true);
        expect(onOpenChange.mock.calls[0]?.[1]).toBeDefined();

        await user.keyboard("{Escape}");
        await waitFor(() => {
            expect(screen.queryByText(EXPLANATION)).not.toBeInTheDocument();
        });
        expect(onOpenChange.mock.calls.at(-1)?.[0]).toBe(false);
        expect(onOpenChange.mock.calls.at(-1)).toHaveLength(1);
    });

    it("shares one floating layer with the pop-outs around it", async () => {
        // Both used to be separate systems with different dismissal rules: a
        // Mantine Popover for the bubble and this one for panels. Now Escape
        // closes the innermost open thing, whichever it is.
        const user = userEvent.setup();

        render(
            <MantineProvider theme={compactTheme}>
                <PopoutManager>
                    <Popout>
                        <Popout.Trigger>
                            <button>Open panel</button>
                        </Popout.Trigger>
                        <Popout.Panel width={240} header={{ variant: "title", title: "Panel" }}>
                            <Popout.Content>
                                <span data-testid="panel-content">Panel content</span>
                                <InfoCircle label="Betweenness">{EXPLANATION}</InfoCircle>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </PopoutManager>
            </MantineProvider>,
        );

        await user.click(screen.getByRole("button", { name: "Open panel" }));
        await waitFor(() => {
            expect(screen.getByTestId("panel-content")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "About Betweenness" }));
        await waitFor(() => {
            expect(screen.getByText(EXPLANATION)).toBeInTheDocument();
        });

        // Escape closes the bubble and leaves the panel it sits in open.
        await user.keyboard("{Escape}");
        await waitFor(() => {
            expect(screen.queryByText(EXPLANATION)).not.toBeInTheDocument();
        });
        expect(screen.getByTestId("panel-content")).toBeInTheDocument();

        // A second Escape closes the panel.
        await user.keyboard("{Escape}");
        await waitFor(() => {
            expect(screen.queryByTestId("panel-content")).not.toBeInTheDocument();
        });
    });
});
