import { assert, describe, it } from "vitest";
import { z } from "zod";

import { LABEL_STYLE_DEFAULTS, LABEL_STYLE_DESCRIPTORS, LABEL_STYLE_FIELDS } from "../../src/catalog";
import { RICH_TEXT_KEYS } from "../../src/catalog/label-style";
import { RichTextStyle } from "../../src/config/RichTextStyle";

/** The part of a JSON Schema property this test reads. */
interface Property {
    enum?: unknown[];
    minimum?: number;
    exclusiveMinimum?: number;
    maximum?: number;
    type?: string;
}

const PROPERTIES = (
    z.toJSONSchema(RichTextStyle, { io: "input", unrepresentable: "any" }) as {
        properties: Record<string, Property>;
    }
).properties;

describe("LABEL_STYLE_DESCRIPTORS", () => {
    it("describes every label style field, once, in LABEL_STYLE_FIELDS order", () => {
        assert.deepStrictEqual(
            LABEL_STYLE_DESCRIPTORS.map((d) => d.field),
            [...LABEL_STYLE_FIELDS],
        );
        for (const d of LABEL_STYLE_DESCRIPTORS) {
            assert.isNotEmpty(d.plainName, d.field);
            assert.strictEqual(d.accepts === "enum", d.values !== undefined, `${d.field}: values exactly on an enum`);
        }
        assert.isTrue(Object.isFrozen(LABEL_STYLE_DESCRIPTORS));
    });

    it("gives each field the default LABEL_STYLE_DEFAULTS states, and none where it states none", () => {
        for (const d of LABEL_STYLE_DESCRIPTORS) {
            assert.deepStrictEqual(d.default, LABEL_STYLE_DEFAULTS[d.field], d.field);
        }
    });

    it("takes the same choices and bounds the renderer's schema takes", () => {
        for (const d of LABEL_STYLE_DESCRIPTORS) {
            const key = (RICH_TEXT_KEYS as Partial<Record<string, string>>)[d.field];
            const property = key === undefined ? undefined : PROPERTIES[key];
            if (property === undefined) {
                continue;
            }
            if (property.enum !== undefined) {
                assert.sameMembers([...(d.values ?? [])], property.enum as string[], d.field);
            }
            if (property.type === "number" || property.type === "integer") {
                assert.strictEqual(d.accepts, "number", d.field);
                assert.strictEqual(d.min, property.minimum ?? property.exclusiveMinimum, `${d.field} min`);
                assert.strictEqual(d.exclusiveMin === true, property.exclusiveMinimum !== undefined, `${d.field} >`);
                // a whole number's schema carries the largest safe integer as its maximum: no bound at all
                const max = property.maximum === Number.MAX_SAFE_INTEGER ? undefined : property.maximum;
                assert.strictEqual(d.max, max, `${d.field} max`);
                assert.strictEqual(d.integer === true, property.type === "integer", `${d.field} whole`);
            }
            if (property.type === "boolean") {
                assert.strictEqual(d.accepts, "boolean", d.field);
            }
        }
    });

    it("describes maxLines as a whole number from 1", () => {
        const maxLines = LABEL_STYLE_DESCRIPTORS.find((d) => d.field === "maxLines");
        assert.deepInclude(maxLines, { accepts: "number", min: 1, integer: true });
        assert.isUndefined(maxLines?.default);
    });
});
