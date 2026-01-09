import { describe, expect, test } from "vitest";

import {
    extractMarkerFromPath,
    extractMarkerFromSessionId,
    resolveProjectMarker,
} from "../../src/server/marker-utils.js";

describe("extractMarkerFromPath", () => {
    test("extracts marker from .worktrees path on Unix", () => {
        expect(extractMarkerFromPath("/home/user/project/.worktrees/remote-logging")).toBe("remote-logging");
        expect(extractMarkerFromPath("/home/user/project/.worktrees/feature-xyz")).toBe("feature-xyz");
        expect(extractMarkerFromPath("/Users/dev/code/.worktrees/main")).toBe("main");
    });

    test("extracts marker from .worktrees path on Windows", () => {
        expect(extractMarkerFromPath("C:\\Users\\dev\\project\\.worktrees\\remote-logging")).toBe("remote-logging");
        expect(extractMarkerFromPath("D:\\code\\.worktrees\\feature-branch")).toBe("feature-branch");
    });

    test("extracts marker from nested .worktrees path", () => {
        expect(extractMarkerFromPath("/home/user/project/.worktrees/remote-logging/subdir")).toBe("remote-logging");
        expect(extractMarkerFromPath("/home/user/project/.worktrees/feature-xyz/deep/nested")).toBe("feature-xyz");
    });

    test("uses basename for regular project paths", () => {
        expect(extractMarkerFromPath("/home/user/my-project")).toBe("my-project");
        expect(extractMarkerFromPath("/Users/dev/graphty-monorepo")).toBe("graphty-monorepo");
        expect(extractMarkerFromPath("C:\\Users\\dev\\my-app")).toBe("my-app");
    });

    test("handles paths with trailing slashes", () => {
        expect(extractMarkerFromPath("/home/user/project/.worktrees/remote-logging/")).toBe("remote-logging");
        expect(extractMarkerFromPath("/home/user/my-project/")).toBe("my-project");
    });

    test("returns 'default' for empty or invalid paths", () => {
        expect(extractMarkerFromPath("")).toBe("default");
        expect(extractMarkerFromPath("/")).toBe("default");
    });

    test("handles paths with special characters", () => {
        expect(extractMarkerFromPath("/home/user/.worktrees/feature-123-fix")).toBe("feature-123-fix");
        expect(extractMarkerFromPath("/home/user/.worktrees/v2.0.0")).toBe("v2.0.0");
    });
});

describe("extractMarkerFromSessionId", () => {
    test("extracts prefix from session ID with standard format", () => {
        // Format: {prefix}-{timestamp}-{random}
        expect(extractMarkerFromSessionId("graphty-element-1704067200000-abc123")).toBe("graphty-element");
        expect(extractMarkerFromSessionId("my-app-1704067200000-xyz789")).toBe("my-app");
        expect(extractMarkerFromSessionId("remote-logging-1704067200000-def456")).toBe("remote-logging");
    });

    test("handles session IDs with multiple hyphens in prefix", () => {
        expect(extractMarkerFromSessionId("my-cool-app-1704067200000-abc")).toBe("my-cool-app");
        expect(extractMarkerFromSessionId("graphty-element-ui-1704067200000-xyz")).toBe("graphty-element-ui");
    });

    test("handles simple session IDs without timestamp format", () => {
        expect(extractMarkerFromSessionId("simple-session")).toBe("simple");
        expect(extractMarkerFromSessionId("test")).toBe("test");
    });

    test("returns 'default' for empty session IDs", () => {
        expect(extractMarkerFromSessionId("")).toBe("default");
    });

    test("handles session IDs with only numbers after prefix", () => {
        expect(extractMarkerFromSessionId("app-123456789-xyz")).toBe("app");
    });
});

describe("resolveProjectMarker", () => {
    test("prefers explicit projectMarker over all other options", () => {
        expect(
            resolveProjectMarker({
                projectMarker: "explicit-marker",
                workingDirectory: "/home/user/.worktrees/from-path",
                sessionId: "from-session-123-abc",
            }),
        ).toBe("explicit-marker");
    });

    test("uses workingDirectory when projectMarker not provided", () => {
        expect(
            resolveProjectMarker({
                workingDirectory: "/home/user/.worktrees/remote-logging",
                sessionId: "from-session-123-abc",
            }),
        ).toBe("remote-logging");
    });

    test("uses sessionId when no path options provided", () => {
        expect(
            resolveProjectMarker({
                sessionId: "my-app-1704067200000-abc123",
            }),
        ).toBe("my-app");
    });

    test("returns 'default' when no options provided", () => {
        expect(resolveProjectMarker({})).toBe("default");
    });

    test("returns 'default' when all options are empty strings", () => {
        expect(
            resolveProjectMarker({
                projectMarker: "",
                workingDirectory: "",
                sessionId: "",
            }),
        ).toBe("default");
    });

    test("skips empty projectMarker and falls back to workingDirectory", () => {
        expect(
            resolveProjectMarker({
                projectMarker: "",
                workingDirectory: "/home/user/.worktrees/remote-logging",
            }),
        ).toBe("remote-logging");
    });
});
