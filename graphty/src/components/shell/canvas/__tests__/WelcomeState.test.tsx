/**
 * Boards for the Welcome block's own surface.
 *
 * These pin the 2026-09-13 amendment recorded at the head of `WelcomeState.tsx`: the
 * block must read correctly whatever the canvas behind it is doing, because the canvas
 * is graphty-element's clear colour (measured #F5F5F5) and the shell does not own it.
 * So the sheet's ground must be OPAQUE and token-sourced, it must be sized to its
 * content rather than to the viewport, and it must NOT have become a modal dialog --
 * design 7.1 closes "No tour, no wizard, no modal. The rail is visible so the shape of
 * the tool is learned by seeing it", which forbids a dialog, not a self-backed sheet.
 */

import { PANEL_INK } from "@graphty/compact-mantine";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { render } from "../../../../test/test-utils";
import { CANVAS_METRICS, CANVAS_SPACE } from "../canvasLayout";
import { WelcomeState } from "../WelcomeState";

/** The host width every board measures in, wide enough for the 600 px content band. */
const HOST_WIDTH = 900;

/** The sentence a failed load hands the block, as the shell composes it. */
const LOAD_ERROR = "Could not load friends.json. Unexpected token o in JSON at position 1.";

/**
 * Draws Welcome inside a positioned host, so its `position: absolute; inset: 0`
 * wrapper resolves against a known box rather than against the test viewport.
 * @param error - the failed load's sentence, or undefined when nothing has failed.
 * @returns the rendered container.
 */
function renderWelcome(error?: string): HTMLElement {
    const { container } = render(
        <div style={{ position: "relative", width: HOST_WIDTH, height: 700 }}>
            <WelcomeState onOpenFile={vi.fn()} onPasteOrOpenFromUrl={vi.fn()} error={error} />
        </div>,
    );

    return container;
}

/**
 * The dashed drop zone, which is the block's drop target and the failed load's home.
 * @param container - the rendered container.
 * @returns the zone.
 */
function dropZoneOf(container: HTMLElement): HTMLElement {
    const zone = container.querySelector<HTMLElement>("[data-dragging]");

    expect(zone).not.toBeNull();

    return zone as HTMLElement;
}

/**
 * The sheet element that carries the block's ground.
 * @param container - the rendered container.
 * @returns the sheet.
 */
function sheetOf(container: HTMLElement): HTMLElement {
    const sheet = container.querySelector<HTMLElement>("[data-canvas-welcome-sheet]");

    expect(sheet).not.toBeNull();

    return sheet as HTMLElement;
}

