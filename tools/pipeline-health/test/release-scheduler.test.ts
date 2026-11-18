import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { DISPATCH_APP_PARAMS } from "../src/collector/github.ts";
import { appPoster, RELEASE_DISPATCH, runSlot } from "../src/handlers/release-scheduler.ts";

const SLOT = "2026-11-16T06:00:00Z";

describe("release scheduler slot (#3608)", () => {
    it("in dry run logs the dispatch it would make and posts nothing", async () => {
        const post = vi.fn();
        const log = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
        const report = await runSlot(SLOT, false, post);
        expect(post).not.toHaveBeenCalled();
        expect(report).toEqual({
            releaseScheduler: "dry-run",
            slot: SLOT,
            dispatched: false,
            dispatch: RELEASE_DISPATCH,
        });
        expect(JSON.parse(log.mock.calls[0][0] as string)).toEqual(report);
        log.mockRestore();
    });

    it("live dispatches release.yml on master with scheduled and full, as the Worker does", async () => {
        const post = vi.fn().mockResolvedValue(undefined);
        const log = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
        const report = await runSlot(SLOT, true, post);
        expect(post).toHaveBeenCalledExactlyOnceWith(
            "repos/graphty-org/graphty-monorepo/actions/workflows/release.yml/dispatches",
            { ref: "master", inputs: { scheduled: "true", mode: "full" } },
        );
        expect(report.dispatched).toBe(true);
        log.mockRestore();
    });

    it("live throws, and logs no dispatch, when the post fails", async () => {
        const log = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
        await expect(runSlot(SLOT, true, vi.fn().mockRejectedValue(new Error("HTTP 422")))).rejects.toThrow("422");
        expect(log).not.toHaveBeenCalled();
        log.mockRestore();
    });

    it("the poster reads the release-scheduler App's parameters and refuses when they are missing", async () => {
        const getParams = vi.fn().mockResolvedValue({});
        const f = vi.fn();
        await expect(appPoster(getParams, f)(RELEASE_DISPATCH.path, RELEASE_DISPATCH.body)).rejects.toThrow(
            "parameters are missing",
        );
        expect(getParams).toHaveBeenCalledWith(Object.values(DISPATCH_APP_PARAMS));
        expect(f).not.toHaveBeenCalled();
    });

    it("the poster signs in as the App and posts the dispatch to GitHub's API, no network", async () => {
        const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
        const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
        const getParams = vi.fn().mockResolvedValue({
            [DISPATCH_APP_PARAMS.appId]: "1",
            [DISPATCH_APP_PARAMS.installationId]: "77",
            [DISPATCH_APP_PARAMS.privateKey]: pem,
        });
        const f = vi.fn((url: string, _init?: RequestInit) =>
            Promise.resolve(
                url.endsWith("/access_tokens")
                    ? Response.json({ token: "inst", expires_at: "2099-01-01T00:00:00Z" })
                    : new Response(null, { status: 204 }),
            ),
        );
        await appPoster(getParams, f)(RELEASE_DISPATCH.path, RELEASE_DISPATCH.body);
        expect(f.mock.calls.map((c) => [c[0], c[1]?.method])).toEqual([
            ["https://api.github.com/app/installations/77/access_tokens", "POST"],
            [`https://api.github.com/${RELEASE_DISPATCH.path}`, "POST"],
        ]);
        expect(JSON.parse(f.mock.calls[1][1]?.body as string)).toEqual(RELEASE_DISPATCH.body);
    });
});
