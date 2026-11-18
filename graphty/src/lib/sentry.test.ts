import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { SENTRY_MASKED_ATTRIBUTES } from "./analytics";
import {
    captureUserFeedback,
    initSentry,
    isSentryEnabled,
    resetSentryState,
    type SentryCalls,
    sentryConfigured,
    setSentryCallsForTests,
    stopSentry,
    testCaptureError,
} from "./sentry";

// Sentry's SDK as stand-ins that record their calls, passed in rather than mocked: a module mock
// switches a browser test page's HTTP cache off (issue #3416).
const mockAddAttachment = vi.fn();
const mockClearAttachments = vi.fn();
const mockInit = vi.fn();
const mockClose = vi.fn(() => Promise.resolve(true));
const mockReplayStart = vi.fn();
const mockReplayStartBuffering = vi.fn();
const mockReplay = vi.fn(() => ({
    name: "Replay",
    start: mockReplayStart,
    startBuffering: mockReplayStartBuffering,
    stop: vi.fn(() => Promise.resolve()),
}));
const mockCaptureException = vi.fn();
const mockCaptureFeedback = vi.fn();
const mockGetCurrentScope = vi.fn(() => ({
    addAttachment: mockAddAttachment,
    clearAttachments: mockClearAttachments,
}));

/** Only the members the module calls, each a recording stand-in. */
const calls = {
    init: mockInit,
    close: mockClose,
    replayIntegration: mockReplay,
    captureException: mockCaptureException,
    captureFeedback: mockCaptureFeedback,
    getCurrentScope: mockGetCurrentScope,
} as unknown as SentryCalls;

beforeAll(() => {
    setSentryCallsForTests(calls);
});
afterAll(() => {
    setSentryCallsForTests();
});

describe("Sentry initialization", () => {
    beforeEach(() => {
        resetSentryState();
        mockInit.mockClear();
        mockCaptureException.mockClear();
    });

    afterEach(() => {
        resetSentryState();
    });

    it("should not initialize when DSN is not configured", () => {
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        initSentry({ dsn: "" });

        expect(isSentryEnabled()).toBe(false);
        expect(mockInit).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith("Sentry DSN not configured, error tracking disabled");

        consoleWarnSpy.mockRestore();
    });

    it("should not initialize when DSN is undefined", () => {
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        initSentry({ dsn: undefined });

        expect(isSentryEnabled()).toBe(false);
        expect(mockInit).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith("Sentry DSN not configured, error tracking disabled");

        consoleWarnSpy.mockRestore();
    });

    it("should initialize when DSN is configured", () => {
        initSentry({
            dsn: "https://test@test.ingest.sentry.io/123",
            environment: "test",
        });

        expect(isSentryEnabled()).toBe(true);
        expect(mockInit).toHaveBeenCalledWith(
            expect.objectContaining({
                dsn: "https://test@test.ingest.sentry.io/123",
                environment: "test",
                replaysSessionSampleRate: 0,
                replaysOnErrorSampleRate: 1,
                sendClientReports: false,
                dataCollection: expect.objectContaining({ userInfo: false }),
            }),
        );
    });

    it("buffers for replay-on-error only, with every text, input and medium and the reader's attributes masked", () => {
        mockReplay.mockClear();
        initSentry({ dsn: "https://test@test.ingest.sentry.io/123" });

        expect(mockReplay).toHaveBeenCalledWith(
            expect.objectContaining({
                maskAllText: true,
                maskAllInputs: true,
                blockAllMedia: true,
                maskAttributes: [...SENTRY_MASKED_ATTRIBUTES],
            }),
        );
        const masked = (mockReplay.mock.calls[0] as unknown as [{ maskAttributes: string[] }])[0].maskAttributes;
        for (const name of ["aria-description", "name", "href", "id", "data-part"]) {
            expect(masked).toContain(name);
        }
    });

    it("leaves out session pings, console breadcrumbs and conversation tagging, and keeps the other defaults", () => {
        initSentry({ dsn: "https://test@test.ingest.sentry.io/123" });

        const { integrations } = (mockInit.mock.calls[0] as unknown as [{ integrations: unknown }])[0];
        expect(typeof integrations).toBe("function");
        const names = [
            "EventFilters",
            "FunctionToString",
            "ConversationId",
            "BrowserApiErrors",
            "Breadcrumbs",
            "Console",
            "GlobalHandlers",
            "LinkedErrors",
            "Dedupe",
            "HttpContext",
            "CultureContext",
            "BrowserSession",
        ];
        const chosen = (integrations as (defaults: { name: string }[]) => { name: string }[])(
            names.map((name) => ({ name })),
        ).map((each) => each.name);
        expect(chosen).toEqual([
            "EventFilters",
            "FunctionToString",
            "BrowserApiErrors",
            "Breadcrumbs",
            "GlobalHandlers",
            "LinkedErrors",
            "Dedupe",
            "HttpContext",
            "CultureContext",
            "Replay",
        ]);
    });

    it("sets no tracesSampleRate and no trace lifecycle", () => {
        initSentry({ dsn: "https://test@test.ingest.sentry.io/123" });

        const options = (mockInit.mock.calls[0] as unknown as [Record<string, unknown>])[0];
        expect("tracesSampleRate" in options).toBe(false);
        expect("traceLifecycle" in options).toBe(false);
    });

    it("reads the configuration a test supplies, for initSentry() and sentryConfigured()", () => {
        setSentryCallsForTests({ ...calls, defaultConfig: { dsn: "" } });
        expect(sentryConfigured()).toBe(false);

        setSentryCallsForTests({ ...calls, defaultConfig: { dsn: "https://test@test.ingest.sentry.io/123" } });
        expect(sentryConfigured()).toBe(true);
        initSentry();
        expect(mockInit).toHaveBeenCalledWith(
            expect.objectContaining({ dsn: "https://test@test.ingest.sentry.io/123" }),
        );

        setSentryCallsForTests(calls);
    });

    it("stops sending when usage data is turned off", () => {
        initSentry({ dsn: "https://test@test.ingest.sentry.io/123" });
        stopSentry();

        expect(mockClose).toHaveBeenCalled();
        expect(isSentryEnabled()).toBe(false);
    });

    it("keeps one replay when usage data is turned off and on again", () => {
        mockReplay.mockClear();
        mockReplayStart.mockClear();
        initSentry({ dsn: "https://test@test.ingest.sentry.io/123" });
        stopSentry();
        initSentry({ dsn: "https://test@test.ingest.sentry.io/123" });

        // Sentry throws on a second replayIntegration() in one page; start() would record the whole session.
        expect(mockReplay).toHaveBeenCalledTimes(1);
        expect(mockReplayStartBuffering).toHaveBeenCalledTimes(1);
        expect(mockReplayStart).not.toHaveBeenCalled();
    });

    it("should capture test error via testCaptureError", () => {
        testCaptureError();

        expect(mockCaptureException).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Test error from Graphty",
            }),
        );
    });
});

