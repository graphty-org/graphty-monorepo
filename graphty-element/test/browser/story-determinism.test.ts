/**
 * @file Every story Chromatic snapshots draws the same picture every run.
 *
 * It checks for:
 *
 * 1. Math.random() without a seeded RNG - random data is a different graph each run.
 * 2. Physics layouts (ngraph, d3, forceatlas2, spring, spring-electrical, random) without:
 *    - a seed
 *    - a pre-step count
 *    - a play function that waits for the layout to settle
 *
 * THE LAYOUT, SEED AND PRE-STEP CHECKS READ EFFECTIVE ARGS. Each story is composed the way
 * Storybook composes it -- the meta's args merged with the story's, every spread and shared
 * constant already resolved -- and judged on that. This check used to run regular expressions over
 * one `export const X: Story = {...}` block at a time, so a story whose layout or seed came from
 * the meta, from a spread such as `...CAT_NETWORK`, or from a helper was skipped outright or
 * wrongly flagged.
 *
 * WHY THE BROWSER PROJECT. Composing a story means importing its module, and every story module
 * reaches Lit, Babylon and the DOM at load time. The Node project cannot load them.
 *
 * WHY `storySetup` IS REPLACED. `storySetup()` turns the pre-step count a story names into zero
 * whenever the page is not Chromatic, which is where this test runs, and fills in 2000 when the
 * story names none. Replacing it with a function that hands back exactly what the story asked for
 * lets this test read the count the story itself named.
 */

import { composeStories } from "storybook/preview-api";
import { assert, describe, it, vi } from "vitest";

vi.mock("../../stories/helpers", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../stories/helpers")>()),
    storySetup: (opts: Record<string, unknown> = {}) => ({ ...opts }),
}));

/** Physics layouts: their arrangement depends on a seed and on how long they have run. */
const PHYSICS_LAYOUTS = ["ngraph", "d3", "forceatlas2", "spring", "spring-electrical", "random"];

/**
 * The physics layouts the element runs as a SIMULATION, which is what makes a pre-step count a
 * story's own business rather than the visual-regression lane's.
 *
 * A simulation is advanced by RENDERED FRAMES -- one iteration per frame, by default -- so a
 * story that asks one for five hundred iterations and names no pre-step count is asking for five
 * hundred frames of animation. `preSteps` runs the iterations before the first frame is drawn,
 * and a count matched to the layout's own iteration budget is the one that lands on the finished
 * arrangement. The other physics layouts arrive inside `setLayout`, finished, so the default
 * count `storySetup()` fills in is all they need.
 */
const SIMULATION_LAYOUTS = ["forceatlas2", "spring", "spring-electrical"];

/** Layouts with no seed option. D3's force layout stays repeatable through a high diffThreshold. */
const LAYOUTS_WITHOUT_SEED_SUPPORT = ["d3"];

/**
 * The per-layout args the story files alias to `layoutConfig.seed` for their controls panels.
 */
const SEED_ALIASES = ["ngraphSeed", "randomSeed", "springSeed", "fa2Seed", "d3Seed"];

/** One story as this check sees it. */
interface CheckedStory {
    /** Its export name. */
    readonly name: string;
    /** Its effective args: meta args merged with story args. */
    readonly args: Record<string, unknown>;
    /** Its effective parameters. */
    readonly parameters: Record<string, unknown>;
    /** The play function Storybook will run: the story's own, else the meta's. */
    readonly play: unknown;
}

/** A CSF module, as imported. */
type StoryModule = Record<string, unknown>;

const storyModules = import.meta.glob<StoryModule>("../../stories/**/*.stories.ts");

const storySources = import.meta.glob<string>("../../stories/**/*.stories.ts", {
    query: "?raw",
    import: "default",
    eager: true,
});

/** The shared helper modules a play function may reach a settle through. */
const helperSources = import.meta.glob<string>(["../../stories/**/*.ts", "!../../stories/**/*.stories.ts"], {
    query: "?raw",
    import: "default",
    eager: true,
});

