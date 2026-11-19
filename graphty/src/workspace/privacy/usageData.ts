/**
 * The usage data gate (design/graphty/usage-analytics.md, section 3): Share starts PostHog and
 * error reporting, No stops both, here and in every other open tab. Anonymous counts (PostHog's
 * cookieless mode, lib/analytics.ts) are sent whatever the answer, and Share switches the counts to
 * PostHog's shared mode; Share itself is one anonymous count, `usage_data_shared`. The answer is
 * the reader's own preference, kept in this browser. With the usage-analytics experiment off
 * (src/features.ts), Share and No start and stop error reporting alone, in this tab alone, and No
 * still deletes what an earlier visit with it on stored for analytics. A Share given with it off
 * never starts PostHog once it is on: the card asks again (SHARE_WITH_ANALYTICS).
 */

import { useSyncExternalStore } from "react";

import { appFeatureOn } from "../../features";
import {
    analyticsSends,
    count,
    forgetAnalyticsRecords,
    onOwnHost,
    startPostHog,
    stopPostHog,
    stripQueryForRecorders,
} from "../../lib/analytics";
import { initSentry, stopSentry } from "../../lib/sentry";
import { onSiteConfig } from "../../siteConfig";

/** The reader's answer to the usage data card. */
export type UsageAnswer = "share" | "declined";

const KEY = "graphty.usageData.v1";
/**
 * The stored Share given under the words that list PostHog (the page sends PostHog: analyticsSends).
 * A plain "share" was given under the words that never name it (error reports and replay only), so
 * where PostHog would run it reads as unanswered and the card asks again: it never starts PostHog.
 */
const SHARE_WITH_ANALYTICS = "share-analytics";

/**
 * The answer a stored value holds, for the words this page shows.
 * @param stored - the stored value.
 * @returns the answer, or null when there is none for this page's words.
 */
function parse(stored: string | null): UsageAnswer | null {
    if (stored === SHARE_WITH_ANALYTICS || stored === "declined") {
        return stored === "declined" ? "declined" : "share";
    }
    return stored === "share" && !analyticsSends() ? "share" : null;
}

/**
 * The value an answer is stored as, for the words this page shows now.
 * @param answer - the reader's answer.
 * @returns the stored value.
 */
function encode(answer: UsageAnswer): string {
    return answer === "share" && analyticsSends() ? SHARE_WITH_ANALYTICS : answer;
}
const listeners = new Set<() => void>();
/** What Share and No switch on and off: the address bar's query is removed before either recorder starts. */
const live = {
    /**
     * Starts PostHog and error reporting.
     * @param fresh - false when another tab's Share started this one (see startPostHog).
     */
    start: (fresh = true): void => {
        // The usage-analytics experiment off: Share starts error reporting alone, as it did before.
        if (!appFeatureOn("usage-analytics")) {
            initSentry();
            return;
        }
        // Off the site's own host (a local build serving a real site's site.json) nothing starts.
        if (!onOwnHost()) {
            return;
        }
        stripQueryForRecorders();
        initSentry();
        startPostHog(fresh);
    },
    stop: (): void => {
        stopSentry();
        // Whatever the experiment says: a reader who shared on a visit with it on (canary,
        // ?features=usage-analytics, or production before a rollback) has PostHog's id, survey keys
        // and a visit record stored, and No deletes them. stopPostHog loads and sends nothing.
        stopPostHog();
        if (!appFeatureOn("usage-analytics")) {
            // With it on these stay: anonymous counts and their survey record go on after No.
            forgetAnalyticsRecords();
        }
    },
};
/** The live sender, or the stand-in a test passed in. */
let sending = live;

/**
 * Makes Share and No call a stand-in rather than start and stop PostHog and Sentry. A test passes one
 * in here instead of mocking those modules: in a browser test, a module mock switches the page's HTTP
 * cache off (issue #3416).
 * @param sender - the stand-in, or nothing for the live sender again.
 * @param sender.start - called where sending would start.
 * @param sender.stop - called where sending would stop.
 */
export function setUsageSenderForTests(sender?: { start: (fresh?: boolean) => void; stop: () => void }): void {
    sending = sender ?? live;
}

/**
 * This page view's answer, as stored (encode), for when browser storage is unavailable (a private
 * window). Kept in its stored form so a Share given under the words that never name PostHog reads as
 * unanswered once site.json switches PostHog on, here as in storage.
 */
