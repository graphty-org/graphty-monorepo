/**
 * The real posthog-js chunk, loaded through the default import, with its ingest host pointed at a
 * same-origin prefix that this file answers itself: no request reaches a server. What leaves the page
 * is read from the recorded request bodies. Run it again whenever the posthog-js pin changes.
 *
 * The canned remote config turns recording off, except in the replay case, which turns it on with
 * posthog-js's published `SessionRecordingRemoteConfig` shape and reads the `$snapshot` bodies.
 */
import { pickFiles } from "@graphty/compact-mantine";
import type { PostHog } from "posthog-js";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { loadSiteConfig, resetSiteConfig } from "../siteConfig";
import {
    interceptPostHog,
    POSTHOG_TEST_CONFIG,
    POSTHOG_TEST_HOST,
    type PostHogTestNetwork,
    sentEvents,
} from "../test/posthog-network";
import {
    count,
    importPostHogModule,
    postHog,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    setCommandAllowlist,
    startPostHog,
    stopPostHog,
    stripQueryForRecorders,
} from "./analytics";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Answers the next file picker with this file (graphty/vitest.config.ts). */
        chooseNextFile: (name: string, mimeType: string, text: string) => Promise<void>;
    }
}

const KEY = "phc_realchunktest";
/** The sentinel ingest host. */
const PREFIX = POSTHOG_TEST_HOST;
const SECRETS = ["SECRET_URL", "SECRET_LOG", "SECRET_TEXT", "SECRET_PROJECT"];

/** The wrappers answering the sentinel host, installed per case. */
let network: PostHogTestNetwork;
/** Every request body sent to the sentinel host, as text. */
let bodies: string[] = [];
/** Every URL requested on the sentinel host. */
let urls: string[] = [];

const address = globalThis.location.href;

/** The canned remote config with session recording on, sampled at 100%, no minimum duration. */
const RECORDING_CONFIG = JSON.stringify({
    ...(JSON.parse(POSTHOG_TEST_CONFIG) as Record<string, unknown>),
    sessionRecording: { endpoint: "/s/", sampleRate: null, minimumDurationMilliseconds: 0 },
});

/**
 * The recorded request bodies that carry a replay snapshot.
 * @returns them, joined.
 */
function snapshots(): string {
    return bodies.filter((body) => body.includes("$snapshot")).join("\n");
}

/**
 * Starts PostHog as the live sender does and waits for its client.
 * @returns the client.
 */
async function started(): Promise<PostHog> {
    startPostHog();
    await vi.waitFor(() => {
        assert.isDefined(postHog());
    });
    return postHog() as unknown as PostHog;
}

/**
 * A button carrying reader text in its label and text, and a marker class replay keeps.
 * @param marker - its class, found in a snapshot to show the search works.
 * @returns the button, on the page.
 */
function markedButton(marker: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = "SECRET_TEXT";
    button.setAttribute("aria-label", "SECRET_PROJECT");
    button.className = marker;
    button.dataset.phCaptureAttributeControl = "history.undo";
    document.body.append(button);
    return button;
}

