/**
 * @file What the storybook test lane asserts, beyond "the story mounted and nothing threw".
 *
 * WHAT THE LANE USED TO ASSERT. Every story in this package is one test in the `storybook` vitest
 * project, and the whole of that test -- it is four lines in
 * `@storybook/addon-vitest/dist/vitest-plugin/test-utils.mjs` -- is: compose the story, set the
 * viewport, run it, record its reports. It fails if something throws. Across all thirty story
 * files there was not one assertion about appearance, geometry, colour, text, layer count or
 * element state, and twenty-nine of the stories had no play function at all, so their test
 * returned before the graph had even loaded its data.
 *
 * That is how a hundred and thirty-one green tests coexisted with blank label stories, thirteen
 * byte-identical layer stories and twenty-seven algorithm stories on which no algorithm ever ran.
 *
 * WHAT IT ASSERTS NOW, once per story, for every story that puts a `<graphty-element>` on screen:
 *
 * 1. The graph the story asked for actually arrived. Every wait helper in `stories/helpers.ts`
 *    resolves on timeout instead of failing -- `waitForDataLoaded` races a five-second timer that
 *    calls `resolve()`, and `waitForGraphSettled` does the same "For static layouts, this is not
 *    an error" -- and thirty-odd stories fetch their data over the network at render time. So a
 *    failed fetch produced an empty canvas and a passing test. Here it produces a failure.
 * 2. Every node and edge has been painted by the style stack at least once. The element's own
 *    fallback appearance happens to equal its default layer's colour, so a graph the stack never
 *    painted looks right until a story asks for something the fallback does not have.
 * 3. The element reports no problem it could not paint.
 * 4. Everything the story's `setup` asked for is there: each layer it named is in the stack, and
 *    each channel it named has been painted onto an element.
 *
 * WHY HERE AND NOT IN `preview.ts`. These are test assertions, and `preview.ts` is also what a
 * person browsing Storybook loads. An assertion error belongs in a test report, not in front of a
 * reader looking at a graph.
 *
 * WHAT IT DELIBERATELY DOES NOT ASSERT. Whether the physics layout has come to rest. An unsettled
 * layout is a real problem -- it is what makes a visual snapshot a different picture every run --
 * but it is the pre-step count's problem, and failing a paint assertion on it would report the
 * wrong fault. The per-story appearance baseline is Chromatic's job and this is not a substitute
 * for it: these assertions say the element did what the story asked, never that the picture is the
 * right picture.
 *
 * HOW A STORY OPTS OUT, when it genuinely draws no graph:
 *
 * ```ts
 * parameters: { paintCheck: { exempt: "renders the AI panel with no graph behind it" } }
 * ```
 *
 * The reason is required. An exemption with no reason is a silent skip, and a silent skip is what
 * this file exists to remove.
 */

import { Logger } from "@babylonjs/core";
import { setProjectAnnotations } from "@storybook/web-components-vite";
import { assert } from "vitest";

import type { Graphty } from "../src/graphty-element";
import {
    assertEveryElementPainted,
    assertStackContains,
    paintOf,
    strandedOnBootstrap,
} from "../test/helpers/paint-assertions";
import * as projectAnnotations from "./preview";

// Suppress Babylon.js logs during tests
Logger.LogLevels = Logger.ErrorLogLevel;

// Suppress Lit dev mode warnings
if (typeof window !== "undefined") {
    // @ts-expect-error - Global window modification for test environment
    window.litIssuedWarnings = new Set(); // Prevent duplicate warnings
    // Suppress console warnings from Lit during tests
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
        const message = args[0];
        if (
            typeof message === "string" &&
            (message.includes("Lit is in dev mode") || message.includes("Multiple versions of Lit loaded"))
        ) {
            return; // Suppress Lit warnings
        }

        originalWarn.apply(console, args);
    };
}

/**
 * How long the whole check may take, in milliseconds.
 *
 * One budget shared by every step rather than a timeout each, so the hook cannot outlive the
 * project's own thirty-second test timeout however the time is spent. A story whose play function
 * already waited for the graph to settle arrives here with everything done and spends none of it.
 */
