import { readFileSync } from "node:fs";

import { BaseSequencer, type TestSpecification } from "vitest/node";

/**
 * Seconds each slow story file takes with its screenshots on a CI runner (ci.yml run 42341586884,
 * Story tests (graphty-1) and (graphty-2)). Every other file counts as DEFAULT_SECONDS.
 *
 * Vitest's own --shard splits by a hash of the file's path, and that hash puts StartScreen (about
 * 10 minutes: twelve stories of a 7,700 px tall page, two modes each) and StylePanel (about 7
 * minutes) in the same part, so one leg took 22 to 26 minutes while the other took 6 (issue #5161).
 * ponytail: measured once, by hand; when a leg drifts past about 15 minutes, re-read the legs'
 * per-file times and update these.
 */
export const STORY_SECONDS: Readonly<Record<string, number>> = {
    "src/workspace/start/StartScreen.stories.tsx": 620,
    "src/workspace/style/StylePanel.stories.tsx": 398,
    "src/workspace/project/Project.stories.tsx": 100,
    "src/workspace/frame/Frame.stories.tsx": 96,
    "src/stories/TimeDock.stories.tsx": 93,
    "src/workspace/inspector/Inspector.stories.tsx": 72,
};

/** What a story file not in STORY_SECONDS is taken to cost: about the median of the rest. */
export const DEFAULT_SECONDS = 40;

/**
 * The files of part `index` (1-based) of `count`, split so the parts' total times come out as even as they can:
 * the slowest file first, each to the part with the least time so far (ties to the lower part). The same files
 * always give the same split, so every leg of one run agrees on it and between them they run each file once.
 * @param files - repository-relative paths, relative to the project root.
 * @param index - the part, 1 to `count`.
 * @param count - how many parts.
 * @param seconds - what a file costs.
 * @returns the part's files.
 */
export function balancedPart(
    files: readonly string[],
    index: number,
    count: number,
    seconds: (file: string) => number,
): string[] {
    const load = Array.from({ length: count }, () => 0);
    const part = new Map<string, number>();
    // slowest first; equal times by path, so the order never depends on the order the files came in
    const order = [...files].sort((a, b) => seconds(b) - seconds(a) || a.localeCompare(b, "en"));
    for (const file of order) {
        const least = load.indexOf(Math.min(...load));
        load[least] += seconds(file);
        part.set(file, least + 1);
    }
    return files.filter((file) => part.get(file) === index);
}

/**
 * Whether a spec's project is the storybook project. A browser project's specs carry its instance's name,
 * "storybook (chromium)"; if vitest changes that form, story-shards.test.ts fails instead of the legs quietly
 * going back to the hash split.
 * @param name - the spec's project name.
 * @returns true for the storybook project.
 */
export function isStoryProject(name: string): boolean {
    return /^storybook(?: \(|$)/.test(name);
}

/**
 * Whether a spec's project is the real-element project or its experiments-on twin: its files mount the real
 * graphty-element and run one at a time (fileParallelism: false), so in a graphty-N or graphty-features-on-N part
 * they take most of the part's time. The twin once fell to vitest's hash split, and its parts ran 529 to 1,446 s.
 * @param name - the spec's project name.
 * @returns true for real-element and real-element-features-on (not large-graph, whose parts are one file each).
 */
export function isRealElementProject(name: string): boolean {
    return /^real-element(?:-features-on)?(?: \(|$)/.test(name);
}

/** What a real-element file costs before its tests: loading the element and the page, between files. */
export const FILE_SECONDS = 15;
/** What each real-element test costs on a CI runner. */
export const TEST_SECONDS = 3.2;

/**
 * Each real-element file's measured seconds on a CI runner, loading included: the median of four full runs'
 * graphty-N logs (release.yml runs 42921328419, 42942000609, 42966344736 and 42996342490), written by
 * real-element-seconds.mjs. The test count below missed by up to 130 s a file (Timeline 26 tests, 98 s counted,
 * 225 s run) and gave one part 1,440 s while another had 1,010 s (issue #6620).
 * ponytail: refreshed by hand; when a graphty-N part drifts more than about 100 s from the others, run
 * real-element-seconds.mjs on the newest full runs' graphty-N logs.
 */
export const REAL_ELEMENT_SECONDS: Readonly<Record<string, number>> = JSON.parse(
    readFileSync(new URL("real-element-seconds.json", import.meta.url), "utf8"),
) as Record<string, number>;

/**
 * What a real-element file the table has no time for yet (a new file) is taken to cost, from how many tests it
 * declares. Fitted to the 36 real-element files of full run 42537878114's graphty-4 part (about 8 s a file plus
 * 3.2 s a test, r = 0.65, and about 7 s between files).
 * @param source - the file's text.
 * @returns its seconds.
 */
export function realElementSeconds(source: string): number {
    const tests = source.match(/^\s*(?:it|test)(?:\.each\([^)]*\))?\(/gm)?.length ?? 0;
    return FILE_SECONDS + TEST_SECONDS * tests;
}

/**
 * Vitest's sequencer with a --shard split by time where vitest's hash split comes out uneven: a run of the
 * storybook project alone (ci.yml's Story tests (graphty-N) legs) splits its story files by STORY_SECONDS, and a
 * run with the real-element project or its twin (the graphty-N and graphty-features-on-N parts) splits that
 * project's files by REAL_ELEMENT_SECONDS (realElementSeconds for a file it lacks) and every other file as vitest
 * splits it.
 */
export class StoryShardSequencer extends BaseSequencer {
    override async shard(files: TestSpecification[]): Promise<TestSpecification[]> {
        const { index, count } = this.ctx.config.shard ?? { index: 1, count: 1 };
        const { root } = this.ctx.config;
        const rel = (spec: TestSpecification): string => spec.moduleId.slice(root.length + 1).replaceAll("\\", "/");
        if (files.length > 0 && files.every((f) => isStoryProject(f.project.name))) {
            const keep = new Set(
                balancedPart(files.map(rel), index, count, (file) => STORY_SECONDS[file] ?? DEFAULT_SECONDS),
            );
            return files.filter((spec) => keep.has(rel(spec)));
        }
        const timed = files.filter((f) => isRealElementProject(f.project.name));
        if (timed.length === 0) {
            return super.shard(files);
        }
        const cost = new Map(
            timed.map((spec) => [
                rel(spec),
                REAL_ELEMENT_SECONDS[rel(spec)] ?? realElementSeconds(readFileSync(spec.moduleId, "utf8")),
            ]),
        );
        const keep = new Set(balancedPart([...cost.keys()], index, count, (file) => cost.get(file) ?? FILE_SECONDS));
        const rest = files.filter((f) => !isRealElementProject(f.project.name));
        return [...timed.filter((spec) => keep.has(rel(spec))), ...(rest.length > 0 ? await super.shard(rest) : [])];
    }
}
