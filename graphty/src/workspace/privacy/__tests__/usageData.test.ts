/**
 * The usage data gate: PostHog and error reporting start only after the reader says Share, a later
 * No (here or in another tab) stops them, and the answer is kept for the next launch.
 */
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import {
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    setPostHogClientForTests,
    startPageCounts,
    type UmamiBody,
} from "../../../lib/analytics";
import * as sentry from "../../../lib/sentry";
import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import { act, renderHook } from "../../../test/test-utils";
import {
    answerUsageData,
    forgetUsageAnswer,
    readUsageAnswer,
    setUsageSenderForTests,
    startUsageDataIfShared,
    useUsageAnswer,
} from "../usageData";

/** Where sending would start and stop. */
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

    it("starts sending, and re-renders this tab's controls, when another tab says Share", () => {
        // As the chip and the Settings switch read the answer.
        const { result, unmount } = renderHook(() => useUsageAnswer());
        assert.isNull(result.current);
        localStorage.setItem("graphty.usageData.v1", "share");
        act(() => {
            globalThis.dispatchEvent(
                new StorageEvent("storage", {
                    key: "graphty.usageData.v1",
                    oldValue: null,
                    newValue: "share",
                    storageArea: localStorage,
                }),
            );
        });
        assert.equal(initSentry.mock.calls.length, 1);
        assert.equal(result.current, "share");
        unmount();
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

describe("the live sender", () => {
    const sends: UmamiBody[] = [];

    beforeEach(async () => {
        setUsageSenderForTests();
        resetAnalyticsForTests();
        resetSiteConfig();
        forgetUsageAnswer();
        sends.length = 0;
        setAnalyticsCallsForTests({
            send: (body) => {
                sends.push(body);
                return undefined;
            },
            hostname: () => "graphty.app",
            privacySignals: () => ({ dnt: true, gpc: false }),
        });
        const file = {
            site: "production",
            features: [],
            analytics: { umamiWebsiteId: "8f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b" },
        };
        startPageCounts(await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(file))}`));
        sends.length = 0;
    });
    afterEach(() => {
        forgetUsageAnswer();
        sentry.stopSentry();
        sentry.resetSentryState();
        sentry.setSentryCallsForTests();
        setAnalyticsCallsForTests();
        resetAnalyticsForTests();
        resetSiteConfig();
        setUsageSenderForTests({ start: initSentry, stop: stopSentry });
    });

    it("counts one usage_data_shared on Share, and nothing on No", () => {
        answerUsageData("declined");
        assert.deepEqual(sends, []);
        answerUsageData("share");
        assert.deepEqual(
            sends.map((body) => body.payload.name),
            ["usage_data_shared"],
        );
    });

    it("stops PostHog and error reporting when another tab says No", () => {
        // The page's one client: a No disables it rather than closing it.
        const options: { enabled?: boolean } = { enabled: true };
        sentry.setSentryCallsForTests({
            init: vi.fn(),
            getClient: () => ({ getOptions: () => options }),
            replayIntegration: vi.fn(() => ({ name: "Replay", stop: vi.fn(() => Promise.resolve()) })),
        } as unknown as Partial<sentry.SentryCalls>);
        sentry.initSentry({ dsn: "https://public@o0.ingest.sentry.io/0" });
        const optOut = vi.fn();
        setPostHogClientForTests({ opt_out_capturing: optOut });
        localStorage.setItem("ph_phc_x_posthog", "{}");

        // As the browser reports another tab's write: this tab's storage already holds it.
        localStorage.setItem("graphty.usageData.v1", "declined");
        globalThis.dispatchEvent(
            new StorageEvent("storage", {
                key: "graphty.usageData.v1",
                oldValue: "share",
                newValue: "declined",
                storageArea: localStorage,
            }),
        );

        assert.isFalse(options.enabled);
        assert.equal(optOut.mock.calls.length, 1);
        assert.isNull(localStorage.getItem("ph_phc_x_posthog"));
        assert.equal(readUsageAnswer(), "declined");
    });
});
