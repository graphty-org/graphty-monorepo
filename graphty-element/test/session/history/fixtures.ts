/**
 * @file The round-trip fixtures: for every undoable op, one command per value of its argument's
 * discriminant, run, undone and redone by `round-trip.test.ts` (on a session) and
 * `test/browser/history-round-trip.test.ts` (on a real `Graph`, for fixtures tagged `renderer`).
 *
 * The vocabulary test fails when an undoable op, or a value of its discriminant, has no fixture
 * here, and when an op that changes what is drawn has no fixture tagged `renderer`. A phase that
 * adds an op adds its fixtures (design/undo/undo-plan.md, "How to read this plan", rule 3).
 */

import type { SessionCommand } from "../../../src/session/planning";
import type { GraphSession } from "../../../src/session/types";

/** One command whose round trip is checked. */
export interface RoundTripFixture {
    /** What the case is, for the test title. */
    readonly name: string;
    /** The command, run through `session.execute`. */
    readonly command: SessionCommand;
    /** The value of the command's discriminant it covers, for an op that has one. */
    readonly variant?: string;
    /** Where it runs: on a session, on a renderer, or both. */
    readonly tags: readonly ("session" | "renderer")[];
    /**
     * State to build before the command, as steps of their own. The round trip is checked from
     * the state after them.
     */
    readonly before?: (session: GraphSession) => Promise<void>;
}

/** Every fixture. The first arrive with the first ported op. */
export const FIXTURES: readonly RoundTripFixture[] = [];
