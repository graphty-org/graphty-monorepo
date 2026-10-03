/**
 * @file `session.labels`: how many node labels the overlap rule hid, and which.
 *
 * The overlap rule (`layoutBehavior.labels.declutter`) is decided by the renderer, frame by frame,
 * from where each label lands on screen. The renderer reports each decision here, and a consumer
 * reads it here -- so a label line can say "77 names, 64 hidden to avoid overlap" without the
 * consumer measuring anything. A session no renderer draws draws no labels, and counts zero.
 */

import type { NodeId } from "@graphty/graph-format";

/** How many node labels a style asks for, and how many of them the overlap rule hid. */
export interface LabelCounts {
    /**
     * The node labels the style layers ask for, on nodes that are showing. A label outside the
     * view counts: this is the overlap rule's count, not a count of what is on screen.
     */
    readonly requested: number;
    /** `requested` less `hiddenByOverlap`. */
    readonly drawn: number;
    /** The labels the overlap rule hid, because their words would land on a label it kept. */
    readonly hiddenByOverlap: number;
}

/** The node labels: what the overlap rule hid, and its switch. */
export interface SessionLabels {
    /**
     * How many labels are asked for and how many the overlap rule hid, as of the last frame.
     * @returns The counts.
     */
    counts(): LabelCounts;
    /**
     * The nodes whose label the overlap rule hid, in the order the rule decided them: a selected
     * node first, then the node with more edges, then the id.
     * @returns The ids, frozen.
     */
    hiddenIds(): readonly NodeId[];
    /** Whether the overlap rule is on: `config.layoutBehavior.labels.declutter`. Off by default. */
    readonly declutter: boolean;
    /**
     * Turn the overlap rule on or off. A project setting: one step, which undo takes back.
     * @param on - True hides labels that would overlap; false draws every label.
     * @returns Settles once the step is recorded.
     */
    setDeclutter(on: boolean): Promise<void>;
}

const NONE: readonly NodeId[] = Object.freeze([]);

/** Where the renderer reports what the overlap rule decided. Internal: not on the session. */
export class LabelReport {
    private requested = 0;
    private hidden: readonly NodeId[] = NONE;

    /**
     * Start with nothing counted.
     * @param changed - Told the new counts whenever a report moved them or the hidden ids.
     */
    constructor(private readonly changed: (counts: LabelCounts) => void) {}

    /**
     * Record one decision, and tell the listener when it differs from the last.
     * @param requested - The labels asked for on showing nodes.
     * @param hidden - The nodes whose label the rule hid.
     */
    report(requested: number, hidden: readonly NodeId[]): void {
        if (requested === this.requested && sameIds(hidden, this.hidden)) {
            return;
        }

        this.requested = requested;
        this.hidden = hidden.length === 0 ? NONE : Object.freeze([...hidden]);
        this.changed(this.counts());
    }

    /**
     * The counts as of the last report.
     * @returns The counts.
     */
    counts(): LabelCounts {
        const hiddenByOverlap = this.hidden.length;
        return Object.freeze({ requested: this.requested, drawn: this.requested - hiddenByOverlap, hiddenByOverlap });
    }

    /**
     * The hidden ids as of the last report.
     * @returns The ids, frozen.
     */
    hiddenIds(): readonly NodeId[] {
        return this.hidden;
    }
}

/**
 * The published face of a label report.
 * @param report - What the renderer reported.
 * @param declutter - Reads the switch.
 * @param setDeclutter - Writes the switch as a project setting.
 * @returns The labels API.
 */
export function labelsOf(
    report: LabelReport,
    declutter: () => boolean,
    setDeclutter: (on: boolean) => Promise<void>,
): SessionLabels {
    return Object.freeze({
        counts: () => report.counts(),
        hiddenIds: () => report.hiddenIds(),
        get declutter() {
            return declutter();
        },
        setDeclutter,
    });
}

function sameIds(a: readonly NodeId[], b: readonly NodeId[]): boolean {
    return a.length === b.length && a.every((id, i) => id === b[i]);
}
