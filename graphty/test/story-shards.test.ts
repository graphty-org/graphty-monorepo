import { assert, describe, it } from "vitest";

import { balancedPart, DEFAULT_SECONDS, isStoryProject, STORY_SECONDS } from "./story-shards";

const seconds = (file: string): number => STORY_SECONDS[file] ?? DEFAULT_SECONDS;
const total = (files: string[]): number => files.reduce((sum, f) => sum + seconds(f), 0);

// The graphty story files of ci.yml run 42341586884, the run whose times STORY_SECONDS holds.
const FILES = [
    ...Object.keys(STORY_SECONDS),
    "src/workspace/data-page/DataPage.stories.tsx",
    "src/workspace/toolbar/Toolbar.stories.tsx",
    "src/workspace/table/TableDock.stories.tsx",
    "src/workspace/export/ExportDialog.stories.tsx",
    "src/stories/compact/CompactButtons.stories.tsx",
    "src/stories/compact/CompactOverview.stories.tsx",
    "src/stories/Sentry.stories.tsx",
    "src/stories/FeedbackModal.stories.tsx",
    "src/workspace/data-place/DataPlace.stories.tsx",
    "src/workspace/style/StyleTab.stories.tsx",
    "src/workspace/canvas/Canvas.stories.tsx",
    "src/stories/App.stories.tsx",
    "src/workspace/graph-place/GraphPlace.stories.tsx",
    "src/stories/compact/CompactControls.stories.tsx",
    "src/stories/compact/CompactInputs.stories.tsx",
    "src/stories/compact/CompactDisplay.stories.tsx",
];

describe("balancedPart", () => {
    it("puts the two slowest story files in different legs", () => {
        const [one, two] = [1, 2].map((i) => balancedPart(FILES, i, 2, seconds));
        const start = "src/workspace/start/StartScreen.stories.tsx";
        const style = "src/workspace/style/StylePanel.stories.tsx";
        assert.notEqual(one.includes(start), one.includes(style));
        assert.notEqual(two.includes(start), two.includes(style));
    });

    it("runs every file in exactly one part, whatever order the files come in", () => {
        for (const count of [1, 2, 3, 5]) {
            const parts = Array.from({ length: count }, (_, i) => balancedPart(FILES, i + 1, count, seconds));
            const reversed = Array.from({ length: count }, (_, i) =>
                balancedPart([...FILES].reverse(), i + 1, count, seconds),
            );
            assert.deepEqual(parts.flat().sort(), [...FILES].sort());
            assert.deepEqual(
                parts.map((p) => [...p].sort()),
                reversed.map((p) => [...p].sort()),
            );
        }
    });

    it("keeps the longer leg within the slowest file's time of the shorter", () => {
        const legs = [1, 2].map((i) => total(balancedPart(FILES, i, 2, seconds)));
        assert.isAtMost(Math.abs(legs[0] - legs[1]), Math.max(...FILES.map(seconds)));
        // vitest's own hash split of these files put three quarters of the time in one leg
        assert.isBelow(Math.max(...legs), 0.55 * total(FILES));
    });

    it("gives each part one file when there are as many parts as files", () => {
        const files = ["a", "b", "c"];
        const parts = [1, 2, 3].map((i) => balancedPart(files, i, 3, () => DEFAULT_SECONDS));
        assert.deepEqual(parts, [["a"], ["b"], ["c"]]);
    });
});

describe("isStoryProject", () => {
    it("takes the storybook project by the names vitest gives its specs, and no other project", () => {
        // vitest 4 names a browser instance's specs "<project> (<browser>)"
        assert.isTrue(isStoryProject("storybook (chromium)"));
        assert.isTrue(isStoryProject("storybook"));
        for (const name of ["browser (chromium)", "real-element (chromium)", "node", "storybook-extra"]) {
            assert.isFalse(isStoryProject(name), name);
        }
    });
});
