import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { appJwt, GitHub, installationToken, readAppConfig, APP_PARAMS } from "../../src/collector/github.js";
import { fakeGitHub, NOW } from "./fake-github.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();

describe("GitHub App", () => {
    it("signs an RS256 JWT GitHub accepts: issued a minute ago, expiring within 10 minutes", () => {
        const jwt = appJwt("12345", pem, NOW);
        const [h, p, s] = jwt.split(".");
        expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
        const claims = JSON.parse(Buffer.from(p, "base64url").toString());
        expect(claims.iss).toBe("12345");
        expect(claims.iat).toBe(Math.floor(NOW / 1000) - 60);
        expect(claims.exp - Math.floor(NOW / 1000)).toBeLessThanOrEqual(600);
        expect(createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, Buffer.from(s, "base64url"))).toBe(
            true,
        );
    });

    it("reads the App from SSM, and is not set up when a parameter is missing", async () => {
        const all = { [APP_PARAMS.appId]: "1", [APP_PARAMS.installationId]: "2", [APP_PARAMS.privateKey]: pem };
        expect(await readAppConfig(async () => all)).toEqual({ appId: "1", installationId: "2", privateKey: pem });
        expect(await readAppConfig(async () => ({ [APP_PARAMS.appId]: "1" }))).toBeUndefined();
        expect(await readAppConfig(async () => ({}))).toBeUndefined();
    });

    it("caches the installation token until shortly before it expires", async () => {
        const fake = fakeGitHub();
        const cfg = { appId: "9", installationId: "77", privateKey: pem };
        expect(await installationToken(cfg, fake.fetch, NOW)).toBe("ghs_test");
        expect(await installationToken(cfg, fake.fetch, NOW + 10 * 60_000)).toBe("ghs_test");
        expect(fake.tokenCalls).toBe(1);
        await installationToken(cfg, fake.fetch, NOW + 56 * 60_000);
        expect(fake.tokenCalls).toBe(2);
    });

    it("keeps the rate limit of the newest response and answers 404 as undefined", async () => {
        const gh = new GitHub(async () => "t", fakeGitHub().fetch);
        expect(await gh.rest("repos/graphty-org/graphty-monorepo/nothing")).toBeUndefined();
        expect(gh.rate).toEqual({ remaining: 4000, limit: 5000 });
        expect(gh.calls).toBe(1);
    });
});
