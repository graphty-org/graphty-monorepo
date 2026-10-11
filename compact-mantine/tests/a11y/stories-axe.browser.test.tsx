import { composeStories, setProjectAnnotations } from "@storybook/react";
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
import { axeFindings, OFF_BY_DESIGN } from "./axe";

/**
 * Every story of these components has no axe-core violation: the check Storybook's Accessibility
 * panel runs (addon-a11y), enforced here because the panel only reports. Each story is rendered
 * and its play function run, so the states a play opens (a menu, a modal) are checked too, in
 * both color schemes and both contrast token sets.
 *
 * Rules switched off, and why: `region` everywhere and `color-contrast` under the Figma token set,
 * plus the by-design list (see ./axe.ts); the AA set runs `color-contrast` on every story.
 */
setProjectAnnotations(preview);

const MODULES = { DataRow, Menu, Modal, Pagination, Progress, QuickActions, Slider, SplitButton, Tabs, Toolbar };

afterEach(() => {
    document.body.innerHTML = "";
});

describe.each(Object.entries(MODULES))("%s stories have no axe violations", (_name, module) => {
    describe.each([
        ["light", "figma"],
        ["dark", "figma"],
        ["light", "high"],
        ["dark", "high"],
    ] as const)("%s, %s contrast", (theme, contrast) => {
        // `schemes: "single"` renders a BOTH_SCHEMES story once, in this scheme, as Chromatic does.
        const stories = composeStories(module, { initialGlobals: { theme, contrast, schemes: "single" } });
        const off = OFF_BY_DESIGN[module.default.title ?? ""] ?? [];

        it.each(Object.entries(stories))("%s", async (_story, Story) => {
            const canvasElement = document.createElement("div");
            document.body.appendChild(canvasElement);
            await Story.run({ canvasElement });

            const found = await axeFindings(contrast, off);
            expect(found).toEqual([]);
        });
    });
});
