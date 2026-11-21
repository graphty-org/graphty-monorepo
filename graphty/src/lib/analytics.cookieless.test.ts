/**
 * The anonymous mode on the real posthog-js chunk (design/graphty/usage-analytics.md, section 11):
 * it stores nothing, sends only the allowlisted counts, and a switch to the shared mode and back
 * never counts a page view twice. Its own file, so posthog-js is a fresh module: in a file where
 * earlier cases already ran `init`, a second init on the loaded instance does nothing and a second
 * named init reuses the instance, so these cases would depend on test order.
 */
import type { CaptureResult, PostHog } from "posthog-js";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { loadSiteConfig, resetSiteConfig, type SiteConfig } from "../siteConfig";
import { interceptPostHog, POSTHOG_TEST_HOST, type PostHogTestNetwork, sentEvents } from "../test/posthog-network";
import { answerUsageData, forgetUsageAnswer } from "../workspace/privacy/usageData";
import {
    count,
    importPostHogModule,
    postHog,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    startAnalyticsAtBoot,
    stopPostHog,
} from "./analytics";

const KEY = "phc_cookielesstest";
/** The names the anonymous mode may send (section 4.1). */
const COUNTED = new Set([
    "$pageview",
    "first_visit",
    "return_visit",
    "usage_data_shared",
    "sample_loaded",
    "own_file_opened",
    "layout_changed",
    "algorithm_run",
    "export_done",
    "style_changed",
    "assistant_used",
    "view_mode",
    "xr_entered",
    "camera_used",
    "camera_saved",
    "project_saved",
    "project_reopened",
    "load_failed",
    "timeline_played",
]);

let network: PostHogTestNetwork;
let config: SiteConfig;
const address = globalThis.location.href;

/**
 * Everything the browser stores for this origin, but the app's own visit record.
 * @returns the storage entries and the cookie string.
 */
function stored(): string {
    const entries = (storage: Storage): string[][] =>
        Object.keys(storage)
            .filter((key) => key !== "graphty.visits.v1")
            .sort()
            .map((key) => [key, storage.getItem(key) ?? ""]);
    return JSON.stringify({ local: entries(localStorage), session: entries(sessionStorage), cookie: document.cookie });
}

/**
 * Every event sent so far.
 * @returns them.
 */
function events(): ReturnType<typeof sentEvents> {
    return sentEvents(network.bodies);
}

