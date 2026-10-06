import "@testing-library/jest-dom/vitest";
import "@mantine/core/styles.css";

import { ensureCompactStyles } from "../src/theme/global-styles";

// The package's stylesheet (tokens, Inter, shared classes) is injected by the first themed
// component to render; injecting it up front means a test that reads a token before rendering
// anything still sees it. The theme re-sets data-cm-contrast on its first render.
ensureCompactStyles();

// Browser-specific setup file
// Unlike JSDOM, real browsers have all the necessary APIs already:
// - matchMedia
// - ResizeObserver
// - Pointer capture API

// No mocks needed for browser tests!
