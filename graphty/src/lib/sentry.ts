/**
 * Error reporting (design/graphty/usage-analytics.md, section 7): errors, a masked replay of the
 * moments before an error, and feedback the reader sends. Started only after Share usage data
 * (workspace/privacy/usageData.ts); usage itself is counted by analytics.ts, never here.
 */

import * as SentrySdk from "@sentry/react";

import { siteConfig } from "../siteConfig";
import { sentryMaskedAttributes } from "./analytics";
import { beforeAddRecordingEvent, preloadErrorCodes, privacyFilters } from "./sentryPrivacy";

/** The parts of Sentry's SDK this module calls. */
export type SentryCalls = Pick<
    typeof SentrySdk,
    | "init"
    | "getClient"
    | "replayIntegration"
    | "captureException"
    | "captureFeedback"
    | "getCurrentScope"
    | "getIsolationScope"
>;

/** Sentry's SDK, or the stand-in a test passed to {@link setSentryCallsForTests}. */
let Sentry: SentryCalls = SentrySdk;
/** The configuration a test supplies in place of the build's and the site's, else undefined. */
let testDefaultConfig: SentryConfig | undefined;

/**
 * Sends this module's calls to a stand-in rather than Sentry's SDK. A test passes one in here instead
 * of mocking the module: in a browser test, a module mock switches the page's HTTP cache off
 * (issue #3416). Members left out stay Sentry's own.
 * @param calls - the stand-ins, and optionally `defaultConfig`, the configuration `initSentry()`
 * and {@link sentryConfigured} read in place of the build's (a DSN, a transport, replay options);
 * nothing for Sentry's SDK and the build's configuration again.
 */
export function setSentryCallsForTests(calls?: Partial<SentryCalls> & { defaultConfig?: SentryConfig }): void {
    const { defaultConfig, ...members } = calls ?? {};
    Sentry = { ...SentrySdk, ...members };
    testDefaultConfig = defaultConfig;
}

let initialized = false;
/**
 * The one replay integration of this page. Sentry throws "Multiple Sentry Session Replay
 * instances are not supported" on a second replayIntegration(), and a reader can turn usage data
 * off and on again in one visit, so it is made once and restarted.
 */
let replay: ReturnType<typeof SentrySdk.replayIntegration> | undefined;
/** True while an error's replay is being sent and the buffer restarted. */
let sendingErrorReplay = false;
/** The last stop of the replay, settled once it has stopped (see {@link sentryStoppedForTests}). */
let stopping: Promise<void> = Promise.resolve();

/**
 * Sends the buffered replay of the moments before an error once, then starts a new buffer. Sentry's
 * own handling would switch the replay to recording the whole session from here, uploading every
 * segment for up to an hour and resuming after a reload: a second full-session recorder beside
 * PostHog, which is not what the reader was told. Called from `beforeErrorSampling`, which then
 * answers false so Sentry never converts the buffer itself.
 */
function sendErrorReplayOnce(): void {
    const integration = replay;
    if (integration === undefined || sendingErrorReplay || integration.getRecordingMode() !== "buffer") {
        return;
    }
    sendingErrorReplay = true;
    integration
        .flush({ continueRecording: false })
        .then(() => integration.stop({ flush: false }))
        .then(() => {
            if (initialized) {
                integration.startBuffering();
            }
        })
        .catch(() => undefined)
        .finally(() => {
            sendingErrorReplay = false;
        });
}

/**
 * Sentry's default integrations this page leaves out: release-health session pings (Umami and
 * PostHog count visits), console breadcrumbs (dropped anyway) and gen-AI conversation tagging (the
 * app sends none).
 */
const DROPPED_INTEGRATIONS: ReadonlySet<string> = new Set(["BrowserSession", "Console", "ConversationId"]);

export interface SentryConfig {
    dsn?: string;
    environment?: string;
    /** Where events go; Sentry's own by default. Tests pass one that records them. */
    transport?: SentrySdk.BrowserOptions["transport"];
    /** Whether the replay compresses its recording; Sentry's default (true) when absent. Tests turn it off to read it. */
    useCompression?: boolean;
}

/**
 * The configuration from the build and the site, or the one a test supplied.
 * @returns The default Sentry configuration
 */
