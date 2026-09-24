/**
 * @file Every story in the package is named in a checked-in roster, and every story that was
 * taken away is named in the same file with the reason it went.
 *
 * WHY THIS EXISTS. Twenty stories were deleted in one pass in September 2026 -- seventeen from
 * `stories/LabelStyles.stories.ts` and three from `stories/EdgeStyles.stories.ts` -- and no gate
 * anywhere in the repository went red. Not one of the four that could have:
 *
 * - the storybook vitest project runs the stories that EXIST, so deleting one removes a test
 *   rather than failing one. The count fell from 150 to 131 and three later reports printed 131
 *   as green;
 * - Chromatic fails on a CHANGED snapshot, and a deleted story produces no snapshot to diff;
 * - the pre-push gate never runs the storybook project at all;
 * - ESLint globally ignored `**\/stories\/**` at the time, so the static gates never read the
 *   files either.
 *
 * Every one of those is blind to an ABSENCE by construction, and an absence is the whole failure.
 * The commit that carried the deletions is `ff12a515`, whose subject is "test(graphty-element):
 * drive a dummy extension through everything a built-in does" -- `tools/commit-changes.sh` sorts
 * `graphty-element/stories` into the `[tests]` bucket, so nothing in the message mentions a story.
 *
 * WHAT THIS TEST MAKES IMPOSSIBLE. Not "deleting a story" -- a story whose subject has no public
 * API really is a picture of the default, and retiring it can be the right call. What it makes
 * impossible is deleting one SILENTLY. The only way to get this test green after a deletion is to
 * write the id and the reason into `stories/story-roster.json`, which is a sentence in a file in
 * the repository: it survives a truncated agent report, a partially read document, a commit
 * splitter that renames the change, and an owner who was asleep. All four of those defeated the
 * warnings that were genuinely written last time.
 *
 * BOTH DIRECTIONS, which is what keeps the roster from rotting into a stale list nobody trusts:
 * adding a story also edits the roster, so the roster is always the full set rather than whatever
 * somebody remembered to add.
 *
 * A STORY'S ID IS `<meta title>::<export name>`, which is what a visual-regression baseline is
 * keyed on. So a retitled meta and a renamed export are both caught here, and both of those
 * orphan a Chromatic baseline exactly as a deletion does.
 *
 * NO STORYBOOK, NO BROWSER. The ids are read off disk, so this runs in the `default` vitest
 * project -- which means the pre-push gate and the `graphty-element-default` CI shard, the two
 * gates the class of failure above was invisible to. Reading Storybook's live `index.json` would
 * need a server, which makes the check CI-only at best.
 *
 * READ BY THE TYPESCRIPT PARSER, NOT BY A REGULAR EXPRESSION, and the difference is the whole
 * point of a roster. The ids used to be found with `/^export const (\w+): Story\b/gm` and the
 * titles with `/title:\s*"([^"]+)"/`. Both describe how this package happens to type its stories
 * and nothing else, so `export const Foo = {...} satisfies Story`, `export const Foo:
 * StoryObj<StoryArgs> = ...`, `export { Foo }` and a single-quoted title were each invisible --
 * and a story the roster cannot see is a story that can be deleted, renamed or hollowed out with
 * every gate green. The worst of them took a whole FILE out of the roster at once: one title the
 * pattern could not read and the file contributed no ids, which looks exactly like a file whose
 * stories were all deleted. `test/contracts/story-source.ts` parses instead, takes every named
 * export as a story the way Storybook does, and REFUSES to read a file it does not understand
 * rather than quietly returning nothing from it.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { assert, describe, it } from "vitest";

import { PACKAGE_ROOT, readStories, readStoryFile, STORIES_DIR, type StoryFileReading, storyFiles } from "./story-source";

/** The checked-in roster. */
const ROSTER_PATH = path.join(STORIES_DIR, "story-roster.json");

/** Where a scratch story tree goes: the monorepo's own tmp, never the system one. */
const SCRATCH_ROOT = path.join(PACKAGE_ROOT, "..", "tmp");

/** One story that used to exist and deliberately does not any more. */
interface RetiredStory {
    /** The id it had: `<meta title>::<export name>`. */
    id: string;
    /** Why it went. A reader has to be able to act on this without reading a commit. */
    why: string;
    /** The id of the story that covers its subject now, when one does. */
    replacedBy?: string;
}

