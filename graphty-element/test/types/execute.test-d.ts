/**
 * @file Compile-only checks of `session.execute` and the command types (checked by `tsc` in
 * `npm run lint`).
 *
 * `execute` hands back an op's outcome unwrapped: for `algo.run` the `Run` handle, because a
 * promise resolved with a `Run` would adopt it and yield the result instead. `run` takes only an
 * algorithm run; `estimate` and `plan` take any command. Until a second op is in the union the
 * rejection is checked against a stand-in; the style ops replace it when they land.
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

/** A command of another op, standing in for the first one the union gains. */
interface StandIn {
    readonly op: "stand.in";
}
expectTypeOf<StandIn>().not.toExtend<Parameters<GraphSession["run"]>[0]>();
