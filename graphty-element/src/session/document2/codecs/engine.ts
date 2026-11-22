/**
 * @file A record's `engine` (spec/README.md 4.5 rule 6): the code that computed a run or drew a
 * layout, written as it ran and compared when a seeded record is run again (8.2 rule 3).
 */

import type { EngineVersions } from "../../runs/types";
import { isJsonObject } from "../framing";
import type { JsonObject, ReadContext } from "../types";

/**
 * An engine as a file holds it.
 * @param engine - The engine.
 * @returns The JSON.
 */
export function engineJson(engine: EngineVersions): JsonObject {
    return {
        packages: { ...engine.packages },
        ...(engine.accelerator === undefined ? {} : { accelerator: engine.accelerator }),
        ...(engine.method === undefined ? {} : { method: engine.method }),
    };
}

/** One way two engines differ: a package name, `accelerator` or `method`, and both sides' values. */
interface EngineChange {
    readonly key: string;
    readonly was: string | null;
    readonly now: string | null;
}

/** What comparing two engines takes besides them. */
export interface EngineComparison {
    /** Whether the accelerator is compared; a layout's is not known when it starts. */
    readonly accelerator: boolean;
    /** What each record names as its method when `engine.method` is absent. */
    readonly named?: { readonly was?: string; readonly now?: string };
}

/**
 * A string member, or null.
 * @param value - The member.
 * @returns The string, or null.
 */
const text = (value: unknown): string | null => (typeof value === "string" ? value : null);

/**
 * How a saved engine and the one that ran now differ: every package whose version differs or that
 * one side lists alone, the effective method (`method`, else what the record names) and, when
 * asked, the accelerator. Members neither side knows are not compared.
 * @param saved - The engine as the file holds it.
 * @param now - The engine of the rerun.
 * @param options - What is compared.
 * @returns The differences, packages first in name order.
 */
function engineChanges(saved: unknown, now: EngineVersions, options: EngineComparison): EngineChange[] {
    const was = isJsonObject(saved) ? saved : {};
    const wasPackages = isJsonObject(was.packages) ? was.packages : {};
    const changes: EngineChange[] = [];
    const names = [...new Set([...Object.keys(wasPackages), ...Object.keys(now.packages)])].sort((a, b) =>
        a.localeCompare(b),
    );
    for (const name of names) {
        const [before, after] = [text(wasPackages[name]), now.packages[name] ?? null];
        if (before !== after) {
            changes.push({ key: name, was: before, now: after });
        }
    }

    const methodWas = text(was.method) ?? options.named?.was ?? null;
    const methodNow = now.method ?? options.named?.now ?? null;
    if (methodWas !== methodNow) {
        changes.push({ key: "method", was: methodWas, now: methodNow });
    }

    const acceleratorWas = text(was.accelerator);
    const acceleratorNow = now.accelerator ?? null;
    if (options.accelerator && acceleratorWas !== acceleratorNow) {
        changes.push({ key: "accelerator", was: acceleratorWas, now: acceleratorNow });
    }

    return changes;
}

/**
 * Report `W_ENGINE_CHANGED` once for each way a seeded record's rerun ran under other code than
 * the record names (spec 8.2 rule 3). A difference already reported for the same run is not
 * reported again, so a run both the view and the results record is reported once.
 * @param context - The open.
 * @param run - The run id, or `"layout"`.
 * @param saved - The engine as the file holds it.
 * @param now - The engine of the rerun.
 * @param options - What is compared.
 */
export function reportEngineChanges(
    context: ReadContext,
    run: string,
    saved: unknown,
    now: EngineVersions,
    options: EngineComparison,
): void {
    for (const change of engineChanges(saved, now, options)) {
        const params = { run, ...change };
        const seen = context.problems.some(
            (problem) =>
                problem.code === "W_ENGINE_CHANGED" && problem.params.run === run && problem.params.key === change.key,
        );
        if (!seen) {
            context.problems.push({ code: "W_ENGINE_CHANGED", params });
        }
    }
}
