/**
 * The SPARQL source in Chromium: a query is a simple request (a form POST with an Accept header),
 * so an endpoint that sends Access-Control-Allow-Origin and answers no preflight still works, as
 * Wikidata's does.
 */

import { expandFromSource, loadFromSource } from "@graphty/graph-io";
import { describe, expect, inject, it } from "vitest";

const WD = "http://www.wikidata.org/entity/";

describe("sparql in a browser", () => {
    const endpoint = `${inject("corsServer")}/cors/sparql`;

    it("loads a CONSTRUCT and expands a node without a preflight", async () => {
        const { snapshot, report } = await loadFromSource(
            "sparql",
            { query: "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }", pageSize: 4 },
            { endpoint, limits: { maxNodes: 2 } },
        );
        expect(snapshot.ids.has(`${WD}Q937`)).toBe(true);
        expect(report.source?.next).toMatchObject({ offset: 4 });
        const around = await expandFromSource("sparql", { params: {}, ids: [`${WD}Q47480`] }, { endpoint });
        expect(around.snapshot.edgeCount).toBe(2);
    });
});
