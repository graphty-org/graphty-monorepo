/**
 * The error replay masks the attributes that carry the reader's text: a real Sentry client with a
 * transport that records every envelope, and the replay uncompressed so the recording can be read.
 * In a file of its own: Sentry allows one replay integration per page.
 */
import * as Sentry from "@sentry/react";
import { afterAll, assert, it, vi } from "vitest";

import { initSentry, resetSentryState, setSentryCallsForTests, stopSentry } from "./sentry";

afterAll(() => {
    stopSentry();
    resetSentryState();
    setSentryCallsForTests();
});

it("records an error's replay with no reader attribute in it", async () => {
    const sent: string[] = [];
    setSentryCallsForTests({
        defaultConfig: {
            dsn: "https://public@o0.ingest.sentry.io/0",
            useCompression: false,
            transport: (options) =>
                Sentry.createTransport(options, (request) => {
                    sent.push(typeof request.body === "string" ? request.body : new TextDecoder().decode(request.body));
                    return Promise.resolve({ statusCode: 200 });
                }),
        },
    });
    const host = document.createElement("div");
    host.innerHTML =
        '<p aria-description="SECRET_NOTE" data-part="SECRET_PART"><input name="SECRET_NAME"></p>' +
        '<span class="POSITIVE_MARKER">x</span>';
    document.body.append(host);

    initSentry();
    Sentry.captureException(new Error("boom"));

    await vi.waitFor(() => {
        const all = sent.join("\n");
        assert.include(all, '"type":"event"');
        assert.include(all, '"type":"replay_recording"');
        assert.include(all, "POSITIVE_MARKER");
    });
    const all = sent.join("\n");
    for (const secret of ["SECRET_NOTE", "SECRET_PART", "SECRET_NAME"]) {
        assert.notInclude(all, secret);
    }
    host.remove();
});
