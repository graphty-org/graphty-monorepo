/**
 * @file A re-run keeps its groups' numbers. A community algorithm numbers its groups afresh on every
 * run, so after a filter or a new setting "group 3" may be other nodes. Here each new group takes
 * the number of the old group it shares most members with, so a layer, a selection step, a card or
 * a saved project that names "group 3" keeps holding the same members' group. A group no old one
 * matches takes a number no old group had. What the numbers cannot say on their own -- a group
 * that split, or groups that merged -- is reported as caveat facts.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { NodeId } from "../../catalog/types";
import { englishNotes } from "../english";
import { elementIdsOf, isBuiltResult, renumberResult } from "../results/RunResult";
import type { RunResult } from "../results/types";
import type { CodedFact } from "../shared";
import { matchGroups } from "../styles/values";
import { caveat, type CaveatCode, caveatSentence } from "./caveatFacts";
import type { Caveats } from "./types";

/** One field's renaming, and what it could not say by numbers alone. */
interface FieldRenumbering {
    readonly rename: Map<unknown, unknown>;
    readonly facts: CodedFact<CaveatCode>[];
}

/**
 * A group's value as `matchGroups` names it: a number or a text as it prints.
 * @param value - The value.
 * @returns The name.
 */
function nameOf(value: unknown): string {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : JSON.stringify(value);
}

/**
 * The value most of some elements held in another reading, or undefined when none held one.
 * @param ids - The elements.
 * @param read - Their value in that reading.
 * @returns The value.
 */
function mostlyFrom(ids: readonly NodeId[], read: (id: NodeId) => unknown): unknown {
    const counts = new Map<unknown, number>();
    let best: unknown;
    let most = 0;
    for (const id of ids) {
        const value = read(id);
        if (value === undefined || value === null) {
            continue;
        }
        const count = (counts.get(value) ?? 0) + 1;
        counts.set(value, count);
        if (count > most) {
            most = count;
            best = value;
        }
    }
    return best;
}

/**
 * Renumber one field of a new result after the old one.
 * @param field - The field.
 * @param before - The result being replaced.
 * @param after - The new result.
 * @returns The renaming and its facts, or null when the field's values are not all numbers.
 */
function renumberField(field: string, before: RunResult, after: RunResult): FieldRenumbering | null {
    const was = (id: NodeId): unknown => before.node(id)?.[field];
    const now = (id: NodeId): unknown => after.node(id)?.[field];
    const oldIds = elementIdsOf(before, "node");
    const newIds = elementIdsOf(after, "node");
    const oldValues = new Map<string, unknown>();
    for (const id of oldIds) {
        const value = was(id);
        if (value !== undefined && value !== null) {
            oldValues.set(nameOf(value), value);
        }
    }
    const match = matchGroups<NodeId>(new Set([...oldIds, ...newIds]), was, now, true);
    // ponytail: only numbered groups are renumbered; a run whose unstable names are text keeps them.
    const numbers = [...oldValues.values(), ...match.values.values()];
    if (numbers.length === 0 || !numbers.every((value) => typeof value === "number")) {
        return null;
    }

    const rename = new Map<unknown, unknown>();
    for (const [old, into] of match.to) {
        rename.set(match.values.get(into), oldValues.get(old));
    }
    // A group no old one matches takes a number no old group had, so a name kept for a group that
    // is gone never comes to hold another one.
    let next = Math.max(-1, ...([...oldValues.values()] as number[])) + 1;
    const members = new Map<unknown, NodeId[]>();
    for (const id of newIds) {
        const value = now(id);
        if (value !== undefined && value !== null && !rename.has(value)) {
            const ids = members.get(value) ?? [];
            ids.push(id);
            members.set(value, ids);
        }
    }
    for (const value of [...members.keys()].sort((a, b) => (a as number) - (b as number))) {
        rename.set(value, next++);
    }

    const facts: CodedFact<CaveatCode>[] = [];
    // A new group holding mostly an old group's members split from it.
    const splits = new Map<unknown, unknown[]>();
    for (const [value, ids] of members) {
        const from = mostlyFrom(ids, was);
        if (from !== undefined && match.to.has(nameOf(from))) {
            splits.set(from, [...(splits.get(from) ?? []), rename.get(value)]);
        }
    }
    for (const [group, into] of splits) {
        facts.push(caveat("groups.split", { field, group: group as number, into: into as number[] }));
    }
    // An old group whose members now mostly sit in a group that kept another number merged into it.
    const goneMembers = new Map<string, NodeId[]>();
    for (const id of oldIds) {
        const name = nameOf(was(id));
        if (match.gone.has(name)) {
            const ids = goneMembers.get(name) ?? [];
            ids.push(id);
            goneMembers.set(name, ids);
        }
    }
    const merges = new Map<unknown, unknown[]>();
    for (const [name, value] of match.gone) {
        const ids = goneMembers.get(name) ?? [];
        const into = rename.get(mostlyFrom(ids, now));
        if (into !== undefined && into !== value) {
            merges.set(into, [...(merges.get(into) ?? []), value]);
        }
    }
    for (const [group, from] of merges) {
        facts.push(caveat("groups.merged", { field, group: group as number, from: from as number[] }));
    }
    return { rename, facts };
}

/**
 * A new result whose unstable node fields keep the numbers the old result gave the same groups.
 * @param before - The result readers hold now, or another run's of the same question; undefined
 *   when there is none.
 * @param after - The result the run just computed.
 * @param unstable - The names of the fields whose values are names a re-run may spell differently.
 * @param caveats - The run's caveats for the new result.
 * @returns The result to publish and its caveats, the facts about splits and merges appended.
 */
export function keepGroupNumbers<T>(
    before: unknown,
    after: T,
    unstable: ReadonlySet<string>,
    caveats: Caveats,
): { readonly result: T; readonly caveats: Caveats } {
    if (unstable.size === 0 || !isBuiltResult(before) || !isBuiltResult(after)) {
        return { result: after, caveats };
    }
    const renames = new Map<string, ReadonlyMap<unknown, unknown>>();
    const facts: CodedFact<CaveatCode>[] = [];
    for (const field of unstable) {
        const renumbered = renumberField(field, before, after);
        if (renumbered !== null) {
            renames.set(field, renumbered.rename);
            facts.push(...renumbered.facts);
        }
    }
    if (renames.size === 0) {
        return { result: after, caveats };
    }
    const more = { facts, sentences: facts.map(caveatSentence) };
    const kept: Caveats = Object.freeze({
        ...caveats,
        facts: Object.freeze([...caveats.facts, ...more.facts]),
        notes: Object.freeze([...englishNotes(caveats), ...more.sentences]),
    });
    return { result: renumberResult(after, renames, more) as T, caveats: kept };
}
