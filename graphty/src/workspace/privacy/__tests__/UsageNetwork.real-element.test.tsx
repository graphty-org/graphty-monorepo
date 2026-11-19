/**
 * What leaves the page with the usage-analytics experiment off (nothing, for any reader), and for a
 * reader who never shares usage data with it on, with the REAL graphty-element and
 * the app's own analytics wiring (design/graphty/usage-analytics.md, section 11): PostHog's real code
 * loads once after first paint and sends only its anonymous, cookieless counts, none carrying the
 * address bar's secret, a file's name or a label; Sentry never starts. PostHog's ingest host is a
 * same-origin prefix answered by the test's own wrappers, and every request the browser makes off
 * the test server is listed by the `watchOffOriginRequests` command, a listener that leaves the HTTP
 * cache alone.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { CaptureResult, PostHog } from "posthog-js";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import {
    type AnalyticsCalls,
    APP_CALLER_KEY,
    importPostHogModule,
    onUsageEvent,
    postHog,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    startAnalyticsAtBoot,
} from "../../../lib/analytics";
import { isSentryEnabled, resetSentryState, type SentryCalls, setSentryCallsForTests } from "../../../lib/sentry";
import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import { openSampleFromStart } from "../../../test/open";
import {
    interceptPostHog,
    POSTHOG_TEST_HOST,
    type PostHogTestNetwork,
    sentEvents,
} from "../../../test/posthog-network";
import { act, render, screen, within } from "../../../test/test-utils";
import { TEST_ANALYTICS } from "../../../test/usage-recorders";
import { PROTOTYPE_SAMPLES, sampleName, sampleUrl } from "../../start/samples";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { forgetUsageAnswer } from "../usageData";

/** The browser commands this file uses, registered in vitest.config.ts. */
const watch = commands as unknown as {
    watchOffOriginRequests: () => Promise<void>;
    takeOffOriginRequests: () => Promise<string[]>;
};

const SECRETS = ["SECRET_URL", "SECRET_GENES", "TP53", "SECRET_PROJECT"];

/** The wrappers answering PostHog's sentinel host, installed per case. */
let network: PostHogTestNetwork;
/** How often PostHog's code was asked for. */
let imports = 0;
/** How often Sentry was started. */
let sentryStarts = 0;
const address = globalThis.location.href;

/**
 * Settles at the next usage event of a name. No deadline of its own.
 * @param name - the event name.
 * @returns settles then.
 */
function next(name: string): Promise<void> {
    return new Promise((resolve) => {
        const off = onUsageEvent((each) => {
            if (each === name) {
                off();
                resolve();
            }
        });
    });
}

/**
 * Drops a file as the browser does, on the window. A synthetic DragEvent, the one exception to real
 * input here: a page cannot start a drag of a file from the operating system.
 * @param file - the file.
 */