/** The roster file. */
interface StoryRoster {
    /** What the file is, for a reader who opened it without this test beside them. */
    note: string;
    /** Every story the package ships, by id. */
    stories: string[];
    /** Every story it used to ship and deliberately does not, by id, each with its reason. */
    retired: RetiredStory[];
}

/**
 * Read every story file, keeping the ones that could not be read rather than dropping them.
 *
 * A FILE THAT CANNOT BE READ IS A FAILURE, never an empty file. That distinction is the one the
 * old pattern could not make, and it is what let a whole file leave the roster in silence.
 * @returns What was read, and one sentence per file that could not be.
 */
function readEveryStoryFile(): { readings: StoryFileReading[]; unreadable: string[] } {
    const readings: StoryFileReading[] = [];
    const unreadable: string[] = [];

    for (const file of storyFiles(STORIES_DIR)) {
        try {
            readings.push(readStoryFile(file));
        } catch (error) {
            unreadable.push(error instanceof Error ? error.message : String(error));
        }
    }

    return { readings, unreadable };
}

/**
 * Read the roster, with a failure message that says what to do rather than `ENOENT`.
 * @returns The roster as written.
 */
function readRoster(): StoryRoster {
    let raw: string;

    try {
        raw = readFileSync(ROSTER_PATH, "utf8");
    } catch {
        throw new Error(
            `stories/story-roster.json is missing. It is the list of every story this package ` +
                `ships, plus every story it used to ship and the reason each one went. Create it ` +
                `with {"stories": [...], "retired": [...]}.`,
        );
    }

    return JSON.parse(raw) as StoryRoster;
}

describe("the story roster", () => {
    const onDisk = readEveryStoryFile();
    const diskIds = new Set(onDisk.readings.flatMap((reading) => reading.stories.map((story) => story.id)));
    const roster = readRoster();
    const rosterIds = new Set(roster.stories);
    const retiredIds = new Set(roster.retired.map((entry) => entry.id));

    it("can read every story file there is", () => {
        assert.deepEqual(
            onDisk.unreadable,
            [],
            `These story files could not be read, so this test does not know what is in them and ` +
                `nothing below is checking them. That is the failure this gate exists to prevent: a ` +
                `file it cannot read contributes no story ids, which is indistinguishable from a file ` +
                `whose stories were all deleted. Write the meta and the title out in the file, or ` +
                `teach test/contracts/story-source.ts the form used -- never leave it unable to look.`,
        );
    });

    it("names every story that is on disk", () => {
        const unlisted = [...diskIds].filter((id) => !rosterIds.has(id)).sort();

        assert.deepEqual(
            unlisted,
            [],
            `These stories exist and are not in stories/story-roster.json. Add each id to ` +
                `"stories". The roster is checked in both directions on purpose: a roster that ` +
                `only ever gains entries when somebody remembers is a list nobody can trust to ` +
                `tell them a story went missing.`,
        );
    });

    it("finds every story it names", () => {
        const missing = roster.stories.filter((id) => !diskIds.has(id)).sort();

        assert.deepEqual(
            missing,
            [],
            `These stories are named in stories/story-roster.json and no file declares them. ` +
                `Either the story was deleted -- in which case move its id into "retired" with a ` +
                `"why" a reader can act on -- or its meta title or its export name changed, ` +
                `which orphans its visual-regression baseline and needs the same decision.`,
        );
    });

    it("does not both ship and retire the same story", () => {
        const both = roster.stories.filter((id) => retiredIds.has(id)).sort();

        assert.deepEqual(both, [], `These ids are in both "stories" and "retired". A story is one or the other.`);
    });

    it("gives every retired story a reason", () => {
        const unexplained = roster.retired
            .filter((entry) => entry.why.trim().length === 0)
            .map((entry) => entry.id)
            .sort();

        assert.deepEqual(
            unexplained,
            [],
            `These retired stories have an empty "why". The reason is the entire value of the ` +
                `entry: without it the roster records that something went and not what was lost.`,
        );
    });

    it("retires only stories that are genuinely absent", () => {
        const stillHere = roster.retired
            .map((entry) => entry.id)
            .filter((id) => diskIds.has(id))
            .sort();

        assert.deepEqual(
            stillHere,
            [],
            `These ids are listed as retired and are on disk. A retirement entry that outlives ` +
                `the thing it describes is worse than no entry: it tells the next reader the ` +
                `capability is gone when it is back. Move the id into "stories".`,
        );
    });

    it("names a story that exists whenever a retired entry claims a replacement", () => {
        const dangling = roster.retired
            .filter((entry) => entry.replacedBy !== undefined && !diskIds.has(entry.replacedBy))
            .map((entry) => `${entry.id} -> ${String(entry.replacedBy)}`)
            .sort();

        assert.deepEqual(
            dangling,
            [],
            `These retired stories point at a replacement that does not exist. "replacedBy" is ` +
                `the sentence that tells a reader the subject is still demonstrated somewhere.`,
        );
    });
});

