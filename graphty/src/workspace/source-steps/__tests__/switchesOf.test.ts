/** The Ignore switches' counts: a switch that changes nothing is not offered. */
import type { SourceMatchCounts } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { switchesOf } from "../joinCards";

/**
 * Match counts with what each switch would add.
 * @param caseMore - rows Ignore case alone adds
 * @param spacesMore - rows Ignore spaces alone adds
 * @param both - rows both together add
 * @returns the counts
 */
function counts(caseMore: number, spacesMore: number, both: number): SourceMatchCounts {
    return {
        moreRowsWithIgnoreCase: caseMore,
        moreNodesWithIgnoreCase: 0,
        moreRowsWithIgnoreSpaces: spacesMore,
        moreNodesWithIgnoreSpaces: 0,
        moreRowsWithBoth: both,
        moreNodesWithBoth: 0,
    } as unknown as SourceMatchCounts;
}

describe("switchesOf", () => {
    it("says the two together add rows only when they add more than each does alone", () => {
        assert.isFalse(switchesOf([counts(0, 1, 1)]).together, "Spaces alone adds the one row: Case adds nothing");
        assert.isFalse(switchesOf([counts(0, 0, 0)]).together, "nothing to add");
        assert.isTrue(switchesOf([counts(0, 0, 2)]).together, "only both together match two more rows");
        assert.isTrue(switchesOf([counts(1, 1, 3)]).together, "a row needs both");
    });
});
