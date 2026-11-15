/**
 * @file Every layout in the catalogue, and every engine that can draw one, carries a description.
 */

import { assert, describe, it } from "vitest";

import { LAYOUT_CATALOG } from "../../src/catalog/layouts";

describe("layout descriptions", () => {
    it("every layout and every implementation has a non-empty description", () => {
        assert.isNotEmpty(LAYOUT_CATALOG);
        for (const { descriptor, implementations } of LAYOUT_CATALOG) {
            assert.isNotEmpty(descriptor.description.trim(), descriptor.id);
            for (const implementation of implementations) {
                assert.isNotEmpty(implementation.description.trim(), `${descriptor.id}: ${implementation.engine}`);
            }
        }
    });
});
