/**
 * @file A story named for a style channel has to paint that channel.
 *
 * WHY THIS EXISTS. `test/contracts/story-roster.test.ts` makes a story impossible to delete
 * quietly. It cannot make one impossible to HOLLOW OUT, because it counts ids and an id is a
 * name: a story that keeps its export name and its title while its body stops demonstrating
 * anything is, to the roster, a story that is still there.
 *
 * That is how `Styles/Layered::ArrowSizeVariations` spent the 2.0 migration claiming three arrow
 * sizes in a comment while all three of its layers wrote a cap type and nothing else. Every gate
 * was green. Chromatic was green too, and could not have been anything else: the baseline it
 * compares against was taken from the same hollow picture, so the day the sizes went away was the
 * day the baseline stopped being able to notice.
 *
 * WHAT IS ASSERTED. Three things, and the third is the one that keeps the first two honest.
 *
 * 1. No story in the `Styles/` tree names a channel it does not paint.
 * 2. The gate is still reading a substantial part of that tree, so a change that quietly stops it
 *    recognising subjects fails here rather than passing everything.
 * 3. The gate can still go red. It is run over a story written to be hollow, in a scratch
 *    directory of this test's own, and is required to catch it -- and over the same story with
 *    its sizes put back, where it is required to say nothing. A gate nobody has ever seen fail is
 *    a gate nobody knows the shape of.
 *
 * The same three things are asserted for every tree in `SUBJECT_TREES` -- Layout, Data and
 * Algorithms -- where the subject is a registry key rather than a channel: a layout story names
 * the engine it sets, a data story the format it loads, an algorithm story the algorithm it runs.
 *
 * The rule itself, the vocabulary it reads and what counts as demonstrating a subject are in
 * `test/contracts/story-subject.ts`.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { assert, describe, it } from "vitest";

import { PACKAGE_ROOT, readStories } from "./story-source";
import { checkSubjects, checkTreeSubjects } from "./story-subject";

/**
 * How many stories in the `Styles/` tree must name a subject for the gate to count as awake.
 *
 * A TRIPWIRE, NOT A TARGET. Sixty-two stories name a channel today. This floor is far below that
 * and exists for one failure only: a change to the tokeniser, the vocabulary or the tree's titles
 * that leaves the gate recognising nothing and therefore passing everything, which is the exact
 * shape of defect this whole file is about. Raising it to track the real number would only make
 * it a second roster.
 */
const MUST_CHECK_AT_LEAST = 25;

/**
 * How many stories in each registry-keyed tree must name a key, for the same reason as
 * {@link MUST_CHECK_AT_LEAST}. Today: 27 layout stories, 20 data stories, 27 algorithm stories.
 */
const TREE_MUST_CHECK_AT_LEAST: Readonly<Record<string, number>> = {
    "Layout/": 15,
    Data: 10,
    "Algorithms/": 15,
};

/**
 * One hollow story per registry-keyed tree, and the same story with its subject back. The
 * hollow one keeps its name and configures some other key, which is how a copied story that was
 * never finished looks.
 */
const TREE_FIXTURES: readonly {
    tree: string;
    title: string;
    exportName: string;
    hollow: string;
    whole: string;
    missing: string;
}[] = [
    {
        tree: "Layout/",
        title: "Layout/2D",
        exportName: "KamadaKawai",
        hollow: `args: { layout: "circular" }`,
        whole: `args: { layout: "kamada-kawai" }`,
        missing: 'layout engine "kamada-kawai"',
    },
    {
        tree: "Data",
        title: "Data",
        exportName: "CsvNeo4j",
        hollow: `args: { dataSource: "json", dataSourceConfig: { data: "{}" } }`,
        whole: `args: { dataSource: "csv", dataSourceConfig: { data: "a,b" } }`,
        missing: 'format "csv"',
    },
    {
        tree: "Algorithms/",
        title: "Algorithms/Centrality",
        exportName: "PageRank",
        hollow: `args: { setup: storySetup({ algorithms: ["graphty:degree"] }) }`,
        whole: `args: { setup: storySetup({ algorithms: ["graphty:pagerank"] }) }`,
        missing: 'algorithm "pagerank"',
    },
];

