/**
 * The site's own configuration: one build of the app serves canary, nightly and production, and
 * each site serves a `site.json` at its root saying which it is, which experiments its readers get,
 * where its datasets live and how Sentry labels its errors (design/ci/channels-pipeline/features.md,
 * section 5). A missing, unreadable or invalid file switches every experiment off, so a broken
 * configuration can only make a site look more like production.
 */

import { featuresFromUrl } from "@graphty/graphty-element/catalog";

/** The sites one build serves; `unknown` when the site said nothing usable. */
export type SiteName = "canary" | "nightly" | "production" | "unknown";

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
}

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
    return {
        site: site === undefined ? "unknown" : (site as SiteName),
        features,
        ...(datasets === undefined ? {} : { datasets: datasets as string }),
        ...(sentryEnvironment === undefined ? {} : { sentryEnvironment: sentryEnvironment as string }),
    };
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
        const parsed = response.ok ? parse(await response.json()) : null;
        if (parsed === null) {
            const why = response.ok ? "not a site configuration" : `HTTP ${String(response.status)}`;
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
