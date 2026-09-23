/**
 * @file A request the element decides not to carry out still has to answer the caller.
 *
 * WHAT WENT WRONG. Every public method that changes the graph -- `setViewMode`, `setLayout`,
 * `addNodes`, `runAlgorithm` -- puts its work on an operation queue and hands the caller a promise
 * for it. The queue also cancels work: `src/constants/obsolescence-rules.ts` is a table of which
 * kind of request makes which other kind pointless, and a second view-mode switch makes a first
 * one pointless, so the first is dropped.
 *
 * Dropping it aborted its signal and deleted it from the queue's maps. It did not touch the
 * promise. The resolvers lived in the deleted entry, so nothing could ever settle them again, and
 * an ordinary two lines --
 *
 * ```js
 * const shown = graph.setViewMode("2d");
 * graph.setViewMode("3d");
 * await shown;
 * ```
 *
 * -- waited for ever on a graph that was working perfectly. No value, no error, no event: a
 * consumer awaiting a superseded request simply never continued, and nothing anywhere said why.
 * Any code that awaits its requests in sequence stops dead the first time the reader changes their
 * mind quickly.
 *
 * WHAT IS PINNED HERE. That the promise settles, and that a superseded request settles by
 * RESOLVING rather than throwing. The element cancels an operation because a newer instruction
 * from the same caller made it redundant -- that is a decision the element took about the
 * caller's own later request, not a failure the caller has to handle. The graph's constructor
 * depends on exactly that reading: it queues the default `ngraph` layout expressly so a
 * consumer's own `layout` can obsolete it (`src/Graph.ts`), and treating that as an error would
 * put a failure on the console of every page that chooses a layout.
 *
 * HOW THE RACE IS MADE REPEATABLE. A superseded request only hangs if it is still waiting its turn
 * when the newer one arrives; if it has already started, its body runs to the end and resolves on
 * its own. On a real graph that is the common case -- a queue is nearly always busy with something
 * -- but in a test it is a coin toss, so a slow operation is put on the queue first and released
 * by hand, which holds everything behind it for as long as the test needs.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";

/** How long the element needs to connect, drain its queue and draw. */
const SETTLE_MS = 1500;

/** How long a promise gets to settle before the test calls it hung. */
const PATIENCE_MS = 4000;

/** A graph small enough that every request below finishes instantly. */
const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

/** A path through them. */
const EDGES = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
    { src: "c", dst: "d" },
];

/** What became of a promise, including the outcome that is not an outcome. */
type Outcome = "resolved" | "rejected" | "never settled";

let mounted: Graphty | null = null;

/**
 * Put an element on the page with some data on it.
 * @returns the element, before anything has been asked of it
 */
function mount(): Graphty {
    const container = document.createElement("div");

    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);

    const element = document.createElement("graphty-element");

    element.nodeData = NODES;
    element.edgeData = EDGES;
    container.appendChild(element);
    mounted = element;

    return element;
}

/**
 * Wait for the element to finish everything it has been asked to do.
 * @param element - the mounted element
 */
async function settle(element: Graphty): Promise<void> {
    await element.graph.operationQueue.waitForCompletion();
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
}

/**
 * Watch a promise for a while and report what it did, without ever letting it throw at the page.
 * @param promise - the promise under test
 * @returns how it settled, or that it did not
 */
function outcomeOf(promise: Promise<unknown>): Promise<Outcome> {
    const watched: Promise<Outcome> = promise.then(
        () => "resolved" as const,
        () => "rejected" as const,
    );

    const patience = new Promise<Outcome>((resolve) => {
        setTimeout(() => {
            resolve("never settled");
        }, PATIENCE_MS);
    });

    return Promise.race([watched, patience]);
}

/**
 * Hold the queue open so that everything asked for next waits its turn.
 * @param element - the mounted element
 * @returns a function that lets the queue go again
 */
function blockTheQueue(element: Graphty): () => void {
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => {
        release = resolve;
    });

    void element.graph.operationQueue.queueOperationAsync("data-update", () => held, {
        description: "a slow operation, so the requests behind it have to wait",
    });

    return release;
}

afterEach(() => {
    mounted?.parentElement?.remove();
    mounted = null;
});

describe("a request the element supersedes", () => {
    test("settles the promise the caller is holding", async () => {
        const element = mount();

        await settle(element);

        const release = blockTheQueue(element);

        // Long enough for the slow operation to have started, so the two below are queued behind
        // it rather than running the moment they are asked for.
        await new Promise((resolve) => setTimeout(resolve, 100));

        const superseded = element.graph.setViewMode("2d");
        const winner = element.graph.setViewMode("3d");

        release();

        const outcome = await outcomeOf(superseded);

        assert.notEqual(
            outcome,
            "never settled",
            "a view-mode switch was superseded by the next line, and the promise the caller was handed never " +
                "settled -- not a value, not an error. Anything that awaits its requests in order stops dead " +
                "there. See applyObsolescenceRules in src/managers/OperationQueueManager.ts.",
        );
        assert.equal(
            outcome,
            "resolved",
            "a superseded request resolves: the element dropped the work because the caller's own next " +
                "request made it redundant, which is not a failure the caller has to handle. The graph's " +
                "constructor queues its default layout expressly so a consumer's layout can supersede it.",
        );

        await winner;
        assert.equal(element.graph.getViewMode(), "3d", "the request that superseded the first one still ran");
    });

    test("settles even when the caller never hears from the queue again", async () => {
        const element = mount();

        await settle(element);

        const release = blockTheQueue(element);

        await new Promise((resolve) => setTimeout(resolve, 100));

        const abandoned = element.graph.setLayout("circular");

        // The reader closes the panel, the host tears the graph down, and the queue is emptied
        // with work still on it. The promise for that work is the caller's only handle on it.
        element.graph.operationQueue.clear();
        release();

        assert.notEqual(
            await outcomeOf(abandoned),
            "never settled",
            "the queue was cleared with a layout request still on it, and the caller awaiting that request " +
                "was left waiting on a queue that had thrown the work away",
        );
    });

    test("and the ordinary sequence of two view-mode switches finishes", async () => {
        const element = mount();

        await settle(element);

        const release = blockTheQueue(element);

        await new Promise((resolve) => setTimeout(resolve, 100));

        const both = Promise.all([element.graph.setViewMode("2d"), element.graph.setViewMode("3d")]);

        release();

        assert.notEqual(
            await outcomeOf(both),
            "never settled",
            "`await Promise.all([...])` over two view-mode switches never came back, because the first of " +
                "them was superseded by the second and its promise was abandoned",
        );
    });
});
