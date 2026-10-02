import { describe, expect, it } from "vitest";

import { assertAscii, checkOutgoing } from "../lib/text.mjs";

describe("assertAscii", () => {
    it("accepts plain ASCII, including tabs and newlines", () => {
        expect(() => assertAscii("ok -- 'quoted'\t\n")).not.toThrow();
    });

    it("names the first non-ASCII character and where it is", () => {
        expect(() => assertAscii("a\u2014b", "comment body")).toThrow(
            "comment body is not plain ASCII: U+2014 at offset 1",
        );
        expect(() => assertAscii("\u00e9")).toThrow("text is not plain ASCII: U+00E9 at offset 0");
    });
});

describe("checkOutgoing", () => {
    const env = {};

    it("passes ordinary text", () => {
        expect(checkOutgoing("Fixes #412: the layout was generated with the wrong seed.", env)).toEqual([]);
    });

    it.each([
        ["ghp_abcdefghijklmnop", "GitHub personal access token"],
        ["gho_abcdefghijklmnop", "GitHub OAuth token"],
        ["ghs_abcdefghijklmnop", "GitHub app token"],
        ["github_pat_11ABCDEF", "GitHub fine-grained token"],
        ["sk-ant-api03-xyz", "Anthropic API key"],
        ["-----BEGIN OPENSSH PRIVATE KEY-----", "PEM key block"],
        [`npm_${"a1B2".repeat(9)}`, "npm access token"],
        [`sk-proj-${"x9".repeat(12)}`, "sk- secret key"],
        [`AIza${"Sy".repeat(18)}`, "Google API key"],
        [["xoxb", "1234567890", "abcdef"].join("-"), "Slack token"],
        ["AKIAIOSFODNN7EXAMPLE", "AWS access key id"],
    ])("refuses the secret pattern in %s", (secret, label) => {
        expect(checkOutgoing(`log line: ${secret} end`, env)).toEqual([`contains a ${label}`]);
    });

    it.each([
        ["Co-Authored-By: Claude <noreply@anthropic.com>", "Co-Authored-By line"],
        ["co-authored-by: someone", "Co-Authored-By line"],
        ["Claude-Session: abc", "Claude-Session line"],
        ["Generated with [Claude Code](https://claude.com/claude-code)", '"Generated with" line'],
    ])("refuses the attribution line %s", (line, label) => {
        expect(checkOutgoing(`fix(x): y\n\n${line}\n`, env)).toEqual([`contains a ${label}`]);
    });

    it("refuses the value of an environment variable whose name contains TOKEN, KEY or SECRET, without quoting it", () => {
        const secretEnv = {
            GH_TOKEN: "abcdef0123456789",
            ANTHROPIC_API_KEY: "zyxw-9876-5432",
            client_secret: "lowercase-secret-value",
            HOME: "/home/someone",
        };
        expect(checkOutgoing("token abcdef0123456789 here", secretEnv)).toEqual([
            "contains the value of environment variable GH_TOKEN",
        ]);
        expect(checkOutgoing("k=zyxw-9876-5432", secretEnv)).toEqual([
            "contains the value of environment variable ANTHROPIC_API_KEY",
        ]);
        expect(checkOutgoing("lowercase-secret-value", secretEnv)).toEqual([
            "contains the value of environment variable client_secret",
        ]);
        expect(checkOutgoing("cd /home/someone", secretEnv)).toEqual([]);
        expect(checkOutgoing("token abcdef0123456789", secretEnv).join(" ")).not.toContain("abcdef0123456789");
    });

    it("ignores short and empty values that would match almost any text", () => {
        expect(
            checkOutgoing("1 true", { FEATURE_KEY: "1", SOME_TOKEN: "true", EMPTY_SECRET: "", UNSET_TOKEN: undefined }),
        ).toEqual([]);
    });

    it("reads the process environment by default", () => {
        const name = "GITHERD_TEST_TOKEN";
        process.env[name] = "process-env-secret-value";
        try {
            expect(checkOutgoing("x process-env-secret-value x")).toContain(
                `contains the value of environment variable ${name}`,
            );
        } finally {
            delete process.env[name];
        }
    });

    it("does not take ordinary words for the new credential prefixes", () => {
        const text = "task-list risk-free desk-top npm_config_registry AKIA xoxb- sk-short AIza";
        expect(checkOutgoing(text, env)).toEqual([]);
    });

    it("reports every match", () => {
        expect(checkOutgoing("ghp_x sk-ant-y Claude-Session: z", env)).toHaveLength(3);
    });
});
