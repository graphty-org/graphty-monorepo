import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { initRemoteLogger, type RemoteLoggerGlobal } from "../../src/bundle/browser-entry.js";

describe("browser-entry auto-init", () => {
    let savedLog: typeof console.log;
    let savedWarn: typeof console.warn;
    let savedError: typeof console.error;
    let savedInfo: typeof console.info;
    let savedDebug: typeof console.debug;
    let result: RemoteLoggerGlobal | undefined;

    beforeEach(() => {
        savedLog = console.log;
        savedWarn = console.warn;
        savedError = console.error;
        savedInfo = console.info;
        savedDebug = console.debug;

        delete window.__remoteLogger__;
        delete (window as Record<string, unknown>).__REMOTE_LOG_SERVER_URL__;
    });

    afterEach(() => {
        if (result) {
            result.destroy();
            result = undefined;
        }
        // Ensure console is restored even if destroy wasn't called
        console.log = savedLog;
        console.warn = savedWarn;
        console.error = savedError;
        console.info = savedInfo;
        console.debug = savedDebug;
    });

    test("detects server URL from window global", () => {
        (window as Record<string, unknown>).__REMOTE_LOG_SERVER_URL__ = "http://test-server:9080";

        result = initRemoteLogger();

        expect(result).toBeDefined();
        expect(result!.client).toBeDefined();
        expect(result!.client.sessionId).toMatch(/^remote-/);
    });

    test("exposes window.__remoteLogger__", () => {
        (window as Record<string, unknown>).__REMOTE_LOG_SERVER_URL__ = "http://test-server:9080";

        result = initRemoteLogger();

        expect(window.__remoteLogger__).toBeDefined();
        expect(window.__remoteLogger__!.client).toBeDefined();
        expect(typeof window.__remoteLogger__!.destroy).toBe("function");
    });

    test("intercepts console methods", () => {
        (window as Record<string, unknown>).__REMOTE_LOG_SERVER_URL__ = "http://test-server:9080";

        result = initRemoteLogger();

        // Console methods should have been replaced
        expect(console.log).not.toBe(savedLog);
        expect(console.warn).not.toBe(savedWarn);
        expect(console.error).not.toBe(savedError);
        expect(console.info).not.toBe(savedInfo);
        expect(console.debug).not.toBe(savedDebug);
    });

    test("intercepted console methods still call originals", () => {
        const spy = vi.fn();
        console.log = spy;
        (window as Record<string, unknown>).__REMOTE_LOG_SERVER_URL__ = "http://test-server:9080";

        result = initRemoteLogger();

        console.log("test message");
        expect(spy).toHaveBeenCalledWith("test message");
    });

    test("intercepted console methods forward to RemoteLogClient", () => {
        (window as Record<string, unknown>).__REMOTE_LOG_SERVER_URL__ = "http://test-server:9080";

        result = initRemoteLogger();
        const logSpy = vi.spyOn(result!.client, "log");

        console.log("hello world");
        expect(logSpy).toHaveBeenCalledWith("LOG", "hello world");

        console.warn("warning");
        expect(logSpy).toHaveBeenCalledWith("WARN", "warning");

        console.error("error");
        expect(logSpy).toHaveBeenCalledWith("ERROR", "error");

        console.info("info");
        expect(logSpy).toHaveBeenCalledWith("INFO", "info");

        console.debug("debug");
        expect(logSpy).toHaveBeenCalledWith("DEBUG", "debug");
    });

    test("stringifies non-string arguments", () => {
        (window as Record<string, unknown>).__REMOTE_LOG_SERVER_URL__ = "http://test-server:9080";

        result = initRemoteLogger();
        const logSpy = vi.spyOn(result!.client, "log");

        console.log("obj:", { key: "value" });
        expect(logSpy).toHaveBeenCalledWith("LOG", 'obj: {"key":"value"}');
    });

    test("destroy restores console methods", () => {
        (window as Record<string, unknown>).__REMOTE_LOG_SERVER_URL__ = "http://test-server:9080";
        const preLog = console.log;
        const preWarn = console.warn;
        const preError = console.error;

        result = initRemoteLogger();

        // Methods should be different after init
        expect(console.log).not.toBe(preLog);

        result.destroy();
        result = undefined;

        // After destroy, calling console.log should not forward to RemoteLogClient
        // (we can't do strict equality on bound functions, but we can verify
        //  the interceptors are gone by checking the function identity changed back)
        expect(console.log).toBe(preLog);
        expect(console.warn).toBe(preWarn);
        expect(console.error).toBe(preError);
    });

    test("destroy removes window.__remoteLogger__", () => {
        (window as Record<string, unknown>).__REMOTE_LOG_SERVER_URL__ = "http://test-server:9080";

        result = initRemoteLogger();
        expect(window.__remoteLogger__).toBeDefined();

        result!.destroy();
        result = undefined;

        expect(window.__remoteLogger__).toBeUndefined();
    });

    test("returns undefined without server URL and warns", () => {
        // In happy-dom, window.location.origin exists as a fallback,
        // so we need to override it to truly have no URL
        const origOrigin = window.location.origin;
        Object.defineProperty(window.location, "origin", { value: "", configurable: true });

        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        result = initRemoteLogger();

        expect(result).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining("Could not detect server URL"),
        );

        warnSpy.mockRestore();
        Object.defineProperty(window.location, "origin", { value: origOrigin, configurable: true });
    });

    test("falls back to window.location.origin", () => {
        // Don't set __REMOTE_LOG_SERVER_URL__ -- let it fall through to location.origin
        // happy-dom provides window.location.origin

        result = initRemoteLogger();

        expect(result).toBeDefined();
        expect(result!.client).toBeDefined();
    });
});
