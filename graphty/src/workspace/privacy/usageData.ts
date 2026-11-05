/**
 * The usage data gate (tier1-design.md section 2.11): nothing is sent until the reader answers
 * Share usage data, and sending stops after a later No. The answer is the reader's own
 * preference, kept in this browser.
 */

import { useSyncExternalStore } from "react";

import { initSentry, stopSentry } from "../../lib/sentry";

/** The reader's answer to the usage data card. */
export type UsageAnswer = "share" | "declined";

const KEY = "graphty.usageData.v1";
const listeners = new Set<() => void>();
/** What Share and No switch on and off: Sentry, or the stand-in a test passed in. */
let sending = { start: initSentry, stop: stopSentry };

/**
 * Makes Share and No call a stand-in rather than start and stop Sentry. A test passes one in here
 * instead of mocking the Sentry module: in a browser test, a module mock switches the page's HTTP
 * cache off (issue #3416).
 * @param sender - the stand-in, or nothing for Sentry again.
 * @param sender.start - called where Sentry would start.
 * @param sender.stop - called where Sentry would stop.
 */
export function setUsageSenderForTests(sender?: { start: () => void; stop: () => void }): void {
    sending = sender ?? { start: initSentry, stop: stopSentry };
}

/** The answer when browser storage is unavailable (a private window): kept for this page view. */
let remembered: UsageAnswer | null = null;

/**
 * The reader's answer.
 * @returns the answer, or null while it is unanswered.
 */
export function readUsageAnswer(): UsageAnswer | null {
    try {
        const stored = localStorage.getItem(KEY);
        if (stored === "share" || stored === "declined") {
            return stored;
        }
    } catch {
        // Storage blocked: fall through to this page view's answer.
    }
    return remembered;
}

/**
 * Records an answer and acts on it: Share starts sending, No stops it.
 * @param answer - the reader's answer.
 */
export function answerUsageData(answer: UsageAnswer): void {
    remembered = answer;
    try {
        localStorage.setItem(KEY, answer);
    } catch {
        // Storage blocked: the answer holds for this page view only.
    }
    if (answer === "share") {
        sending.start();
    } else {
        sending.stop();
    }
    listeners.forEach((listener) => {
        listener();
    });
}

/**
 * At startup: starts sending only when the reader said Share on an earlier visit.
 */
export function startUsageDataIfShared(): void {
    if (readUsageAnswer() === "share") {
        sending.start();
    }
}

/**
 * Forgets the answer, as on a first launch. For tests and stories.
 */
export function forgetUsageAnswer(): void {
    remembered = null;
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
    return () => {
        listeners.delete(listener);
    };
}

/**
 * The reader's answer, re-read when it changes.
 * @returns the answer, or null while it is unanswered.
 */
export function useUsageAnswer(): UsageAnswer | null {
    return useSyncExternalStore(subscribe, readUsageAnswer);
}