function drop(file: File): void {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    for (const type of ["dragover", "drop"]) {
        globalThis.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

/**
 * The TP53 table the app serves, under a secret name.
 * @returns the file.
 */
async function secretFile(): Promise<File> {
    const sample = PROTOTYPE_SAMPLES.find((each) => sampleName(each) === "tp53-interactions.tsv");
    if (sample === undefined) {
        throw new Error("no TP53 fixture");
    }
    const response = await fetch(sampleUrl(sample));
    return new File([await response.blob()], "SECRET_GENES.tsv");
}

/** The address the cases boot from: a secret, and a channel. */
const SECRET_QUERY = "?url=https://SECRET_URL.example/SECRET_URL.csv&ref=hn";

/**
 * Boots analytics as main.tsx does, for a site with PostHog configured, from an address that
 * carries a secret, then shows the workspace's start page.
 * @param features - the site's experiments: usage-analytics on, unless a case says otherwise.
 */
async function boot(features: readonly string[] = ["usage-analytics"]): Promise<void> {
    globalThis.history.replaceState(null, "", SECRET_QUERY);
    const site = {
        site: "production",
        features,
        analytics: TEST_ANALYTICS,
    };
    startAnalyticsAtBoot(await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(site))}`));
    render(<Workspace store={createWorkspaceStore()} />);
}

/**
 * Opens the secret file from the start page and runs a measure in it, through the reader's drop and
 * the session, and waits until both were counted.
 */
async function useTheApp(): Promise<void> {
    const opened = next("own_file_opened");
    drop(await secretFile());
    await opened;
    const element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
        "graphty-element:not([data-start-page])",
    );
    const ran = next("algorithm_run");
    await element?.session.runs.start("degree", {});
    await ran;
}

/**
 * Waits until PostHog was sent an event of a name.
 * @param name - the event name.
 * @returns its properties.
 */
async function sentToPostHog(name: string): Promise<Record<string, unknown>> {
    return vi.waitFor(() => {
        const found = sentEvents(network.bodies).find((event) => event.event === name);
        assert.isDefined(found, `${name} left the page`);
        return found.properties;
    });
}

/**
 * Asserts what left the page: PostHog's code loaded once, only anonymous counts sent to it, free of
 * every secret, and no request to Sentry or off the page to PostHog.
 */
async function assertOnlyAnonymousCounts(): Promise<void> {
    // Not vacuous: the counts were sent.
    for (const name of ["$pageview", "own_file_opened", "algorithm_run"]) {
        await sentToPostHog(name);
    }
    const offOrigin = await watch.takeOffOriginRequests();
    assert.strictEqual(imports, 1, "PostHog's code loaded once, after first paint");
    assert.strictEqual(sentryStarts, 0, "Sentry never started");
    assert.isEmpty(
        offOrigin.filter((url) => /posthog|sentry/i.test(url)),
        "no request reached a PostHog or Sentry host",
    );
    for (const url of network.urls) {
        assert.match(url, /\/e\/(\?|$)/, "PostHog was sent events only");
    }
    for (const event of sentEvents(network.bodies)) {
        assert.include(event.properties, { $cookieless_mode: true, tracking: "anonymous" }, event.event);
    }
    const all = JSON.stringify({ bodies: network.bodies, urls: network.urls, offOrigin });
    for (const secret of SECRETS) {
        assert.notInclude(all, secret);
    }
}

/**
 * The analytics seams these cases use: PostHog's real code, counted as it loads, sending to the
 * sentinel host, and a first paint that has already happened.
 * @returns them.
 */
function recordingCalls(): Partial<AnalyticsCalls> {
    return {
        posthogHost: POSTHOG_TEST_HOST,
        afterFirstPaint: (run) => {
            run();
        },
        hostname: () => "graphty.app",
        privacySignals: () => ({ dnt: false, gpc: false }),
        importPostHog: () => {
            imports++;
            return importPostHogModule();
        },
    };
}

/** Starts the recording seams and the request watch, as each case needs. */
async function startRecording(): Promise<void> {
    resetAnalyticsForTests();
    resetSiteConfig();
    forgetUsageAnswer();
    imports = 0;
    sentryStarts = 0;
    setAnalyticsCallsForTests(recordingCalls());
    setSentryCallsForTests({
        init: () => {
            sentryStarts++;
        },
        // Sentry's real replay allows one instance per page, and resetSentryState forgets this
        // page's: a stand-in lets each case start error reporting again.
        replayIntegration: () => ({
            name: "Replay",
            startBuffering: () => undefined,
            stop: () => Promise.resolve(),
        }),
        defaultConfig: { dsn: "https://public@o0.ingest.sentry.io/0" },
    } as unknown as Partial<SentryCalls>);
    await watch.watchOffOriginRequests();
    network = interceptPostHog();
}

/** Undoes `startRecording` and the address a case booted from. */
function stopRecording(): void {
    network.restore();
    globalThis.history.replaceState(null, "", address);
    forgetUsageAnswer();
    resetAnalyticsForTests();
    resetSiteConfig();
    setAnalyticsCallsForTests();
    resetSentryState();
    setSentryCallsForTests();
}

/**
 * Opens a sample from the start page, as a reader does, and counts the settings steps (the project's
 * name, the app's starting settings) its element journaled, by whether the app marked them as its own.
 * @returns the app's own and the rest.
 */
async function configStepsOfASample(): Promise<{ app: number; other: number }> {
    const { session } = await openSampleFromStart("Florentine families");
    const steps = session.journal.entries.filter((entry) => entry.kind === "config" && entry.trigger === undefined);
    const app = steps.filter((entry) => entry.callerKey === APP_CALLER_KEY).length;
    return { app, other: steps.length - app };
}

/** The storage keys only analytics writes: PostHog's, its surveys', and the app's visit and survey records. */
function analyticsKeys(): string[] {
    return Object.keys(localStorage).filter((key) =>
        /^(ph_|seenSurvey_|inProgressSurvey_|lastSeenSurveyDate|graphty\.visits\.|graphty\.surveys\.)/.test(key),
    );
}

// First in the file, so nothing earlier on this page has loaded PostHog's code.
describe("with the usage-analytics experiment off", () => {
    beforeEach(startRecording);
    afterEach(stopRecording);

    it("sends PostHog nothing, loads none of it and stores nothing for it, while the reader shares", async () => {
        // A reader who shared on an earlier visit, booting with PostHog's ids configured...
        localStorage.setItem("graphty.usageData.v1", "share");
        await boot([]);
        assert.strictEqual(sentryStarts, 1, "the earlier Share starts error reporting, as before");
        // ...then uses the app.
        assert.isNull(screen.queryByRole("complementary", { name: "Usage data" }), "the question was answered");
        await useTheApp();
        assert.isNull(screen.queryByRole("complementary", { name: "Survey" }));
        assert.isNull(document.querySelector(".ws-usage-corner"), "no survey corner: the card is laid out as before");

        assert.strictEqual(imports, 0, "PostHog's code was never asked for");
        assert.isEmpty(network.urls, "no request reached PostHog");
        const offOrigin = await watch.takeOffOriginRequests();
        assert.isEmpty(offOrigin.filter((url) => /posthog/i.test(url)));
        assert.isEmpty(analyticsKeys(), "nothing was stored for analytics");
        assert.strictEqual(globalThis.location.search, SECRET_QUERY, "the address bar is left as it was");
    });

    it("starts error reporting alone on a first visit's Share", async () => {
        await boot([]);
        const card = screen.getByRole("complementary", { name: "Usage data" });
        await userEvent.click(within(card).getByRole("button", { name: "Share usage data" }));
        assert.strictEqual(sentryStarts, 1, "Share starts error reporting, as before");
        await useTheApp();

        assert.strictEqual(imports, 0, "PostHog's code was never asked for");
        assert.isEmpty(network.urls, "no request reached PostHog");
        assert.isEmpty(analyticsKeys(), "nothing was stored for analytics");
        assert.isNull(screen.queryByRole("complementary", { name: "Survey" }));
        assert.isNull(document.querySelector(".ws-usage-corner"), "no survey corner: the card is laid out as before");
    });

    it("writes an opened project's name and starting settings as plain settings, as before", async () => {
        await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify({ features: [] }))}`);
        const steps = await configStepsOfASample();
        assert.strictEqual(steps.app, 0, "no step is marked as the app's own");
        assert.isAtLeast(steps.other, 2, "the name and the starting settings were written");
    });

    it("deletes what an earlier visit with the experiment on stored, when the reader turns sharing off", async () => {
        // A reader who shared on a visit with the experiment on, back on a site with it off.
        localStorage.setItem("graphty.usageData.v1", "share-analytics");
        localStorage.setItem("ph_phc_test_posthog", '{"distinct_id":"someone"}');
        localStorage.setItem("seenSurvey_x", "true");
        localStorage.setItem("graphty.visits.v1", '{"first":"2026-01-01","last":"2026-01-02"}');
        localStorage.setItem("graphty.surveys.v1", '{"seen":[],"use_case":"SECRET_PROJECT"}');
        await boot([]);
        // The privacy chip in an open project's status bar leads to Settings > Privacy.
        await useTheApp();
        const [chip] = await screen.findAllByRole("button", { name: "Usage data on, content masked" });
        await userEvent.click(chip);
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        const toggle = within(dialog).getByRole<HTMLInputElement>("switch", { name: "Share usage data" });
        assert.isTrue(toggle.checked, "Share is on");
        await userEvent.click(toggle);
        assert.isFalse(toggle.checked);

        assert.isEmpty(analyticsKeys(), "PostHog's id, the survey keys and the visit and survey records are gone");
        assert.strictEqual(imports, 0, "PostHog's code was never asked for");
        assert.isEmpty(network.urls, "no request reached PostHog");
    });
});

