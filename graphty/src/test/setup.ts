import "@testing-library/jest-dom";
// Import Mantine CSS for browser tests that check computed styles
import "@mantine/core/styles.css";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Cleanup after each test case
afterEach(() => {
    cleanup();
});
