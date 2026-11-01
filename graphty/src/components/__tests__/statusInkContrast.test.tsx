import "../../workspace/server/server.css";
import "../../workspace/style/style.css";

import type { ShaderDescriptor } from "@graphty/graphty-element/catalog";
import { MantineProvider } from "@mantine/core";
import { render as renderBare } from "@testing-library/react";
import axe from "axe-core";
import React from "react";
import { assert, beforeEach, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor } from "../../test/test-utils";
import { theme } from "../../theme";
import { ReadyMark } from "../../workspace/data-page/DataPage";
import { clearRecent, rememberRecent } from "../../workspace/project/recent";
import { CodeChip } from "../../workspace/server/PreviewRows";
import { ShaderFacts } from "../../workspace/style/ShaderGallery";
import { Workspace } from "../../workspace/Workspace";
import { ErrorFallback } from "../ErrorFallback";

/*
   Status text (a file that can no longer be read) must meet WCAG 1.4.3 (4.5:1) on its ground. The
   recent-projects line colored it with a fill token or a raw Mantine color (#3032).
*/

async function contrastFailures(element: Element): Promise<string[]> {
    await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
    const results = await axe.run(element, { runOnly: ["color-contrast"], resultTypes: ["violations"] });

    return results.violations.flatMap((violation) =>
        violation.nodes.map((node) => `${node.html.slice(0, 120)}\n  ${node.failureSummary ?? ""}`),
    );
}

/**
 * Renders under the app's theme in one scheme, forced.
 * @param scheme - the color scheme
 * @param ui - what to render
 */
function renderIn(scheme: "light" | "dark", ui: React.ReactElement): void {
    renderBare(
        <MantineProvider theme={theme} forceColorScheme={scheme}>
            {ui}
        </MantineProvider>,
    );
}

/**
 * The channels (0-255) and alpha of a computed `rgb()` / `rgba()` color.
 * @param color - the computed color
 * @returns red, green, blue and alpha
 */
function channels(color: string): [number, number, number, number] {
    const [r = 0, g = 0, b = 0, a = 1] = (color.match(/[\d.]+/g) ?? []).map(Number);
    return [r, g, b, a];
}

/**
 * The WCAG 2.x relative luminance of three 0-255 channels.
 * @param rgb - the channels
 * @returns the luminance
 */
function luminance(rgb: number[]): number {
    const [r = 0, g = 0, b = 0] = rgb.map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The contrast of a glyph's stroke against the first opaque background behind it (WCAG 1.4.11).
 * @param glyph - the glyph's svg
 * @returns the ratio, such as 3
 */
function glyphContrast(glyph: Element): number {
    let surface: Element | null = glyph;
    let back = channels("rgb(255, 255, 255)");
    while (surface !== null) {
        const found = channels(getComputedStyle(surface).backgroundColor);
        if (found[3] === 1) {
            back = found;
            break;
        }
        surface = surface.parentElement;
    }
    const [r, g, b, a] = channels(getComputedStyle(glyph).stroke);
    const ink = [r * a + back[0] * (1 - a), g * a + back[1] * (1 - a), b * a + back[2] * (1 - a)];
    const [hi = 0, lo = 0] = [luminance(ink), luminance(back)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

const HEAVY: ShaderDescriptor = {
    id: "test/heavy",
    plainName: "Heavy",
    target: "node",
    params: [],
    reads: [],
    motion: {},
    cost: "heavy",
    origin: "registered",
    webgpu: "translate",
};

beforeEach(async () => {
    await clearRecent();
});

describe("status ink contrast", () => {
    it("a recent project's can-no-longer-be-read line meets 4.5:1", async () => {
        const root = await navigator.storage.getDirectory();
        const handle = await root.getFileHandle("gone.graphty.json", { create: true });
        await root.removeEntry("gone.graphty.json");
        await rememberRecent({ id: "gone", name: "Gone", nodes: 3, at: 1, handle });
        render(<Workspace />);

        await userEvent.click(await screen.findByRole("gridcell", { name: /^Gone/ }));
        const line = await screen.findByText("This file can no longer be read. Locate...");
        const failures = await contrastFailures(line);

        assert.deepEqual(failures, [], failures.join("\n"));
    });

    // Hovered, the row sits on a gray ground; Figma's #dc3412 was 4.39:1 on it in the light scheme.
    it("a recent project's can-no-longer-be-read line meets 4.5:1 on its hovered row in the light scheme", async () => {
        const root = await navigator.storage.getDirectory();
        const handle = await root.getFileHandle("gone.graphty.json", { create: true });
        await root.removeEntry("gone.graphty.json");
        await rememberRecent({ id: "gone", name: "Gone", nodes: 3, at: 1, handle });
        renderIn("light", <Workspace />);

        const cell = await screen.findByRole("gridcell", { name: /^Gone/ });
        const row = cell.querySelector<HTMLElement>(".cm-page-button") ?? cell;
        await userEvent.click(cell);
        const line = await screen.findByText("This file can no longer be read. Locate...");
        await userEvent.hover(cell);
        await waitFor(() => {
            assert.notEqual(getComputedStyle(row).backgroundColor, "rgba(0, 0, 0, 0)");
        });
        const failures = await contrastFailures(line);

        assert.deepEqual(failures, [], failures.join("\n"));
    });

    // Status glyphs need 3:1 on the surface they sit on (WCAG 1.4.11), in both schemes (#3080).
    for (const scheme of ["light", "dark"] as const) {
        it(`a ready table's check meets 3:1 on the Data page in the ${scheme} scheme`, async () => {
            renderIn(
                scheme,
                <div style={{ background: "var(--cm-bg)" }}>
                    <ReadyMark ready />
                </div>,
            );
            const ratio = glyphContrast(await screen.findByRole("img", { name: "Ready" }));
            assert.isAtLeast(ratio, 3, `contrast ${ratio.toFixed(2)}:1`);
        });

        it(`the error screen's warning glyph meets 3:1 in the ${scheme} scheme`, async () => {
            renderIn(scheme, <ErrorFallback error={new Error("x")} resetError={() => undefined} />);
            await screen.findByRole("heading", { name: "Something went wrong" });
            const glyph = document.querySelector("svg.lucide-triangle-alert, svg.lucide-alert-triangle");
            assert.isNotNull(glyph);
            const ratio = glyphContrast(glyph);
            assert.isAtLeast(ratio, 3, `contrast ${ratio.toFixed(2)}:1`);
        });

        it(`a server preview's failure code meets 4.5:1 in the ${scheme} scheme`, async () => {
            renderIn(
                scheme,
                <div style={{ background: "var(--cm-bg)" }} data-testid="ground">
                    <CodeChip fact={{ code: "E_UNREACHABLE", params: {} }} />
                </div>,
            );
            const failures = await contrastFailures(await screen.findByTestId("ground"));
            assert.deepEqual(failures, [], failures.join("\n"));
        });

        for (const ground of ["var(--cm-bg)", "var(--mantine-color-default-hover)"]) {
            it(`a heavy shader's cost glyph meets 3:1 on ${ground} in the ${scheme} scheme`, async () => {
                renderIn(
                    scheme,
                    <div style={{ background: ground }}>
                        <ShaderFacts descriptor={HEAVY} />
                    </div>,
                );
                const cost = document.querySelector('[data-cost="heavy"] svg');
                assert.isNotNull(cost);
                await screen.findByRole("img", { name: /cost/i });
                const ratio = glyphContrast(cost);
                assert.isAtLeast(ratio, 3, `contrast ${ratio.toFixed(2)}:1`);
            });
        }
    }
});