// Canary: the experiment on, and no PostHog ids to send with. The page shows the words for sending
// PostHog nothing, so it behaves as with the experiment off.
describe("with the usage-analytics experiment on and no PostHog ids", () => {
    beforeEach(startRecording);
    afterEach(stopRecording);

    it("leaves the address bar as it was, at boot and after a Share, and starts error reporting alone", async () => {
        // On canary's own host, so only the missing PostHog ids keep the page from sending.
        setAnalyticsCallsForTests({ ...recordingCalls(), hostname: () => "canary.graphty.app" });
        globalThis.history.replaceState(null, "", SECRET_QUERY);
        const site = { site: "canary", features: ["usage-analytics"] };
        startAnalyticsAtBoot(await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(site))}`));
        render(<Workspace store={createWorkspaceStore()} />);
        assert.strictEqual(globalThis.location.search, SECRET_QUERY, "boot keeps the channel parameters");

        const card = screen.getByRole("complementary", { name: "Usage data" });
        assert.isNull(document.querySelector(".ws-usage-corner"), "no survey corner: the card is laid out as before");
        await userEvent.click(within(card).getByRole("button", { name: "Share usage data" }));
        assert.strictEqual(sentryStarts, 1, "Share starts error reporting, as before");
        assert.strictEqual(globalThis.location.search, SECRET_QUERY, "Share keeps the query");
        assert.strictEqual(imports, 0, "PostHog's code was never asked for");
        assert.isEmpty(network.urls, "no request reached PostHog");
    });
});

describe("a reader who never shares usage data", () => {
    beforeEach(startRecording);
    afterEach(stopRecording);

    it("marks an opened project's name and starting settings as the app's own steps", async () => {
        const site = { site: "production", features: ["usage-analytics"], analytics: TEST_ANALYTICS };
        await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(site))}`);
        const steps = await configStepsOfASample();
        assert.strictEqual(steps.other, 0, "no settings step is counted as the reader's");
        assert.isAtLeast(steps.app, 2, "the name and the starting settings");
    });

    it("sends PostHog only anonymous counts and Sentry nothing after No thanks, with no secret", async () => {
        await boot();
        const card = screen.getByRole("complementary", { name: "Usage data" });
        await userEvent.click(within(card).getByRole("button", { name: "No thanks" }));
        await useTheApp();
        await assertOnlyAnonymousCounts();
        assert.notInclude(
            sentEvents(network.bodies).map((event) => event.event),
            "usage_data_shared",
        );
    });

    it("asks again, and sends only anonymous counts, when the reader's Share was given with the experiment off", async () => {
        // Share answered under the words that never named PostHog, then a visit with the experiment on.
        localStorage.setItem("graphty.usageData.v1", "share");
        await boot();
        assert.isNotNull(screen.getByRole("complementary", { name: "Usage data" }), "the card asks again");
        await useTheApp();
        await assertOnlyAnonymousCounts();
    });

    it("sends PostHog only anonymous counts and Sentry nothing while the question is unanswered", async () => {
        await boot();
        assert.isNotNull(screen.getByRole("complementary", { name: "Usage data" }));
        await useTheApp();
        await assertOnlyAnonymousCounts();
    });

    it("returns to anonymous counts for good when Share is turned off in Settings: opted out, no id kept", async () => {
        await boot();
        const card = screen.getByRole("complementary", { name: "Usage data" });
        await userEvent.click(within(card).getByRole("button", { name: "Share usage data" }));
        await vi.waitFor(() => {
            assert.isDefined(postHog(), "Share loaded PostHog");
        });
        const client = postHog() as unknown as PostHog;
        assert.strictEqual(imports, 1, "Share reused the chunk loaded after first paint");
        // Every event that reaches the shared instance's before_send, before the app's cleaning runs.
        const sharedSeen: string[] = [];
        const own = client.config.before_send;
        client.config.before_send = [
            (event: CaptureResult | null) => {
                sharedSeen.push(event?.event ?? "");
                return event;
            },
            ...[own ?? []].flat(),
        ];

        await userEvent.click(screen.getByRole("button", { name: "Change this in Settings > Privacy" }));
        // Not vacuous: while Share is on, a real click reaches the shared instance's before_send.
        await vi.waitFor(() => {
            assert.include(sharedSeen, "$autocapture");
        });
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        const toggle = within(dialog).getByRole<HTMLInputElement>("switch", { name: "Share usage data" });
        assert.isTrue(toggle.checked, "Share is on");
        await userEvent.click(toggle);
        assert.isFalse(toggle.checked);
        const seenAtSwitch = sharedSeen.length;

        assert.isTrue(client.has_opted_out_capturing());
        assert.isUndefined(postHog());
        assert.isEmpty(
            Object.keys(localStorage).filter((key) => key.startsWith("ph_")),
            "no PostHog id is kept",
        );
        // Real input after the switch: clicks, a panel opened, a measure run. The shared instance's
        // own handlers (autocapture, heatmaps, dead clicks, web vitals) must hand it nothing.
        await userEvent.keyboard("{Escape}");
        await useTheApp();
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        const [row] = await within(tree).findAllByRole("treeitem");
        await userEvent.click(row);
        await screen.findByRole("complementary", { name: "Inspector" });
        // The barrier: the run's count left in the anonymous mode.
        assert.include(await sentToPostHog("algorithm_run"), { $cookieless_mode: true, tracking: "anonymous" });
        assert.deepEqual(
            sharedSeen.slice(seenAtSwitch),
            [],
            "the shared instance's before_send received nothing after Share was turned off",
        );
        const offOrigin = await watch.takeOffOriginRequests();
        assert.isEmpty(offOrigin.filter((url) => /posthog/i.test(url)));
        assert.isEmpty(
            Object.keys(localStorage).filter((key) => key.startsWith("ph_")),
            "and none is saved later",
        );
    });
});

