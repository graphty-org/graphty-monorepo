/**
 * @file The compile a third party gets for the members that used to change a graph without an
 * undoable step, run against the published declarations.
 *
 * Each `@ts-expect-error` below is the assertion: the line must NOT compile. If one of these
 * members becomes writable again, the directive is unused and this compile fails. Nothing here
 * runs; `tsconfig.strict-consumer.json` checks it against `dist/`.
 */

import type { Graph } from "@graphty/graphty-element";
import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";

declare const session: GraphSession;
declare const graph: Graph;

/** Coordinates are read through `session.positions` and placed only by its undoable verbs. */
export function positionsAreReadOnly(): void {
    const at = { x: 0, y: 0, z: 0 };
    session.positions.read(0, at);
    void session.positions.set([{ id: "a", x: 1, y: 2 }]);
    // @ts-expect-error the lane's writer is not on the session
    session.positions.write(0, 1, 2, 3);
    // @ts-expect-error nor is the raw array
    session.positions.view(1);
    // @ts-expect-error nor the pin bytes
    session.positions.setPinned(0, true);
    // @ts-expect-error the store's coordinates are read-only too
    session.data.store.positions.write(0, 1, 2, 3);
}

/** The configuration document on `Graph` cannot be replaced; settings go through the session. */
export function graphStylesIsReadOnly(): void {
    // @ts-expect-error `Graph.styles` is readonly
    graph.styles = null as unknown as typeof graph.styles;
    // @ts-expect-error the operation queue is private
    void graph.operationQueue;
}

/** A published session is the only writer of its graph and settings. */
export function createGraphSessionTakesNoSecondWriter(): void {
    createGraphSession({ config: { acceleration: { policy: "off" } } });
    // @ts-expect-error no store of the caller's own
    createGraphSession({ store: session.data.store });
    // @ts-expect-error no record source
    createGraphSession({ records: { nodeAttributes: () => undefined, edgeAttributes: () => undefined } });
    // @ts-expect-error no configuration read through a function
    createGraphSession({ config: { data: () => session.config.data } });
}