/**
 * A one-story file in a tree of the fixture's choosing.
 * @param title - The meta title.
 * @param exportName - The story's export name.
 * @param body - The story object's members.
 * @returns The file's source.
 */
function treeStory(title: string, exportName: string, body: string): string {
    return `import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { storySetup } from "./helpers";

const meta: Meta = { title: "${title}", component: "graphty-element" };
export default meta;

export const ${exportName}: StoryObj = { ${body} };
`;
}

/** Where a scratch story tree goes: the monorepo's own tmp, never the system one. */
const SCRATCH_ROOT = path.join(PACKAGE_ROOT, "..", "tmp");

/**
 * A one-file story tree, written to disk so the gate reads it exactly as it reads the real one.
 * @param layerSet - What the story's three layers write, as the body of a `set` object.
 * @returns The file's source.
 */
function arrowSizeStory(layerSet: string): string {
    return `import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { storySetup } from "./helpers";

const meta: Meta = { title: "Styles/Layered", component: "graphty-element" };
export default meta;

type Story = StoryObj;

/** Three layers sizing an arrow by the weight of the edge it caps. */
export const ArrowSizeVariations: Story = {
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "light edges",
                    target: "edge",
                    selector: { match: "expression", where: "data.weight == \`1\`" },
                    set: { ${layerSet} },
                },
            ],
        }),
    },
};
`;
}

/**
 * Run the gate over a story tree of this test's own making.
 * @param source - The single story file to put in it.
 * @returns What the gate found.
 */
function gateOver(source: string): ReturnType<typeof checkSubjects> {
    return checkSubjects(readScratch(source));
}

/**
 * Read a one-file story tree of this test's own making, written to disk so the reader reads it
 * exactly as it reads the real one.
 * @param source - The single story file to put in it.
 * @returns The reading.
 */
