/**
 * Edits to a selection built from steps (graphty-element's `union` leaf): adding, removing,
 * moving and duplicating its groups and steps. Pure: each edit returns the next rule, which the
 * host writes (a style layer's selector, a filter condition). The element evaluates it, fills its
 * colors and reports every count and state (`scope.watchSteps`); nothing here reads the graph.
 * Design: design/ui/selection-groups/spec.md, section 1.
 */

import type { RuleTree, UnionBranch, UnionLeaf, UnionStep } from "@graphty/graphty-element/session";

/** A step's verb: Add (Figma's union), Keep (intersect), Except (subtract). */
export type Verb = UnionStep["op"];

/** The verbs in Figma's boolean menu order: Union, Subtract, Intersect. */
export const VERBS: readonly Verb[] = ["add", "except", "keep"];

let made = 0;

/**
 * A new id for a group or a step, so the editor can name it before its write lands. The element
 * keeps a given id and only fills a missing one.
 * @param prefix - "b" for a group, "s" for a step.
 * @returns the id.
 */
function newId(prefix: "b" | "s"): string {
    made += 1;
    return `${prefix}${Date.now().toString(36)}${made.toString(36)}`;
}

/**
 * A new selection: one group starting with nothing and no step yet (spec 1: a new selection's
 * first group starts None).
 * @param side - nodes or edges.
 * @param within - the host's base.
 * @returns the selection.
 */
export function newSelection(side: UnionLeaf["side"], within: UnionLeaf["within"]): UnionLeaf {
    return { kind: "union", side, within, branches: [{ id: newId("b"), start: "none", steps: [] }] };
}

/**
 * The verb "+" writes at a group's foot: Add on an empty None group, Keep on an empty All group,
 * else the last step's verb.
 * @param branch - the group.
 * @returns the verb.
 */
export function defaultVerb(branch: UnionBranch): Verb {
    const last = branch.steps.at(-1);
    if (last !== undefined) {
        return last.op;
    }
    return branch.start === "none" ? "add" : "keep";
}

/**
 * A list with one item moved.
 * @param list - the list.
 * @param from - the item's place.
 * @param to - its new place, clamped to the list.
 * @returns the new list; the same items when nothing moves.
 */
function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
    const next = [...list];
    const target = Math.max(0, Math.min(list.length - 1, to));
    if (from < 0 || from >= list.length || target === from) {
        return next;
    }
    const [item] = next.splice(from, 1);
    next.splice(target, 0, item);
    return next;
}

/**
 * The rule with one group replaced, or removed when the edit returns null.
 * @param rule - the selection.
 * @param id - the group's id.
 * @param edit - the edit.
 * @returns the selection.
 */
function withBranch(rule: UnionLeaf, id: string, edit: (branch: UnionBranch) => UnionBranch | null): UnionLeaf {
    return {
        ...rule,
        branches: rule.branches.flatMap((branch) => (branch.id === id ? (edit(branch) ?? []) : [branch])),
    };
}

/**
 * Changes a group (its name, on box, start).
 * @param rule - the selection.
 * @param id - the group.
 * @param patch - what changes.
 * @returns the selection.
 */
export const editBranch = (rule: UnionLeaf, id: string, patch: Partial<UnionBranch>): UnionLeaf =>
    withBranch(rule, id, (branch) => ({ ...branch, ...patch }));

/**
 * Removes a group.
 * @param rule - the selection.
 * @param id - the group.
 * @returns the selection.
 */
export const removeBranch = (rule: UnionLeaf, id: string): UnionLeaf => withBranch(rule, id, () => null);

/**
 * Adds a group under the last ("+ Or"): starting with nothing, no color of its own (the element
 * gives it the palette's next free one).
 * @param rule - the selection.
 * @returns the selection and the new group's id.
 */
export function addBranch(rule: UnionLeaf): { rule: UnionLeaf; id: string } {
    const id = newId("b");
    return { rule: { ...rule, branches: [...rule.branches, { id, start: "none", steps: [] }] }, id };
}

/**
 * Moves a group up or down the list.
 * @param rule - the selection.
 * @param id - the group.
 * @param to - its new place.
 * @returns the selection.
 */
