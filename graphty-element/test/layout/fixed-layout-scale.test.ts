/**
 * The fixed layout takes no scale of its own (issue #2322): a file's stored positions reach it
 * already in the file scale its styles recorded, through `data/filePositions.ts`. A project saved
 * while the option existed still opens.
 */
import { assert, describe, it } from "vitest";

import { LAYOUT_CATALOG } from "../../src/catalog/layouts";
import { FixedLayout } from "../../src/layout/FixedLayoutEngine";

describe("the fixed layout's options", () => {
    it("offer no scale", () => {
        const fixed = LAYOUT_CATALOG.find((entry) => entry.descriptor.id === "fixed");
        assert.isDefined(fixed);
        assert.notInclude(JSON.stringify(fixed), '"scale"');
        assert.notProperty(new FixedLayout().config, "scale");
    });

    it("ignore a scale a saved project still carries", () => {
        const legacy = { scale: 3 } as unknown as ConstructorParameters<typeof FixedLayout>[0];
        assert.notProperty(new FixedLayout(legacy).config, "scale");
    });
});