const CHECK_BUDGET_MS = 12000;

/** How often to look again while waiting for the data to arrive. */
const POLL_MS = 50;

/** The story parameters this hook reads. */
interface PaintCheckParameters {
    /** Why this story is not held to the check. An empty or absent reason is refused. */
    readonly exempt?: unknown;
}

/** What this hook reads of a story's `setup`, which is the object `renderFn` turns into layers. */
interface StorySetupLike {
    /** Node channels painted as fixed values. */
    readonly node?: Record<string, unknown>;
    /** Node channels bound to the data. */
    readonly nodeEncode?: Record<string, unknown>;
    /** Edge channels painted as fixed values. */
    readonly edge?: Record<string, unknown>;
    /** Edge channels bound to the data. */
    readonly edgeEncode?: Record<string, unknown>;
    /** Layers beyond those two, each with a name. */
    readonly layers?: readonly { readonly name?: unknown }[];
}

/** The part of a story's context this hook needs. */
interface StoryContextLike {
    /** The story id, for a failure message that names the story a reader can open. */
    readonly id?: unknown;
    /** Where the story was rendered. */
    readonly canvasElement?: unknown;
    /** What the story declares it is a story OF. */
    readonly component?: unknown;
    /** The story's parameters, merged from the project, the meta and the story. */
    readonly parameters?: Record<string, unknown>;
    /** The story's args, merged the same way. */
    readonly args?: Record<string, unknown>;
}

/**
 * The `<graphty-element>` a story put on screen, if it put one there.
 * @param canvasElement - Where the story was rendered.
 * @returns The element, or null.
 */
function elementIn(canvasElement: unknown): Graphty | null {
    if (!(canvasElement instanceof HTMLElement)) {
        return null;
    }

    if (canvasElement.tagName === "GRAPHTY-ELEMENT") {
        return canvasElement as Graphty;
    }

    return canvasElement.querySelector<HTMLElement>("graphty-element") as Graphty | null;
}

/**
 * Why a story is exempt from the check, when it says it is.
 * @param story - How the story is named, for a failure message.
 * @param parameters - The story's parameters.
 * @returns The reason, or null when the story is not exempt.
 */
function exemptionOf(story: string, parameters: Record<string, unknown> | undefined): string | null {
    const declared = parameters?.paintCheck as PaintCheckParameters | undefined;

    if (declared?.exempt === undefined) {
        return null;
    }

    assert.isTrue(
        typeof declared.exempt === "string" && declared.exempt.trim() !== "",
        `${story}: parameters.paintCheck.exempt must say WHY this story draws no graph. An exemption with ` +
            "no reason is a silent skip.",
    );

    return String(declared.exempt);
}

/**
 * Wait for something to become true, failing when the budget runs out.
 * @param done - What is being waited for.
 * @param deadline - When to give up, as a timestamp.
 * @param complaint - What to say when it never happened.
 */
