/**
 * The start page's fixed words make claims about graphty-element: the formats under Open a file
 * and the views in the bottom bar. Each is checked here against what the element publishes, so a
 * claim that stops being true fails a test instead of staying on the page. (The algorithm and
 * layout counts are read from the element's catalog at run time and need no check.)
 */
import { FORMAT_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import { VIEW_MODE_VALUES } from "@graphty/graphty-element/schema";
import { assert, describe, it } from "vitest";

describe("the start page's claims", () => {
    it('opens every format "CSV, GraphML, GEXF, Cytoscape" names', () => {
        const readable = new Set(FORMAT_DESCRIPTORS.filter((format) => format.canImport).map((format) => format.id));
        for (const id of ["csv", "graphml", "gexf", "cys"]) {
            assert.isTrue(readable.has(id), `${id} is a format the element reads`);
        }
    });

    it('draws every view "2D, 3D, VR and AR" names', () => {
        assert.includeMembers([...VIEW_MODE_VALUES], ["2d", "3d", "vr", "ar"]);
    });
});