let remembered: string | null = null;
/** True when this page's answer could not be stored: it wins over what storage still holds. */
let unsaved = false;

/**
 * The reader's answer.
 * @returns the answer, or null while it is unanswered.
 */
export function readUsageAnswer(): UsageAnswer | null {
    if (unsaved) {
        return parse(remembered);
    }
    try {
        const stored = parse(localStorage.getItem(KEY));
        if (stored !== null) {
            return stored;
        }
    } catch {
        // Storage blocked: fall through to this page view's answer.
    }
    return parse(remembered);
}

/**
 * Stores an answer. When it cannot be written (storage blocked, or full while still readable), the
 * stored one is removed, which needs no room, so an older Share never outlives a No, and this page's
 * answer is the one read.
 * @param answer - the reader's answer.
 */
function store(answer: UsageAnswer): void {
    try {
        localStorage.setItem(KEY, encode(answer));
        unsaved = false;
    } catch {
        unsaved = true;
        try {
            localStorage.removeItem(KEY);
        } catch {
            // Storage blocked: nothing is stored to outlive the answer.
        }
    }
}

/**
 * Records an answer and acts on it: Share starts sending, No stops it.
 * @param answer - the reader's answer.
 */
export function answerUsageData(answer: UsageAnswer): void {
    remembered = encode(answer);
    if (answer === "share") {
        // Counted before PostHog's shared mode starts, so it is always an anonymous-mode event: its count over first_visit is the opt-in rate.
        count("usage_data_shared");
        // Started before the answer is stored: the other tabs start when they see it, and take the
        // PostHog id this start saved (startPostHog).
        sending.start();
        store(answer);
    } else {
        store(answer);
        sending.stop();
    }
    listeners.forEach((listener) => {
        listener();
    });
}

// Every tab follows the latest answer. Another tab's No (or a cleared answer) stops sending here
// too, or this tab would keep recording and PostHog would write its id back after the other tab
// deleted it. Another tab's Share starts it here, so this tab's chip and Settings switch, which read
// the stored answer, never say it sends while it does not.
globalThis.addEventListener("storage", (event) => {
    // The usage-analytics experiment off: each tab acts on its own answer only, as before.
    if ((event.key !== KEY && event.key !== null) || !appFeatureOn("usage-analytics")) {
        return;
    }
    unsaved = false;
    remembered = event.newValue;
    if (parse(remembered) === "share") {
        sending.start(false);
    } else {
        sending.stop();
    }
    listeners.forEach((listener) => {
        listener();
    });
});

/**
 * At startup: starts sending only when the reader said Share on an earlier visit.
 */
export function startUsageDataIfShared(): void {
    if (readUsageAnswer() === "share") {
        sending.start();
    }
}

/**
 * Answers No for this page view only, storing nothing and calling nothing: the question pinned to
 * every page stays out of the way of tests and stories that are not about it. One that is calls
 * `forgetUsageAnswer` after this.
 */
export function assumeUsageDeclinedForTests(): void {
    remembered = "declined";
    listeners.forEach((listener) => {
        listener();
    });
}

/**
 * Forgets the answer, as on a first launch. For tests and stories.
 */
export function forgetUsageAnswer(): void {
    remembered = null;
    unsaved = false;
    try {
        localStorage.removeItem(KEY);
    } catch {
        // Nothing stored.
    }
    listeners.forEach((listener) => {
        listener();
    });
}

/**
 * Listens for a new answer.
 * @param listener - called after each answer.
 * @returns a function that stops listening.
 */
function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    // The experiment decides what a stored Share means (parse), and is known once site.json loads.
    const stopSite = onSiteConfig(listener);
    return () => {
        listeners.delete(listener);
        stopSite();
    };
}

/**
 * The reader's answer, re-read when it changes.
 * @returns the answer, or null while it is unanswered.
 */
export function useUsageAnswer(): UsageAnswer | null {
    return useSyncExternalStore(subscribe, readUsageAnswer);
}

/**
 * Whether this page sends PostHog anything (lib/analytics.ts, analyticsSends), re-read once the
 * site configuration loads. The words that say what is sent, and the privacy page's links, follow it.
 * @returns true when PostHog may run on this page.
 */
export function useAnalyticsSends(): boolean {
    return useSyncExternalStore(onSiteConfig, () => analyticsSends());
}
