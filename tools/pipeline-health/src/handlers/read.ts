import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

/**
 * Public read API. Only /v1/health answers for now; every other route is "no data" until the
 * precomputed page items exist (design section 10.3).
 * @param event - the HTTP API request
 * @returns the JSON response
 */
export function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
    if (event.rawPath === "/v1/health") {
        return Promise.resolve(json(200, { ok: true, time: new Date().toISOString() }));
    }
    return Promise.resolve(json(503, { code: "no_data" }));
}

function json(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
    return {
        statusCode,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
        body: JSON.stringify(body),
    };
}
