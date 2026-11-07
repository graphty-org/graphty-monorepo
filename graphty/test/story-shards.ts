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
 * Vitest's sequencer with a --shard split by time for a run of the storybook project alone (ci.yml's Story tests
 * (graphty-N) legs); any other run is split as vitest splits it.
 */
export class StoryShardSequencer extends BaseSequencer {
    override async shard(files: TestSpecification[]): Promise<TestSpecification[]> {
        if (files.length === 0 || files.some((f) => !isStoryProject(f.project.name))) {
            return super.shard(files);
        }
        const { index, count } = this.ctx.config.shard ?? { index: 1, count: 1 };
        const { root } = this.ctx.config;
        const rel = (spec: TestSpecification): string => spec.moduleId.slice(root.length + 1).replaceAll("\\", "/");
        const keep = new Set(
            balancedPart(files.map(rel), index, count, (file) => STORY_SECONDS[file] ?? DEFAULT_SECONDS),
        );
        return files.filter((spec) => keep.has(rel(spec)));
    }
}
