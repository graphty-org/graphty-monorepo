/**
 * The usage data gate: nothing is sent until the reader says Share, a later No stops sending,
 * and the answer is kept for the next launch.
 */
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import {
    answerUsageData,
    forgetUsageAnswer,
    readUsageAnswer,
    setUsageSenderForTests,
    startUsageDataIfShared,
} from "../usageData";

/** Where Sentry would start and stop. */
const initSentry = vi.fn();
const stopSentry = vi.fn();
setUsageSenderForTests({ start: initSentry, stop: stopSentry });

describe("the usage data gate", () => {
    beforeEach(() => {
        forgetUsageAnswer();
        initSentry.mockClear();
        stopSentry.mockClear();
    });
    afterEach(() => {
        forgetUsageAnswer();
    });

    it("sends nothing at startup while the card is unanswered", () => {
        startUsageDataIfShared();
        assert.isNull(readUsageAnswer());
        assert.equal(initSentry.mock.calls.length, 0);
    });

    it("starts sending on Share and again at the next launch", () => {
        answerUsageData("share");
        assert.equal(initSentry.mock.calls.length, 1);
        assert.equal(readUsageAnswer(), "share");

        startUsageDataIfShared();
        assert.equal(initSentry.mock.calls.length, 2);
    });

    it("stops sending after a later No, and stays off at the next launch", () => {
        answerUsageData("share");
        answerUsageData("declined");
        assert.equal(stopSentry.mock.calls.length, 1);

        initSentry.mockClear();
        startUsageDataIfShared();
        assert.equal(initSentry.mock.calls.length, 0);
    });
});
