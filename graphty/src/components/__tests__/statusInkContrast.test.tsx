import { MantineProvider } from "@mantine/core";
import { render as renderBare } from "@testing-library/react";
import axe from "axe-core";
import React from "react";
import { assert, beforeEach, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor } from "../../test/test-utils";
import { theme } from "../../theme";
import { clearRecent, rememberRecent } from "../../workspace/project/recent";
import { Workspace } from "../../workspace/Workspace";

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
});
