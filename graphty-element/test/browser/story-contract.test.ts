/**
 * @file The pairing a story depends on and nothing enforced: `setup` only works under `renderFn`.
 *
 * WHAT `setup` IS. `stories/helpers.ts` defines a small object a story hands the element -- node
 * and edge channels, encodings, extra layers, a view mode, a background, a camera distance, the
 * algorithms to run on load and the layout pre-step count. It is NOT a property of
 * `<graphty-element>`. It is a convention understood by exactly one function, `renderFn`, which
 * turns half of it into layers on the element's style stack and the other half into element
 * properties.
 *
 * WHAT WENT WRONG. Storybook's default web-components renderer assigns every arg as a property on
 * the element, so a story file whose meta has no `render` gets `dataSource`, `layout` and
 * `layoutConfig` applied and `element.setup = {...}` landing as a dead property nothing reads. No
 * algorithm runs, no story layer is added, and the layout runs with zero pre-steps -- the one
 * thing that makes a visual snapshot a different picture every time. Twenty-seven algorithm
 * stories, twenty-one data stories and one more were in that state, and every test of them passed,
 * because the whole of a storybook-lane test is "the story mounted and nothing threw".
 *
 * The migration that caused it is visible in one line of diff: the argument used to be
 * `styleTemplate`, which WAS a real element property, so the default renderer applied it and the
 * stories worked with no render function at all. It was replaced by a convention, and the render
 * function that convention needs was never added.
 *
 * WHY THIS TEST IS SHAPED LIKE THIS. It is an identity comparison on an imported function, so it
 * is the cheapest test in the file set and the only one that catches the whole class rather than
 * one instance of it. It needs no browser, no graph and no settle -- it lives in the browser
 * project only because the story modules it imports reach Lit and the DOM.
 */

import { assert, beforeAll, describe, it } from "vitest";

import { renderFn } from "../../stories/helpers";

/** The loader for one story module, as Vite's glob hands it over. */
type StoryModuleLoader = () => Promise<Record<string, unknown>>;

/** What this test reads of a story's meta. Everything else about it is somebody else's business. */
interface MetaLike {
    /** The render function the file declares for all of its stories, when it declares one. */
    readonly render?: unknown;
    /** Args shared by every story in the file. */
    readonly args?: Record<string, unknown>;
    /** What the file is called in the sidebar, for a failure message a reader can act on. */
    readonly title?: unknown;
}

/** What this test reads of one story. */
interface StoryLike {
    /** A render function of this story's own, which overrides the meta's. */
    readonly render?: unknown;
    /** This story's own args. */
    readonly args?: Record<string, unknown>;
    /** What Storybook runs after the story mounts, and the only place a story can assert. */
    readonly play?: unknown;
}

/** One story file, loaded. */
interface LoadedStoryFile {
    /** Where it lives, relative to the package root. */
    readonly path: string;
    /** Its default export. */
    readonly meta: MetaLike;
    /** Its stories, by export name. */
    readonly stories: readonly { readonly name: string; readonly story: StoryLike }[];
}

/**
 * Every story module in the package.
 *
 * EAGERLESS ON PURPOSE: the modules are imported inside `beforeAll` so that a module that throws
 * on load fails this test with its own message rather than taking the whole file down before
 * vitest has a test to attach the failure to.
 */
const storyModules = import.meta.glob<Record<string, unknown>>("../../stories/**/*.stories.ts") as Record<
    string,
    StoryModuleLoader
>;

/**
 * Whether one export is a story.
 *
 * Storybook's own rule, which is why it is this loose: every non-default export of a CSF file is a
 * story unless the meta narrows it. A story file in this package exports nothing but stories.
 * @param name - The export name.
 * @param value - What it is.
 * @returns True when Storybook would treat it as a story.
 */
