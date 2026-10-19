import { MantineProvider } from "@mantine/core";
import { render as renderBare } from "@testing-library/react";
import axe from "axe-core";
import React from "react";
import { assert, beforeEach, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor } from "../../test/test-utils";
import { theme } from "../../theme";
import { clearRecent, rememberRecent } from "../../workspace/project/recent";
import { Workspace } from "../../workspace/Workspace";
import type { GraphtyHandle } from "../Graphty";
import { LoadDataModal } from "../LoadDataModal";
import { RunAlgorithmModal } from "../RunAlgorithmModal";
import { RunLayoutsModal } from "../RunLayoutsModal";
import { CANVAS_TOOLBAR_DESKTOP } from "../shell/constants";
import { ViewsMenu } from "../shell/toolbar/ViewsMenu";

/*
   Status text (an error, a file that can no longer be read) must meet WCAG 1.4.3 (4.5:1) on its
   ground, and a state glyph (a checked row's check) WCAG 1.4.11 (3:1). These places colored them
   with a fill token or a raw Mantine color (#3032).
*/

async function contrastFailures(element: Element): Promise<string[]> {
    await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
    const results = await axe.run(element, { runOnly: ["color-contrast"], resultTypes: ["violations"] });

    return results.violations.flatMap((violation) =>
        violation.nodes.map((node) => `${node.html.slice(0, 120)}\n  ${node.failureSummary ?? ""}`),
    );
}

function luminance(color: string): number {
    const [r, g, b] = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map((part) => {
        const c = Number(part) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg: string, bg: string): number {
    const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
    return (hi + 0.05) / (lo + 0.05);
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
 * The Views menu, open, with its Toolbar row checked.
 * @returns the menu
 */
function viewsMenu(): React.ReactElement {
    return (
        <ViewsMenu
            opened
            onOpenChange={vi.fn()}
            profile={CANVAS_TOOLBAR_DESKTOP}
            legendShown
            toolbarShown
            vrSupported={false}
            arSupported={false}
            visibleNodeCount={20}
            onResetView={vi.fn()}
            onViewPreset={vi.fn()}
            onToggleToolbar={vi.fn()}
            onToggleLegend={vi.fn()}
            onEnterVr={vi.fn()}
            onEnterAr={vi.fn()}
        />
    );
}

beforeEach(async () => {
    await clearRecent();
});

describe("status ink contrast", () => {
    // The modal paints a dark ground in both schemes; render it in the light scheme, where an
    // unscoped light-scheme ink would land on that dark ground.
    it("the Run Algorithm modal's error meets 4.5:1 on the modal's dark ground in the light scheme", async () => {
        const graphtyRef = {
            current: {
                session: {
                    data: { nodes: () => [] },
                    runs: { start: () => Promise.reject(new Error("The algorithm failed")) },
                },
            } as unknown as GraphtyHandle,
        };
        renderBare(
            <MantineProvider theme={theme} forceColorScheme="light">
                <RunAlgorithmModal opened onClose={vi.fn()} graphtyRef={graphtyRef} />
            </MantineProvider>,
        );

        await userEvent.click(await screen.findByRole("button", { name: "Run Algorithm" }));
        const failures = await contrastFailures(await screen.findByText("The algorithm failed"));

        assert.deepEqual(failures, [], failures.join("\n"));
    });

    it("a recent project's can-no-longer-be-read line meets 4.5:1", async () => {
        const root = await navigator.storage.getDirectory();
        const handle = await root.getFileHandle("gone.graphty.json", { create: true });
        await root.removeEntry("gone.graphty.json");
        await rememberRecent({ id: "gone", name: "Gone", nodes: 3, at: 1, handle });
        render(<Workspace />);

        await userEvent.click(await screen.findByRole("button", { name: /^Gone/ }));
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

        const row = await screen.findByRole("button", { name: /^Gone/ });
        await userEvent.click(row);
        const line = await screen.findByText("This file can no longer be read. Locate...");
        await userEvent.hover(row);
        await waitFor(() => {
            assert.notEqual(getComputedStyle(row).backgroundColor, "rgba(0, 0, 0, 0)");
        });
        const failures = await contrastFailures(line);

        assert.deepEqual(failures, [], failures.join("\n"));
    });

    it("the Views menu's checked glyph meets 3:1 on the menu", async () => {
        render(viewsMenu());

        const dropdown = await screen.findByRole("menu", { name: "Views" });
        const glyph = (await screen.findByRole("menuitemcheckbox", { name: "Toolbar" })).querySelector("span");
        assert.isNotNull(glyph);
        await waitFor(() => {
            assert.notEqual(getComputedStyle(dropdown).backgroundColor, "rgba(0, 0, 0, 0)");
        });
        const measured = ratio(getComputedStyle(glyph).color, getComputedStyle(dropdown).backgroundColor);

        assert.isAtLeast(measured, 3, `checked glyph ${measured.toFixed(2)}:1`);
    });

    // The menu's rows resolve their inks dark, so its ground must too: in the light scheme it
    // resolved light, and the row text was white on #f5f5f5 (1.09:1, #3057).
    it.each(["light", "dark"] as const)("the Views menu's rows are readable in the %s scheme", async (scheme) => {
        renderIn(scheme, viewsMenu());

        const dropdown = await screen.findByRole("menu", { name: "Views" });
        await waitFor(() => {
            assert.notEqual(getComputedStyle(dropdown).backgroundColor, "rgba(0, 0, 0, 0)");
        });
        const ground = getComputedStyle(dropdown).backgroundColor;
        const row = await screen.findByRole("menuitemcheckbox", { name: "Toolbar" });
        const glyph = row.querySelector("span");
        assert.isNotNull(glyph);
        const text = ratio(getComputedStyle(row).color, ground);
        const check = ratio(getComputedStyle(glyph).color, ground);

        assert.isAtLeast(text, 4.5, `row text ${text.toFixed(2)}:1`);
        assert.isAtLeast(check, 3, `checked glyph ${check.toFixed(2)}:1`);
    });

    it.each(["light", "dark"] as const)("the Load Data modal's error meets 4.5:1 in the %s scheme", async (scheme) => {
        const onLoad = vi.fn(() => Promise.reject(new Error("Failed to fetch URL: 404 Not Found")));
        renderIn(scheme, <LoadDataModal opened onClose={vi.fn()} onLoad={onLoad} />);

        await userEvent.click(screen.getByText("URL"));
        await userEvent.fill(screen.getByLabelText("Data URL"), "https://example.com/missing.json");
        await userEvent.click(screen.getByRole("button", { name: /^Load / }));
        const failures = await contrastFailures(await screen.findByText("Failed to fetch URL: 404 Not Found"));

        assert.deepEqual(failures, [], failures.join("\n"));
    });

    it.each(["light", "dark"] as const)(
        "the Run Layouts modal's warning meets 4.5:1 in the %s scheme",
        async (scheme) => {
            renderIn(scheme, <RunLayoutsModal opened onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            await userEvent.click(screen.getByRole("combobox", { name: /layout/i }));
            await userEvent.click(await screen.findByText("BFS Tree"));
            const failures = await contrastFailures(await screen.findByText(/requires Start Node/i));

            assert.deepEqual(failures, [], failures.join("\n"));
        },
    );
});
