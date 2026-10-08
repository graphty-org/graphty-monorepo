import { composeStories, setProjectAnnotations } from "@storybook/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";

import preview from "../../.storybook/preview";
import * as SplitButton from "../../stories/components/actions/SplitButton.stories";
import * as DataRow from "../../stories/components/data/DataRow.stories";
import * as Menu from "../../stories/components/overlays/Menu.stories";
import * as Modal from "../../stories/components/overlays/Modal.stories";
import * as QuickActions from "../../stories/components/shell/QuickActions.stories";
import * as Toolbar from "../../stories/components/shell/Toolbar.stories";
import * as Progress from "../../stories/mantine/feedback/Progress.stories";
import * as Pagination from "../../stories/mantine/navigation/Pagination.stories";
import * as Tabs from "../../stories/mantine/navigation/Tabs.stories";
import * as Slider from "../../stories/mantine/selection/Slider.stories";

/**
 * Every story of these components has no axe-core violation: the check Storybook's Accessibility
 * panel runs (addon-a11y), enforced here because the panel only reports. Each story is rendered
 * and its play function run, so the states a play opens (a menu, a modal) are checked too, in
 * both color schemes and both contrast token sets.
 *
 * Rules switched off, and why:
 * - `region` everywhere, as addon-a11y does: a story is a fragment of a page, not a page with
 *   landmarks.
 * - `color-contrast` under the default (exact Figma) token set: Figma's secondary and
 *   placeholder text fall short of AA by design, and `createCompactTheme({ highContrast: true })`
 *   is the AA set (stories/introduction/Accessibility.mdx, "Contrast: exact Figma, or AA"). The
 *   rule runs under that set on every story.
 * - `scrollable-region-focusable` for Menu: a long menu scrolls, and its rows are out of the Tab
 *   order by design (WAI-ARIA menu pattern: one Tab stop, the arrow keys move between rows and
 *   scroll each into view). axe exempts a combobox's listbox for the same reason, not a menu.
 */
setProjectAnnotations(preview);

const MODULES = { DataRow, Menu, Modal, Pagination, Progress, QuickActions, Slider, SplitButton, Tabs, Toolbar };

const OFF_FOR: Partial<Record<keyof typeof MODULES, string[]>> = { Menu: ["scrollable-region-focusable"] };

afterEach(() => {
    document.body.innerHTML = "";
});

describe.each(Object.entries(MODULES))("%s stories have no axe violations", (name, module) => {
    describe.each([
        ["light", "figma"],
        ["dark", "figma"],
        ["light", "high"],
        ["dark", "high"],
    ] as const)("%s, %s contrast", (theme, contrast) => {
        // `schemes: "single"` renders a BOTH_SCHEMES story once, in this scheme, as Chromatic does.
        const stories = composeStories(module, { initialGlobals: { theme, contrast, schemes: "single" } });
        const off = ["region", ...(OFF_FOR[name as keyof typeof MODULES] ?? [])];

        it.each(Object.entries(stories))("%s", async (_story, Story) => {
            const contrastOff = contrast === "figma";
            const canvasElement = document.createElement("div");
            document.body.appendChild(canvasElement);
            await Story.run({ canvasElement });

            axe.reset();
            const result = await axe.run(document.body, {
                rules: Object.fromEntries(
                    [...off, ...(contrastOff ? ["color-contrast"] : [])].map((id) => [id, { enabled: false }]),
                ),
            });
            const found = result.violations.map(
                (v) =>
                    `${v.id} (${v.impact}): ${v.help}\n${v.nodes.map((n) => `    ${n.target.join(" ")}`).join("\n")}`,
            );
            expect(found).toEqual([]);
        });
    });
});
