import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import { CompactColorInput } from "../../src/components/CompactColorInput";
import { InfoCircle } from "../../src/components/InfoCircle";
import { Popout, PopoutManager } from "../../src/components/popout";
import { compactTheme } from "../../src/theme";

// A transformed ancestor becomes the containing block of every position: fixed descendant, so
// a panel that writes viewport coordinates into left/top lands offset by the ancestor's own
// position (and scaled by its scale). Each pop-out kind is opened once with no transform and
// once inside a transformed ancestor; the panel must keep the same place relative to what
// opened it.

/** Where the panel sits relative to the control that opened it, in viewport pixels. */
interface Offset {
    left: number;
    top: number;
}

/** One way a pop-out panel is opened. */
interface Kind {
    name: string;
    ui: React.ReactElement;
    /** Opens the panel and returns it with the control that opened it. */
    open: () => Promise<{ panel: HTMLElement; trigger: HTMLElement }>;
}

/**
 * Renders a pop-out kind inside a wrapper that carries the given transform, with room around
 * it so no panel is pushed back on screen.
 * @param ui - the pop-out to render
 * @param transform - the wrapper's CSS transform, or "none"
 */
function renderIn(ui: React.ReactElement, transform: string): void {
    render(
        <MantineProvider theme={compactTheme}>
            <div style={{ transform, transformOrigin: "0 0", padding: "120px 0 0 520px" }}>
                <PopoutManager>{ui}</PopoutManager>
            </div>
        </MantineProvider>,
    );
}

/**
 * Opens a kind and measures where its panel sits relative to its trigger.
 * @param kind - the pop-out kind
 * @param transform - the wrapper's CSS transform
 * @returns the panel's offset from its trigger
 */
async function measure(kind: Kind, transform: string): Promise<Offset> {
    renderIn(kind.ui, transform);
    const { panel, trigger } = await kind.open();
    // The panel is hidden until it is first positioned.
    await waitFor(() => {
        expect(getComputedStyle(panel).visibility).toBe("visible");
    });
    // Let the per-frame follow-up measurement settle.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const p = panel.getBoundingClientRect();
    const t = trigger.getBoundingClientRect();
    cleanup();
    return { left: p.left - t.left, top: p.top - t.top };
}

const clickTrigger = async (name: RegExp): Promise<{ panel: HTMLElement; trigger: HTMLElement }> => {
    const trigger = screen.getByRole("button", { name });
    await userEvent.click(trigger);
    const panel = await screen.findByRole("dialog");
    return { panel, trigger };
};

const KINDS: Kind[] = [
    {
        name: "a pop-out opened from its trigger",
        ui: (
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={240} header={{ variant: "title", title: "Settings" }}>
                    <Popout.Content>content</Popout.Content>
                </Popout.Panel>
            </Popout>
        ),
        open: () => clickTrigger(/^Open$/),
    },
    {
        name: "a nested pop-out opened from inside another panel",
        ui: (
            <Popout>
                <Popout.Trigger>
                    <button>Open parent</button>
                </Popout.Trigger>
                <Popout.Panel width={200} header={{ variant: "title", title: "Parent" }}>
                    <Popout.Content>
                        <Popout>
                            <Popout.Trigger>
                                <button>Open child</button>
                            </Popout.Trigger>
                            <Popout.Panel width={160} header={{ variant: "title", title: "Child" }}>
                                <Popout.Content>
                                    <span data-testid="child-content">child</span>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
        ),
        open: async () => {
            await clickTrigger(/^Open parent$/);
            const trigger = screen.getByRole("button", { name: /^Open child$/ });
            await userEvent.click(trigger);
            const content = await screen.findByTestId("child-content");
            return { panel: content.closest<HTMLElement>('[role="dialog"]') as HTMLElement, trigger };
        },
    },
    {
        name: "the color input's picker",
        ui: <CompactColorInput color="#336699" defaultColor="#336699" label="Fill" />,
        open: () => clickTrigger(/swatch/i),
    },
    {
        name: "an info circle's bubble",
        ui: <InfoCircle label="Resolution">Higher resolution finds more, smaller communities.</InfoCircle>,
        open: () => clickTrigger(/Resolution/),
    },
];

describe("Popout inside a transformed ancestor (browser)", () => {
    beforeAll(async () => {
        await page.viewport(1280, 800);
    });

    for (const kind of KINDS) {
        it(`keeps ${kind.name} on its trigger inside a translated ancestor`, async () => {
            const plain = await measure(kind, "none");
            const moved = await measure(kind, "translate(37px, 53px)");
            expect(Math.abs(moved.left - plain.left)).toBeLessThanOrEqual(1);
            expect(Math.abs(moved.top - plain.top)).toBeLessThanOrEqual(1);
        });
    }

    // Under a scale every distance scales with it, gaps included, so only the kinds that open
    // flush against their trigger (gap 0) keep exactly a scaled copy of the plain offset.
    for (const kind of [KINDS[0], KINDS[2]]) {
        it(`keeps ${kind.name} on its trigger inside a scaled ancestor`, async () => {
            const plain = await measure(kind, "none");
            const scaled = await measure(kind, "translate(20px, 30px) scale(0.75)");
            expect(Math.abs(scaled.left - plain.left * 0.75)).toBeLessThanOrEqual(1);
            expect(Math.abs(scaled.top - plain.top * 0.75)).toBeLessThanOrEqual(1);
        });
    }
});
