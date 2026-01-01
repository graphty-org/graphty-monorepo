import * as Sentry from "@sentry/react";

let initialized = false;

export interface SentryConfig {
    dsn?: string;
    environment?: string;
    isProd?: boolean;
}

/**
 * Get the default configuration from environment variables.
 * This function is separated to allow for testing.
 * @returns The default Sentry configuration
 */
export function getDefaultConfig(): SentryConfig {
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

    Sentry.init({
        dsn,
        environment: effectiveConfig.environment,
        tracesSampleRate: effectiveConfig.isProd ? 0.1 : 1.0,
        replaysSessionSampleRate: 0, // Privacy-first
        replaysOnErrorSampleRate: 0,
    });
    initialized = true;
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

export interface FeedbackData {
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
