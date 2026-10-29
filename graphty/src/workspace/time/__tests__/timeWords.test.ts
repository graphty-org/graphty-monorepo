import { assert, describe, it, vi } from "vitest";

import { intervalOf, noticeOf, rangeWords, windowWords } from "../timeWords";

const DAY = 86_400_000;
const MAR_10 = Date.UTC(2025, 2, 10);

describe("the timeline's words", () => {
    // The dock writes two dates for every bar of its histogram on every frame of a play, and a
    // formatter made for each one cost a loaded page about a second of a twelve-frame play (#4196).
    it("writes dates without making a formatter for each", () => {
        const made = vi.spyOn(Intl, "DateTimeFormat");
        try {
            for (let day = 0; day < 100; day++) {
                rangeWords(MAR_10 + day * DAY, MAR_10 + (day + 7) * DAY, "ms", "week");
            }
            assert.equal(made.mock.calls.length, 0);
        } finally {
            made.mockRestore();
        }
    });

    it("writes a half-open date window with its last included day", () => {
        assert.equal(rangeWords(MAR_10, MAR_10 + 7 * DAY, "ms", "week"), "Mar 10, 2025 - Mar 16, 2025");
        assert.equal(rangeWords(MAR_10, MAR_10 + DAY, "ms", "day"), "Mar 10, 2025");
        assert.equal(rangeWords(Date.UTC(2025, 0, 1), Date.UTC(2025, 3, 1), "ms", "quarter"), "Jan 2025 - Mar 2025");
    });

    it("writes ordinal time as plain numbers, a whole-number window ending one before its end", () => {
        assert.equal(rangeWords(1995, 2000, "ordinal"), "1995 - 1999");
        assert.equal(rangeWords(1995, 1996, "ordinal"), "1995");
        assert.equal(rangeWords(-508, -300, "ordinal"), "-508 - -301");
        assert.equal(windowWords({ attribute: "data.year", from: 2000, to: 2010, step: 10 }, "ordinal"), "2000 - 2009");
    });

    it("counts values that are not times in the right number", () => {
        const one = { code: "time.unparsed", params: { path: "sent", count: 1 } } as const;
        const two = { code: "time.unparsed", params: { path: "sent", count: 2 } } as const;
        assert.equal(noticeOf(one).message, "1 value in sent is not a time");
        assert.equal(noticeOf(two).message, "2 values in sent are not times");
    });

    it("plays 1x as one step a second", () => {
        assert.equal(intervalOf(1), 1000);
        assert.equal(intervalOf(4), 250);
    });
});
