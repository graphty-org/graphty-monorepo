/**
 * Gemini's `generateContent` answer to an image request, recorded in the shape the API documents
 * (no headers, no key): one candidate whose only part is a 64 x 36 PNG, and the same request
 * declined (no candidates). A fetch that answers with one records what it was sent.
 * @module test/ai/engine/imageFixtures
 */

/** The PNG in the answer, base64: two bands of color, 64 x 36 pixels. */
export const RECORDED_PNG_BASE64 =
    "iVBORw0KGgoAAAANSUhEUgAAAEAAAAAkCAIAAAC2bqvFAAAAR0lEQVR42u3WMQ0AIAwAwYpgRhNyEFsRSEBEp6aXvIHbPtY+rQsAAAAAAAAAgALg5W0dAAAAAAAAAEAF4EYBAAAAAAAABgM+H1fYiO46T5QAAAAASUVORK5CYII=";

/** The answer that carries a picture. */
export const RECORDED_IMAGE_ANSWER = {
    candidates: [
        {
            content: { role: "model", parts: [{ inlineData: { mimeType: "image/png", data: RECORDED_PNG_BASE64 } }] },
            finishReason: "STOP",
            index: 0,
        },
    ],
    usageMetadata: { promptTokenCount: 9, candidatesTokenCount: 1290, totalTokenCount: 1299 },
    modelVersion: "gemini-2.5-flash-image",
};

/** The answer to a prompt the provider declined: no picture. */
export const RECORDED_DECLINED_ANSWER = {
    promptFeedback: { blockReason: "OTHER" },
    usageMetadata: { promptTokenCount: 9, totalTokenCount: 9 },
    modelVersion: "gemini-2.5-flash-image",
};

/** One request the recorded fetch was sent. */
export interface ImageRequest {
    readonly url: string;
    readonly headers: Record<string, string>;
    readonly body: Record<string, unknown>;
}

/**
 * A fetch that answers every request with a recorded answer.
 * @param answer - The JSON body.
 * @param status - The HTTP status.
 * @returns The fetch, and the requests it was sent.
 */
export function recordedFetch(
    answer: unknown,
    status = 200,
): { fetch: typeof globalThis.fetch; requests: ImageRequest[] } {
    const requests: ImageRequest[] = [];
    const fetch = (input: string, init?: RequestInit): Promise<Response> => {
        requests.push({
            url: input,
            headers: { ...(init?.headers as Record<string, string>) },
            body: JSON.parse(init?.body as string) as Record<string, unknown>,
        });
        return Promise.resolve(
            new Response(JSON.stringify(answer), { status, headers: { "content-type": "application/json" } }),
        );
    };
    return { fetch: fetch as unknown as typeof globalThis.fetch, requests };
}
