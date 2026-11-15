/**
 * What the reader pointed at while talk was held: the nodes the pointer entered, in order, and the
 * selection when talk started. The message the utterance sends carries it in its facts block, so
 * "color this" names a node without a tool or an extra turn.
 * @module ai/voice/pointing
 */

import type { NodeId } from "../../catalog/types";
import { type AiPointing, FACT_IDS_CAP } from "../tools/prompt";

/** The most nodes one press records: the largest facts-block list. */
export const POINTING_CAP = Math.max(...Object.values(FACT_IDS_CAP));

/** One press's pointing. */
export class PointingRecord {
    private readonly pointed: NodeId[] = [];
    private readonly selected: readonly NodeId[];

    /**
     * A record, started when talk is pressed.
     * @param selected - The selected nodes at the press.
     */
    constructor(selected: readonly NodeId[]) {
        this.selected = selected.slice(0, POINTING_CAP);
    }

    /**
     * The pointer entered a node. Entering the same node again in a row adds nothing; past the cap
     * the oldest is dropped, since "this" is what was pointed at last.
     * @param id - The node.
     */
    enter(id: NodeId): void {
        if (this.pointed.at(-1) === id) {
            return;
        }

        this.pointed.push(id);
        if (this.pointed.length > POINTING_CAP) {
            this.pointed.shift();
        }
    }

    /**
     * The record, for the message's facts block.
     * @returns The pointed and selected nodes.
     */
    facts(): AiPointing {
        return { pointed: [...this.pointed], selected: this.selected };
    }
}