/**
 * The names of helpers that reach `waitForGraphSettled`, directly or through another helper.
 *
 * A story is settled when its play function calls `waitForGraphSettled`, or calls a helper that
 * does, or a helper that calls a helper that does. The call is followed one hop at a time rather
 * than grepped for in the whole file, so one settling story cannot excuse another that never
 * settles.
 * @param content - The source to read helpers from.
 * @returns Every helper name from which a settle is reachable.
 */
function settlingHelperNames(content: string): Set<string> {
    // `const name = (...) => { ... }`, `const name = async (...) => { ... }`,
    // `function name(...) { ... }` and `async function name(...) { ... }`.
    const declaration =
        /(?:const\s+(\w+)\s*(?::[^=]+)?=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*(?::[^=]*)?=>|(?:async\s+)?function\s+(\w+)\s*\()/g;
    const bodies = new Map<string, string>();
    let match;

    while ((match = declaration.exec(content)) !== null) {
        const name = match[1] ?? match[2];
        if (!name) {
            continue;
        }

        // Take the helper's body by balancing braces from the first one after its signature.
        const open = content.indexOf("{", match.index + match[0].length - 1);
        if (open === -1) {
            continue;
        }

        let depth = 0;
        let end = open;
        for (let i = open; i < content.length; i++) {
            if (content[i] === "{") {
                depth++;
            } else if (content[i] === "}") {
                depth--;
                if (depth === 0) {
                    end = i;
                    break;
                }
            }
        }

        bodies.set(name, content.slice(open, end + 1));
    }

    const settling = new Set<string>();
    let grew = true;

    while (grew) {
        grew = false;
        for (const [name, body] of bodies) {
            if (settling.has(name)) {
                continue;
            }

            const reaches =
                body.includes("waitForGraphSettled") ||
                [...settling].some((known) => new RegExp(`\\b${known}\\s*\\(`).test(body));

            if (reaches) {
                settling.add(name);
                grew = true;
            }
        }
    }

    return settling;
}

/**
 * Math.random() calls that are not inside a seeded generator.
 * @param file - The file's path, for the message.
 * @param content - The file's source.
 * @returns One message per unseeded call.
 */
function unseededRandomIssues(file: string, content: string): string[] {
    const issues: string[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
        if (!lines[i].includes("Math.random()")) {
            continue;
        }

        // Inside a seeded random generator function is fine.
        const context = lines.slice(Math.max(0, i - 10), Math.min(lines.length, i + 2)).join("\n");
        if (context.includes("seededRandom") || context.includes("createRng") || context.includes("seedrandom")) {
            continue;
        }

        issues.push(
            `${file}:${String(i + 1)} Math.random() used without seeded RNG - will produce non-deterministic results`,
        );
    }

    return issues;
}

/**
 * Compose every story in a CSF module and pair each with the play function it will run.
 * @param mod - The module.
 * @returns Its stories, composed.
 */
function composedStories(mod: StoryModule): CheckedStory[] {
    const meta = (mod.default ?? {}) as { play?: unknown };
    const composed = composeStories(mod as never, {}) as Record<
        string,
        { args: Record<string, unknown>; parameters: Record<string, unknown> }
    >;

    return Object.entries(composed).map(([name, story]) => ({
        name,
        args: story.args,
        parameters: story.parameters,
        play: (mod[name] as { play?: unknown } | undefined)?.play ?? meta.play,
    }));
}

/**
 * A number of one or more.
 * @param value - Anything.
 * @returns True for a positive number.
 */
function isPositive(value: unknown): boolean {
    return typeof value === "number" && value >= 1;
}

/**
 * The determinism problems in one file's stories.
 * @param file - The file's path, for the messages.
 * @param stories - Its stories, composed.
 * @param settlingHelpers - Helper names that reach a settle.
 * @returns One message per problem.
 */
function layoutIssues(file: string, stories: readonly CheckedStory[], settlingHelpers: Set<string>): string[] {
    const issues: string[] = [];

    for (const { name, args, parameters, play } of stories) {
        const { layout } = args;
        if (typeof layout !== "string" || !PHYSICS_LAYOUTS.includes(layout)) {
            continue;
        }

        // A story Chromatic never snapshots cannot produce a Chromatic diff.
        if ((parameters.chromatic as { disableSnapshot?: boolean } | undefined)?.disableSnapshot === true) {
            continue;
        }

        const where = `${file} -> ${name}`;
        const hasSeed =
            typeof (args.layoutConfig as { seed?: unknown } | undefined)?.seed === "number" ||
            typeof (args.layoutOptions as { seed?: unknown } | undefined)?.seed === "number" ||
            SEED_ALIASES.some((alias) => typeof args[alias] === "number");

        if (!hasSeed && !LAYOUTS_WITHOUT_SEED_SUPPORT.includes(layout)) {
            issues.push(
                `${where} uses physics layout "${layout}" without a seed - will produce non-deterministic layouts`,
            );
        }

        const setup = args.setup as { preSteps?: unknown } | undefined;
        const behaviourPreSteps = (args.layoutBehavior as { layout?: { preSteps?: unknown } } | undefined)?.layout
            ?.preSteps;
        const namedPreSteps = isPositive(setup?.preSteps) || isPositive(behaviourPreSteps);

        if (SIMULATION_LAYOUTS.includes(layout)) {
            if (!namedPreSteps) {
                issues.push(
                    `${where} uses simulation layout "${layout}" without a preSteps count of its own - ` +
                        "name one matched to the layout's iteration budget in storySetup({ preSteps })",
                );
            }
        } else if (setup === undefined && behaviourPreSteps === undefined) {
            issues.push(
                `${where} uses physics layout "${layout}" without preSteps - will not settle before Chromatic capture`,
            );
        }

        const playSource = typeof play === "function" ? play.toString() : "";
        const settles =
            playSource.includes("waitForGraphSettled") ||
            [...settlingHelpers].some((helper) => new RegExp(`\\b${helper}\\s*\\(`).test(playSource));

        if (!settles) {
            issues.push(
                `${where} uses physics layout "${layout}" without waitForGraphSettled in its play function - ` +
                    "will not settle before Chromatic capture",
            );
        }
    }

    return issues;
}

/** The fixture's settle, which the fixture tests name as a settling helper. */
async function settle(): Promise<void> {}

/**
 * A story on ngraph whose layout sits in the meta's args, and a play function that settles.
 * @param storyArgs - The story's own args.
 * @returns A CSF module with one story.
 */
function fixtureModule(storyArgs: Record<string, unknown>): StoryModule {
    return {
        default: {
            title: "Fixture",
            render: () => document.createElement("div"),
            args: { layout: "ngraph", setup: {} },
        },
        Story: {
            args: storyArgs,
            play: async (): Promise<void> => {
                await settle();
            },
        },
    };
}

describe("Story Determinism", () => {
    it("fails a story whose physics layout comes from the meta args with no seed anywhere", () => {
        const issues = layoutIssues("fixture", composedStories(fixtureModule({})), new Set(["settle"]));

        assert.strictEqual(issues.length, 1, issues.join("\n"));
        assert.include(issues[0], "without a seed");
    });

    it("passes the same story when its seed arrives through a spread", () => {
        const shared = { layoutConfig: { seed: 42 } };
        const issues = layoutIssues("fixture", composedStories(fixtureModule({ ...shared })), new Set(["settle"]));

        assert.deepStrictEqual(issues, []);
    });

    it("all story files should use deterministic patterns for Chromatic visual testing", async () => {
        const files = Object.keys(storyModules).sort();
        assert.isAbove(files.length, 20, "the glob must find the package's story files");

        const helperSettles = settlingHelperNames(Object.values(helperSources).join("\n"));
        const issues: string[] = [];

        for (const file of files) {
            const source = storySources[file];
            const settlingHelpers = new Set([...helperSettles, ...settlingHelperNames(source)]);
            const stories = composedStories(await storyModules[file]());
            const relative = file.replace("../../", "");

            issues.push(...unseededRandomIssues(relative, source), ...layoutIssues(relative, stories, settlingHelpers));
        }

        assert.deepStrictEqual(
            issues,
            [],
            `Found ${String(issues.length)} determinism error(s) in stories:\n  ${issues.join("\n  ")}\n\n` +
                "To fix these issues:\n" +
                "1. Replace Math.random() with a seeded RNG (e.g., seededRandom(42))\n" +
                "2. Add 'seed: 42' to layoutConfig for physics-based layouts\n" +
                "3. See stories/Layout.stories.ts for examples of correct patterns",
        );
    });
});
