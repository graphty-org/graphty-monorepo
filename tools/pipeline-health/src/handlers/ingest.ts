import { createHash, timingSafeEqual } from "node:crypto";

import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export const MAX_BODY_BYTES = 1_000_000;
export const LOCAL_TOKEN_PARAMETER = "/graphty-health/local-token-sha256";

const ssm = new SSMClient({});
let localTokenHash: Promise<string | undefined> | undefined;

/**
 * The API Gateway JWT authorizer has already checked a CI token's signature, issuer, audience and
 * expiry on /v1/ingest/*. /v1/local/* has no authorizer: its bearer token is checked here against
 * the SHA-256 kept in SSM. Records are not stored yet (501); the claim rules per kind follow.
 * @param event - the HTTP API request, with the JWT claims on /v1/ingest/*
 * @returns the JSON response
 */
export async function handler(
    event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> {
    const body = event.body ?? "";
    const size = Buffer.byteLength(body, event.isBase64Encoded ? "base64" : "utf8");
    if (size > MAX_BODY_BYTES) {
        return json(413, { code: "too_large", params: { limit: MAX_BODY_BYTES } });
    }
    const kind = event.pathParameters?.kind;
    if (event.rawPath.startsWith("/v1/local/")) {
        if (!(await localTokenOk(event.headers?.authorization))) {
            return json(401, { code: "unauthorized" });
        }
        log({ route: "local", kind, size });
    } else {
        const claims = event.requestContext.authorizer?.jwt?.claims ?? {};
        const { repository_id: repositoryId, job_workflow_ref: jobWorkflowRef, ref } = claims;
        log({ route: "ingest", kind, size, repositoryId, jobWorkflowRef, ref });
    }
    return json(501, { code: "not_implemented" });
}

async function localTokenOk(authorization: string | undefined): Promise<boolean> {
    const token = /^Bearer (\S+)$/.exec(authorization ?? "")?.[1];
    if (!token) {
        return false;
    }
    localTokenHash ??= ssm
        .send(new GetParameterCommand({ Name: LOCAL_TOKEN_PARAMETER, WithDecryption: true }))
        .then((r) => r.Parameter?.Value?.trim().toLowerCase())
        .catch((error: unknown) => {
            localTokenHash = undefined; // retry on the next request
            console.error(JSON.stringify({ route: "local", error: String(error) }));
            return undefined;
        });
    const expected = await localTokenHash;
    if (!expected) {
        return false;
    }
    const actual = createHash("sha256").update(token).digest("hex");
    return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function log(fields: Record<string, unknown>): void {
    process.stdout.write(`${JSON.stringify(fields)}\n`);
}

function json(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
    return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
