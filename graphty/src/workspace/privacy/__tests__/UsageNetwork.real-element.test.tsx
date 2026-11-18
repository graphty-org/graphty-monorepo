/**
 * What leaves the page for a reader who never shares usage data, with the REAL graphty-element and
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
    importPostHogModule,
    onUsageEvent,
    postHog,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    startAnalyticsAtBoot,
} from "../../../lib/analytics";
import { resetSentryState, type SentryCalls, setSentryCallsForTests } from "../../../lib/sentry";
import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import {
    interceptPostHog,
    POSTHOG_TEST_HOST,
    type PostHogTestNetwork,
    sentEvents,
} from "../../../test/posthog-network";
import { render, screen, within } from "../../../test/test-utils";
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

/**
 * Boots analytics as main.tsx does, for a site with PostHog configured, from an address that
 * carries a secret, then shows the workspace's start page.
 */
async function boot(): Promise<void> {
    globalThis.history.replaceState(null, "", "?url=https://SECRET_URL.example/SECRET_URL.csv&ref=hn");
    const site = {
        site: "production",
        features: [],
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

describe("a reader who never shares usage data", () => {
    beforeEach(async () => {
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
            defaultConfig: { dsn: "https://public@o0.ingest.sentry.io/0" },
        } as unknown as Partial<SentryCalls>);
        await watch.watchOffOriginRequests();
        network = interceptPostHog();
    });

    afterEach(() => {
        network.restore();
        globalThis.history.replaceState(null, "", address);
        forgetUsageAnswer();
        resetAnalyticsForTests();
        resetSiteConfig();
        setAnalyticsCallsForTests();
        resetSentryState();
        setSentryCallsForTests();
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
