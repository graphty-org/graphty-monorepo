import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    clearDefaultProvider,
    DEFAULT_ENCRYPTION_PASSWORD,
    DEFAULT_KEY_PREFIX,
    DEFAULT_PROVIDER_KEY,
    DIALOG_HEIGHT,
    DIALOG_POSITION_KEY,
    DIALOG_WIDTH,
    ENCRYPTION_KEY_STORAGE,
    getDefaultDialogPosition,
    getSavedDefaultProvider,
    getSavedDialogPosition,
    saveDefaultProvider,
    saveDialogPosition,
} from "../ai-storage";

describe("ai-storage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe("constants", () => {
        it("exports ENCRYPTION_KEY_STORAGE", () => {
            expect(ENCRYPTION_KEY_STORAGE).toBe("@graphty-ai-encryption-key");
        });

        it("exports DEFAULT_KEY_PREFIX", () => {
            expect(DEFAULT_KEY_PREFIX).toBe("@graphty-ai-keys");
        });

        it("exports DEFAULT_ENCRYPTION_PASSWORD", () => {
            expect(DEFAULT_ENCRYPTION_PASSWORD).toBe("graphty-default-key");
        });

        it("exports DIALOG_POSITION_KEY", () => {
            expect(DIALOG_POSITION_KEY).toBe("ai-dialog-position");
        });

        it("exports DEFAULT_PROVIDER_KEY", () => {
            expect(DEFAULT_PROVIDER_KEY).toBe("@graphty-ai-default-provider");
        });

        it("exports DIALOG_WIDTH", () => {
            expect(DIALOG_WIDTH).toBe(400);
        });

        it("exports DIALOG_HEIGHT", () => {
            expect(DIALOG_HEIGHT).toBe(500);
        });
    });

    describe("getSavedDialogPosition", () => {
        it("returns null when no position is saved", () => {
            const result = getSavedDialogPosition();
            expect(result).toBeNull();
        });

        it("returns saved position when valid JSON exists", () => {
            localStorage.setItem(DIALOG_POSITION_KEY, JSON.stringify({ x: 100, y: 200 }));

            const result = getSavedDialogPosition();

            expect(result).toEqual({ x: 100, y: 200 });
        });

        it("returns null when saved position is invalid JSON", () => {
            localStorage.setItem(DIALOG_POSITION_KEY, "invalid json{");

            const result = getSavedDialogPosition();

            expect(result).toBeNull();
        });
    });

    describe("saveDialogPosition", () => {
        it("saves position to localStorage", () => {
            saveDialogPosition({ x: 50, y: 75 });

            const saved = localStorage.getItem(DIALOG_POSITION_KEY);
            expect(saved).toBe(JSON.stringify({ x: 50, y: 75 }));
        });
    });

    describe("getDefaultDialogPosition", () => {
        it("returns position based on window dimensions", () => {
            // Mock window dimensions
            const originalInnerWidth = window.innerWidth;
            const originalInnerHeight = window.innerHeight;

            Object.defineProperty(window, "innerWidth", { value: 1920, configurable: true });
            Object.defineProperty(window, "innerHeight", { value: 1080, configurable: true });

            const result = getDefaultDialogPosition();

            expect(result).toEqual({
                x: 1920 - DIALOG_WIDTH - 20,
                y: 1080 - DIALOG_HEIGHT - 20,
            });

            // Restore
            Object.defineProperty(window, "innerWidth", { value: originalInnerWidth, configurable: true });
            Object.defineProperty(window, "innerHeight", { value: originalInnerHeight, configurable: true });
        });
    });

    describe("getSavedDefaultProvider", () => {
        it("returns null when no provider is saved", () => {
            const result = getSavedDefaultProvider();
            expect(result).toBeNull();
        });

        it("returns saved provider", () => {
            localStorage.setItem(DEFAULT_PROVIDER_KEY, "anthropic");

            const result = getSavedDefaultProvider();

            expect(result).toBe("anthropic");
        });
    });

    describe("saveDefaultProvider", () => {
        it("saves provider to localStorage", () => {
            saveDefaultProvider("openai");

            const saved = localStorage.getItem(DEFAULT_PROVIDER_KEY);
            expect(saved).toBe("openai");
        });
    });

    describe("clearDefaultProvider", () => {
        it("removes provider from localStorage", () => {
            localStorage.setItem(DEFAULT_PROVIDER_KEY, "google");

            clearDefaultProvider();

            const saved = localStorage.getItem(DEFAULT_PROVIDER_KEY);
            expect(saved).toBeNull();
        });

        it("does nothing when no provider was saved", () => {
            clearDefaultProvider();

            const saved = localStorage.getItem(DEFAULT_PROVIDER_KEY);
            expect(saved).toBeNull();
        });
    });
});
