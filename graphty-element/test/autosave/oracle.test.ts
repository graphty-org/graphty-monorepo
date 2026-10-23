/**
 * The oracle for the part mapping: seeded random sequences of every kind of change (every project
 * slice; undo, redo and a rolled-back transaction; a finished run; a layout at rest and a drag's
 * end; the stash; the selection; every project boundary) and of the clock. Whenever the writer
 * says everything is saved, the entry put back together from the store must equal a fresh
 * `project.save()` member by member. A failure prints the seed and the shortest sequence that
 * still fails.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { Autosaver } from "../../src/autosave/Autosaver";
import { memoryAutosaveStore } from "../../src/autosave/memoryStore";
import { reassemble } from "../../src/autosave/parts";
import type { AutosaveStore } from "../../src/autosave/types";
import { dispatcherOf, laneOf } from "../../src/session/GraphSession";
import { baseSession } from "../helpers/project-session";
import { FakeClock, FakeLocks } from "./fakes";

const KEY = "test.oracle";
const SEEDS = 40;
const STEPS = 40;

/** One step of a sequence: what to do, and two random numbers it draws its values from. */
interface Step {
    readonly kind: Kind;
    readonly a: number;
    readonly b: number;
}

interface World {
    readonly session: GraphSession;
    readonly saver: Autosaver;
    readonly clock: FakeClock;
}

/**
 * The node ids now.
 * @param session - The session.
 * @returns The ids.
 */
function idsOf(session: GraphSession): string[] {
    return session.data.snapshot().ids.toArray().map(String);
}

/**
 * A value chosen from a list by a random number, or undefined from an empty list.
 * @param list - The list.
 * @param at - The number.
 * @returns The value.
 */
function pick<T>(list: readonly T[], at: number): T | undefined {
    return list.length === 0 ? undefined : list[at % list.length];
}

/**
 * Move one node's coordinates the way a layout engine does: on the lane, outside any command.
 * @param session - The session.
 * @param step - The step.
 * @returns Whether a node was there to move.
 */
function moveOnLane(session: GraphSession, step: Step): boolean {
    const count = session.data.snapshot().nodeCount;
    if (count === 0) {
        return false;
    }

    laneOf(session).write(step.a % count, step.a % 50, step.b % 50, 0);
    return true;
}

