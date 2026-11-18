/**
 * The site's own configuration: one build of the app serves canary, nightly and production, and
 * each site serves a `site.json` at its root saying which it is, which experiments its readers get,
 * where its datasets live, how Sentry labels its errors (design/ci/channels-pipeline/features.md,
 * section 5) and which analytics ids it sends with (design/graphty/usage-analytics.md, section 9).
 * A missing, unreadable or invalid file switches every experiment off, so a broken configuration
 * can only make a site look more like production; an invalid analytics block switches only
 * analytics off.
 */

import { featuresFromUrl, resolveFeatures } from "@graphty/graphty-element/catalog";

/** The sites one build serves; `unknown` when the site said nothing usable. */
type SiteName = "canary" | "nightly" | "production" | "unknown";

/** What the app runs with on this site. */
export interface SiteConfig {
    /** Which site this is. */
    readonly site: SiteName;
    /** Experiment ids switched on: the site's own, then the page address's `?features=`. */
    readonly features: readonly string[];
    /** Where this site's datasets are read from; absent means graphty-element's default. */
    readonly datasets?: string;
    /** Sentry's environment label; absent means the site's name. */
    readonly sentryEnvironment?: string;
    /** Analytics ids for this site; absent means nothing is sent. All are public client ids. */
    readonly analytics?: SiteAnalytics;
}

/** The analytics block of a `site.json` (design/graphty/usage-analytics.md, section 9). */
export interface SiteAnalytics {
    /** Umami website id (a UUID). */
    readonly umamiWebsiteId?: string;
    /** PostHog project key ("phc_..."); it takes effect only with `posthogHost`. */
    readonly posthogKey?: string;
    /**
     * PostHog ingest host: PostHog Cloud's EU ingest host, written out in full. Only the EU host is
     * accepted, because the privacy page and the README name the EU region as where the data goes.
     */
    readonly posthogHost?: string;
}

const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const POSTHOG_KEY = /^phc_[A-Za-z0-9]+$/;
/**
 * PostHog Cloud's EU ingest host, the one region public/privacy.html names. A pattern, not the
 * string: the landing page must hold no PostHog host (scripts/check-posthog-chunks.mjs).
 */
const POSTHOG_HOST = /^https:\/\/eu\.i\.posthog\.com$/;

const SITES: ReadonlySet<unknown> = new Set<SiteName>(["canary", "nightly", "production"]);

/** Every experiment off: no file, an unreadable one or an invalid one. */
const OFF: SiteConfig = Object.freeze({ site: "unknown", features: Object.freeze([]) });

let current: SiteConfig = OFF;
let loading: Promise<SiteConfig> | null = null;
const listeners = new Set<() => void>();

/**
 * Reads a parsed `site.json`.
 * @param value - the parsed file.
 * @returns the configuration, or null when the file is not one.
 */
function parse(value: unknown): (Omit<SiteConfig, "features"> & { features: string[] }) | null {
    if (typeof value !== "object" || value === null) {
        return null;
    }
    const { site, features = [], datasets, sentryEnvironment } = value as Record<string, unknown>;
    const isList = Array.isArray(features) && features.every((id) => typeof id === "string");
    const optionalText = (text: unknown): boolean => text === undefined || typeof text === "string";
    // A file may leave out `site` (the tests' `{ "features": ["all"] }`), but may not name another.
    const isSite = site === undefined || SITES.has(site);
    if (!isSite || !isList || !optionalText(datasets) || !optionalText(sentryEnvironment)) {
        return null;
    }
    const analytics = parseAnalytics((value as Record<string, unknown>).analytics);
    return {
        site: site === undefined ? "unknown" : (site as SiteName),
        features,
        ...(datasets === undefined ? {} : { datasets: datasets as string }),
        ...(sentryEnvironment === undefined ? {} : { sentryEnvironment: sentryEnvironment as string }),
        ...(analytics === undefined ? {} : { analytics }),
    };
}

