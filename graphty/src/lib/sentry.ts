import * as SentrySdk from "@sentry/react";

import { siteConfig } from "../siteConfig";
import { privacyFilters } from "./sentryPrivacy";

/** The parts of Sentry's SDK this module calls. */
export type SentryCalls = Pick<
    typeof SentrySdk,
    "init" | "close" | "replayIntegration" | "captureException" | "captureFeedback" | "getCurrentScope"
>;

/** Sentry's SDK, or the stand-in a test passed to {@link setSentryCallsForTests}. */
let Sentry: SentryCalls = SentrySdk;

/**
 * Sends this module's calls to a stand-in rather than Sentry's SDK. A test passes one in here instead
 * of mocking the module: in a browser test, a module mock switches the page's HTTP cache off
 * (issue #3416).
 * @param calls - the stand-in, or nothing for Sentry's SDK again.
 */
export function setSentryCallsForTests(calls?: SentryCalls): void {
    Sentry = calls ?? SentrySdk;
}

let initialized = false;
/**
 * The one replay integration of this page. Sentry throws "Multiple Sentry Session Replay
 * instances are not supported" on a second replayIntegration(), and a reader can turn usage data
 * off and on again in one visit, so it is made once and restarted.
 */
let replay: ReturnType<typeof SentrySdk.replayIntegration> | undefined;

interface SentryConfig {
    dsn?: string;
    environment?: string;
    isProd?: boolean;
    /** Where events go; Sentry's own by default. Tests pass one that records them. */
    transport?: SentrySdk.BrowserOptions["transport"];
}

/**
 * Get the default configuration from environment variables.
 * This function is separated to allow for testing.
 * @returns The default Sentry configuration
 */
function getDefaultConfig(): SentryConfig {
    const { site, sentryEnvironment } = siteConfig();
    return {
        dsn: import.meta.env.VITE_SENTRY_DSN,
        // The site's label from its site.json, so canary's errors are not labelled production; a
        // site that serves none is labelled as the build was before site.json existed.
        environment: sentryEnvironment ?? (site === "unknown" ? import.meta.env.MODE : site),
        isProd: import.meta.env.PROD,
    };
}

/**
 * Initialize Sentry with the given configuration.
 * If no config is provided, uses environment variables.
 * @param config - Optional Sentry configuration
 */
export function initSentry(config?: SentryConfig): void {
    const effectiveConfig = config ?? getDefaultConfig();
    const { dsn } = effectiveConfig;

    if (!dsn) {
        console.warn("Sentry DSN not configured, error tracking disabled");
        return;
    }

    const restart = replay !== undefined;
    replay ??= Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true });
    Sentry.init({
        dsn,
        environment: effectiveConfig.environment,
        tracesSampleRate: effectiveConfig.isProd ? 0.1 : 1,
        // Started only once the reader has said Share usage data (workspace/privacy/usageData.ts),
        // whose "What is collected" list promises a replay of each session with every text and
        // input masked. The canvas is not recorded: replay draws no canvas without its canvas
        // integration, which is not added.
        replaysSessionSampleRate: 1,
        replaysOnErrorSampleRate: 1,
        integrations: [replay],
        // Every event, transaction and breadcrumb is cut down to an allowlist before it is sent.
        ...privacyFilters,
        // Spans go out inside their transaction, through beforeSendTransaction above. Sentry 11's
        // default, streaming each span on its own, skips that hook and would send span attributes
        // (a request URL with its query, anything a caller set) unfiltered.
        traceLifecycle: "static",
        // Sentry 11 collects these by default, and some (the reader's IP address, inferred by Sentry's
        // server from the request) are added after the event leaves the page, past every hook above.
        dataCollection: {
            userInfo: false,
            cookies: false,
            // the browser string, which privacyFilters keeps; every other header stays on the page
            httpHeaders: { allow: ["User-Agent"] },
            httpBodies: [],
            urlQueryParams: false,
            graphQL: { document: false, variables: false },
            genAI: { inputs: false, outputs: false },
        },
        transport: effectiveConfig.transport,
    });
    if (restart) {
        // The integration sets itself up once per page; on a later start it records only when asked.
        replay.start();
    }
    initialized = true;
}

/**
 * Stop sending anything: the reader turned usage data off.
 */
export function stopSentry(): void {
    if (initialized) {
        // Best effort: events that cannot be flushed as usage data is turned off are dropped.
        replay?.stop().catch(() => undefined);
        Sentry.close().catch(() => undefined);
    }
    initialized = false;
}

/**
 * Check if Sentry has been initialized.
 * @returns True if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
    return initialized;
}

/**
 * Reset the initialized state. Only for testing purposes.
 */
export function resetSentryState(): void {
    initialized = false;
    replay = undefined;
}

/**
 * Capture a test error to verify Sentry is working.
 */
export function testCaptureError(): void {
    Sentry.captureException(new Error("Test error from Graphty"));
}

export interface AttachmentData {
    filename: string;
    data: Uint8Array;
    contentType?: string;
}

interface FeedbackData {
    name?: string;
    email?: string;
    message: string;
    attachments?: AttachmentData[];
}

export interface FeedbackResult {
    success: boolean;
    message: string;
}

/**
 * Capture user feedback and send it to Sentry.
 * @param feedback - The feedback data to send
 * @returns The result of the feedback submission
 */
export function captureUserFeedback(feedback: FeedbackData): FeedbackResult {
    // Check if Sentry is configured
    if (!initialized) {
        console.warn("[Sentry] Cannot send feedback - Sentry is not configured");
        return {
            success: false,
            message: "Feedback could not be sent. Error reporting is not configured.",
        };
    }

    const scope = Sentry.getCurrentScope();

    // Add attachments if provided
    // Sentry's addAttachment accepts Uint8Array directly for binary data
    if (feedback.attachments && feedback.attachments.length > 0) {
        for (const attachment of feedback.attachments) {
            scope.addAttachment({
                filename: attachment.filename,
                data: attachment.data,
                contentType: attachment.contentType,
            });
        }
    }

    Sentry.captureFeedback({
        message: feedback.message,
        name: feedback.name,
        email: feedback.email,
    });

    // Clear attachments after sending
    scope.clearAttachments();

    return {
        success: true,
        message: "Thank you for your feedback!",
    };
}