const ACTIONS = {
    style: ({ session }: World, { a }: Step) =>
        session.styles.add({
            name: `Layer ${a}`,
            target: "node",
            selector: { match: "expression", where: `data.dept == \`${a % 3}\`` },
            set: { "node.color": a % 2 === 0 ? "#ff9900" : "#0099ff" },
        }),
    styleRemove: async ({ session }: World, { a }: Step) => {
        const layer = pick(
            session.styles.list().filter((each) => !each.locked),
            a,
        );
        if (layer !== undefined) {
            await session.styles.remove(layer.id);
        }
    },
    config: ({ session }: World, { a }: Step) => session.config.set({ name: `Project ${a}` }),
    layout: ({ session }: World, { a }: Step) => session.layout.setDimension(a % 2 === 0 ? "2d" : "3d"),
    place: async ({ session }: World, { a, b }: Step) => {
        const id = pick(idsOf(session), a);
        if (id !== undefined) {
            await session.positions.set([{ id, x: a % 40, y: b % 40, z: 0 }]);
        }
    },
    pin: async ({ session }: World, { a, b }: Step) => {
        const id = pick(idsOf(session), a);
        if (id !== undefined) {
            await session.positions.set([{ id, x: b % 40, y: a % 40, z: 1 }]);
            await (b % 2 === 0 ? session.positions.pin([id]) : session.positions.unpin([id]));
        }
    },
    run: ({ session }: World, { a }: Step) =>
        session.runs.start("degree", undefined, { as: `run${a % 3}`, style: false }),
    runRemove: ({ session }: World, { a }: Step) => {
        const run = pick(session.runs.list(), a);
        if (run !== undefined) {
            session.runs.remove(run.id);
        }
    },
    visibility: ({ session }: World, { a }: Step) =>
        session.visibility.set(a % 3 === 0 ? null : { kind: "degree", min: a % 3 }),
    set: ({ session }: World, { a }: Step) => {
        const id = pick(idsOf(session), a);
        if (id !== undefined) {
            session.sets.create({ kind: "fixed", nodes: [id], reading: "induced" }, { name: `Set ${a}` });
        }
    },
    view: ({ session }: World, { a, b }: Step) =>
        session.views.save([
            { name: `View ${a % 3}`, camera: { position: { x: a, y: b, z: 10 }, target: { x: 0, y: 0, z: 0 } } },
        ]),
    note: ({ session }: World, { a }: Step) => {
        const id = pick(idsOf(session), a);
        if (id !== undefined) {
            session.notes.add({ text: `Note ${a}`, targets: [{ node: id }] });
        }
    },
    declare: ({ session }: World, { a }: Step) =>
        session.data.declare(
            { kind: "node", name: "dept" },
            { measurement: a % 2 === 0 ? "categorical" : "quantitative" },
        ),
    addNode: ({ session }: World, { a, b }: Step) => session.data.addNodes([{ id: `n${a}`, dept: b % 3 }]),
    removeNode: async ({ session }: World, { a }: Step) => {
        const id = pick(idsOf(session), a);
        if (id !== undefined) {
            await session.data.removeNodes([id]);
        }
    },
    addEdge: async ({ session }: World, { a, b }: Step) => {
        const ids = idsOf(session);
        const source = pick(ids, a);
        const target = pick(ids, b);
        if (source !== undefined && target !== undefined) {
            await session.data.addEdges([{ source, target, weight: a % 5 }]);
        }
    },
    undo: ({ session }: World) => session.undo(),
    redo: ({ session }: World) => session.redo(),
    rollback: ({ session }: World, { a }: Step) =>
        session
            .transaction("Fails midway", async (tx) => {
                await tx.config.set({ name: `never ${a}` });
                throw new Error("the operation failed midway");
            })
            .catch(() => undefined),
    rest: ({ session }: World, step: Step) => {
        if (moveOnLane(session, step)) {
            dispatcherOf(session).arrangement.rest();
        }
    },
    drag: ({ session }: World, step: Step) => {
        if (moveOnLane(session, step)) {
            dispatcherOf(session).arrangement.seal();
        }
    },
    stash: ({ saver }: World, { a }: Step) => {
        saver.stash("org.example.draft", { text: `draft ${a}` });
    },
    select: async ({ session, saver }: World, { a }: Step) => {
        const id = pick(idsOf(session), a);
        await session.selection.apply({ nodes: id === undefined ? [] : [id], edges: [] });
        // The selection is no change; it is written with the next one, or on hide.
        await saver.flush(true);
    },
    clear: ({ session }: World) => session.data.clear(),
    import: ({ session }: World, { a }: Step) =>
        session.data.import({
            type: "json",
            config: {
                data: JSON.stringify({
                    nodes: [
                        { id: `p${a}`, dept: 1 },
                        { id: "q", dept: 2 },
                    ],
                    edges: [{ source: `p${a}`, target: "q" }],
                }),
            },
        }),
    open: async ({ session }: World, { a }: Step) => {
        const other = createGraphSession();
        await other.data.addNodes([{ id: `o${a}`, dept: 0 }, { id: "o" }]);
        await other.config.set({ name: `Opened ${a}` });
        const { text } = await other.project.save();
        other.dispose();
        await session.project.open(text, { discard: true });
    },
    source: ({ session }: World, { a }: Step) =>
        session.execute({
            op: "data.setSource",
            source: { type: "json", name: `Source ${a}`, config: { url: `https://example.org/${a % 4}.json` } },
        }),
    tick: ({ clock }: World, { a }: Step) => {
        clock.advance(a % 3000);
    },
    idle: ({ clock }: World) => {
        clock.goIdle();
    },
    flush: ({ saver }: World) => saver.flush(),
} satisfies Record<string, (world: World, step: Step) => unknown>;

type Kind = keyof typeof ACTIONS;
const KINDS = Object.keys(ACTIONS) as Kind[];

/**
 * A small seeded generator (mulberry32).
 * @param seed - The seed.
 * @returns The next number in [0, 2^32).
 */
function random(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return (t ^ (t >>> 14)) >>> 0;
    };
}

/**
 * The sequence a seed names.
 * @param seed - The seed.
 * @returns The steps.
 */
function sequenceOf(seed: number): Step[] {
    const next = random(seed);
    return Array.from({ length: STEPS }, () => ({ kind: KINDS[next() % KINDS.length], a: next(), b: next() }));
}

/**
 * The project document's members by kind, without the view state when it is left out.
 * @param document - The document.
 * @param withViewState - Whether to keep the view state.
 * @returns The head and the members.
 */
