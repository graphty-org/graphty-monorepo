import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { menuRowContrast, TEXT_MIN_CONTRAST } from "../../../../test/contrast";
import { theme } from "../../../../theme";
import { HelpMenu } from "../HelpMenu";

function StatefulHelpMenu(): React.JSX.Element {
    const [opened, setOpened] = React.useState(false);
    return (
        <HelpMenu
            opened={opened}
            onOpenChange={setOpened}
            onSelect={vi.fn()}
            moreSuggestionsCount={3}
            alreadyRunCount={2}
        >
            <button type="button" style={{ width: 47, height: 44 }}>
                Help
            </button>
        </HelpMenu>
    );
}

describe("HelpMenu contrast", () => {
    it.each(["light", "dark"] as const)("draws every row at 4.5:1 or more on its dropdown in %s", async (scheme) => {
        render(
            <MantineProvider theme={theme} forceColorScheme={scheme}>
                <StatefulHelpMenu />
            </MantineProvider>,
        );

        await userEvent.click(screen.getByRole("button", { name: "Help" }));
        const dropdown = await screen.findByRole("menu", { name: "Help" });
        const rows = within(dropdown).getAllByRole("menuitem");

        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
            expect(menuRowContrast(row, dropdown), `"${row.textContent}" in ${scheme}`).toBeGreaterThanOrEqual(
                TEXT_MIN_CONTRAST,
            );
        }
    });
});