beforeEach(async () => {
    resetAnalyticsForTests();
    resetSiteConfig();
    forgetUsageAnswer();
    localStorage.clear();
    sessionStorage.clear();
    const site = {
        site: "production",
        features: ["usage-analytics"],
        analytics: { posthogKey: KEY, posthogHost: "https://us.i.posthog.com" },
    };
    config = await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(site))}`);
    setAnalyticsCallsForTests({
        hostname: () => "graphty.app",
        posthogHost: POSTHOG_TEST_HOST,
        afterFirstPaint: (run) => {
            run();
        },
    });
    network = interceptPostHog();
});

afterEach(() => {
    network.restore();
    globalThis.history.replaceState(null, "", address);
    document.body.replaceChildren();
    resetAnalyticsForTests();
    resetSiteConfig();
    forgetUsageAnswer();
    setAnalyticsCallsForTests();
});

describe("the anonymous mode on the real posthog-js chunk", () => {
    it("stores nothing, sends only the counts, and switching modes never counts twice", async () => {
        const before = stored();
        // Every write, even one removed again at once (a before-and-after compare cannot see that).
        const setItem = vi.spyOn(Storage.prototype, "setItem");
        const removeItem = vi.spyOn(Storage.prototype, "removeItem");
        startAnalyticsAtBoot(config);

        // The named instance, as posthog-js keeps it on its default instance.
        const { default: posthog } = await importPostHogModule();
        const anonymous = await vi.waitFor(() => {
            const instance = (posthog as unknown as { anonymous?: PostHog }).anonymous;
            assert.isDefined(instance, "the anonymous instance was created");
            return instance;
        });
        // Records every event that reaches its before_send, before the app's cleaning runs.
        const seen: string[] = [];
        const own = anonymous.config.before_send;
        anonymous.config.before_send = [
            (event: CaptureResult | null) => {
                seen.push(event?.event ?? "");
                return event;
            },
            ...[own ?? []].flat(),
        ];

        const button = document.createElement("button");
        button.textContent = "click me";
        document.body.append(button);
        await userEvent.click(button);
        globalThis.scrollBy(0, 10);
        console.log("SECRET_LOG");
        count("sample_loaded", { sample: "karate" });
        count("sample_loaded", { sample: "les-miserables" });
        count("algorithm_run", { algorithm: "degree", outcome: "succeeded" });
        count("style_changed", { op: "style.patch", action: "add", SECRET_KEY: "SECRET_VALUE" });

        await vi.waitFor(() => {
            const names = events().map((event) => event.event);
            for (const name of ["$pageview", "sample_loaded", "algorithm_run", "style_changed"]) {
                assert.include(names, name);
            }
        });
        for (const url of network.urls) {
            assert.match(url, /\/e\/(\?|$)/, "every request is an event post");
        }
        for (const event of events()) {
            assert.isTrue(COUNTED.has(event.event), event.event);
            assert.include(event.properties, {
                $cookieless_mode: true,
                tracking: "anonymous",
                distinct_id: "$posthog_cookieless",
                // Without it PostHog's ingestion makes a person profile for each hashed id.
                $process_person_profile: false,
            });
            for (const key of ["$device_id", "$session_id", "$window_id", "$browser_version", "$os_version"]) {
                assert.notProperty(event.properties, key);
            }
        }
        assert.lengthOf(
            events().filter((event) => event.event === "sample_loaded"),
            1,
        );
        // A style edit, with its own allowlisted keys and nothing else of its own.
        const style = events().find((event) => event.event === "style_changed");
        assert.include(style?.properties, { op: "style.patch", action: "add", first_on_page: true });
        assert.notInclude(network.bodies.join("\n"), "SECRET_VALUE");
        for (const name of ["$autocapture", "$$heatmap", "$dead_click", "$rageclick", "$web_vitals", "$pageleave"]) {
            assert.notInclude(seen, name, "the extensions did not run");
        }
        assert.notInclude(network.bodies.join("\n"), "SECRET_LOG");
        assert.strictEqual(stored(), before, "PostHog stored nothing");
        const others = (spy: typeof setItem | typeof removeItem): string[] =>
            spy.mock.calls.map((call) => call[0]).filter((key) => key !== "graphty.visits.v1");
        // posthog-js's own localStorage support check, which no option turns off (section 5); no
        // toolbar probe ("test").
        assert.deepEqual(others(setItem), ["__mplssupport__"], "PostHog wrote only its support check");
        for (const key of others(removeItem)) {
            assert.isTrue(
                key === "__mplssupport__" || key === "ph_debug" || key.startsWith("ph_graphty_anonymous"),
                `removed only its own or absent keys: ${key}`,
            );
        }
        setItem.mockRestore();
        removeItem.mockRestore();

        // Share: from here the shared mode counts.
        answerUsageData("share");
        const client = await vi.waitFor(() => {
            const found = postHog();
            assert.isDefined(found, "the shared instance started");
            return found as unknown as PostHog;
        });
        const seenAtSwitch = seen.length;
        count("export_done", { kind: "graph", format: "json", destination: "download" });
        const shared = await vi.waitFor(() => {
            const found = events().find((event) => event.event === "export_done");
            assert.isDefined(found);
            return found;
        });
        assert.notProperty(shared.properties, "$cookieless_mode");
        assert.equal(shared.properties.tracking, "shared");
        assert.include(localStorage.getItem(`ph_${KEY}_posthog`) ?? "", String(shared.properties.distinct_id));
        assert.lengthOf(
            events().filter((event) => event.event === "$pageview"),
            1,
        );
        assert.strictEqual(seen.length, seenAtSwitch, "the anonymous instance was handed nothing after the switch");

        // No: back to the anonymous mode, the shared id deleted, nothing asked of PostHog.
        const reset = vi.spyOn(client, "reset");
        const reload = vi.spyOn(client, "reloadFeatureFlags");
        stopPostHog();
        count("layout_changed", { layout: "ngraph", outcome: "applied" });
        const after = await vi.waitFor(() => {
            const found = events().find((event) => event.event === "layout_changed");
            assert.isDefined(found);
            return found;
        });
        assert.isTrue(after.properties.$cookieless_mode);
        assert.isNull(localStorage.getItem(`ph_${KEY}_posthog`));
        assert.strictEqual(reset.mock.calls.length, 0);
        assert.strictEqual(reload.mock.calls.length, 0);
    });
});
