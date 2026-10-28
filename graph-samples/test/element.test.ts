import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { toElementData } from "../src/element.js";
import { plantedPartitionGraph } from "../src/generators/index.js";
import { florentineFamilies, karate } from "./helpers/datasets.js";

describe("toElementData", () => {
    it("uses indices as ids and copies typed node columns", () => {
        const data = toElementData(plantedPartitionGraph({ groups: 2, groupSize: 3, pIn: 1, pOut: 0, seed: 1 }));
        expect(data.nodes).toEqual([
            { id: 0, community: 0 },
            { id: 1, community: 0 },
            { id: 2, community: 0 },
            { id: 3, community: 1 },
            { id: 4, community: 1 },
            { id: 5, community: 1 },
        ]);
        expect(data.edges[0]).toEqual({ source: 0, target: 1 });
        expect(data.edges).toHaveLength(6);
    });

    it("uses external ids and carries weights and string columns", () => {
        const families = toElementData(florentineFamilies());
        expect(families.nodes[0]).toEqual({ id: "Acciaiuoli" });
        expect(families.edges[0]).toEqual({ source: "Acciaiuoli", target: "Medici" });
        const club = toElementData(karate());
        expect(club.nodes[33]).toEqual({ id: 33, club: "Officer" });
        expect(club.edges[0]).toEqual({ source: 0, target: 1, weight: 4 });
    });

    it("gives a dataset's snapshot the same records as the graph it was built from", () => {
        for (const graph of [karate(), florentineFamilies()]) {
            expect(toElementData(fromEdgeArrays(graph))).toEqual(toElementData(graph));
        }
    });
});