function comparable(document: Record<string, unknown>, withViewState: boolean): Record<string, unknown> {
    const members = (document.members as { kind: string }[]).filter(
        (member) => withViewState || member.kind !== "graphty-view-state",
    );
    return { ...document, members };
}

/**
 * Compare the writer's entry with a fresh save.
 * @param store - The store.
 * @param world - The session and the writer.
 * @param withViewState - Whether the selection must match too.
 */
async function check(store: AutosaveStore, world: World, withViewState: boolean): Promise<void> {
    const { session, saver } = world;
    const id = saver.status.entry;
    if (saver.status.state !== "saved" || id === null) {
        return;
    }

    const entry = await store.read(id);
    assert.isDefined(entry, "the current entry is in the store");
    const stored = reassemble(entry?.meta ?? { id, key: KEY, gen: 0, seq: 0 }, entry?.parts ?? {});
    const saved = JSON.parse((await session.project.save({ markSaved: false })).text) as Record<string, unknown>;
    const ours = comparable(stored, withViewState);
    const theirs = comparable(saved, withViewState);
    const { members: ourMembers, ...ourHead } = ours as { members: { kind: string }[] };
    const { members: theirMembers, ...theirHead } = theirs as { members: { kind: string }[] };
    assert.deepStrictEqual(ourHead, theirHead, "the document's head");
    assert.strictEqual(ourMembers.length, theirMembers.length);
    theirMembers.forEach((member, at) => {
        assert.deepStrictEqual(ourMembers[at], member, `the ${member.kind} member`);
    });
}

/**
 * Run one sequence on a fresh session, checking after every step.
 * @param steps - The sequence.
 * @returns The failure, or null.
 */
async function runSequence(steps: readonly Step[]): Promise<{ at: number; error: unknown } | null> {
    const session = await baseSession();
    const store = memoryAutosaveStore();
    const clock = new FakeClock();
    const saver = new Autosaver({ session, store, key: KEY, clock, locks: new FakeLocks() });
    const world: World = { session, saver, clock };
    let at = 0;
    try {
        for (; at < steps.length; at++) {
            const step = steps[at];
            try {
                await ACTIONS[step.kind](world, step);
            } catch {
                // A random step the session refuses (a duplicate id, a column the data lost) is
                // still a step: the writer must stay right whatever the session did.
            }

            await saver.settled();
            await check(store, world, step.kind === "select");
        }

        at = steps.length;
        await saver.flush(true);
        await check(store, world, true);
        assert.strictEqual(saver.status.state, "saved", "the final flush committed everything");
        const live = (await store.list(KEY)).filter((meta) => meta.ended === undefined);
        assert.deepStrictEqual(
            live.map((meta) => meta.id),
            saver.status.entry === null ? [] : [saver.status.entry],
            "every entry but the current one has ended",
        );
        for (const meta of await store.list(KEY)) {
            const entry = await store.read(meta.id);
            reassemble(meta, entry?.parts ?? {});
        }

        return null;
    } catch (error) {
        return { at, error };
    } finally {
        saver.stop();
        session.dispose();
    }
}

/**
 * The shortest sequence that still fails, removing one step at a time.
 * @param steps - A failing sequence.
 * @returns A shorter failing one.
 */
async function shrink(steps: readonly Step[]): Promise<Step[]> {
    let current = [...steps];
    let changed = true;
    while (changed) {
        changed = false;
        for (let at = current.length - 1; at >= 0; at--) {
            const candidate = current.filter((_, index) => index !== at);
            if ((await runSequence(candidate)) !== null) {
                current = candidate;
                changed = true;
            }
        }
    }

    return current;
}

describe("the autosave oracle", () => {
    it(`after every commit, the entry equals project.save() (${SEEDS} seeds of ${STEPS} steps)`, async () => {
        for (let seed = 1; seed <= SEEDS; seed++) {
            const steps = sequenceOf(seed);
            const failure = await runSequence(steps);
            if (failure !== null) {
                const shrunk = await shrink(steps.slice(0, failure.at + 1));
                const again = await runSequence(shrunk);
                assert.fail(
                    `seed ${seed} failed at step ${failure.at}: ${String(failure.error)}\n` +
                        `shrunk to ${shrunk.length} steps:\n${JSON.stringify(shrunk, null, 1)}\n` +
                        `which fails with: ${String(again?.error)}`,
                );
            }
        }
    });
});