/**
 * A story written every other legal way, so the reader is asked to do the thing the pattern
 * could not.
 *
 * Single-quoted title; one story typed with `satisfies` and no annotation at all; one annotated
 * with the underlying Storybook type rather than the file's own `Story` alias; one declared
 * plainly and exported in a separate statement. All four are ordinary CSF that Storybook indexes
 * and puts in the sidebar, and the regular expression this gate used to run found none of them.
 */
const OTHERWISE_WRITTEN_STORIES = `import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta: Meta = { title: 'Styles/Written Differently', component: "graphty-element" };
export default meta;

type Story = StoryObj;

export const Satisfying = {
    args: { setup: { node: { "node.color": "red" } } },
} satisfies Story;

export const Annotated: StoryObj = {
    args: { setup: { node: { "node.shape": "box" } } },
};

const Separately: Story = {
    args: { setup: { node: { "node.size": 2 } } },
};

export { Separately };
`;

/** What the roster gate used to find stories with. */
const OLD_STORY_EXPORT_PATTERN = /^export const ([A-Za-z\d_]+): Story\b/gm;

/** What it used to find titles with. */
const OLD_TITLE_PATTERN = /title:\s*"([^"]+)"/;

describe("the roster reads a story however it is written", () => {
    /**
     * Put one story file in a scratch tree of this test's own and read it back.
     * @param source - The file's source.
     * @returns What the reader made of it.
     */
    const read = (source: string): StoryFileReading[] => {
        mkdirSync(SCRATCH_ROOT, { recursive: true });

        const dir = mkdtempSync(path.join(SCRATCH_ROOT, "story-roster-selftest-"));

        try {
            writeFileSync(path.join(dir, "Scratch.stories.ts"), source, "utf8");

            return readStories(dir);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    };

    it("finds a story that does not carry the type annotation the old pattern wanted", () => {
        const ids = read(OTHERWISE_WRITTEN_STORIES).flatMap((reading) =>
            reading.stories.map((story) => story.id),
        );

        assert.deepEqual(
            ids.sort(),
            [
                "Styles/Written Differently::Annotated",
                "Styles/Written Differently::Satisfying",
                "Styles/Written Differently::Separately",
            ],
            `Three stories written in three ordinary CSF styles, and the roster did not find all ` +
                `three. Every story it cannot see is a story that can be deleted, renamed or emptied ` +
                `with this gate green -- which is the whole failure the roster was built after.`,
        );
    });

    it("is reading more than the pattern it replaced could", () => {
        // Not decoration: this is the measurement that says the rewrite was worth making. The old
        // pattern found no stories at all in that file, and no title either, so the file would
        // have contributed nothing and looked like a file with nothing in it.
        assert.deepEqual([...OTHERWISE_WRITTEN_STORIES.matchAll(OLD_STORY_EXPORT_PATTERN)], []);
        assert.isNull(OLD_TITLE_PATTERN.exec(OTHERWISE_WRITTEN_STORIES));
    });

    it("refuses a file whose title it cannot read, instead of reading no stories from it", () => {
        assert.throws(
            () => read(`import type { Meta } from "@storybook/web-components-vite";\n` +
                `const meta: Meta = { title: titleFor("Styles/Node"), component: "graphty-element" };\n` +
                `export default meta;\n` +
                `export const Only = { args: {} };\n`),
            /title/,
            `A meta whose title is built at run time takes every story in the file out of the roster ` +
                `at once. The reader has to refuse it out loud; returning zero stories is the silence ` +
                `this gate exists to break.`,
        );
    });
});
