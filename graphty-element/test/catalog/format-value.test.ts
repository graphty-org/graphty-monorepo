/**
 * @file The one value formatter (`formatValue`) and the number format fields a binding and a data entry share:
 * decimals, percent, money, notation, sign, prefix and suffix, absolute and relative dates, lists and group
 * objects, text with only its prefix and suffix, and the same fields through a label template.
 */

import { assert, describe, it } from "vitest";

import { formatValue } from "../../src/catalog/data-lists";
import { prepareBinding } from "../../src/session/styles/encoding";
import { createScaleRegistry } from "../../src/session/styles/scales";

const DAY = 86_400_000;

describe("formatValue", () => {
    it("writes numbers through every Intl.NumberFormat field", () => {
        assert.strictEqual(formatValue(34, { minimumFractionDigits: 2, locale: "en-US" }), "34.00");
        assert.strictEqual(formatValue(0.25, { style: "percent", locale: "en-US" }), "25%");
        assert.strictEqual(formatValue(12.5, { style: "currency", currency: "USD", locale: "en-US" }), "$12.50");
        assert.strictEqual(formatValue(12_345, { notation: "compact", locale: "en-US" }), "12K");
        assert.strictEqual(formatValue(12_345, { notation: "scientific", locale: "en-US" }), "1.235E4");
        assert.strictEqual(formatValue(3, { signDisplay: "always", locale: "en-US" }), "+3");
        assert.strictEqual(formatValue(3, { prefix: "#", suffix: " kg" }), "#3 kg");
        assert.strictEqual(formatValue(1234.5), "1234.5", "no format writes a number in full");
    });

    it("writes text and yes-no with only the prefix and suffix, lists item by item, groups as key value", () => {
        assert.strictEqual(formatValue("dog", { prefix: "(", suffix: ")", maximumFractionDigits: 0 }), "(dog)");
        assert.strictEqual(formatValue(true, { suffix: "!" }), "true!");
        assert.strictEqual(formatValue([1.234, 2], { maximumFractionDigits: 1, locale: "en-US" }), "1.2, 2");
        assert.strictEqual(formatValue({ in: 2, out: 3 }), "in 2, out 3");
        assert.strictEqual(formatValue(null), "");
    });

    it("writes dates absolute in UTC, or relative to the newest date given", () => {
        const at = Date.UTC(2026, 2, 5, 12);
        assert.strictEqual(
            formatValue(at, { date: { style: "absolute", dateStyle: "short" }, locale: "en-US" }),
            "3/5/26",
        );
        assert.strictEqual(
            formatValue("2026-03-05T12:00:00Z", { date: { style: "absolute", dateStyle: "medium" }, locale: "en-US" }),
            "Mar 5, 2026",
        );
        assert.strictEqual(
            formatValue(at, { date: { style: "relative" }, locale: "en-US" }, at + 3 * DAY),
            "3 days ago",
        );
        assert.strictEqual(formatValue("not a date", { date: { style: "relative" } }), "not a date");
    });

    it("gives a label template the new fields", () => {
        const prepared = prepareBinding({
            channel: "node.label",
            binding: { template: ["{data.price}"], format: { style: "percent", prefix: "~", locale: "en-US" } },
            scales: createScaleRegistry(),
            columnOf: () => [],
        });
        assert.strictEqual(
            prepared.paint((path: string) => (path === "data.price" ? 0.5 : undefined)),
            "~50%",
        );
    });
});
