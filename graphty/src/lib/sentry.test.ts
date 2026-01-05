import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { captureUserFeedback, initSentry, isSentryEnabled, resetSentryState, testCaptureError } from "./sentry";

// Use vi.hoisted to define mock functions that can be used in vi.mock factory
// This is required because vi.mock is hoisted to the top of the file
const { mockInit, mockCaptureException, mockCaptureFeedback, mockAddAttachment, mockClearAttachments, mockGetCurrentScope } = vi.hoisted(() => {
    const mockAddAttachment = vi.fn();
    const mockClearAttachments = vi.fn();
    const mockInit = vi.fn();
    const mockCaptureException = vi.fn();
    const mockCaptureFeedback = vi.fn();
    const mockGetCurrentScope = vi.fn(() => ({
        addAttachment: mockAddAttachment,
        clearAttachments: mockClearAttachments,
    }));
    return { mockInit, mockCaptureException, mockCaptureFeedback, mockAddAttachment, mockClearAttachments, mockGetCurrentScope };
});

// Mock Sentry module
vi.mock("@sentry/react", () => ({
    init: mockInit,
    captureException: mockCaptureException,
    captureFeedback: mockCaptureFeedback,
    getCurrentScope: mockGetCurrentScope,
}));

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
            isProd: false,
        });

        expect(isSentryEnabled()).toBe(true);
        expect(mockInit).toHaveBeenCalledWith(
            expect.objectContaining({
                dsn: "https://test@test.ingest.sentry.io/123",
                environment: "test",
                replaysSessionSampleRate: 0,
                replaysOnErrorSampleRate: 0,
            }),
        );
    });

    it("should use lower traces sample rate in production", () => {
        initSentry({
            dsn: "https://test@test.ingest.sentry.io/123",
            environment: "production",
            isProd: true,
        });

        expect(mockInit).toHaveBeenCalledWith(
            expect.objectContaining({
                tracesSampleRate: 0.1,
            }),
        );
    });

    it("should use higher traces sample rate in development", () => {
        initSentry({
            dsn: "https://test@test.ingest.sentry.io/123",
            environment: "development",
            isProd: false,
        });

        expect(mockInit).toHaveBeenCalledWith(
            expect.objectContaining({
                tracesSampleRate: 1.0,
            }),
        );
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