describe("the usage card while site.json loads", () => {
    beforeEach(startRecording);
    afterEach(stopRecording);

    it("keeps the answer line and its focus when site.json switches the experiment on after an answer", async () => {
        // The page paints before site.json settles, with every experiment off.
        render(<Workspace store={createWorkspaceStore()} />);
        const card = screen.getByRole("complementary", { name: "Usage data" });
        await userEvent.click(within(card).getByRole("button", { name: "No thanks" }));
        const line = document.querySelector(".ws-start-answer");
        assert.isNotNull(line, "the answer line");
        const close = await vi.waitFor(() => {
            const focused = document.activeElement;
            assert.strictEqual(focused?.getAttribute("aria-label"), "Close", "focus moved to the line's Close");
            return focused;
        });

        const site = { site: "production", features: ["usage-analytics"], analytics: TEST_ANALYTICS };
        await act(async () => {
            await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(site))}`);
        });

        assert.isNotNull(document.querySelector(".ws-usage-corner"), "the experiment is on");
        assert.strictEqual(document.querySelector(".ws-start-answer"), line, "the same answer line is still shown");
        assert.strictEqual(document.activeElement, close, "focus stayed on its Close");
    });

    it("stops what a Share started, and asks again with focus on the question, when site.json switches PostHog on after it", async () => {
        // The page paints before site.json settles: the card's words never name PostHog.
        render(<Workspace store={createWorkspaceStore()} />);
        const card = screen.getByRole("complementary", { name: "Usage data" });
        await userEvent.click(within(card).getByRole("button", { name: "Share usage data" }));
        // Not vacuous: the Share started error reporting, and focus moved to the answer line's Close.
        assert.isTrue(isSentryEnabled(), "Share started error reporting");
        await vi.waitFor(() => {
            assert.strictEqual(document.activeElement?.getAttribute("aria-label"), "Close");
        });

        const site = { site: "production", features: ["usage-analytics"], analytics: TEST_ANALYTICS };
        await act(async () => {
            await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(site))}`);
        });

        assert.isFalse(isSentryEnabled(), "error reporting stopped with the Share it came from");
        const asked = screen.getByRole("complementary", { name: "Usage data" });
        await vi.waitFor(() => {
            assert.strictEqual(
                document.activeElement,
                within(asked).getByRole("button", { name: "Share usage data" }),
                "focus is on the question asked again",
            );
        });
        assert.include(
            document.querySelector('[role="status"]')?.textContent ?? "",
            "Usage data is off again",
            "the status line says the answer no longer holds",
        );
    });
});
