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
import { RunAlgorithmModal } from "../RunAlgorithmModal";
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

    it("the Views menu's checked glyph meets 3:1 on the menu", async () => {
        render(
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
            />,
        );

        const dropdown = await screen.findByRole("menu", { name: "Views" });
        const glyph = (await screen.findByRole("menuitemcheckbox", { name: "Toolbar" })).querySelector("span");
        assert.isNotNull(glyph);
        await waitFor(() => {
            assert.notEqual(getComputedStyle(dropdown).backgroundColor, "rgba(0, 0, 0, 0)");
        });
        const measured = ratio(getComputedStyle(glyph).color, getComputedStyle(dropdown).backgroundColor);

        assert.isAtLeast(measured, 3, `checked glyph ${measured.toFixed(2)}:1`);
    });
});
