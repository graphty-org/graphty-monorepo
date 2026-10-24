import "@testing-library/jest-dom/vitest";
import "@mantine/core/styles.css";

import { configure } from "@testing-library/react";
import { beforeAll } from "vitest";
import { commands } from "vitest/browser";

import { WAIT_GUARD_MS } from "../../tools/test-wait-guard.mjs";
import { ensureCompactStyles } from "../src/theme/global-styles";

// Every waitFor and findBy* waits until the monorepo's one hang guard, not Testing Library's 1000 ms:
// a deadline on a wait fails a test whenever the machine is busy (tools/test-wait-guard.mjs).
configure({ asyncUtilTimeout: WAIT_GUARD_MS });

// The package's stylesheet (tokens, Inter, shared classes) is injected by the first themed
// component to render; injecting it up front means a test that reads a token before rendering
// anything still sees it. The theme re-sets data-cm-contrast on its first render.
ensureCompactStyles();

// The real pointer stays where the previous test file left it, so a file whose first render puts
// a control under that spot starts with the control in :hover (the Menu States story's
// data-hovered row then "draws nothing" when the state check removes the attribute, #1482).
// Every file starts with the pointer parked in the far corner.
beforeAll(async () => {
    await commands.mouseAway();
});

// Browser-specific setup file
// Unlike JSDOM, real browsers have all the necessary APIs already:
// - matchMedia
// - ResizeObserver
// - Pointer capture API

// No mocks needed for browser tests!
