/**
 * The SigV4 signer against AWS's published signature test suite (aws-sig-v4-test-suite: the
 * get-vanilla, get-vanilla-query-order-key-case, post-vanilla and post-x-www-form-urlencoded
 * vectors) and, for the session-token and Neptune cases, signatures botocore computed for the same
 * requests.
 */

import { describe, expect, it } from "vitest";

import { credentials, loadFromSource, replayFetch } from "../../src/index.js";
import { signRequest } from "../../src/sources/sigv4.js";

const CREDS = { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY" };
const TOKEN =
    "AQoDYXdzEPT//////////wEXAMPLEtc764bNrC9SAPBSM22wDOk4x4HIZ8j4FZTwdQWLWsKWHGBuFqwAeMicRXmxfpSPfIeoIYRqTflfKD8YUuwthAx7mSEI/qkPpKPi/kMcGdQrmGdeehM4IC1NtBmUpp2wUE8phUZampKsburEDy0KPkyQDYwT7WZ0wq5VSXDvp75YU9HFvlRd8Tx6q6fE8YQcHNVXAkiY9q6d+xo0rKwT38xVqr7ZD0u0iPPkUL64lIZbqBAz+scqKmlzm8FDrypNC9Yjc8fPOLn9FX9KSYvKTr4rvx3iSIlTJabIQwj2ICCR/oLxBA==";
const NOW = new Date(Date.UTC(2015, 7, 30, 12, 36, 0));

/** One vector: the request, and the Authorization header it must get. */
interface Vector {
    readonly name: string;
    readonly method: string;
    readonly url: string;
    readonly headers?: Record<string, string>;
    readonly body?: string;
    readonly sessionToken?: string;
    readonly service: string;
    readonly signedHeaders: string;
    readonly signature: string;
}

const VECTORS: readonly Vector[] = [
    {
        name: "get-vanilla",
        method: "GET",
        url: "https://example.amazonaws.com/",
        service: "service",
        signedHeaders: "host;x-amz-date",
        signature: "5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31",
    },
    {
        name: "get-vanilla-query-order-key-case",
        method: "GET",
        url: "https://example.amazonaws.com/?Param2=value2&Param1=value1",
        service: "service",
        signedHeaders: "host;x-amz-date",
        signature: "b97d918cfa904a5beff61c982a1b6f458b799221646efd99d3219ec94cdf2500",
    },
    {
        name: "post-vanilla",
        method: "POST",
        url: "https://example.amazonaws.com/",
        service: "service",
        signedHeaders: "host;x-amz-date",
        signature: "5da7c1a2acd57cee7505fc6676e4e544621c30862966e37dddb68e92efbe5d6b",
    },
    {
        name: "post-x-www-form-urlencoded",
        method: "POST",
        url: "https://example.amazonaws.com/",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "Param1=value1",
        service: "service",
        signedHeaders: "content-type;host;x-amz-date",
        signature: "ff11897932ad3f4e8b18135d722051e5ac45fc38421b1da7b9d196a0fe09473a",
    },
    {
        name: "session token (botocore)",
        method: "GET",
        url: "https://example.amazonaws.com/",
        sessionToken: TOKEN,
        service: "service",
        signedHeaders: "host;x-amz-date;x-amz-security-token",
        signature: "c8db8b9676d526f735dac5330f17623554c6cad1e2980d321903e9a3884c051b",
    },
    {
        name: "Neptune openCypher (botocore)",
        method: "POST",
        url: "https://db.cluster-x.us-east-1.neptune.amazonaws.com:8182/openCypher",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: "query=MATCH+%28n%29+RETURN+n+LIMIT+1&parameters=%7B%7D",
        service: "neptune-db",
        signedHeaders: "content-type;host;x-amz-date",
        signature: "f3334bd2e8b19ba8603ceb69ba172af124bbc745f731980b9387a65d1fe463f9",
    },
];

describe("SigV4", () => {
    for (const v of VECTORS) {
        it(`signs ${v.name}`, async () => {
            const request = new Request(v.url, { method: v.method, headers: v.headers, body: v.body });
            const signed = await signRequest(
                request,
                { region: "us-east-1", service: v.service, credentials: { ...CREDS, sessionToken: v.sessionToken } },
                NOW,
            );
            expect(signed.headers.get("authorization")).toBe(
                `AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/${v.service}/aws4_request, SignedHeaders=${v.signedHeaders}, Signature=${v.signature}`,
            );
            expect(signed.headers.get("x-amz-date")).toBe("20150830T123600Z");
            expect(await signed.text()).toBe(v.body ?? "");
        });
    }

    it("takes credentials from a provider function per request", async () => {
        let calls = 0;
        const provider = (): Promise<typeof CREDS> => {
            calls++;
            return Promise.resolve(CREDS);
        };
        const signed = await signRequest(
            new Request("https://example.amazonaws.com/"),
            { region: "us-east-1", service: "service", credentials: provider },
            NOW,
        );
        expect(signed.headers.get("authorization")).toContain("Signature=5fa00fa3");
        expect(calls).toBe(1);
    });

    it("signs through ctx.fetch for a load, sending the signature only to the endpoint", async () => {
        const endpoint = "https://db.cluster-x.us-east-1.neptune.amazonaws.com:8182";
        const fetch = replayFetch([
            { method: "POST", url: `${endpoint}/openCypher`, credential: true, body: { results: [] } },
        ]);
        await loadFromSource(
            "neptune",
            { query: "MATCH (n) RETURN n LIMIT 1" },
            { endpoint, fetch, credential: credentials.awsSigV4({ region: "us-east-1", credentials: CREDS }) },
        );
        expect(fetch.calls).toEqual([{ method: "POST", url: `${endpoint}/openCypher`, credential: true }]);
    });
});
