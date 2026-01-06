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
