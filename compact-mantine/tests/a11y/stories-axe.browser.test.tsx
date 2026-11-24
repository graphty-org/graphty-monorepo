import { composeStories, setProjectAnnotations } from "@storybook/react";
import { afterEach, describe, expect, it } from "vitest";

import preview from "../../.storybook/preview";
import * as SplitButton from "../../stories/components/actions/SplitButton.stories";
import * as ColorPalettes from "../../stories/components/color/ColorPalettes.stories";
import * as DataFieldPicker from "../../stories/components/data/DataFieldPicker.stories";
import * as DataRow from "../../stories/components/data/DataRow.stories";
import * as ProseBlock from "../../stories/components/data/ProseBlock.stories";
import * as AnglePicker from "../../stories/components/inputs/AnglePicker.stories";
import * as FontPicker from "../../stories/components/inputs/FontPicker.stories";
import * as ImagePicker from "../../stories/components/inputs/ImagePicker.stories";
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

/** What this test needs of a composed story: rendering it and running its play function. */
interface RunnableStory {
    run: (context: { canvasElement: HTMLElement }) => Promise<void>;
}

const MODULES = {
    AnglePicker,
    ColorPalettes,
    DataFieldPicker,
    DataRow,
    FontPicker,
    ImagePicker,
    Menu,
    Modal,
    Pagination,
    Progress,
    ProseBlock,
    QuickActions,
    Slider,
    SplitButton,
    Tabs,
    Toolbar,
};

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
        // `schemes: "single"` renders a BOTH_SCHEMES story once, in this scheme, as the visual capture does.
        const stories = composeStories(module, { initialGlobals: { theme, contrast, schemes: "single" } });
        const off = OFF_BY_DESIGN[module.default.title ?? ""] ?? [];

        // The union of this many modules' story types is too wide for TypeScript to keep, so each
        // story is named by the one method this test calls.
        const entries = Object.entries(stories) as [string, RunnableStory][];
        it.each(entries)("%s", async (_story, Story) => {
            const canvasElement = document.createElement("div");
            document.body.appendChild(canvasElement);
            await Story.run({ canvasElement });

            const found = await axeFindings(contrast, off);
            expect(found).toEqual([]);
        });
    });
});
