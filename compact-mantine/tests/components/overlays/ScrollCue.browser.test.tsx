/**
 * ScrollArea's opt-in scroll cue: with `scrollCue` the thumb shows whenever the content overflows
 * and the content fades at an edge with more beyond it; without it the scroller is exactly as
 * before (thumb only on hover, no fade). Scrolled with the real keyboard.
 */
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { compactTheme, ScrollArea } from "../../../src";
import { untilPasses } from "../../../stories/helpers/settled";

/**
 * A 120px scroller of `count` 24px rows.
 * @param props - Component props
 * @param props.count - how many rows
 * @param props.cue - set scrollCue
 * @returns The scroller
 */
function List({ count, cue }: Readonly<{ count: number; cue?: boolean }>): React.JSX.Element {
    return (
        <MantineProvider theme={compactTheme} forceColorScheme="light">
            <ScrollArea h={120} w={200} focusableViewport scrollCue={cue} data-testid="root">
                {Array.from({ length: count }, (_, i) => (
                    <div key={i} style={{ height: 24 }}>
                        Row {i + 1}
                    </div>
                ))}
            </ScrollArea>
        </MantineProvider>
    );
}

/**
 * The scroller's vertical thumb track, if Mantine draws one.
 * @returns the track
 */
function track(): HTMLElement | null {
    return screen.getByTestId("root").querySelector<HTMLElement>(".cm-scroll-scrollbar[data-orientation='vertical']");
}

/**
 * Whether the track is drawn.
 * @returns true when visible
 */
function trackShown(): boolean {
    const bar = track();
    return bar !== null && bar.checkVisibility();
}

describe("ScrollArea scrollCue (browser)", () => {
    it("is off by default: no fade, and the thumb shows only on hover", async () => {
        render(<List count={30} />);
        const root = screen.getByTestId("root");
        const port = root.querySelector(".cm-scroll-viewport") as HTMLElement;
        expect(root.hasAttribute("data-scroll-cue")).toBe(false);
        expect(root.hasAttribute("data-cue-bottom")).toBe(false);
        expect(getComputedStyle(port).maskImage).toBe("none");
        expect(trackShown()).toBe(false);
    });

    it("shows the thumb and fades the edge with more beyond it, following the scroll", async () => {
        render(<List count={30} cue />);
        const root = screen.getByTestId("root");
        const viewport = root.querySelector(".cm-scroll-viewport") as HTMLElement;
        await untilPasses(() => {
            expect(root.hasAttribute("data-cue-bottom")).toBe(true);
            expect(trackShown()).toBe(true);
        });
        expect(root.hasAttribute("data-cue-top")).toBe(false);
        expect(getComputedStyle(viewport).maskImage).toContain("linear-gradient");
        viewport.focus();
        await userEvent.keyboard("{End}");
        await untilPasses(() => {
            expect(root.hasAttribute("data-cue-top")).toBe(true);
            expect(root.hasAttribute("data-cue-bottom")).toBe(false);
        });
        await userEvent.keyboard("{PageUp}");
        await untilPasses(() => {
            expect(root.hasAttribute("data-cue-top")).toBe(true);
            expect(root.hasAttribute("data-cue-bottom")).toBe(true);
        });
    });

    it("draws the keyboard ring on the unmasked root, so the fade never hides it", async () => {
        render(<List count={30} cue />);
        const root = screen.getByTestId("root");
        const viewport = root.querySelector(".cm-scroll-viewport") as HTMLElement;
        await userEvent.tab();
        expect(document.activeElement).toBe(viewport);
        await userEvent.keyboard("{PageDown}");
        await untilPasses(() => {
            expect(root.hasAttribute("data-cue-top")).toBe(true);
            expect(root.hasAttribute("data-cue-bottom")).toBe(true);
        });
        expect(getComputedStyle(viewport).outlineStyle).toBe("none");
        expect(getComputedStyle(root).outlineStyle).toBe("solid");
        expect(getComputedStyle(root).outlineWidth).toBe("1px");
        expect(getComputedStyle(root).maskImage).toBe("none");
    });

    it("keeps the ring on the viewport without the cue", async () => {
        render(<List count={30} />);
        const root = screen.getByTestId("root");
        await userEvent.tab();
        const viewport = root.querySelector(".cm-scroll-viewport") as HTMLElement;
        expect(document.activeElement).toBe(viewport);
        expect(getComputedStyle(viewport).outlineStyle).toBe("solid");
        expect(getComputedStyle(root).outlineStyle).toBe("none");
    });

    it("shows nothing when the content fits", async () => {
        render(<List count={3} cue />);
        const root = screen.getByTestId("root");
        await untilPasses(() => {
            expect(root.hasAttribute("data-scroll-cue")).toBe(true);
        });
        expect(root.hasAttribute("data-cue-top")).toBe(false);
        expect(root.hasAttribute("data-cue-bottom")).toBe(false);
        expect(trackShown()).toBe(false);
    });
});
