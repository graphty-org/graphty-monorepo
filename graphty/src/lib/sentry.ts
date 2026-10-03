import * as Sentry from "@sentry/react";

let initialized = false;
/**
 * The one replay integration of this page. Sentry throws "Multiple Sentry Session Replay
 * instances are not supported" on a second replayIntegration(), and a reader can turn usage data
 * off and on again in one visit, so it is made once and restarted.
 */
let replay: ReturnType<typeof Sentry.replayIntegration> | undefined;

interface SentryConfig {
    dsn?: string;
    environment?: string;
    isProd?: boolean;
}

/**
 * Get the default configuration from environment variables.
 * This function is separated to allow for testing.
 * @returns The default Sentry configuration
 */
function getDefaultConfig(): SentryConfig {
    return {
        dsn: import.meta.env.VITE_SENTRY_DSN as string | undefined,
        environment: import.meta.env.MODE,
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
        tracesSampleRate: effectiveConfig.isProd ? 0.1 : 1.0,
        // Started only once the reader has said Share usage data (workspace/privacy/usageData.ts),
        // whose "What is collected" list promises a replay of each session with every text and
        // input masked. The canvas is not recorded: replay draws no canvas without its canvas
        // integration, which is not added.
        replaysSessionSampleRate: 1.0,
        replaysOnErrorSampleRate: 1.0,
        integrations: [replay],
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
        void replay?.stop();
        void Sentry.close();
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
