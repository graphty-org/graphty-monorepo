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
 * The rule itself, the vocabulary it reads and what counts as demonstrating a subject are in
 * `test/contracts/story-subject.ts`.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { assert, describe, it } from "vitest";

import { PACKAGE_ROOT, readStories } from "./story-source";
import { checkSubjects } from "./story-subject";

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
    mkdirSync(SCRATCH_ROOT, { recursive: true });

    const dir = mkdtempSync(path.join(SCRATCH_ROOT, "story-subject-selftest-"));

    try {
        writeFileSync(path.join(dir, "Scratch.stories.ts"), source, "utf8");

        return checkSubjects(readStories(dir));
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
