import "@testing-library/jest-dom/vitest";
import "@mantine/core/styles.css";

// Mock window.matchMedia for JSDOM (required by MantineProvider)
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string): MediaQueryList => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
    }),
});

// Mock ResizeObserver for JSDOM (required by some Mantine components like SegmentedControl)
class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

// Mock Pointer Capture API for JSDOM (required by @zag-js/floating-panel)
// These methods are not implemented in JSDOM but are used by Zag.js for drag behavior
if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = function () {
        return false;
    };
}

if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = function () {};
}

if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = function () {};
}