/**
 * Reads the analytics block on its own, so a typo in it switches analytics off and nothing else.
 * @param value - the block as parsed.
 * @returns the block, or undefined (with one console line when one was there but is invalid).
 */
function parseAnalytics(value: unknown): SiteAnalytics | undefined {
    if (value === undefined) {
        return undefined;
    }
    const block = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
    const { umamiWebsiteId, posthogKey, posthogHost } = block;
    const fits = (field: unknown, pattern: RegExp): boolean =>
        field === undefined || (typeof field === "string" && pattern.test(field));
    const valid =
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        fits(umamiWebsiteId, UUID) &&
        fits(posthogKey, POSTHOG_KEY) &&
        fits(posthogHost, POSTHOG_HOST) &&
        // A key with no host would send nowhere the reader was told about.
        (posthogKey === undefined || posthogHost !== undefined);
    if (!valid) {
        console.warn("[graphty] site.json: the analytics block is invalid; analytics is off");
        return undefined;
    }
    return Object.fromEntries(
        Object.entries({ umamiWebsiteId, posthogKey, posthogHost }).filter(([, field]) => field !== undefined),
    );
}

/**
 * Fetches the file and validates it.
 * @param url - where the file is.
 * @returns the configuration, or null with one console line when there is none.
 */
async function read(url: string): Promise<ReturnType<typeof parse>> {
    try {
        // GitHub Pages serves max-age=600; no-cache revalidates, so a flipped flag reaches readers
        // on their next load.
        const response = await fetch(url, { cache: "no-cache" });
        // With no file, a single-page fallback (vite preview, the dev server) answers with
        // index.html and a 200: parsing that as JSON fails with a message naming no cause.
        const isPage = response.headers.get("content-type")?.includes("text/html") ?? false;
        const parsed = response.ok && !isPage ? parse(await response.json()) : null;
        if (parsed === null) {
            let why = `HTTP ${String(response.status)}`;
            if (response.ok) {
                why = isPage ? "served an HTML page, not a site configuration" : "not a site configuration";
            }
            console.warn(`[graphty] ${url}: ${why}; every experiment is off`);
        }
        return parsed;
    } catch (error: unknown) {
        console.warn(`[graphty] ${url} could not be read; every experiment is off:`, error);
        return null;
    }
}

/**
 * Loads the site's configuration, once. Called before graphty-element loads, so the element's
 * first session already has the site's experiments.
 * @param url - where the file is; the site's root by default.
 * @returns the configuration the app now runs with.
 */
export function loadSiteConfig(url = `${import.meta.env.BASE_URL}site.json`): Promise<SiteConfig> {
    loading ??= read(url).then((file) => {
        const base = file ?? OFF;
        // The address's ?features= works on every site, production included: an experiment only
        // adds, and it lets a tester try one on graphty.app without a new build.
        const features = [...new Set([...base.features, ...featuresFromUrl(globalThis.location.href)])];
        current = Object.freeze({ ...base, features: Object.freeze(features) });
        listeners.forEach((listener) => {
            listener();
        });
        return current;
    });
    return loading;
}

/**
 * The configuration as loaded so far: every experiment off until `loadSiteConfig` settles.
 * @returns the configuration.
 */
export function siteConfig(): SiteConfig {
    return current;
}

/**
 * Whether this site switches styles from files on, for the Settings switch the start page offers
 * before any session exists; `fileStylesOn(session)` answers everywhere else.
 * @returns true when it is on.
 */
export function siteFileStyles(): boolean {
    return resolveFeatures(current.features).enabled.includes("file-styles");
}

/**
 * Calls back once the configuration has loaded.
 * @param listener - called with nothing.
 * @returns a function that stops the calls.
 */
export function onSiteConfig(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** Forgets the loaded configuration, as on a fresh page. For tests. */
export function resetSiteConfig(): void {
    current = OFF;
    loading = null;
}