describe("captureUserFeedback", () => {
    beforeEach(() => {
        resetSentryState();
        mockCaptureFeedback.mockClear();
        mockAddAttachment.mockClear();
        mockClearAttachments.mockClear();
        // Initialize Sentry so captureUserFeedback works
        initSentry({ dsn: "https://test@test.ingest.sentry.io/123" });
    });

    afterEach(() => {
        resetSentryState();
    });

    it("should return error when Sentry is not initialized", () => {
        resetSentryState(); // Reset to uninitialized state

        const result = captureUserFeedback({ message: "Test feedback" });

        expect(result.success).toBe(false);
        expect(result.message).toContain("not configured");
        expect(mockCaptureFeedback).not.toHaveBeenCalled();
    });

    it("should return success when Sentry is initialized", () => {
        const result = captureUserFeedback({ message: "Test feedback" });

        expect(result.success).toBe(true);
        expect(result.message).toContain("Thank you");
    });

    it("should capture feedback with message only", () => {
        captureUserFeedback({ message: "Test feedback" });

        expect(mockCaptureFeedback).toHaveBeenCalledWith({
            message: "Test feedback",
            name: undefined,
            email: undefined,
        });
    });

    it("should capture feedback with name and email", () => {
        captureUserFeedback({
            message: "Test feedback",
            name: "John Doe",
            email: "john@example.com",
        });

        expect(mockCaptureFeedback).toHaveBeenCalledWith({
            message: "Test feedback",
            name: "John Doe",
            email: "john@example.com",
        });
    });

    it("should not add attachments when none provided", () => {
        captureUserFeedback({ message: "Test feedback" });

        expect(mockAddAttachment).not.toHaveBeenCalled();
        expect(mockClearAttachments).toHaveBeenCalled();
    });

    it("should not add attachments when empty array provided", () => {
        captureUserFeedback({ message: "Test feedback", attachments: [] });

        expect(mockAddAttachment).not.toHaveBeenCalled();
        expect(mockClearAttachments).toHaveBeenCalled();
    });

    it("should add single attachment to scope", () => {
        const attachmentData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
        const attachment = {
            filename: "test.txt",
            data: attachmentData,
            contentType: "text/plain",
        };

        captureUserFeedback({ message: "Test feedback", attachments: [attachment] });

        expect(mockAddAttachment).toHaveBeenCalledTimes(1);
        expect(mockAddAttachment).toHaveBeenCalledWith({
            filename: "test.txt",
            data: attachmentData, // Uint8Array passed directly, not base64 encoded
            contentType: "text/plain",
        });
    });

    it("should add multiple attachments to scope", () => {
        const data1 = new Uint8Array([65, 66, 67]); // "ABC"
        const data2 = new Uint8Array([1, 2, 3]);
        const attachments = [
            {
                filename: "file1.txt",
                data: data1,
                contentType: "text/plain",
            },
            {
                filename: "file2.bin",
                data: data2,
                contentType: "application/octet-stream",
            },
        ];

        captureUserFeedback({ message: "Test feedback", attachments });

        expect(mockAddAttachment).toHaveBeenCalledTimes(2);
        expect(mockAddAttachment).toHaveBeenNthCalledWith(1, {
            filename: "file1.txt",
            data: data1, // Uint8Array passed directly
            contentType: "text/plain",
        });
        expect(mockAddAttachment).toHaveBeenNthCalledWith(2, {
            filename: "file2.bin",
            data: data2, // Uint8Array passed directly
            contentType: "application/octet-stream",
        });
    });

    it("should clear attachments after sending feedback", () => {
        captureUserFeedback({
            message: "Test feedback",
            attachments: [{ filename: "test.txt", data: new Uint8Array([65]) }],
        });

        expect(mockClearAttachments).toHaveBeenCalled();
        // Verify clearAttachments is called after captureFeedback
        const captureFeedbackCallOrder = mockCaptureFeedback.mock.invocationCallOrder[0];
        const clearAttachmentsCallOrder = mockClearAttachments.mock.invocationCallOrder[0];
        expect(clearAttachmentsCallOrder).toBeGreaterThan(captureFeedbackCallOrder);
    });

    it("should handle attachment without contentType", () => {
        const data = new Uint8Array([1, 2, 3]);
        const attachment = {
            filename: "test.bin",
            data,
        };

        captureUserFeedback({ message: "Test feedback", attachments: [attachment] });

        expect(mockAddAttachment).toHaveBeenCalledWith({
            filename: "test.bin",
            data, // Uint8Array passed directly
            contentType: undefined,
        });
    });
});
