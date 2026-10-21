/**
 * The conformance suite every built-in source runs (design section 17, item 2): the descriptor
 * validates; params are checked before any request; a sentinel secret never appears in a report,
 * issue, error, cursor or serialized output; the global fetch is never called; an abort rejects at
 * once; and a capped load's cursor resumes exactly. A source's test file calls
 * `runSourceConformance(source, cases)`.
 */

import { inspect } from "node:util";

import { describe, expect, it, vi } from "vitest";

import {
    type Credential,
    credentials,
    type GraphSource,
    ImportError,
    type ImportGraphResult,
    loadFromSource,
    type Recording,
    replayFetch,
    type SourceCursor,
} from "../../src/index.js";
import { checkSource } from "../../src/sources/define.js";
import { SENTINEL } from "./helpers.js";

/** One recorded load a source must pass the suite with. */
interface ConformanceCase {
    /** What the case loads, for the test names. */
    readonly name: string;
    /** The params. */
    readonly params: Readonly<Record<string, unknown>>;
    /** The endpoint, when not the source's default. */
    readonly endpoint?: string;
    /** The recorded responses; a request with no recording fails. */
    readonly recordings: readonly Recording[];
    /** Query parameters that hold a credential in these recordings. */
    readonly secretQuery?: readonly string[];
    /** The sentinel credential to send; default a bearer token. */
    readonly credential?: (secret: string) => Credential;
    /** A cap that stops this load early, to check the cursor resumes exactly. */
    readonly cap?: { readonly maxNodes?: number; readonly maxEdges?: number };
}

/**
 * Every string a value holds once serialized both ways.
 * @param value - the value
 * @returns JSON plus util.inspect
 */
function serialized(value: unknown): string {
    let json = "";
    try {
        json = JSON.stringify(value) ?? "";
    } catch {
        // a cycle; inspect still sees everything
    }
    return `${json}\n${inspect(value, { depth: 20, showHidden: true, getters: true })}`;
}

/**
 * Run the conformance suite for one source.
 * @param source - the source (loaded, or what a lazy registration loads)
 * @param cases - recorded loads it must pass with
 */
export function runSourceConformance(source: GraphSource<never>, cases: readonly ConformanceCase[]): void {
    describe(`source conformance: ${source.id}`, () => {
        it("has a valid descriptor", () => {
            expect(() => checkSource(source)).not.toThrow();
            expect(source.descriptor?.plainName.length ?? 1).toBeGreaterThan(0);
            for (const p of source.descriptor?.params ?? []) {
                expect(p.name.length * p.plainName.length).toBeGreaterThan(0);
                expect(["password", "secret"]).not.toContain(p.type);
            }
        });

        const required = (source.descriptor?.params ?? []).filter(
            (p) => p.required === true && p.default === undefined,
        );
        for (const p of required) {
            it(`refuses a missing ${p.name} before any request`, async () => {
                const fetch = replayFetch([]);
                const params = Object.fromEntries(Object.entries(cases[0]?.params ?? {}).filter(([k]) => k !== p.name));
                const err: unknown = await loadFromSource(source, params as never, {
                    endpoint: cases[0]?.endpoint,
                    fetch,
                }).catch((e: unknown) => e);
                expect((err as ImportError).issue?.params).toEqual({ name: p.name, reason: "required" });
                expect(fetch.calls).toHaveLength(0);
            });
        }

        for (const c of cases) {
            const options = (signal?: AbortSignal) => ({
                endpoint: c.endpoint,
                fetch: replayFetch(c.recordings, { secretQuery: c.secretQuery }),
                credential: (c.credential ?? ((s: string) => credentials.bearer(s)))(SENTINEL),
                signal,
            });

            it(`${c.name}: never leaks the credential and never calls the global fetch`, async () => {
                const spy = vi.spyOn(globalThis, "fetch");
                try {
                    const outcome: unknown = await loadFromSource(source, c.params as never, options()).catch(
                        (e: unknown) => e,
                    );
                    const text =
                        outcome instanceof ImportError
                            ? serialized([outcome, outcome.report, outcome.issue, outcome.message, outcome.stack])
                            : serialized((outcome as { report: unknown }).report);
                    expect(text).not.toContain(SENTINEL);
                    expect(spy).not.toHaveBeenCalled();
                } finally {
                    spy.mockRestore();
                }
            });

            it(`${c.name}: rejects with the signal's reason when aborted`, async () => {
                const controller = new AbortController();
                const reason = new Error("conformance abort");
                controller.abort(reason);
                await expect(loadFromSource(source, c.params as never, options(controller.signal))).rejects.toBe(
                    reason,
                );
            });

            if (c.cap !== undefined) {
                it(`${c.name}: a capped load's cursor resumes exactly`, async () => {
                    const whole = await loadFromSource(source, c.params as never, options());
                    const ids = new Set<unknown>();
                    let cursor: SourceCursor | null | undefined = undefined;
                    for (let i = 0; i < 1000; i++) {
                        const part: ImportGraphResult = await loadFromSource(source, c.params as never, {
                            ...options(),
                            limits: c.cap,
                            cursor: cursor ?? undefined,
                        });
                        for (const id of part.snapshot.ids) {
                            ids.add(id);
                        }
                        cursor = part.report.source?.next;
                        if (cursor === null || cursor === undefined) {
                            break;
                        }
                    }
                    expect([...ids].sort()).toEqual([...whole.snapshot.ids].sort());
                });
            }
        }
    });
}
