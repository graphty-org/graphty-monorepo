/**
 * Recording stand-ins for the two PostHog modes (design/graphty/usage-analytics.md, section 11), for
 * the tests that drive the app with the real graphty-element. Each stand-in's captures pass through
 * `cleanPostHogEvent` for its mode, so what is recorded is what PostHog would be sent.
 */
import { setPostHogClientForTests, type TrackingMode } from "../lib/analytics";

/** A site's analytics block that turns PostHog on (a fake key and the EU host). */
export const TEST_ANALYTICS = { posthogKey: "phc_testkey123", posthogHost: "https://eu.i.posthog.com" } as const;

/** One recorded event, after cleaning. */
export interface Recorded {
    readonly event: string;
    readonly properties: Record<string, unknown>;
}

/** Keys every event carries besides its own: the mode, the page and the visit. */
const CONTEXT_KEYS: ReadonlySet<string> = new Set([
    "token",
    "distinct_id",
    "tracking",
    "first_on_page",
    "site",
    "channel_ref",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "visit",
    "use_case",
]);

/**
 * Installs a stand-in for one mode's instance that records what it is handed.
 * @param records - where each recorded event goes.
 * @param mode - the mode; "shared" also marks sharing on.
 * @returns a function that removes the stand-in.
 */
export function recordInto(records: Recorded[], mode: TrackingMode = "shared"): () => void {
    return setPostHogClientForTests(
        {
            capture: (event, properties) => {
                records.push({ event, properties: { ...properties } });
                return undefined;
            },
        },
        mode,
    );
}

/**
 * An event's own properties: without PostHog's `$` keys and the keys every event carries.
 * @param properties - the recorded properties.
 * @returns the event's own.
 */
function eventData(properties: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(properties).filter(([key]) => !key.startsWith("$") && !CONTEXT_KEYS.has(key)),
    );
}

/**
 * The page's first occurrence of a name, in whichever mode sent it: what the whole-audience counts
 * see (`first_on_page`), at most one per name per page view.
 * @param records - every recorded event, of both modes.
 * @param name - the event name.
 * @returns the own properties of each first occurrence.
 */
export function firstOnPage(records: readonly Recorded[], name: string): Record<string, unknown>[] {
    return records
        .filter((each) => each.event === name && each.properties.first_on_page === true)
        .map((each) => eventData(each.properties));
}