async function until(done: () => boolean, deadline: number, complaint: string): Promise<void> {
    while (!done()) {
        if (Date.now() > deadline) {
            assert.fail(complaint);
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
}

/**
 * Wait for something to become true, and give up quietly when it does not.
 *
 * For a condition an assertion is about to report on anyway: the assertion writes the sentence,
 * and this only stops the check racing the renderer, which is a frame behind the model by design.
 * @param done - What is being waited for.
 * @param deadline - When to stop waiting, as a timestamp.
 */
async function settleQuietly(done: () => boolean, deadline: number): Promise<void> {
    while (!done() && Date.now() <= deadline) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
}

/**
 * Give a promise a deadline, so a queue that never drains fails with a sentence rather than by
 * running the test out of time.
 * @param work - The promise to wait on.
 * @param deadline - When to give up, as a timestamp.
 * @param complaint - What to say when it never finished.
 */
async function within(work: Promise<unknown>, deadline: number, complaint: string): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<"expired">((resolve) => {
        timer = setTimeout(() => {
            resolve("expired");
        }, Math.max(0, deadline - Date.now()));
    });

    const outcome = await Promise.race([work.then(() => "done" as const), expired]);

    if (timer !== undefined) {
        clearTimeout(timer);
    }

    assert.strictEqual(outcome, "done", complaint);
}

/**
 * The channels a story's setup asked to be painted on one kind of element.
 * @param setup - The story's setup.
 * @param target - Nodes or edges.
 * @returns The channel names.
 */
function channelsAsked(setup: StorySetupLike, target: "node" | "edge"): readonly string[] {
    const fixed = target === "node" ? setup.node : setup.edge;
    const bound = target === "node" ? setup.nodeEncode : setup.edgeEncode;

    return [...Object.keys(fixed ?? {}), ...Object.keys(bound ?? {})];
}

/**
 * Everything the story asked the element for is in the picture the element drew.
 * @param context - The story's context.
 */
async function assertStoryDrewWhatItAskedFor(context: StoryContextLike): Promise<void> {
    const story = typeof context.id === "string" ? context.id : "this story";
    const exemption = exemptionOf(story, context.parameters);
    const element = elementIn(context.canvasElement);

    if (element === null) {
        assert.isTrue(
            context.component !== "graphty-element" || exemption !== null,
            `${story}: declares component "graphty-element" and rendered none. Either it renders one, or it ` +
                "says why not through parameters.paintCheck.exempt.",
        );

        return;
    }

    if (exemption !== null) {
        return;
    }

    const deadline = Date.now() + CHECK_BUDGET_MS;
    const { graph, session } = element;

    await until(
        () => session.status.counts.nodes > 0,
        deadline,
        `${story}: no graph ever arrived. Every wait helper in stories/helpers.ts resolves on timeout instead ` +
            "of failing, so a story whose data never loaded renders an empty canvas and passes. This one did.",
    );

    await within(
        graph.operationQueue.waitForCompletion(),
        deadline,
        `${story}: the element's operation queue never drained.`,
    );

    await within(
        session.styles.settled(),
        deadline,
        `${story}: the element says it still has painting of its own in flight. That is styles.settled(), the ` +
            "door the element publishes so a consumer need not count turns.",
    );

    // The renderer is a frame behind the style model: a pass marks an element dirty and the
    // render loop hands the new paint to it on its next tick. Twenty-nine of these stories have no
    // play function at all, so the check arrives the instant the story mounts.
    await settleQuietly(() => strandedOnBootstrap(graph).length === 0, deadline);

    assertEveryElementPainted(graph, story);

    const problems = paintOf(graph)
        .problems()
        .map((problem) => `${problem.layerId}: ${problem.message}`);

    assert.deepStrictEqual(problems, [], `${story}: the element could not paint some of its own layers`);

    const setup = (context.args?.setup ?? {}) as StorySetupLike;
    const named = (setup.layers ?? [])
        .map((layer) => layer.name)
        .filter((name): name is string => typeof name === "string");

    assertStackContains(session, named, story);

    const paint = paintOf(graph);
    const counts = session.data.statistics();

    for (const target of ["node", "edge"] as const) {
        const asked = channelsAsked(setup, target);

        if (asked.length === 0 || (target === "edge" && counts.edgeCount === 0)) {
            continue;
        }

        const painted = Object.keys(paint.styleOf(target, 0));
        const missing = asked.filter((channel) => !painted.includes(channel));

        assert.deepStrictEqual(
            missing,
            [],
            `${story}: the story asked for [${asked.join(", ")}] on every ${target}, and the first one is ` +
                `painted [${painted.join(", ")}]`,
        );
    }
}

// This is an important step to apply the right configuration when testing your stories.
// More info at: https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
//
// The hook below is a PROJECT-LEVEL afterEach, which `prepareStory` merges with the meta's and the
// story's own. `parameters.play` in preview.ts looks like it does this already and does not:
// Storybook resolves a play function as `story.play ?? meta.play` and never reads one out of
// parameters, so that block has never run.
setProjectAnnotations([projectAnnotations, { afterEach: assertStoryDrewWhatItAskedFor }]);
