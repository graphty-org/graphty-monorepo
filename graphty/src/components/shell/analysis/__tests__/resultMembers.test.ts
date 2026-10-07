import type { HistogramBin, NodeId } from "@graphty/graphty-element/session";
import { describe, expect, it } from "vitest";

import { filterAbove, groupsCsv, type MemberSession, selectAbove, selectBins, selectTop } from "../resultMembers";

/**
 * A session that records what the member verbs ask of it.
 * @param page - the records and group ranks a node page with a result column returns.
 * @param page.ids - the node ids, in page order.
 * @param page.ranks - each node's group rank, or undefined for a node in no group.
 * @returns the session and what it was asked.
 */
function fakeSession(
    page: { ids: readonly NodeId[]; ranks: readonly (number | undefined)[] } = { ids: [], ranks: [] },
) {
    const asked = { selections: [] as unknown[], filters: [] as unknown[], pages: [] as unknown[] };
    const session = {
        selection: {
            apply: (target: unknown) => {
                asked.selections.push(target);
                return Promise.resolve({});
            },
        },
        visibility: {
            set: (filter: unknown) => {
                asked.filters.push(filter);
                return Promise.resolve({});
            },
        },
        results: { path: (run: string) => `results.${run}.value` },
        data: {
            nodePage: (options: unknown) => {
                asked.pages.push(options);
                return {
                    records: page.ids.map((id) => ({ id })),
                    columns: [{ ranks: page.ranks }],
                };
            },
        },
    } as unknown as MemberSession;

    return { session, asked };
}

describe("a result card's member verbs", () => {
    it("selects the top N with the element's top target", async () => {
        const { session, asked } = fakeSession();
        await selectTop(session, "degree", 10);
        expect(asked.selections).toEqual([{ top: { run: "degree", n: 10 } }]);
    });

    it("selects above a threshold with the element's above target", async () => {
        const { session, asked } = fakeSession();
        await selectAbove(session, "degree", 3);
        expect(asked.selections).toEqual([{ above: { run: "degree", threshold: 3 } }]);
    });

    it("filters above a threshold with the element's threshold filter on the run's path", async () => {
        const { session, asked } = fakeSession();
        await filterAbove(session, "degree", 3);
        expect(asked.filters).toEqual([{ kind: "threshold", path: "results.degree.value", above: 3 }]);
    });

    it("selects brushed bars with the element's range target, from the first bar's from to the last bar's to", async () => {
        const { session, asked } = fakeSession();
        const bins: HistogramBin[] = [
            { from: 1, to: 1, count: 4 },
            { from: 2, to: 5, count: 9 },
            { from: 6, to: 12, count: 2 },
        ];
        await selectBins(session, "degree", bins, 1, 2);
        expect(asked.selections).toEqual([{ range: { run: "degree", min: 2, max: 12 } }]);
    });

    it("exports the groups as CSV of id and group, by the element's group rank", () => {
        const { session, asked } = fakeSession({
            ids: [1, "a,b", "=SUM(A1)", "lonely"],
            ranks: [1, 2, 1, undefined],
        });

        expect(groupsCsv(session, "louvain")).toBe('id,group\n1,1\n"a,b",2\n\'=SUM(A1),1\n');
        expect(asked.pages).toEqual([{ limit: Infinity, columns: ["louvain"] }]);
    });
});