function readScratch(source: string): ReturnType<typeof readStories> {
    mkdirSync(SCRATCH_ROOT, { recursive: true });

    const dir = mkdtempSync(path.join(SCRATCH_ROOT, "story-subject-selftest-"));

    try {
        writeFileSync(path.join(dir, "Scratch.stories.ts"), source, "utf8");

        return readStories(dir);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

describe("a story demonstrates the subject it is named after", () => {
    const report = checkSubjects(readStories());

    it("paints every channel its name claims", () => {
        const failures = report.findings.map((finding) => {
            const writes = finding.writes.length === 0 ? "nothing at all" : finding.writes.join(", ");

            return `${finding.id} (${finding.file}) names ${finding.missing.join(", ")} and writes ${writes}`;
        });

        assert.deepEqual(
            failures,
            [],
            `Each of these stories is named after a style channel and never writes it, so its name ` +
                `promises a picture the story does not draw. Either the story lost its subject and the ` +
                `layers have to come back, or it was never about that subject and its name is the thing ` +
                `to change -- and renaming it changes its story id, so stories/story-roster.json is ` +
                `edited in the same breath and the lost demonstration is recorded rather than mislaid.`,
        );
    });

    it("is still reading the Styles tree", () => {
        assert.isAtLeast(
            report.checked,
            MUST_CHECK_AT_LEAST,
            `Only ${String(report.checked)} stories in the Styles tree were found to name a channel at ` +
                `all, which is too few for this gate to be doing its job. Something that used to connect ` +
                `story names to the channel vocabulary has stopped: the tree was retitled, the channel ` +
                `list moved, or the word splitting in test/contracts/story-subject.ts no longer matches ` +
                `how the stories are named. A gate that recognises nothing passes everything.`,
        );
    });

    it("names every story it could only read loosely", () => {
        assert.deepEqual(
            [...report.readLoosely].sort(),
            ["Styles/Node::AllNodeShapes"],
            `A story whose layers are built by a helper cannot be read layer by layer, so the gate ` +
                `falls back to looking for channel names anywhere in its FILE -- a weaker reading that ` +
                `a hollowed story in the same file could hide behind. One story is written that way on ` +
                `purpose: AllNodeShapes builds one layer per shape by mapping over the shape list the ` +
                `schema publishes, which is how it should be written. Any other name in this list is a ` +
                `story that has quietly moved out of the strict reading, and the question to answer is ` +
                `whether its layers could simply be written out instead.`,
        );
    });

    it("catches a story that keeps its name and drops its subject", () => {
        const hollow = gateOver(arrowSizeStory(`"edge.arrowHead": "normal"`));

        assert.deepEqual(
            hollow.findings.map((finding) => `${finding.id}: ${finding.missing.join(", ")}`),
            ["Styles/Layered::ArrowSizeVariations: size"],
            `A story called ArrowSizeVariations whose only layer writes a cap TYPE is the defect this ` +
                `gate exists for, and the gate did not report it. Whatever was changed, it stopped ` +
                `noticing the thing it was built to notice.`,
        );
    });

    it("says nothing about the same story once its subject is back", () => {
        const whole = gateOver(arrowSizeStory(`"edge.arrowHead": "normal", "edge.arrowHeadSize": 0.5`));

        assert.deepEqual(
            whole.findings,
            [],
            `The same story, with the arrow size it is named for, is reported as hollow. The gate is ` +
                `failing stories that are doing exactly what their name says, which makes every red it ` +
                `raises worthless.`,
        );
    });
});

describe("a layout, data or algorithm story demonstrates the key it is named after", () => {
    const reports = checkTreeSubjects(readStories());

    for (const report of reports) {
        it(`${report.tree}: writes every key its name spells`, () => {
            assert.deepEqual(
                report.findings.map((finding) => `${finding.id} (${finding.file}) names ${finding.missing.join(", ")}`),
                [],
                `Each of these stories is named after a key in the element's registry and never writes ` +
                    `it, so its name promises a layout, a format or an algorithm the story does not use. ` +
                    `Either put the key back, or rename the story -- and renaming it changes its story id, ` +
                    `so stories/story-roster.json is edited in the same breath.`,
            );
        });

        it(`${report.tree}: is still reading the tree`, () => {
            assert.isAtLeast(
                report.checked,
                TREE_MUST_CHECK_AT_LEAST[report.tree],
                `Only ${String(report.checked)} stories in ${report.tree} were found to name a key at all. ` +
                    `The tree was retitled, the catalogue it reads moved, or the name matching in ` +
                    `test/contracts/story-subject.ts stopped matching. A gate that recognises nothing ` +
                    `passes everything.`,
            );
        });
    }

    it("covers exactly the trees it has a floor and a fixture for", () => {
        const trees = reports.map((report) => report.tree);

        assert.sameMembers(Object.keys(TREE_MUST_CHECK_AT_LEAST), trees);
        assert.sameMembers(
            TREE_FIXTURES.map((fixture) => fixture.tree),
            trees,
        );
    });

    for (const fixture of TREE_FIXTURES) {
        it(`${fixture.tree}: catches a story that keeps its name and drops its subject`, () => {
            const found = checkTreeSubjects(readScratch(treeStory(fixture.title, fixture.exportName, fixture.hollow)))
                .flatMap((report) => report.findings)
                .map((finding) => `${finding.id}: ${finding.missing.join(", ")}`);

            assert.deepEqual(found, [`${fixture.title}::${fixture.exportName}: ${fixture.missing}`]);
        });

        it(`${fixture.tree}: says nothing about the same story once its subject is back`, () => {
            const reports = checkTreeSubjects(readScratch(treeStory(fixture.title, fixture.exportName, fixture.whole)));

            assert.deepEqual(
                reports.flatMap((report) => report.findings),
                [],
            );
            assert.strictEqual(reports.reduce((total, report) => total + report.checked, 0), 1);
        });
    }
});
