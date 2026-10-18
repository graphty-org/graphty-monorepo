import { describe, expect, it } from "vitest";

import { sniffJsonDialectHead } from "../src/sniff.js";

describe("sniffJsonDialectHead: truncated heads", () => {
    it("reads an empty first section of a cut head as an empty array", () => {
        expect(
            sniffJsonDialectHead('{"nodes": [], "links": [{"source": "a", "target": "b", "va'),
        ).toMatchInlineSnapshot(`"d3"`);
        expect(
            sniffJsonDialectHead('{"nodes": [{"id": "a"}], "edges": [], "directed": true, "x'),
        ).toMatchInlineSnapshot(`"node-link"`);
        expect(sniffJsonDialectHead('{"graphs": [], "meta')).toMatchInlineSnapshot(`"jgf"`);
        expect(
            sniffJsonDialectHead('{"graphs": [{"edges": [{"sub": "a", "pred": "is_a", "obj": "b"}], "x'),
        ).toMatchInlineSnapshot(`"obographs"`);
        expect(
            sniffJsonDialectHead('{"options": {"type": "mixed"}, "attributes": {}, "nodes": [{"key": "a'),
        ).toMatchInlineSnapshot(`"graphology"`);
        expect(sniffJsonDialectHead("[[1, 2], [3")).toMatchInlineSnapshot(`null`);
    });
});
