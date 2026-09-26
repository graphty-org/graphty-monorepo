/**
 * @file Compile-only checks of `session.execute` and the command types (checked by `tsc` in
 * `npm run lint`).
 *
 * `execute` hands back an op's outcome unwrapped: for `algo.run` the `Run` handle, because a
 * promise resolved with a `Run` would adopt it and yield the result instead. `run` takes only an
 * algorithm run; `estimate` and `plan` take any command, a style edit included.
 */

import { expectTypeOf } from "vitest";

import type { AlgorithmRunCommand, CommandOutcomeMap, GraphSession, SessionCommand } from "../../session";

declare const session: GraphSession;

const run = session.execute({ op: "algo.run", algorithm: "degree" });
expectTypeOf(run.cancel).toBeFunction();
expectTypeOf(run.id).toBeString();

/** True for a promise whose value is itself awaitable, which would be adopted. */
type PromiseOfThenable<T> = T extends Promise<infer V> ? (V extends PromiseLike<unknown> ? true : false) : false;
type AnyPromiseOfThenable = {
    [Op in keyof CommandOutcomeMap]: PromiseOfThenable<CommandOutcomeMap[Op]>;
}[keyof CommandOutcomeMap];
expectTypeOf<AnyPromiseOfThenable>().toEqualTypeOf<false>();

expectTypeOf<Parameters<GraphSession["run"]>[0]>().toEqualTypeOf<AlgorithmRunCommand>();
expectTypeOf<Parameters<GraphSession["estimate"]>[0]>().toEqualTypeOf<SessionCommand>();
expectTypeOf<Parameters<GraphSession["plan"]>[0]>().toEqualTypeOf<SessionCommand>();

/** A style edit: a command of another op, which `estimate` and `plan` take and `run` does not. */
const edit = { op: "style.patch", action: "remove", id: "a-layer" } as const;
expectTypeOf(edit).toExtend<Parameters<GraphSession["estimate"]>[0]>();
expectTypeOf(edit).toExtend<Parameters<GraphSession["plan"]>[0]>();
expectTypeOf(edit).not.toExtend<Parameters<GraphSession["run"]>[0]>();
expectTypeOf(session.execute(edit)).toEqualTypeOf<Promise<void>>();