export function moveBranch(rule: UnionLeaf, id: string, to: number): UnionLeaf {
    const from = rule.branches.findIndex((branch) => branch.id === id);
    return { ...rule, branches: moveItem(rule.branches, from, to) };
}

/**
 * A copy of a group, under it, with new ids and no color (the element gives it its own).
 * @param rule - the selection.
 * @param id - the group.
 * @returns the selection and the copy's id.
 */
export function duplicateBranch(rule: UnionLeaf, id: string): { rule: UnionLeaf; id: string } {
    const at = rule.branches.findIndex((branch) => branch.id === id);
    const source = rule.branches[at];
    if (source === undefined) {
        return { rule, id };
    }
    const { color: _color, ...rest } = source;
    const copy: UnionBranch = {
        ...rest,
        id: newId("b"),
        steps: source.steps.map((step) => ({ ...step, id: newId("s") })),
    };
    const branches = [...rule.branches];
    branches.splice(at + 1, 0, copy);
    return { rule: { ...rule, branches }, id: copy.id ?? "" };
}

/**
 * A group's steps changed.
 * @param rule - the selection.
 * @param branchId - the group.
 * @param edit - the steps' edit.
 * @returns the selection.
 */
const withSteps = (
    rule: UnionLeaf,
    branchId: string,
    edit: (steps: readonly UnionStep[]) => readonly UnionStep[],
): UnionLeaf => withBranch(rule, branchId, (branch) => ({ ...branch, steps: edit(branch.steps) }));

/**
 * Adds a step to a group, at its foot unless a place is given.
 * @param rule - the selection.
 * @param branchId - the group.
 * @param op - the verb.
 * @param stepRule - what the step tests.
 * @param at - where it goes.
 * @returns the selection and the new step's id.
 */
export function addStep(
    rule: UnionLeaf,
    branchId: string,
    op: Verb,
    stepRule: RuleTree,
    at?: number,
): { rule: UnionLeaf; id: string } {
    const id = newId("s");
    const step: UnionStep = { id, op, rule: stepRule };
    return {
        rule: withSteps(rule, branchId, (steps) => {
            const next = [...steps];
            next.splice(at ?? steps.length, 0, step);
            return next;
        }),
        id,
    };
}

/**
 * Changes a step (its verb, rule, on box, computed on).
 * @param rule - the selection.
 * @param branchId - the group.
 * @param stepId - the step.
 * @param patch - what changes.
 * @returns the selection.
 */
export const editStep = (rule: UnionLeaf, branchId: string, stepId: string, patch: Partial<UnionStep>): UnionLeaf =>
    withSteps(rule, branchId, (steps) => steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step)));

/**
 * Removes a step.
 * @param rule - the selection.
 * @param branchId - the group.
 * @param stepId - the step.
 * @returns the selection.
 */
export const removeStep = (rule: UnionLeaf, branchId: string, stepId: string): UnionLeaf =>
    withSteps(rule, branchId, (steps) => steps.filter((step) => step.id !== stepId));

/**
 * Moves a step within its group. Start with never changes (spec 1).
 * @param rule - the selection.
 * @param branchId - the group.
 * @param stepId - the step.
 * @param to - its new place.
 * @returns the selection.
 */
export const moveStep = (rule: UnionLeaf, branchId: string, stepId: string, to: number): UnionLeaf =>
    withSteps(rule, branchId, (steps) =>
        moveItem(
            steps,
            steps.findIndex((step) => step.id === stepId),
            to,
        ),
    );

/**
 * A copy of a step, under it, with a new id.
 * @param rule - the selection.
 * @param branchId - the group.
 * @param stepId - the step.
 * @returns the selection and the copy's id.
 */
export function duplicateStep(rule: UnionLeaf, branchId: string, stepId: string): { rule: UnionLeaf; id: string } {
    const id = newId("s");
    return {
        rule: withSteps(rule, branchId, (steps) =>
            steps.flatMap((step) => (step.id === stepId ? [step, { ...step, id }] : [step])),
        ),
        id,
    };
}