function getDefaultConfig(): SentryConfig {
    if (testDefaultConfig !== undefined) {
        return testDefaultConfig;
    }
    const { site, sentryEnvironment } = siteConfig();
    return {
        dsn: import.meta.env.VITE_SENTRY_DSN,
        // The site's label from its site.json, so canary's errors are not labelled production; a
        // site that serves none is labelled as the build was before site.json existed.
        environment: sentryEnvironment ?? (site === "unknown" ? import.meta.env.MODE : site),
    };
}

/**
 * Whether error reporting would start: the default configuration has a DSN.
 * @returns true when `initSentry()` would start Sentry.
 */
export function sentryConfigured(): boolean {
    return Boolean(getDefaultConfig().dsn);
}

/**
 * Initialize Sentry with the given configuration.
 * If no config is provided, uses environment variables.
 * @param config - Optional Sentry configuration
 */
export function initSentry(config?: SentryConfig): void {
    const effectiveConfig = config ?? getDefaultConfig();
    const { dsn, useCompression } = effectiveConfig;

    if (!dsn) {
        console.warn("Sentry DSN not configured, error tracking disabled");
        return;
    }

    const client = replay === undefined ? undefined : Sentry.getClient();
    if (replay !== undefined && client !== undefined) {
        // A later start in the same page: the client made by the first start is enabled again.
        // Sentry.init would make a new client, while the replay's hooks (the one that sends a
        // buffered recording with an error, and its breadcrumbs) stay on the first one, once per
        // page, so no error replay would ever be sent again. start() would record the whole session.
        // The breadcrumbs gathered while it was off (clicks, requests, the errors it refused) are
        // dropped, or the next error would carry them.
        Sentry.getIsolationScope().clearBreadcrumbs();
        Sentry.getCurrentScope().clearBreadcrumbs();
        client.getOptions().enabled = true;
        replay.startBuffering();
        initialized = true;
        return;
    }
    preloadErrorCodes();
    replay ??= Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
        // Sentry's default masks only title, placeholder and aria-label. This list masks every
        // attribute but the few PostHog's replay keeps too (analytics.ts sentryMaskedAttributes).
        maskAttributes: sentryMaskedAttributes(),
        beforeAddRecordingEvent,
        // An error sends its buffer once and buffering starts again; the session is never recorded.
        beforeErrorSampling: () => {
            sendErrorReplayOnce();
            return false;
        },
        // A reload never resumes a replay of the page before it.
        stickySession: false,
        // An error in the first seconds of a buffer is sent too. Sentry's default (5 s) holds a
        // shorter replay back for a later flush, which the one-shot stop above would cancel.
        minReplayDuration: 0,
        ...(useCompression === undefined ? {} : { useCompression }),
    });
    const integration = replay;
    Sentry.init({
        dsn,
        environment: effectiveConfig.environment,
        // Started only once the reader has said Share usage data (workspace/privacy/usageData.ts).
        // Replay only buffers: a recording of the moments before an error is sent with that error,
        // and no session is recorded otherwise (PostHog records consenting sessions). The canvas is
        // not recorded: replay draws no canvas without its canvas integration, which is not added.
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1,
        integrations: (defaults) => [...defaults.filter((each) => !DROPPED_INTEGRATIONS.has(each.name)), integration],
        // Dropped-event statistics nobody reads.
        sendClientReports: false,
        // Every event, transaction and breadcrumb is cut down to an allowlist before it is sent.
        ...privacyFilters,
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
    initialized = true;
}

/**
 * Stop sending anything: the reader turned usage data off.
 */
export function stopSentry(): void {
    if (initialized) {
        // The client is disabled, not closed: it stays the page's one client, so a later Share
        // enables it again (initSentry). Disabled at once, so nothing captured from here is sent;
        // close() would disable it only after a flush, and could undo a quick Share again.
        // flush: false, or the segment recorded before the No (the No click among it) is sent
        // after it: the replay sends through the transport directly, past the disabled client.
        stopping = replay?.stop({ flush: false }).catch(() => undefined) ?? Promise.resolve();
        const client = Sentry.getClient();
        if (client !== undefined) {
            client.getOptions().enabled = false;
        }
    }
    initialized = false;
}

/**
 * Settles once the replay stopped by the last {@link stopSentry} has stopped. Only for testing.
 * @returns the stop's promise.
 */
export function sentryStoppedForTests(): Promise<void> {
    return stopping;
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
    sendingErrorReplay = false;
    stopping = Promise.resolve();
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
