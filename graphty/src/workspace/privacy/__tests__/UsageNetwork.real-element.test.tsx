/**
 * What leaves the page for a reader who never shares usage data, with the REAL graphty-element and
 * the app's own analytics wiring (design/graphty/usage-analytics.md, section 11): PostHog is
 * configured, but its code is never loaded and no request reaches a PostHog or Sentry host; Umami
 * gets its anonymous counts, and none carries the address bar's secret, a file's name or a label.
 * Every request the browser makes off the test server is listed by the `watchOffOriginRequests`
 * command, a listener that leaves the HTTP cache alone.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { commands, userEvent } from "vitest/browser";

import {
    onUsageEvent,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    startAnalyticsAtBoot,
    type UmamiBody,
} from "../../../lib/analytics";
import { resetSentryState, type SentryCalls, setSentryCallsForTests } from "../../../lib/sentry";
import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import { render, screen, within } from "../../../test/test-utils";
import { PROTOTYPE_SAMPLES, sampleName, sampleUrl } from "../../start/samples";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { forgetUsageAnswer } from "../usageData";

/** The browser commands this file uses, registered in vitest.config.ts. */
const watch = commands as unknown as {
    watchOffOriginRequests: () => Promise<void>;
    takeOffOriginRequests: () => Promise<string[]>;
};

const UMAMI = "8f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const SECRETS = ["SECRET_URL", "SECRET_GENES", "TP53", "SECRET_PROJECT"];

/** What Umami was sent. */
const umami: UmamiBody[] = [];
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
 * Boots analytics as main.tsx does, for a site with Umami and PostHog configured, from an address
 * that carries a secret, then shows the workspace's start page.
 */
async function boot(): Promise<void> {
    globalThis.history.replaceState(null, "", "?url=https://SECRET_URL.example/SECRET_URL.csv&ref=hn");
    const site = {
        site: "production",
        features: [],
        analytics: { umamiWebsiteId: UMAMI, posthogKey: "phc_testkey123", posthogHost: "https://eu.i.posthog.com" },
    };
    startAnalyticsAtBoot(await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(site))}`));
    render(<Workspace store={createWorkspaceStore()} />);
}

/**
 * Opens the secret file from the start page and runs a measure in it, through the reader's drop and
 * the session, and waits until Umami has counted both.
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
 * Asserts what left the page: no PostHog code loaded, no PostHog or Sentry request, and Umami's
 * counts free of every secret.
 */
async function assertOnlyAnonymousCounts(): Promise<void> {
    const offOrigin = await watch.takeOffOriginRequests();
    assert.strictEqual(imports, 0, "PostHog's code was never loaded");
    assert.strictEqual(sentryStarts, 0, "Sentry never started");
    assert.isEmpty(
        offOrigin.filter((url) => /posthog|sentry/i.test(url)),
        "no request reached a PostHog or Sentry host",
    );
    const names = umami.map((body) => body.payload.name ?? "pageview");
    // Not vacuous: the counts were sent.
    for (const name of ["pageview", "own_file_opened", "algorithm_run"]) {
        assert.include(names, name);
    }
    const all = JSON.stringify({ umami, offOrigin });
    for (const secret of SECRETS) {
        assert.notInclude(all, secret);
    }
}

describe("a reader who never shares usage data", () => {
    beforeEach(async () => {
        resetAnalyticsForTests();
        resetSiteConfig();
        forgetUsageAnswer();
        umami.length = 0;
        imports = 0;
        sentryStarts = 0;
        setAnalyticsCallsForTests({
            send: (body) => {
                umami.push(body);
                return undefined;
            },
            hostname: () => "graphty.app",
            privacySignals: () => ({ dnt: false, gpc: false }),
            importPostHog: () => {
                imports++;
                return import("posthog-js/full/no-external");
            },
        });
        setSentryCallsForTests({
            init: () => {
                sentryStarts++;
            },
            defaultConfig: { dsn: "https://public@o0.ingest.sentry.io/0" },
        } as unknown as Partial<SentryCalls>);
        await watch.watchOffOriginRequests();
    });

    afterEach(() => {
        globalThis.history.replaceState(null, "", address);
        forgetUsageAnswer();
        resetAnalyticsForTests();
        resetSiteConfig();
        setAnalyticsCallsForTests();
        resetSentryState();
        setSentryCallsForTests();
    });

    it("sends PostHog and Sentry nothing after No thanks, and Umami no secret", async () => {
        await boot();
        const card = screen.getByRole("complementary", { name: "Usage data" });
        await userEvent.click(within(card).getByRole("button", { name: "No thanks" }));
        await useTheApp();
        await assertOnlyAnonymousCounts();
        assert.notInclude(
            umami.map((body) => body.payload.name),
            "usage_data_shared",
        );
    });

    it("sends PostHog and Sentry nothing while the question is unanswered, and Umami no secret", async () => {
        await boot();
        assert.isNotNull(screen.getByRole("complementary", { name: "Usage data" }));
        await useTheApp();
        await assertOnlyAnonymousCounts();
    });
});
