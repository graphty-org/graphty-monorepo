import { DirectionProvider, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";
import { ProseBlock } from "../../../src/components/rows/ProseBlock";
import { PANEL_GRID, PANEL_INK } from "../../../src/constants/panel";
import { LabelsProvider } from "../../../src/i18n";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderProse(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * Render inside the compact theme with the text direction reversed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderRtl(ui: React.ReactElement): ReturnType<typeof render> {
    return render(
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <MantineProvider theme={compactTheme}>{ui}</MantineProvider>
        </DirectionProvider>,
    );
}

const READING = "17 cats, 2 humans and 1 dog, connected by 43 relationships. Everyone is connected to everyone else through at most 4 steps.";
const DEPARTURE = "Approximate (sample of 8). Largest connected part only, 18 of 20 nodes.";
const RUN_RECORD = "Betweenness, weighted by Bridges, sample 8";

/**
 * Silence and capture the development warnings.
 * @returns The console.warn spy
 */
function spyOnWarn(): ReturnType<typeof vi.spyOn> {
    return vi.spyOn(console, "warn").mockImplementation(() => undefined);
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("ProseBlock", () => {
    describe("reading -- the sentence that is always on screen", () => {
        it("renders the sentence", () => {
            renderProse(<ProseBlock variant="reading">{READING}</ProseBlock>);

            expect(screen.getByText(READING)).toBeInTheDocument();
        });

        it("is a Mantine Text, so it is a paragraph and carries the Text class", () => {
            renderProse(<ProseBlock variant="reading">{READING}</ProseBlock>);

            const block = screen.getByTestId("prose-block");
            expect(block.tagName).toBe("P");
            expect(block.className).toContain("mantine-Text-root");
        });

        it("draws at 12px on a 1.5 line, in the reading text colour", () => {
            renderProse(<ProseBlock variant="reading">{READING}</ProseBlock>);

            const block = screen.getByTestId("prose-block");
            expect(block).toHaveAttribute("data-variant", "reading");
            expect(block).toHaveStyle({ fontSize: "12px", lineHeight: "1.5" });
            expect(block.style.color).toBe(PANEL_INK.PROSE);
        });

        it("carries no warning glyph and no chevron: it is prose, not a row", () => {
            const { container } = renderProse(<ProseBlock variant="reading">{READING}</ProseBlock>);

            expect(container.querySelector("svg")).toBeNull();
            expect(screen.queryByRole("button")).not.toBeInTheDocument();
        });

        it("is left unnamed, so a screen reader reads the sentence rather than a label", () => {
            renderProse(<ProseBlock variant="reading">{READING}</ProseBlock>);

            const block = screen.getByTestId("prose-block");
            expect(block).not.toHaveAttribute("aria-label");
            expect(block).not.toHaveAttribute("role");
        });

        it("renders a node as happily as a string", () => {
            renderProse(
                <ProseBlock variant="reading">
                    <span data-testid="reading-node">Mr_Whiskers is the most central cat.</span>
                </ProseBlock>,
            );

            expect(screen.getByTestId("reading-node")).toBeInTheDocument();
        });
    });

    describe("reading -- the caps that keep it a reading", () => {
        it("says nothing about two sentences inside 220 characters", () => {
            const warn = spyOnWarn();

            renderProse(<ProseBlock variant="reading">{READING}</ProseBlock>);

            expect(warn).not.toHaveBeenCalled();
        });

        it("warns in development when the reading runs past 220 characters", () => {
            const warn = spyOnWarn();
            const tooLong = `Mr_Whiskers ${"sits on more shortest paths than any other cat ".repeat(6)}`;

            renderProse(<ProseBlock variant="reading">{tooLong}</ProseBlock>);

            expect(tooLong.length).toBeGreaterThan(220);
            expect(warn).toHaveBeenCalledWith(expect.stringContaining("220 characters"));
        });

        it("counts characters as a reader sees them, not as UTF-16 stores them", () => {
            const warn = spyOnWarn();
            // 120 emoji are 240 UTF-16 code units and 120 characters. The old
            // count read this as past the cap; a reader sees 120 marks.
            const emoji = "\u{1f431}".repeat(120);

            renderProse(<ProseBlock variant="reading">{emoji}</ProseBlock>);

            expect(emoji.length).toBeGreaterThan(220);
            expect(warn).not.toHaveBeenCalled();
        });

        it("warns in development when the reading grows a third sentence", () => {
            const warn = spyOnWarn();

            renderProse(
                <ProseBlock variant="reading">
                    20 nodes. 43 relationships. Everyone is connected through at most 4 steps.
                </ProseBlock>,
            );

            expect(warn).toHaveBeenCalledWith(expect.stringContaining("2 sentences"));
        });

        it("counts a third sentence that ends with an ideographic full stop", () => {
            const warn = spyOnWarn();

            renderProse(<ProseBlock variant="reading">{"20個のノード。43本の関係。すべてつながっています。"}</ProseBlock>);

            expect(warn).toHaveBeenCalledWith(expect.stringContaining("2 sentences"));
        });

        it("leaves two sentences of Japanese alone", () => {
            const warn = spyOnWarn();

            renderProse(<ProseBlock variant="reading">{"20個のノード。すべてつながっています。"}</ProseBlock>);

            expect(warn).not.toHaveBeenCalled();
        });

        it("counts a third sentence that ends with an Arabic question mark", () => {
            const warn = spyOnWarn();

            renderProse(<ProseBlock variant="reading">{"كم قطة؟ سبع عشرة؟ وكلها متصلة؟"}</ProseBlock>);

            expect(warn).toHaveBeenCalledWith(expect.stringContaining("2 sentences"));
        });

        it("reads a run of terminators as one ending", () => {
            const warn = spyOnWarn();

            renderProse(<ProseBlock variant="reading">Every cat is connected... to every other cat!?</ProseBlock>);

            expect(warn).not.toHaveBeenCalled();
        });

        it("does not read a decimal as the end of a sentence", () => {
            const warn = spyOnWarn();

            renderProse(<ProseBlock variant="reading">6 groups at granularity 2.5. The largest holds 9 cats.</ProseBlock>);

            expect(warn).not.toHaveBeenCalled();
        });

        it("counts a last sentence that was never given a full stop", () => {
            const warn = spyOnWarn();

            renderProse(<ProseBlock variant="reading">20 nodes. 43 relationships. Everyone is connected</ProseBlock>);

            expect(warn).toHaveBeenCalledWith(expect.stringContaining("2 sentences"));
        });

        it("leaves a second sentence alone when it was never given a full stop", () => {
            const warn = spyOnWarn();

            renderProse(<ProseBlock variant="reading">20 nodes. Everyone is connected</ProseBlock>);

            expect(warn).not.toHaveBeenCalled();
        });

        it("does not read the space after the last full stop as another sentence", () => {
            const warn = spyOnWarn();

            renderProse(<ProseBlock variant="reading">{"20 nodes. Everyone is connected. \n "}</ProseBlock>);

            expect(warn).not.toHaveBeenCalled();
        });

        it("counts a passage with no terminator at all as one sentence", () => {
            const warn = spyOnWarn();
            const unterminated = `Mr_Whiskers ${"sits on more shortest paths than any other cat ".repeat(6)}`;

            renderProse(<ProseBlock variant="reading">{unterminated}</ProseBlock>);

            // Long enough to break the character cap, so the only warning it may
            // draw is that one: a passage with no full stops is still one
            // sentence, not none and not several.
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn).toHaveBeenCalledWith(expect.stringContaining("220 characters"));
        });

        it("cannot measure a node, and does not try", () => {
            const warn = spyOnWarn();

            renderProse(
                <ProseBlock variant="reading">
                    <span>One. Two. Three. Four. Five.</span>
                </ProseBlock>,
            );

            expect(warn).not.toHaveBeenCalled();
        });

        it("leaves the departure line and the run record uncapped", () => {
            const warn = spyOnWarn();
            const long = `Approximate ${"on a sample of 8 cats ".repeat(12)}`;

            renderProse(<ProseBlock variant="departure">{long}</ProseBlock>);
            renderProse(<ProseBlock variant="runRecord">{long}</ProseBlock>);

            expect(warn).not.toHaveBeenCalled();
        });
    });

    describe("departure -- drawn only when there is a departure", () => {
        it("renders the departure at the small step, in the primary text ink", () => {
            renderProse(<ProseBlock variant="departure">{DEPARTURE}</ProseBlock>);

            const block = screen.getByTestId("prose-block");
            expect(block).toHaveAttribute("data-variant", "departure");

            const text = screen.getByTestId("prose-block-text");
            expect(text).toHaveTextContent(DEPARTURE);
            expect(text.tagName).toBe("SPAN");
            expect(text.style.color).toContain("--mantine-color-text");
            expect(text).toHaveStyle({ lineHeight: "1.4" });
        });

        it("takes its font size from the theme's small step rather than a literal", () => {
            renderProse(<ProseBlock variant="departure">{DEPARTURE}</ProseBlock>);

            const text = screen.getByTestId("prose-block-text");
            expect(text.style.getPropertyValue("--text-fz")).toBe("var(--mantine-font-size-sm)");
        });

        it("draws the warning glyph in the yellow, at the glyph size", () => {
            const { container } = renderProse(<ProseBlock variant="departure">{DEPARTURE}</ProseBlock>);

            const slot = screen.getByTestId("prose-block-warning");
            expect(slot.style.color).toContain("yellow");
            expect(slot).toHaveStyle({
                inlineSize: `${PANEL_GRID.GLYPH_SLOT}px`,
                blockSize: `${PANEL_GRID.GLYPH_SLOT}px`,
            });

            const glyph = container.querySelector('[data-glyph="warning"]');
            expect(glyph).toBeInTheDocument();
            expect(glyph).toHaveAttribute("width", String(PANEL_GRID.GLYPH));
        });

        it("states the severity as a named note, not only in yellow", () => {
            renderProse(<ProseBlock variant="departure">{DEPARTURE}</ProseBlock>);

            const note = screen.getByRole("note", { name: "Departure" });
            expect(note).toHaveAttribute("data-variant", "departure");
            expect(note).toHaveTextContent(DEPARTURE);
        });

        it("hides the triangle from assistive technology, so the name is not read twice", () => {
            renderProse(<ProseBlock variant="departure">{DEPARTURE}</ProseBlock>);

            expect(screen.getByTestId("prose-block-warning")).toHaveAttribute("aria-hidden", "true");
            expect(screen.queryByRole("img")).not.toBeInTheDocument();
        });

        it("carries no chevron", () => {
            renderProse(<ProseBlock variant="departure">{DEPARTURE}</ProseBlock>);

            expect(screen.queryByRole("button")).not.toBeInTheDocument();
        });
    });

    describe("runRecord -- one line and a way in", () => {
        it("renders the line at the small step in the secondary ink, shortened, on a 20px row", () => {
            renderProse(
                <ProseBlock variant="runRecord" onDetails={vi.fn()}>
                    {RUN_RECORD}
                </ProseBlock>,
            );

            const block = screen.getByTestId("prose-block");
            expect(block).toHaveAttribute("data-variant", "runRecord");
            expect(block).toHaveStyle({ blockSize: "20px" });

            const text = screen.getByTestId("prose-block-text");
            expect(text).toHaveTextContent(RUN_RECORD);
            expect(text.style.color).toBe(PANEL_INK.CHROME);
            expect(text).toHaveAttribute("data-truncate", "end");
        });

        it("takes its font size from the theme's small step rather than a literal", () => {
            renderProse(
                <ProseBlock variant="runRecord" onDetails={vi.fn()}>
                    {RUN_RECORD}
                </ProseBlock>,
            );

            const text = screen.getByTestId("prose-block-text");
            expect(text.style.getPropertyValue("--text-fz")).toBe("var(--mantine-font-size-sm)");
        });

        it("draws a 12px chevron for the details control", () => {
            const { container } = renderProse(
                <ProseBlock variant="runRecord" onDetails={vi.fn()}>
                    {RUN_RECORD}
                </ProseBlock>,
            );

            const glyph = container.querySelector('[data-glyph="chevronRight"]');
            expect(glyph).toBeInTheDocument();
            expect(glyph).toHaveAttribute("width", String(PANEL_GRID.CHEVRON));
        });

        it("points the chevron the other way when text runs right to left", () => {
            const { container } = renderRtl(
                <ProseBlock variant="runRecord" onDetails={vi.fn()}>
                    {RUN_RECORD}
                </ProseBlock>,
            );

            expect(container.querySelector('[data-glyph="chevronLeft"]')).toBeInTheDocument();
            expect(container.querySelector('[data-glyph="chevronRight"]')).toBeNull();
        });

        it("names the details control, which is icon-only", () => {
            renderProse(
                <ProseBlock variant="runRecord" onDetails={vi.fn()}>
                    {RUN_RECORD}
                </ProseBlock>,
            );

            const details = screen.getByRole("button", { name: "Details" });
            expect(details).toHaveAttribute("title", "Details");
        });

        it("opens the details on click, handing over the event", async () => {
            const user = userEvent.setup();
            const onDetails = vi.fn();
            renderProse(
                <ProseBlock variant="runRecord" onDetails={onDetails}>
                    {RUN_RECORD}
                </ProseBlock>,
            );

            await user.keyboard("[ShiftLeft>]");
            await user.click(screen.getByRole("button", { name: "Details" }));
            await user.keyboard("[/ShiftLeft]");

            expect(onDetails).toHaveBeenCalledTimes(1);
            const event: unknown = onDetails.mock.calls[0][0];
            expect(event).toMatchObject({ shiftKey: true, type: "click" });
        });

        it("opens the details from the keyboard, on Enter", async () => {
            const user = userEvent.setup();
            const onDetails = vi.fn();
            renderProse(
                <ProseBlock variant="runRecord" onDetails={onDetails}>
                    {RUN_RECORD}
                </ProseBlock>,
            );

            await user.tab();
            expect(screen.getByRole("button", { name: "Details" })).toHaveFocus();

            await user.keyboard("{Enter}");

            expect(onDetails).toHaveBeenCalledTimes(1);
        });

        it("opens the details from the keyboard, on Space", async () => {
            const user = userEvent.setup();
            const onDetails = vi.fn();
            renderProse(
                <ProseBlock variant="runRecord" onDetails={onDetails}>
                    {RUN_RECORD}
                </ProseBlock>,
            );

            await user.tab();
            await user.keyboard("[Space]");

            expect(onDetails).toHaveBeenCalledTimes(1);
        });

        it("draws no chevron when there is nothing behind it", () => {
            const { container } = renderProse(<ProseBlock variant="runRecord">{RUN_RECORD}</ProseBlock>);

            expect(screen.queryByRole("button")).not.toBeInTheDocument();
            expect(container.querySelector('[data-glyph="chevronRight"]')).toBeNull();
            expect(screen.getByTestId("prose-block-text")).toHaveTextContent(RUN_RECORD);
        });
    });

    describe("runRecord -- the shortened line stays reachable", () => {
        const LONG = "Betweenness, weighted by Bridges, endpoints included, sample 8, Radial layout, seed 42";

        it("keeps the whole line in the document, so a screen reader reads all of it", () => {
            renderProse(
                <ProseBlock variant="runRecord" onDetails={vi.fn()}>
                    {LONG}
                </ProseBlock>,
            );

            const text = screen.getByTestId("prose-block-text");
            expect(text).toHaveTextContent(LONG);
            expect(text).not.toHaveAttribute("aria-hidden");
        });

        it("describes the details control with the line, so a keyboard reaches the full text", () => {
            renderProse(
                <ProseBlock variant="runRecord" onDetails={vi.fn()}>
                    {LONG}
                </ProseBlock>,
            );

            const details = screen.getByRole("button", { name: "Details" });
            const describedBy = details.getAttribute("aria-describedby");
            expect(describedBy).toBeTruthy();
            expect(screen.getByTestId("prose-block-text")).toHaveAttribute("id", describedBy);
            expect(details).toHaveAccessibleDescription(LONG);
        });

        it("titles the line with its own text, for a pointer", () => {
            renderProse(<ProseBlock variant="runRecord">{LONG}</ProseBlock>);

            expect(screen.getByTestId("prose-block-text")).toHaveAttribute("title", LONG);
        });

        it("has no title to give when the line is a node rather than a string", () => {
            renderProse(
                <ProseBlock variant="runRecord">
                    <span>Betweenness</span>
                </ProseBlock>,
            );

            expect(screen.getByTestId("prose-block-text")).not.toHaveAttribute("title");
        });
    });

    describe("strings come from the labels, not from the component", () => {
        it("takes the name of the departure note from the labels", () => {
            renderProse(
                <LabelsProvider labels={{ departure: "Abweichung" }}>
                    <ProseBlock variant="departure">{DEPARTURE}</ProseBlock>
                </LabelsProvider>,
            );

            expect(screen.getByRole("note", { name: "Abweichung" })).toBeInTheDocument();
        });

        it("takes the name of the details control from the labels", () => {
            renderProse(
                <LabelsProvider labels={{ details: "Einzelheiten" }}>
                    <ProseBlock variant="runRecord" onDetails={vi.fn()}>
                        {RUN_RECORD}
                    </ProseBlock>
                </LabelsProvider>,
            );

            const details = screen.getByRole("button", { name: "Einzelheiten" });
            expect(details).toHaveAttribute("title", "Einzelheiten");
        });

        it("falls back to English with no provider above it", () => {
            renderProse(
                <ProseBlock variant="runRecord" onDetails={vi.fn()}>
                    {RUN_RECORD}
                </ProseBlock>,
            );

            expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
        });
    });

    describe("text that arrives after the panel does", () => {
        it("announces nothing by default", () => {
            renderProse(<ProseBlock variant="reading">{READING}</ProseBlock>);

            const block = screen.getByTestId("prose-block");
            expect(block).not.toHaveAttribute("aria-live");
            expect(block).not.toHaveAttribute("aria-atomic");
        });

        it.each(["reading", "departure", "runRecord"] as const)(
            "marks the %s variant as a polite live region when asked",
            (variant) => {
                renderProse(
                    <ProseBlock variant={variant} live="polite">
                        {READING}
                    </ProseBlock>,
                );

                const block = screen.getByTestId("prose-block");
                expect(block).toHaveAttribute("aria-live", "polite");
                expect(block).toHaveAttribute("aria-atomic", "true");
            },
        );

        it("can interrupt when asked to", () => {
            renderProse(
                <ProseBlock variant="departure" live="assertive">
                    {DEPARTURE}
                </ProseBlock>,
            );

            expect(screen.getByTestId("prose-block")).toHaveAttribute("aria-live", "assertive");
        });

        it("keeps the departure a named note while it is a live region", () => {
            renderProse(
                <ProseBlock variant="departure" live="polite">
                    {DEPARTURE}
                </ProseBlock>,
            );

            expect(screen.getByRole("note", { name: "Departure" })).toHaveAttribute("aria-live", "polite");
        });

        it("keeps the details control reachable while the run record is a live region", () => {
            renderProse(
                <ProseBlock variant="runRecord" live="polite" onDetails={vi.fn()}>
                    {RUN_RECORD}
                </ProseBlock>,
            );

            expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
        });
    });

    describe("onDetails belongs to the run record alone", () => {
        it.each(["reading", "departure"] as const)("draws no chevron on the %s variant", (variant) => {
            spyOnWarn();

            renderProse(
                <ProseBlock variant={variant} onDetails={vi.fn()}>
                    {DEPARTURE}
                </ProseBlock>,
            );

            expect(screen.queryByRole("button")).not.toBeInTheDocument();
        });

        it("warns in development that onDetails is ignored", () => {
            const warn = spyOnWarn();

            renderProse(
                <ProseBlock variant="departure" onDetails={vi.fn()}>
                    {DEPARTURE}
                </ProseBlock>,
            );

            expect(warn).toHaveBeenCalledWith(expect.stringContaining("onDetails"));
        });

        it("says nothing internal in a warning a consumer reads in their own devtools", () => {
            const warn = spyOnWarn();

            renderProse(
                <ProseBlock variant="departure" onDetails={vi.fn()}>
                    {DEPARTURE}
                </ProseBlock>,
            );

            const message: unknown = warn.mock.calls[0][0];
            expect(String(message)).not.toMatch(/RT-\d|VOCAB|the floor|the door/iu);
        });

        it("says nothing when the run record carries it", () => {
            const warn = spyOnWarn();

            renderProse(
                <ProseBlock variant="runRecord" onDetails={vi.fn()}>
                    {RUN_RECORD}
                </ProseBlock>,
            );

            expect(warn).not.toHaveBeenCalled();
        });
    });
});
