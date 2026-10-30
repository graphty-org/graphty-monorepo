/**
 * A scrollbar that is part of a pop-out is part of the pop-out: dragging it never closes it. A
 * scrollbar outside it is outside it: pressing one closes the pop-out like any press outside.
 * Driven with the real mouse, on the browser's native scrollbars and on the package's ScrollArea.
 * Runs in the "scrollbars" project, the one that draws native scrollbars.
 */
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import { compactTheme, Popout, PopoutManager, ScrollArea } from "../../src";

declare module "vitest/browser" {
    interface BrowserCommands {
        mouseDragAt: (selector: string, fromRight: number, fromTop: number, dy: number) => Promise<void>;
    }
}

const ROWS = Array.from({ length: 60 }, (_, i) => (
    <div key={i} style={{ height: 24 }}>
        Issue {i + 1}
    </div>
));

/**
 * A pop-out holding a long issue list, open beside a scrolling table.
 * @param props - Component props
 * @param props.scrollArea - Scroll with the package's ScrollArea rather than natively
 * @returns The table and the pop-out
 */
function Scene({ scrollArea }: { scrollArea: boolean }): React.JSX.Element {
    const list = scrollArea ? (
        <ScrollArea h={200} type="always" data-testid="inner-scroll">
            {ROWS}
        </ScrollArea>
    ) : (
        ROWS
    );
    const table = scrollArea ? (
        <ScrollArea h={300} w={300} type="always" data-testid="side-table">
            {ROWS}
        </ScrollArea>
    ) : (
        <div data-testid="side-table" style={{ height: 300, width: 300, overflowY: "scroll" }}>
            {ROWS}
        </div>
    );
    return (
        <MantineProvider theme={compactTheme}>
            <PopoutManager>
                <div style={{ position: "fixed", left: 20, top: 20 }}>{table}</div>
                <div style={{ position: "fixed", left: 600, top: 20 }}>
                    <Popout>
                        <Popout.Trigger>
                            <button type="button">Issues</button>
                        </Popout.Trigger>
                        <Popout.Panel width={240} header={{ variant: "title", title: "Issues" }}>
                            <Popout.Content>{list}</Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </div>
            </PopoutManager>
        </MantineProvider>
    );
}

/**
 * Open the pop-out and wait until it is placed.
 * @returns The pop-out
 */
async function open(): Promise<HTMLElement> {
    await userEvent.click(screen.getByRole("button", { name: "Issues" }));
    const panel = await screen.findByRole("dialog");
    await waitFor(() => {
        expect(panel.style.visibility).not.toBe("hidden");
        expect(panel.hasAttribute("data-cm-repositioning")).toBe(false);
    });
    return panel;
}

describe("Popout and scrollbars (browser, real mouse)", () => {
    beforeEach(async () => {
        await page.viewport(1000, 400);
    });

    afterEach(async () => {
        await page.viewport(1280, 800);
    });

    it("stays open while its own native scrollbar is dragged, and closes on a press on one outside it", async () => {
        render(<Scene scrollArea={false} />);
        await open();
        const body = screen.getByTestId("popout-panel-content");
        // Long enough to scroll, with a native scrollbar drawn (this project does not hide them).
        expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
        expect(body.offsetWidth - body.clientWidth).toBeGreaterThan(0);

        await commands.mouseDragAt('[data-testid="popout-panel-content"]', 7, 30, 60);
        expect(body.scrollTop).toBeGreaterThan(0);
        expect(screen.getByRole("dialog")).toBeInTheDocument();

        const table = screen.getByTestId("side-table");
        // A press on its track, below the thumb, pages the table down.
        await commands.mouseDragAt('[data-testid="side-table"]', 7, 250, 0);
        expect(table.scrollTop).toBeGreaterThan(0);
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).toBeNull();
        });
    });

    it("stays open while its own ScrollArea scrollbar is dragged, and closes on a press on one outside it", async () => {
        render(<Scene scrollArea />);
        await open();
        const viewport = (testId: string): HTMLElement =>
            screen.getByTestId(testId).querySelector<HTMLElement>(".mantine-ScrollArea-viewport") as HTMLElement;
        const bar = (testId: string): string =>
            `[data-testid="${testId}"] .mantine-ScrollArea-scrollbar[data-orientation="vertical"]`;

        await commands.mouseDragAt(bar("inner-scroll"), 5, 20, 60);
        expect(viewport("inner-scroll").scrollTop).toBeGreaterThan(0);
        expect(screen.getByRole("dialog")).toBeInTheDocument();

        await commands.mouseDragAt(bar("side-table"), 5, 20, 60);
        expect(viewport("side-table").scrollTop).toBeGreaterThan(0);
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).toBeNull();
        });
    });
});
