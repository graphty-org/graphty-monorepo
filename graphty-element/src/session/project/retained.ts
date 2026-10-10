/**
 * @file A counter that moves whenever something the undo history holds by reference changes what
 * it retains after it was recorded: a run result that built a ranking or started reading through
 * the snapshot's id index, a kept set whose shared id table took new ids or whose edge members
 * were built as objects. The history charges such things once, when they are recorded, and
 * charges every step again when this counter has moved (design/undo/undo-design.md section 7).
 */

let changes = 0;

/** Something held by reference now retains a different amount. */
export function retainedChanged(): void {
    changes++;
}

/**
 * The counter.
 * @returns How many times something held by reference changed what it retains.
 */
export function retainedVersion(): number {
    return changes;
}
