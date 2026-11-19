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
} from "../../../lib/analytics";
import * as sentry from "../../../lib/sentry";
import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import { withFeatures, withPostHogSite } from "../../../test/features";
import { act, renderHook } from "../../../test/test-utils";
import { TEST_ANALYTICS } from "../../../test/usage-recorders";
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
    withFeatures(["usage-analytics"]);
    withPostHogSite();
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
        localStorage.setItem("graphty.usageData.v1", "share-analytics");
        act(() => {
            globalThis.dispatchEvent(
                new StorageEvent("storage", {
                    key: "graphty.usageData.v1",
                    oldValue: null,
                    newValue: "share-analytics",
                    storageArea: localStorage,
                }),
            );
        });
        // Started as a follower: it takes the PostHog id the answering tab made (startPostHog).
        assert.deepEqual(initSentry.mock.calls, [[false]]);
        assert.equal(result.current, "share");
        unmount();
    });

    it("keeps a No that storage cannot hold: the older Share is removed, so the next launch stays off", () => {
        answerUsageData("share");
        initSentry.mockClear();
        // A full storage: reads still work, a longer write throws.
        const realSet = Storage.prototype.setItem;
        const full = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
            this: Storage,
            key: string,
            value: string,
        ) {
            if (key === "graphty.usageData.v1") {
                throw new DOMException("full", "QuotaExceededError");
            }
            realSet.call(this, key, value);
        });
        answerUsageData("declined");
        full.mockRestore();

        assert.equal(stopSentry.mock.calls.length, 1);
        assert.equal(readUsageAnswer(), "declined", "this page shows what it does");
        assert.isNull(localStorage.getItem("graphty.usageData.v1"), "no Share is left for the next launch");
        startUsageDataIfShared();
        assert.equal(initSentry.mock.calls.length, 0);
    });

    it("asks again, and starts nothing, for a Share given with the experiment off", () => {
        // The words with the experiment off never named PostHog, so that Share does not cover it.
        localStorage.setItem("graphty.usageData.v1", "share");
        assert.isNull(readUsageAnswer());
        startUsageDataIfShared();
        assert.equal(initSentry.mock.calls.length, 0);

        answerUsageData("share");
        assert.equal(localStorage.getItem("graphty.usageData.v1"), "share-analytics");
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

describe("the live sender", () => {
    /** The event names the anonymous stand-in recorded. */
    const sends: string[] = [];
    const analytics = { posthogKey: "phc_testkey123", posthogHost: "https://eu.i.posthog.com" };
    const signals = { dnt: true, gpc: false };
    /** Installs the anonymous mode's recording stand-in. */
    const recordAnonymous = (): void => {
        setPostHogClientForTests(
            {
                capture: (event) => {
                    sends.push(event);
                    return undefined;
                },
            },
            "anonymous",
        );
    };

    beforeEach(async () => {
        signals.dnt = true;
        signals.gpc = false;
        setUsageSenderForTests();
        resetAnalyticsForTests();
        resetSiteConfig();
        forgetUsageAnswer();
        sends.length = 0;
        setAnalyticsCallsForTests({
            // The shared mode's code never loads here: the live Share leaves it pending.
            importPostHog: () => new Promise(() => undefined),
            afterFirstPaint: () => undefined,
            hostname: () => "graphty.app",
            privacySignals: () => signals,
        });
        recordAnonymous();
        const file = { site: "production", features: ["usage-analytics"], analytics };
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
        signals.dnt = false;
        answerUsageData("declined");
        assert.deepEqual(sends, []);
        answerUsageData("share");
        assert.deepEqual(sends, ["usage_data_shared"]);
    });

    it("leaves a Share under Do Not Track or GPC out of the opt-in rate, as its visits are", () => {
        signals.dnt = true;
        answerUsageData("share");
        forgetUsageAnswer();
        resetAnalyticsForTests();
        recordAnonymous();
        startPageCounts({ site: "production", features: [], analytics });
        signals.dnt = false;
        signals.gpc = true;
        answerUsageData("share");
        assert.notInclude(sends, "usage_data_shared");
        // Not vacuous: the page views were sent.
        assert.isNotEmpty(sends);
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

describe("the usage data gate with the usage-analytics experiment off", () => {
    withFeatures([]);
    beforeEach(() => {
        forgetUsageAnswer();
        initSentry.mockClear();
        stopSentry.mockClear();
    });
    afterEach(() => {
        forgetUsageAnswer();
    });

    it("stores a Share that does not cover PostHog, and reads a Share that did as Share", () => {
        answerUsageData("share");
        assert.equal(localStorage.getItem("graphty.usageData.v1"), "share");
        localStorage.setItem("graphty.usageData.v1", "share-analytics");
        assert.equal(readUsageAnswer(), "share");
        startUsageDataIfShared();
        assert.equal(initSentry.mock.calls.length, 2);
    });

    it("asks again, and starts no PostHog, for a Share clicked before site.json switched PostHog on", async () => {
        // The page painted with the experiment off, so the card's words never named PostHog.
        answerUsageData("share");
        assert.equal(initSentry.mock.calls.length, 1);
        resetSiteConfig();
        const site = { site: "production", features: ["usage-analytics"], analytics: TEST_ANALYTICS };
        await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(site))}`);
        setAnalyticsCallsForTests({ hostname: () => "graphty.app", importPostHog: () => new Promise(() => undefined) });
        try {
            assert.isNull(readUsageAnswer(), "the card asks again");
            startUsageDataIfShared();
            assert.equal(initSentry.mock.calls.length, 1, "nothing more starts at boot");
        } finally {
            setAnalyticsCallsForTests();
        }
    });

    it("starts and stops nothing in this tab when another tab answers", () => {
        localStorage.setItem("graphty.usageData.v1", "share");
        globalThis.dispatchEvent(
            new StorageEvent("storage", {
                key: "graphty.usageData.v1",
                oldValue: null,
                newValue: "share",
                storageArea: localStorage,
            }),
        );
        assert.equal(initSentry.mock.calls.length, 0);
        assert.equal(stopSentry.mock.calls.length, 0);
    });
});
