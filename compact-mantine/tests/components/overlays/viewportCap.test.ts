/**
 * The cap reads the visual viewport, not the window: an on-screen keyboard shrinks only the visual
 * viewport (the window keeps its height), and the cap must follow it. A browser frame cannot shrink
 * one without the other, so this is checked against a visual viewport whose height is set here.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

describe("installViewportCap", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
        document.documentElement.style.removeProperty("--cm-viewport-cap");
    });

    it("sets the cap to the visual viewport's height less 16px, and follows it as it shrinks", async () => {
        const view = Object.assign(new EventTarget(), { height: 820, offsetTop: 0 });
        vi.stubGlobal("visualViewport", view);
        vi.stubGlobal("innerHeight", 820);
        const { installViewportCap } = await import("../../../src/components/overlays/viewportCap");
        installViewportCap();
        const cap = (): string => document.documentElement.style.getPropertyValue("--cm-viewport-cap");
        expect(cap()).toBe("804px");

        // The keyboard opens: the visual viewport shrinks, the window does not.
        view.height = 420;
        view.dispatchEvent(new Event("resize"));
        expect(cap()).toBe("404px");
        expect(window.innerHeight).toBe(820);
    });

    it("falls back to the window's height without a visual viewport", async () => {
        vi.stubGlobal("visualViewport", undefined);
        vi.stubGlobal("innerHeight", 600);
        const { installViewportCap } = await import("../../../src/components/overlays/viewportCap");
        installViewportCap();
        expect(document.documentElement.style.getPropertyValue("--cm-viewport-cap")).toBe("584px");
    });
});
