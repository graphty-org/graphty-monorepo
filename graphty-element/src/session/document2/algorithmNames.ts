/**
 * @file Former algorithm keys and option names, read as the current ones (spec/README.md 10.1
 * rule 2).
 *
 * A renamed algorithm lists the key it replaced in `formerKeys`, with the parameters that reproduce
 * it; a renamed option lists its old names in `formerNames`. A reader meeting an old name reads it
 * as the current one and reports `W_NAME_UPGRADED`, so the next save writes only current names.
 */

import type { AlgorithmDescriptor } from "../../catalog/types";
import { isJsonObject } from "./framing";
import type { DocumentProblem, JsonObject } from "./types";

/** A run's algorithm and params under their current names. */
export interface UpgradedRun {
    /** The current key. */
    readonly key: string;
    /** The params, in the file's form, under current option names. */
    readonly params: JsonObject;
    /** The algorithm's descriptor. */
    readonly descriptor: AlgorithmDescriptor;
    /** Whether a former name was read. */
    readonly renamed: boolean;
}

/** The section bodies an open read a former name in, which a save no longer writes as read. */
const UPGRADED = new WeakSet();

/**
 * Note that a section named something by a former name, so it is not written back as read.
 * @param body - The section's body.
 */
export function markUpgraded(body: object): void {
    UPGRADED.add(body);
}

/**
 * Whether an open read a former name in a section (spec 10.1 rule 2: a writer writes only current
 * names).
 * @param body - The section's body.
 * @returns True when it did.
 */
export function wasUpgraded(body: object): boolean {
    return UPGRADED.has(body);
}

/** Report one upgrade: where it was, the former name and the current one. */
type Report = (at: string, from: string, to: string) => void;

/**
 * The descriptor a key names, by its current key or else a former one.
 * @param algorithms - The algorithms this reader knows.
 * @param key - The key the file names.
 * @param params - The params the file holds.
 * @param report - Called when the key is a former one.
 * @returns The descriptor and the params with the former key's params laid over them.
 */
function resolveKey(
    algorithms: readonly AlgorithmDescriptor[],
    key: string,
    params: JsonObject,
    report: Report,
): { descriptor: AlgorithmDescriptor; params: JsonObject } | undefined {
    const exact = algorithms.find((each) => each.key === key);
    if (exact !== undefined) {
        return { descriptor: exact, params };
    }

    for (const descriptor of algorithms) {
        const former = descriptor.formerKeys?.find((entry) => entry.key === key);
        if (former !== undefined) {
            report("/algorithm", key, descriptor.key);
            return { descriptor, params: { ...params, ...former.params } };
        }
    }

    return undefined;
}

/**
 * Params under current option names: a name the descriptor does not declare that an option lists
 * among its former names is renamed, or dropped when the current name is present too.
 * @param descriptor - The algorithm.
 * @param params - The params.
 * @param report - Called for each renamed option.
 * @returns The params.
 */
function renameOptions(descriptor: AlgorithmDescriptor, params: JsonObject, report: Report): JsonObject {
    const declared = new Set(descriptor.options.map((option) => option.name));
    const formerOf = (name: string): string | undefined =>
        declared.has(name) ? undefined : descriptor.options.find((option) => option.formerNames?.includes(name))?.name;
    const out: JsonObject = {};
    for (const [name, value] of Object.entries(params)) {
        const current = formerOf(name);
        if (current === undefined) {
            out[name] = value;
            continue;
        }

        report(`/params/${name.replaceAll("~", "~0").replaceAll("/", "~1")}`, name, current);
        if (!(current in params)) {
            out[current] = value;
        }
    }

    return out;
}

/**
 * A run's algorithm key and params under their current names.
 * @param algorithms - The algorithms this reader knows.
 * @param key - The key the file names.
 * @param params - The params the file holds, if any.
 * @param pointer - Where the run is; the key is at `<pointer>/algorithm`, params at `<pointer>/params`.
 * @param section - The section's kind, without `graphty-`.
 * @param problems - Where each upgrade is reported; none when undefined.
 * @returns The current key, params and descriptor, or undefined for a key in no descriptor.
 */
export function upgradeRun(
    algorithms: readonly AlgorithmDescriptor[],
    key: string,
    params: unknown,
    pointer: string,
    section: string,
    problems?: DocumentProblem[],
): UpgradedRun | undefined {
    let renamed = false;
    const report: Report = (at, from, to) => {
        renamed = true;
        problems?.push({ code: "W_NAME_UPGRADED", params: { section, pointer: `${pointer}${at}`, from, to } });
    };
    const resolved = resolveKey(algorithms, key, isJsonObject(params) ? params : {}, report);
    if (resolved === undefined) {
        return undefined;
    }

    const { descriptor } = resolved;
    const out = renameOptions(descriptor, resolved.params, report);
    return { key: descriptor.key, params: out, descriptor, renamed };
}
