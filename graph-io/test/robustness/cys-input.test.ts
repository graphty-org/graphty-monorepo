/**
 * Robustness of a Cytoscape session's XML entries: the decoder's warnings about them reach the
 * import report, named by entry.
 */

import { describe, expect, it } from "vitest";

import { importGraph } from "../../src/registry.js";
import { makeZip } from "../helpers/zip.js";
import { bytesOf } from "./helpers.js";

const DECL = '<?xml version="1.0" encoding="UTF-8"?>\n';
const NS = 'xmlns="http://www.cs.rpi.edu/XGMML" xmlns:cy="http://www.cytoscape.org" xmlns:xlink="http://www.w3.org/1999/xlink"';
const ROOT = "CytoscapeSession-1/";

function session(cytables: Uint8Array): Uint8Array {
    return makeZip([
        { name: `${ROOT}3.0.0.version`, data: "" },
        {
            name: `${ROOT}networks/1-Root.xgmml`,
            data: `${DECL}<graph id="1" label="Root" cy:registered="0" cy:documentVersion="3.0" ${NS}><att><graph id="2" label="Net" cy:registered="1"><node id="3" label="a"/></graph></att></graph>`,
        },
        { name: `${ROOT}tables/cytables.xml`, data: cytables },
    ]);
}

describe("robustness: Cytoscape session XML entries", () => {
    it("relays the encoding fallback of a Latin-1 session XML entry under a UTF-8 prolog, naming the entry", async () => {
        const cytables = bytesOf(DECL, "<!-- caf", [0xe9], ' --><cytables xmlns="http://www.cytoscape.org"/>');
        const { report } = await importGraph(session(cytables), { format: "cys" });
        const fallback = report.issues.filter((i) => i.code === "W_ENCODING_FALLBACK");
        expect(fallback).toHaveLength(1);
        expect(fallback[0].element).toBe(`${ROOT}tables/cytables.xml`);
        expect(fallback[0].message).toContain("cytables.xml");
    });

    it("relays an unknown declared encoding of a session XML entry", async () => {
        const cytables = bytesOf('<?xml version="1.0" encoding="EBCDIC-CP-US"?>\n<cytables xmlns="http://www.cytoscape.org"/>');
        const { report } = await importGraph(session(cytables), { format: "cys" });
        const unknown = report.issues.filter((i) => i.code === "W_UNKNOWN_ENCODING");
        expect(unknown).toHaveLength(1);
        expect(unknown[0].element).toBe(`${ROOT}tables/cytables.xml`);
    });
});
