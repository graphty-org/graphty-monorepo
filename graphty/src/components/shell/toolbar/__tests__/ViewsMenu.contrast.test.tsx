import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { TEXT_MIN_CONTRAST, textContrast } from "../../../../test/contrast";
import { theme } from "../../../../theme";
import { CANVAS_TOOLBAR_DESKTOP } from "../../constants";
import { VIEWS_LABEL, ViewsMenu } from "../ViewsMenu";

function StatefulViewsMenu(): React.JSX.Element {
    const [opened, setOpened] = React.useState(false);
    return (
        <div style={{ paddingTop: 600 }}>
            <ViewsMenu
                opened={opened}
                onOpenChange={setOpened}
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
        </div>
    );
}

describe("ViewsMenu contrast (#2966)", () => {
    it.each(["light", "dark"] as const)("draws every row at 4.5:1 or more on its dropdown in %s", async (scheme) => {
        render(
            <MantineProvider theme={theme} forceColorScheme={scheme}>
                <StatefulViewsMenu />
            </MantineProvider>,
        );

        await userEvent.click(screen.getByRole("button", { name: VIEWS_LABEL }));
        const dropdown = await screen.findByRole("menu", { name: VIEWS_LABEL });
        const rows = [...dropdown.querySelectorAll<HTMLElement>("[data-menu-item]")];

        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
            expect(textContrast(row, dropdown), `"${row.textContent}" in ${scheme}`).toBeGreaterThanOrEqual(
                TEXT_MIN_CONTRAST,
            );
        }
    });
});