function isStoryExport(name: string, value: unknown): value is StoryLike {
    return name !== "default" && typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Whether a story, or the file it is in, hands the element a `setup` object.
 * @param file - The file.
 * @param story - The story.
 * @returns True when either declares one.
 */
function declaresSetup(file: LoadedStoryFile, story: StoryLike): boolean {
    return story.args?.setup !== undefined || file.meta.args?.setup !== undefined;
}

/**
 * The render function that will actually build one story's element.
 *
 * A story's own `render` wins over the meta's, which is Storybook's resolution order.
 * @param file - The file.
 * @param story - The story.
 * @returns The function, or undefined when the default renderer will build it.
 */
function effectiveRender(file: LoadedStoryFile, story: StoryLike): unknown {
    return story.render ?? file.meta.render;
}

/**
 * How to name one story in a failure message.
 * @param file - The file it is in.
 * @param name - Its export name.
 * @returns The path and the export name.
 */
function nameOf(file: LoadedStoryFile, name: string): string {
    return `${file.path.replace("../../", "")} -> ${name}`;
}

describe("the pairing between a story's setup and the render function that understands it", () => {
    let files: LoadedStoryFile[] = [];

    beforeAll(async () => {
        files = await Promise.all(
            Object.entries(storyModules)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(async ([path, load]): Promise<LoadedStoryFile> => {
                    const loaded = await load();
                    const meta = (loaded.default ?? {}) as MetaLike;
                    const stories = Object.entries(loaded)
                        .filter(([name, value]) => isStoryExport(name, value))
                        .map(([name, value]) => ({ name, story: value as StoryLike }));

                    return { path, meta, stories };
                }),
        );
    });

    it("finds the story files at all, so nothing below can pass by matching nothing", () => {
        assert.isAbove(files.length, 20, "the package has thirty-odd story files and the glob must see them");

        const withStories = files.filter((file) => file.stories.length > 0);

        assert.isAbove(withStories.length, 20, "and most of them declare stories");
    });

    it("builds every story that declares setup with renderFn, which is the only thing that reads it", () => {
        const inert = files.flatMap((file) =>
            file.stories
                .filter((entry) => declaresSetup(file, entry.story) && effectiveRender(file, entry.story) !== renderFn)
                .map((entry) => nameOf(file, entry.name)),
        );

        assert.deepStrictEqual(
            inert,
            [],
            `${String(inert.length)} stories hand the element a setup object that nothing will read. ` +
                "`setup` is not an element property: without `render: renderFn` on the meta it is assigned to " +
                "the element and ignored, so the story's layers, algorithms and layout pre-steps never happen. " +
                "Add `render: renderFn` to the meta, or stop declaring setup.",
        );
    });

    /**
     * Every story runs a play function.
     *
     * WHY THIS IS THE CHEAPEST GUARD THERE IS. The Storybook vitest addon generates one test per
     * story whose entire body is `composedStory.run()`: compose, mount, run the play function if
     * there is one. A story with no play function is therefore a test whose only assertion is
     * "nothing threw" -- and that assertion is weaker than it sounds, because a style layer the
     * element refuses is reported through a run object the render function cannot await. All 131
     * stories in this package were in that state, and the layered-style stories were all drawing
     * the same picture while their tests passed.
     *
     * `run()` DOES execute play, so play is where an assertion goes, and this is what stops the
     * next story being added without one. It cannot check that the play function asserts anything
     * -- a function's behaviour is not readable from outside it -- so the second case below asks
     * the cheapest question that gets close: a play function that awaits nothing has not read the
     * scene, because every reading in stories/assertions.ts is asynchronous.
     */
    it("runs a play function for every story, which is the only place a story can assert", () => {
        const silent = files.flatMap((file) =>
            file.stories
                .filter((entry) => typeof (entry.story.play ?? (file.meta as { play?: unknown }).play) !== "function")
                .map((entry) => nameOf(file, entry.name)),
        );

        assert.deepStrictEqual(
            silent,
            [],
            `${String(silent.length)} stories declare no play function. The storybook lane generates one test ` +
                "per story and its whole body is `run()`, so a story with no play function is a test that " +
                "asserts nothing at all and passes whatever it draws. Give it a play function that reads the " +
                "scene through stories/assertions.ts.",
        );
    });

    it("declares no play function that awaits nothing, which would read no part of the scene", () => {
        const stubs = files.flatMap((file) =>
            file.stories
                .filter((entry) => {
                    const play = entry.story.play ?? (file.meta as { play?: unknown }).play;

                    return typeof play === "function" && !/\bawait\b/.test(play.toString());
                })
                .map((entry) => nameOf(file, entry.name)),
        );

        assert.deepStrictEqual(
            stubs,
            [],
            `${String(stubs.length)} stories have a play function that awaits nothing. Every reading in ` +
                "stories/assertions.ts is asynchronous -- the graph has to arrive, the operation queue has to " +
                "drain and the style engine has to settle before anything is on screen -- so a play function " +
                "with no await has not looked at what the story drew.",
        );
    });

    it("declares no setup in a story built by a render function of its own", () => {
        const unread = files.flatMap((file) =>
            file.stories
                .filter((entry) => {
                    const render = effectiveRender(file, entry.story);

                    return render !== undefined && render !== renderFn && declaresSetup(file, entry.story);
                })
                .map((entry) => nameOf(file, entry.name)),
        );

        assert.deepStrictEqual(
            unread,
            [],
            "these stories build their element with a render function of their own, so nothing turns their " +
                "setup into layers or properties. A custom render that wants setup has to apply it itself: " +
                `[${unread.join(", ")}]`,
        );
    });
});
