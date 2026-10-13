/**
 * @file What an action really touches, so the coverage test's reach claims are checked rather than
 * believed: the session, its transaction scopes, its parts and the run handles they return are
 * wrapped in proxies that record `<root>.<member>` (the root names of `doors.ts`) for every member
 * an action reads or calls, the renderer stub records `Graph.<member>`, and the session's
 * dispatcher records every op dispatched. Only what happens while an action runs is recorded, and
 * it is filed under that action.
 */

import type { GraphSession } from "../../../session";
import type { AssistantTool } from "../../../src/ai/tools/toolset";
import type { ActionResult, ActionSpec } from "../../../src/ai/tools/types";
import { dispatcherOf } from "../../../src/session/GraphSession";

/** The root a session member's object is, by the member's name. */
const SESSION_PARTS: Readonly<Record<string, string>> = {
    data: "SessionDataApi",
    runs: "RunsApi",
    results: "ResultsApi",
    scope: "ScopeApi",
    sets: "SetsApi",
    notes: "NotesApi",
    selection: "SelectionApi",
    visibility: "VisibilityApi",
    styles: "StylesApi",
    views: "SessionViews",
    layout: "SessionLayout",
    positions: "SessionPositions",
    config: "SessionConfig",
    history: "SessionHistory",
    project: "ProjectApi",
};

/** The root a call's result is, by the root and member called. */
const CALL_RESULTS: Readonly<Record<string, string>> = {
    "RunsApi.start": "Run",
    "RunsApi.get": "Run",
    "RunsApi.list": "Run",
    "Run.rerun": "Run",
};

/** Action specs already wrapped: the built-in tools' specs are shared by every build of them. */
const wrapped = new WeakSet<ActionSpec>();

/** What every action touched, by `tool.action`: `door:<root>.<member>` and `op:<op>`. */
export class ReachRecorder {
    /** The recorder the wrapped actions report to: the one that watched last. */
    private static current: ReachRecorder | undefined;

    readonly touched = new Map<string, Set<string>>();
    /** The action running now, whose touches are recorded. */
    active: string | undefined;

    /**
     * Record one touch for the action running now.
     * @param item - The item key.
     */
    private record(item: string): void {
        if (this.active === undefined) {
            return;
        }

        let own = this.touched.get(this.active);
        if (own === undefined) {
            own = new Set();
            this.touched.set(this.active, own);
        }

        own.add(item);
    }

    /**
     * A session that records what actions touch of it, and of every scope its transactions open.
     * @param session - The session.
     * @returns The recording session.
     */
    session(session: GraphSession): GraphSession {
        const { events } = dispatcherOf(session);
        const prior = events.dispatched;
        events.dispatched = (command) => {
            this.record(`op:${command.op}`);
            prior?.(command);
        };
        return this.wrap(session, "GraphSession") as GraphSession;
    }

    /**
     * A renderer stub that records what actions call of it.
     * @param renderer - The stub.
     * @returns The recording stub.
     */
    renderer<T extends object>(renderer: T): T {
        return this.wrap(renderer, "Graph") as T;
    }

    /**
     * Wrap every action of the tools so what it touches is filed under it, its settling included.
     * @param tools - The tools.
     */
    watch(tools: readonly AssistantTool[]): void {
        ReachRecorder.current = this;
        for (const tool of tools) {
            for (const action of tool.definition.actions) {
                if (wrapped.has(action)) {
                    continue;
                }

                wrapped.add(action);
                const key = `${tool.name}.${action.name}`;
                const run = action.run.bind(action);
                const during = async <T>(work: () => Promise<T>): Promise<T> => {
                    const recorder = ReachRecorder.current;
                    const previous = recorder?.active;
                    if (recorder !== undefined) {
                        recorder.active = key;
                    }

                    try {
                        return await work();
                    } finally {
                        if (recorder !== undefined) {
                            recorder.active = previous;
                        }
                    }
                };
                (action as { run: ActionSpec["run"] }).run = (context, args) =>
                    during(async (): Promise<ActionResult> => {
                        const result = await run(context, args);
                        const { settle } = result;
                        return settle === undefined
                            ? result
                            : { ...result, settle: (settling) => during(() => settle(settling)) };
                    });
            }
        }
    }

    /**
     * A proxy recording `<root>.<member>` for each member read or called.
     * @param target - The object.
     * @param root - Its root's name.
     * @returns The proxy.
     */
    private wrap(target: object, root: string): object {
        // Over an empty object, so a frozen target's invariants never bind what the proxy returns.
        return new Proxy(
            {},
            {
                get: (_, member) => {
                    const value: unknown = Reflect.get(target, member, target);
                    if (typeof member !== "string") {
                        return value;
                    }

                    this.record(`door:${root}.${member}`);
                    if (typeof value === "function") {
                        // A method copied out before an action ran is recorded when it is called.
                        return (...args: unknown[]) => {
                            this.record(`door:${root}.${member}`);
                            return this.called(root, member, value as (...args: unknown[]) => unknown, target, args);
                        };
                    }

                    const part = root === "GraphSession" ? SESSION_PARTS[member] : undefined;
                    return part !== undefined && typeof value === "object" && value !== null
                        ? this.wrap(value, part)
                        : value;
                },
                has: (_, member) => Reflect.has(target, member),
                ownKeys: () => Reflect.ownKeys(target),
                getOwnPropertyDescriptor: (_, member) => {
                    const descriptor = Reflect.getOwnPropertyDescriptor(target, member);
                    return descriptor === undefined ? undefined : { ...descriptor, configurable: true };
                },
                getPrototypeOf: () => Reflect.getPrototypeOf(target),
            },
        );
    }

    /**
     * Call a member, wrapping a transaction's scope and the run handles a call returns.
     * @param root - The root called.
     * @param member - The member.
     * @param fn - Its function.
     * @param target - What it is called on.
     * @param args - The arguments.
     * @returns What it returned, wrapped where it is a root.
     */
    private called(
        root: string,
        member: string,
        fn: (...args: unknown[]) => unknown,
        target: object,
        args: unknown[],
    ): unknown {
        if (root === "GraphSession" && member === "transaction") {
            const [label, body, options] = args as [string, (tx: object, signal: AbortSignal) => unknown, unknown];
            return fn.call(
                target,
                label,
                (tx: object, signal: AbortSignal) => body(this.wrap(tx, "GraphSession"), signal),
                options,
            );
        }

        const result = fn.apply(target, args);
        const part = CALL_RESULTS[`${root}.${member}`];
        if (part === undefined || result === null || typeof result !== "object") {
            return result;
        }

        return Array.isArray(result) ? result.map((each: object) => this.wrap(each, part)) : this.wrap(result, part);
    }
}
