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
        initSentry();
    } else {
        stopSentry();
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
        initSentry();
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
