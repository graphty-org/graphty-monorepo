/**
 * Errors that fail nothing on their own: what the element catches and carries on past (the render
 * loop's catch, the derivation lane's default `onError`, the layout hook's report -- each calls
 * `reportCaught` in src/session/project/strict.ts), and what nobody catches at all (an unhandled
 * rejection, an error thrown from a microtask). test/setup.ts installs the collector and fails the
 * test they happened in; {@link guardedAsyncProperty} fails the fast-check run they happened in, so
 * fast-check reports a seed, a path and a shrunk counterexample for them.
 */

import fc from "fast-check";

interface Collector {
    readonly errors: unknown[];
}

const KEY = "__GRAPHTY_CAUGHT_COLLECTOR__";

/**
 * The one collector, kept on the global so the setup file and a test file share it whatever
 * module instance each loaded.
 * @returns The collector.
 */
function collector(): Collector {
    const scope = globalThis as { [KEY]?: Collector };
    scope[KEY] ??= { errors: [] };
    return scope[KEY];
}

/** Start collecting: the element's report hook, and the global unhandled-error events. */
export function installCaughtErrors(): void {
    const { errors } = collector();
    (globalThis as { __GRAPHTY_CAUGHT__?: (error: unknown) => void }).__GRAPHTY_CAUGHT__ = (error) => {
        errors.push(error);
    };
    if (typeof window !== "undefined") {
        window.addEventListener("error", (event) => {
            // Only an uncaught error: the element's own `error` CustomEvent bubbles here too.
            if (event instanceof ErrorEvent) {
                errors.push(event.error ?? event.message);
            }
        });
        window.addEventListener("unhandledrejection", (event) => errors.push(event.reason));
    } else if (typeof process !== "undefined") {
        process.on("uncaughtException", (error) => errors.push(error));
        process.on("unhandledRejection", (error) => errors.push(error));
    }
}

/**
 * Take and clear everything collected so far.
 * @returns The errors.
 */
export function takeCaughtErrors(): unknown[] {
    return collector().errors.splice(0);
}

/**
 * One error for everything collected, or undefined when nothing was.
 * @param errors - What was collected.
 * @returns The error to throw.
 */
export function caughtFailure(errors: readonly unknown[]): Error | undefined {
    if (errors.length === 0) {
        return undefined;
    }

    const text = errors.map((e) => (e instanceof Error ? `${e.name}: ${e.message}\n${e.stack ?? ""}` : String(e)));
    return new Error(`${String(errors.length)} error(s) caught and carried on past:\n${text.join("\n---\n")}`, {
        cause: errors[0],
    });
}

/**
 * Let queued microtasks run, so an error rethrown from a microtask -- the derivation lane's
 * default report -- lands before the check. No macrotask: with a render loop running each one
 * waits behind a frame, and a hundred-sequence property paid seconds for them. An unhandled
 * rejection, which the browser reports in a task of its own, is caught by the test's afterEach
 * instead (test/setup.ts).
 */
async function flush(): Promise<void> {
    for (let i = 0; i < 10; i++) {
        await Promise.resolve();
    }
}

/** What a property's predicate settles to, as fast-check declares it. */
type Outcome = Awaited<ReturnType<Parameters<typeof fc.asyncProperty<[unknown]>>[1]>>;

/**
 * `fc.asyncProperty`, with the run failing when anything was caught and carried on past, or thrown
 * unhandled, while it ran.
 * @param args - The arbitraries, then the predicate, as `fc.asyncProperty` takes them.
 * @returns The property.
 */
export function guardedAsyncProperty<Ts extends [unknown, ...unknown[]]>(
    ...args: [...arbitraries: { [K in keyof Ts]: fc.Arbitrary<Ts[K]> }, predicate: (...args: Ts) => Promise<Outcome>]
): fc.IAsyncPropertyWithHooks<Ts> {
    const predicate = args[args.length - 1] as (...values: Ts) => Promise<Outcome>;
    const arbitraries = args.slice(0, -1) as { [K in keyof Ts]: fc.Arbitrary<Ts[K]> };
    return fc.asyncProperty<Ts>(...arbitraries, async (...values: Ts): Promise<Outcome> => {
        takeCaughtErrors();
        let result: Outcome = undefined as Outcome;
        let thrown: { error: unknown } | undefined;
        try {
            result = await predicate(...values);
        } catch (error) {
            thrown = { error };
        }

        await flush();
        // A run that threw is reported by its own error; what it caught goes with it.
        const failure = caughtFailure(takeCaughtErrors());
        if (thrown !== undefined) {
            throw thrown.error;
        }

        if (failure !== undefined) {
            throw failure;
        }

        return result;
    });
}
