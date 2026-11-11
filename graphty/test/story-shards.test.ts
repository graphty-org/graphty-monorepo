import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import {
    balancedPart,
    DEFAULT_SECONDS,
    FILE_SECONDS,
    isRealElementProject,
    isStoryProject,
    REAL_ELEMENT_SECONDS,
    realElementSeconds,
    STORY_SECONDS,
    TEST_SECONDS,
} from "./story-shards";

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

describe("isRealElementProject", () => {
    it("takes the real-element project and not large-graph, whose parts are one file each", () => {
        assert.isTrue(isRealElementProject("real-element (chromium)"));
        assert.isTrue(isRealElementProject("real-element"));
        // the experiments-on twin's parts split the same files by time, not by vitest's hash
        assert.isTrue(isRealElementProject("real-element-features-on (chromium)"));
        for (const name of ["large-graph (chromium)", "browser (chromium)", "storybook (chromium)", "node"]) {
            assert.isFalse(isRealElementProject(name), name);
        }
    });
});

describe("realElementSeconds", () => {
    it("counts each it, test and each-table as one test", () => {
        const source = [
            'describe("x", () => {',
            '    it("a", async () => {});',
            '    test("b", () => {});',
            '    it.each([1, 2])("c %d", () => {});',
            '    // it("not at the start of a line") is still a comment',
            "});",
        ].join("\n");
        assert.equal(realElementSeconds(source), FILE_SECONDS + 3 * TEST_SECONDS);
    });
});

describe("the graphty-N parts' real-element files", () => {
    const root = join(import.meta.dirname, "..");
    const files = readdirSync(join(root, "src"), { recursive: true, encoding: "utf8" })
        .filter((f) => f.endsWith(".real-element.test.tsx") && !/LargeGraph\.|__screenshots__/.test(f))
        .map((f) => `src/${f}`);
    const cost = new Map(
        files.map((f) => [f, REAL_ELEMENT_SECONDS[f] ?? realElementSeconds(readFileSync(join(root, f), "utf8"))]),
    );
    const seconds = (f: string): number => cost.get(f) ?? 0;

    it("come out within the slowest file of each other in six parts", () => {
        const parts = [1, 2, 3, 4, 5, 6].map((i) => balancedPart(files, i, 6, seconds));
        assert.deepEqual(parts.flat().sort(), [...files].sort());
        const loads = parts.map((p) => p.reduce((sum, f) => sum + seconds(f), 0));
        assert.isAtMost(Math.max(...loads) - Math.min(...loads), Math.max(...cost.values()));
    });
});