beforeEach(async () => {
    resetAnalyticsForTests();
    resetSiteConfig();
    // The site first: it is read through fetch, which the wrappers below replace.
    const site = {
        site: "production",
        features: ["usage-analytics"],
        analytics: { posthogKey: KEY, posthogHost: "https://us.i.posthog.com" },
    };
    await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(site))}`);
    setAnalyticsCallsForTests({ hostname: () => "graphty.app", posthogHost: PREFIX });
    network = interceptPostHog();
    ({ bodies, urls } = network);
});

afterEach(() => {
    network.restore();
    globalThis.history.replaceState(null, "", address);
    Reflect.deleteProperty(document, "referrer");
    document.body.replaceChildren();
    resetAnalyticsForTests();
    resetSiteConfig();
    setAnalyticsCallsForTests();
});

describe("the real posthog-js chunk", () => {
    it("loads on Share, sends no reader text or query, keeps the control id, and stops for good", async () => {
        globalThis.history.replaceState(null, "", "?url=SECRET_URL&graphty-element-logging=SECRET_LOG");
        setCommandAllowlist(["history.undo"]);

        // The live sender's start: strip the address bar, then start PostHog.
        stripQueryForRecorders();
        startPostHog();
        // The app's own page view, as startPageCounts counts it: posthog-js sends none of its own.
        count("$pageview");
        await vi.waitFor(() => {
            assert.isDefined(postHog());
        });
        const client = postHog() as unknown as PostHog;

        const button = document.createElement("button");
        button.textContent = "SECRET_TEXT";
        button.setAttribute("aria-label", "SECRET_PROJECT");
        button.className = "POSITIVE_MARKER";
        button.dataset.phCaptureAttributeControl = "history.undo";
        document.body.append(button);
        await userEvent.click(button);

        // Not vacuous: a page view and the click's autocapture left the page.
        await vi.waitFor(() => {
            const sent = bodies.join("\n");
            assert.include(sent, "$pageview");
            assert.include(sent, "$autocapture");
        });
        const sent = bodies.join("\n");
        assert.include(sent, "history.undo", "the click carries its control id");
        const views = sentEvents(bodies).filter((event) => event.event === "$pageview");
        assert.lengthOf(views, 1, "the app's page view, and none of posthog-js's own");
        assert.equal(views[0].properties.tracking, "shared");
        assert.notProperty(views[0].properties, "$cookieless_mode");
        for (const secret of SECRETS) {
            assert.notInclude(sent, secret);
            assert.notInclude(urls.join("\n"), secret);
        }

        // An allowlisted capture is queued while sharing, so the same call after the stop can fail.
        assert.isDefined(client.capture("sample_loaded", { sample: "karate" }), "queued while sharing");
        // Sent before the stop, so it is not left in the queue for a later case to see.
        await vi.waitFor(() => {
            assert.include(bodies.join("\n"), "sample_loaded");
        });

        // Stop: opted out, no id kept, and nothing reaches PostHog's flags or reset after it.
        const reset = vi.spyOn(client, "reset");
        const reload = vi.spyOn(client, "reloadFeatureFlags");
        stopPostHog();
        assert.isTrue(client.has_opted_out_capturing());
        assert.isUndefined(postHog());
        assert.isNull(localStorage.getItem(`ph_${KEY}_posthog`));
        // Counted work, not a wait for a batch that may never flush: every capture after the stop,
        // the click's autocapture included, returns nothing, so nothing was queued to send later.
        const capture = vi.spyOn(client, "capture");
        const capturedAfter = client.capture("sample_loaded", { sample: "karate" });
        assert.isUndefined(capturedAfter, "a capture after stop is dropped before it is queued");
        await userEvent.click(button);
        assert.isTrue(
            capture.mock.results.every((result) => result.type === "return" && result.value === undefined),
            "no capture after the stop, the click's included, was queued",
        );
        assert.strictEqual(reset.mock.calls.length, 0);
        assert.strictEqual(reload.mock.calls.length, 0);
        assert.isNull(localStorage.getItem(`ph_${KEY}_posthog`));
        // PostHog's Logs extension posts console lines past before_send; nothing turned it on.
        assert.notInclude(urls.join("\n"), "/i/v1/logs");
    });

    it("keeps a referrer's path and query out of every body, the flags request's included", async () => {
        Object.defineProperty(document, "referrer", {
            configurable: true,
            get: () => "https://intranet.example/SECRET_REF?q=SECRET_REFQ",
        });
        const client = await started();
        const flagsBefore = urls.filter((url) => url.includes("/flags")).length;
        client.reloadFeatureFlags();
        count("sample_loaded", { sample: "karate" });
        await vi.waitFor(() => {
            assert.isAbove(urls.filter((url) => url.includes("/flags")).length, flagsBefore, "a flags request left");
            assert.include(bodies.join("\n"), "sample_loaded");
        });
        assert.notInclude(bodies.join("\n"), "SECRET_REF");
        assert.notInclude(urls.join("\n"), "SECRET_REF");
        stopPostHog();
    });

    it("records no dead or rage click for clicks on the graph's canvas", async () => {
        await import("@graphty/graphty-element");
        await started();
        // As ElementHost.tsx renders it.
        const element = document.createElement("graphty-element");
        element.className = "ph-no-capture";
        element.style.cssText = "display: block; width: 400px; height: 300px";
        document.body.append(element);
        const canvas = await vi.waitFor(() => {
            const found = element.shadowRoot?.querySelector("canvas") ?? null;
            assert.isNotNull(found, "the element drew its canvas");
            return found;
        });
        for (let click = 0; click < 5; click++) {
            await userEvent.click(canvas, { position: { x: 200, y: 150 } });
        }
        // The barrier: a later click elsewhere reaches PostHog, so the canvas clicks were seen first.
        await userEvent.click(markedButton("AFTER_CANVAS"));
        await vi.waitFor(() => {
            assert.include(bodies.join("\n"), "$autocapture");
        });
        const sent = bodies.join("\n");
        assert.notInclude(sent, "$rageclick");
        assert.notInclude(sent, "$dead_click");
        stopPostHog();
    });

    it("gives a reader who says No and later Share again new ids, never the ones from before the No", async () => {
        startPostHog();
        await vi.waitFor(() => {
            assert.isDefined(postHog());
        });
        const client = postHog() as unknown as PostHog;
        const oldDevice = String(client.get_property("$device_id"));
        const oldDistinct = client.get_distinct_id();
        assert.isNotEmpty(oldDevice);

        stopPostHog();
        // An event captured before the No may still leave in a later batch: only what is captured
        // from the new Share on is checked.
        const restarted = Date.now() / 1000;
        startPostHog();
        const from = bodies.length;
        count("sample_loaded", { sample: "karate" });
        await vi.waitFor(() => {
            assert.include(bodies.slice(from).join("\n"), "sample_loaded");
        });

        const after = sentEvents(bodies.slice(from)).filter((event) => (event.properties.$time ?? 0) >= restarted);
        assert.include(
            after.map((event) => event.event),
            "sample_loaded",
        );
        const sent = JSON.stringify(after);
        const stored = localStorage.getItem(`ph_${KEY}_posthog`) ?? "";
        assert.include(stored, String(client.get_property("$device_id")), "the new id is the one kept");
        for (const old of [oldDevice, oldDistinct]) {
            assert.notInclude(sent, old);
            assert.notInclude(stored, old);
        }
        assert.notInclude(urls.join("\n"), "/i/v1/logs");
        stopPostHog();
    });

    it("counts one reader as one person across tabs: another tab's Share hands this tab its new id", async () => {
        startPostHog();
        await vi.waitFor(() => {
            assert.isDefined(postHog());
        });
        const client = postHog() as unknown as PostHog;
        const storeKey = `ph_${KEY}_posthog`;

        // The tab where the reader says Share makes the new id and saves it at once, before
        // usageData.ts stores the answer that starts the other tabs.
        stopPostHog();
        startPostHog();
        const made = client.get_distinct_id();
        const saved = localStorage.getItem(storeKey) ?? "";
        assert.include(saved, made, "saved before the answer is stored");

        // A tab started by that answer takes the saved id, not one of its own.
        stopPostHog();
        localStorage.setItem(storeKey, saved.replaceAll(made, "OTHER_TAB_ID"));
        startPostHog(false);
        assert.strictEqual(client.get_distinct_id(), "OTHER_TAB_ID");
        assert.strictEqual(client.get_property("$device_id"), "OTHER_TAB_ID");
        const from = bodies.length;
        count("sample_loaded", { sample: "karate" });
        await vi.waitFor(() => {
            assert.include(bodies.slice(from).join("\n"), "sample_loaded");
        });
        assert.include(bodies.slice(from).join("\n"), "OTHER_TAB_ID");
        stopPostHog();
    });

    it("keeps one id across tabs when another tab's first Share starts this one before that tab saved its id", async () => {
        const storeKey = `ph_${KEY}_posthog`;
        // The Share tab, on its first Share: its id is saved as soon as posthog-js has loaded.
        startPostHog();
        await vi.waitFor(() => {
            assert.isDefined(postHog());
        });
        const made = (postHog() as unknown as PostHog).get_distinct_id();
        const saved = localStorage.getItem(storeKey) ?? "";
        assert.include(saved, made, "saved at load, not after posthog-js's debounce");

        // Another tab, a fresh page, started by the stored answer while the Share tab's posthog-js
        // is still loading: no id is stored yet, so it loads nothing and makes no id of its own.
        stopPostHog();
        resetAnalyticsForTests();
        const imports = vi.fn(importPostHogModule);
        setAnalyticsCallsForTests({
            hostname: () => "graphty.app",
            posthogHost: PREFIX,
            importPostHog: imports,
        });
        assert.isNull(localStorage.getItem(storeKey));
        startPostHog(false);
        assert.strictEqual(imports.mock.calls.length, 0, "no posthog-js, so no id, until the Share tab saves one");
        assert.isNull(localStorage.getItem(storeKey));

        // The Share tab saves its id: this tab takes it.
        const theirs = saved.replaceAll(made, "OTHER_TAB_ID");
        localStorage.setItem(storeKey, theirs);
        globalThis.dispatchEvent(new StorageEvent("storage", { key: storeKey, newValue: theirs }));
        await vi.waitFor(() => {
            assert.isDefined(postHog());
        });
        assert.strictEqual((postHog() as unknown as PostHog).get_distinct_id(), "OTHER_TAB_ID");
        stopPostHog();
    });

    it("never draws a survey of its own: only the app's survey card asks", async () => {
        startPostHog();
        await vi.waitFor(() => {
            assert.isDefined(postHog());
        });
        const client = postHog() as unknown as PostHog;
        assert.isTrue(client.config.disable_surveys_automatic_display);
        assert.isFalse(client.config.disable_surveys);
        stopPostHog();
    });

    it("leaves none of PostHog's survey records behind when sharing stops", async () => {
        const client = await started();
        // As the survey card sends an answer and a dismissal.
        client.capture("survey sent", { $survey_id: "SURVEY_A", $survey_response: "teach" });
        client.capture("survey dismissed", { $survey_id: "SURVEY_B" });
        const surveyKeys = (): string[] => Object.keys(localStorage).filter((key) => key.startsWith("seenSurvey_"));
        // Not vacuous: posthog-js wrote them itself, past before_send.
        assert.sameMembers(surveyKeys(), ["seenSurvey_SURVEY_A", "seenSurvey_SURVEY_B"]);
        stopPostHog();
        assert.deepEqual(surveyKeys(), []);
        assert.deepEqual(
            Object.keys(localStorage).filter((key) => key.includes("ph_") && !key.startsWith("__ph_opt_in_out_")),
            [],
            "only the opt-out marker is kept",
        );
    });

    // Last, on an instance of its own: posthog-js reads its remote config once, at init, and the
    // other cases share the default instance, which has recording off.
    it("records a masked replay: the kept class shows, no reader text, query, picked file or JSON-LD does", async () => {
        network.setRemoteConfig(RECORDING_CONFIG);
        setAnalyticsCallsForTests({
            hostname: () => "graphty.app",
            posthogHost: PREFIX,
            importPostHog: async () => {
                const { PostHog: Fresh } = await import("posthog-js/full/no-external");
                return { default: new Fresh() };
            },
        });
        globalThis.history.replaceState(null, "", "?url=SECRET_URL&graphty-element-logging=SECRET_LOG");
        setCommandAllowlist(["history.undo"]);
        const jsonLd = document.createElement("script");
        jsonLd.type = "application/ld+json";
        jsonLd.textContent = JSON.stringify({ "@type": "Dataset", name: "SECRET_LD" });
        document.head.append(jsonLd);
        try {
            stripQueryForRecorders();
            const client = await started();
            await vi.waitFor(() => {
                assert.isTrue(client.sessionRecordingStarted(), "the remote config turned recording on");
            });
            await userEvent.click(markedButton("POSITIVE_MARKER"));
            await vi.waitFor(() => {
                assert.include(snapshots(), "POSITIVE_MARKER", "the search finds what replay keeps");
                assert.include(bodies.join("\n"), "$autocapture");
            });

            // A file picked through the browser's chooser, then a change the next snapshot carries.
            // Opened by a click, as the app's Open does: a browser shows its chooser only on a user gesture.
            await commands.chooseNextFile("SECRET_FILE.csv", "text/csv", "a,b\n");
            const open = document.createElement("button");
            open.textContent = "Open";
            let picking: Promise<File[]> | undefined;
            open.addEventListener("click", () => {
                picking = pickFiles();
            });
            document.body.append(open);
            await userEvent.click(open);
            assert.isDefined(picking, "the click opened the picker");
            assert.deepEqual(
                (await picking).map((file) => file.name),
                ["SECRET_FILE.csv"],
            );
            await userEvent.click(markedButton("POSITIVE_AFTER_PICK"));
            await vi.waitFor(() => {
                assert.include(snapshots(), "POSITIVE_AFTER_PICK");
            });

            const sent = bodies.join("\n");
            for (const secret of [...SECRETS, "SECRET_FILE", "SECRET_LD"]) {
                assert.notInclude(sent, secret);
                assert.notInclude(urls.join("\n"), secret);
            }
            assert.notInclude(snapshots(), "$json_ld");
            stopPostHog();
        } finally {
            jsonLd.remove();
        }
    });
});
