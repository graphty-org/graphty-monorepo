import { LAYOUT_DESCRIPTORS, type LayoutDescriptor, layoutEntry } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import { layoutDescription } from "../methods";

describe("the Layout list and form's description line", () => {
    it("reads, for every built-in layout and engine, the same line the element's catalog describes it with", () => {
        for (const descriptor of LAYOUT_DESCRIPTORS) {
            const implementations = layoutEntry(descriptor.id)?.implementations ?? [];
            assert.strictEqual(layoutDescription(descriptor), descriptor.description, descriptor.id);
            for (const implementation of implementations.filter((each) => !each.isDefault)) {
                const engineRow: LayoutDescriptor = { ...descriptor, engine: implementation.engine };
                assert.strictEqual(
                    layoutDescription(engineRow),
                    implementation.description,
                    `${descriptor.id}:${implementation.engine}`,
                );
            }
        }
    });

    it("has no line for a layout a third party registered", () => {
        const plugin = { ...LAYOUT_DESCRIPTORS[0], id: "acme-odd", engine: "acme-odd" } as LayoutDescriptor;
        assert.strictEqual(layoutDescription(plugin), "");
    });
});