describe("WelcomeState surface", () => {
    it("draws the block on a sheet of its own, inside the Welcome wrapper", () => {
        const container = renderWelcome();
        const wrapper = container.querySelector<HTMLElement>("[data-canvas-welcome]");

        expect(wrapper).not.toBeNull();
        expect(sheetOf(container).parentElement).toBe(wrapper);
    });

    it("gives the sheet an opaque ground, so the canvas colour behind it cannot show through", () => {
        const sheet = sheetOf(renderWelcome());
        const ground = globalThis.getComputedStyle(sheet).backgroundColor;

        expect(ground).not.toBe("rgba(0, 0, 0, 0)");
        expect(ground).not.toBe("transparent");
        expect(ground).toMatch(/^rgb\(/);
    });

    it("takes the ground and the boundary from tokens, not from literals", () => {
        const sheet = sheetOf(renderWelcome());

        expect(sheet.style.background).toContain(PANEL_INK.PANEL);
        expect(sheet.style.border).toBe(`${String(CANVAS_SPACE.HAIRLINE)}px solid ${PANEL_INK.BORDER}`);
        expect(sheet.style.borderRadius).toBe("var(--mantine-radius-lg)");
    });

    it("carries both the boundary and the elevation, because the light scheme needs each", () => {
        const sheet = sheetOf(renderWelcome());
        const computed = globalThis.getComputedStyle(sheet);

        expect(computed.borderTopWidth).toBe(`${String(CANVAS_SPACE.HAIRLINE)}px`);
        expect(computed.borderTopColor).not.toBe("rgba(0, 0, 0, 0)");
        expect(sheet.style.boxShadow).toBe("var(--mantine-shadow-xl)");
        expect(computed.boxShadow).not.toBe("none");
    });

    it("is sized to its content, not to the viewport", () => {
        const container = renderWelcome();
        const sheet = sheetOf(container);
        const wrapper = container.querySelector<HTMLElement>("[data-canvas-welcome]") as HTMLElement;
        const expected = CANVAS_METRICS.WELCOME_WIDTH + 2 * CANVAS_SPACE.XL + 2 * CANVAS_SPACE.HAIRLINE;

        expect(wrapper.getBoundingClientRect().width).toBe(HOST_WIDTH);
        expect(sheet.getBoundingClientRect().width).toBe(expected);
        expect(sheet.getBoundingClientRect().height).toBeLessThan(700);
    });

    it("centres the sheet with auto margins, so its top edge stays reachable when it overflows", () => {
        const container = renderWelcome();
        const wrapper = container.querySelector<HTMLElement>("[data-canvas-welcome]") as HTMLElement;

        expect(wrapper.style.overflow).toBe("auto");
        expect(wrapper.style.alignItems).toBe("");
        expect(sheetOf(container).style.margin).toBe("auto");
    });

    it("is a surface and not a dialog: no scrim, no dialog role, no modal claim", () => {
        const container = renderWelcome();
        const wrapper = container.querySelector<HTMLElement>("[data-canvas-welcome]") as HTMLElement;

        expect(container.querySelector('[role="dialog"]')).toBeNull();
        expect(container.querySelector("[aria-modal]")).toBeNull();
        expect(container.querySelector(".mantine-Overlay-root")).toBeNull();
        expect(wrapper.style.position).toBe("absolute");
        expect(wrapper.style.zIndex).toBe("");
    });

    /*
     * Spec 4105 makes a failed load a sub-state of EMPTY and puts its sentence inline in
     * the drop zone; spec 1034 repeats it with the formats list beside it. The block is
     * the Empty state's whole canvas, so this is where a reader who has just been told
     * nothing loaded is standing.
     */
    describe("the failed load's sentence", () => {
        it("draws nothing extra, and leaves the zone as it was, when no load has failed", () => {
            const container = renderWelcome();
            const zone = dropZoneOf(container);

            expect(container.querySelector("[data-welcome-error]")).toBeNull();
            expect(container.querySelector('[role="alert"]')).toBeNull();
            expect(zone.textContent).toContain("Drop a graph file (or a nodes file and an edges file) here");
            expect(zone.textContent).toContain(
                "Accepted formats: JSON, CSV or TSV, GraphML, GEXF, GML, DOT, Pajek, SIF, CX2",
            );
        });

        it("draws the sentence inside the drop zone, above the accepted formats line", () => {
            const container = renderWelcome(LOAD_ERROR);
            const zone = dropZoneOf(container);
            const error = container.querySelector<HTMLElement>("[data-welcome-error]");

            expect(error).not.toBeNull();
            expect(error?.textContent).toBe(LOAD_ERROR);
            expect(zone).toContainElement(error);

            /* Order matters on this one: the sentence says which file did not load, and
               the line under it says what would have. Reading them the other way round
               is reading the answer before the question. */
            const formats = [...zone.querySelectorAll("span")].find((span) =>
                span.textContent?.startsWith("Accepted formats:"),
            );

            expect(formats).not.toBeUndefined();
            expect(
                (error as HTMLElement).compareDocumentPosition(formats as HTMLElement) &
                    Node.DOCUMENT_POSITION_FOLLOWING,
            ).toBeTruthy();
        });

        it("announces it, in the danger ink, as text and not as a control", () => {
            const container = renderWelcome(LOAD_ERROR);
            const error = container.querySelector<HTMLElement>("[data-welcome-error]");

            expect(error).toHaveAttribute("role", "alert");
            expect(error?.style.color).toBe(PANEL_INK.DANGER);

            /* Spec 975-979: "Nothing in this block is iconified and the error text is
               never moved behind an info circle." So it is not a button, not a tooltip's
               contents and not a popover's -- there is nothing to open to read it. */
            expect(error?.closest("button")).toBeNull();
            expect(error?.closest('[role="tooltip"]')).toBeNull();
            expect(error?.closest('[role="dialog"]')).toBeNull();
            expect(error?.querySelector("svg")).toBeNull();
        });
    });

    it("still draws every string of the artboard on the sheet", () => {
        const sheet = sheetOf(renderWelcome());

        expect(sheet.textContent).toContain("Open a graph to get started");
        expect(sheet.textContent).toContain("Drop a graph file (or a nodes file and an edges file) here");
        expect(sheet.textContent).toContain("Open file");
        expect(sheet.textContent).toContain("or paste data / open from URL");
    });
});
