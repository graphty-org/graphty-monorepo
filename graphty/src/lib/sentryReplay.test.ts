/**
 * The error replay masks the attributes that carry the reader's text: a real Sentry client with a
 * transport that records every envelope, and the replay uncompressed so the recording can be read.
 * In a file of its own: Sentry allows one replay integration per page. The cases run in order on
 * one page, as a reader's visit does.
 */
import * as Sentry from "@sentry/react";
import { afterAll, assert, it, vi } from "vitest";

import { initSentry, resetSentryState, setSentryCallsForTests, stopSentry } from "./sentry";

afterAll(() => {
    stopSentry();
    resetSentryState();
    setSentryCallsForTests();
});

/** Every envelope the transport was handed, as text. */
const sent: string[] = [];

/**
 * Settles once the transport has been handed a replay recording since an index. No deadline of its own.
 * @param from - how many envelopes there were before.
 * @returns the envelopes from there.
 */
async function replaySentAfter(from: number): Promise<string> {
    await vi.waitFor(() => {
        const after = sent.slice(from).join("\n");
        assert.include(after, '"type":"event"');
        assert.include(after, '"type":"replay_recording"');
    });
    return sent.slice(from).join("\n");
}

it("records an error's replay with no reader attribute in it, one nobody listed included", async () => {
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
        // A style row's notes name the reader's layers; a shader the reader wrote is named by them.
        '<div data-notes="not set: SECRET_LAYER" data-shader="user/SECRET_SHADER"></div>' +
        // An attribute added later, which no list names, is masked too.
        '<i data-not-listed-yet="SECRET_UNLISTED"></i>' +
        '<span class="POSITIVE_MARKER">x</span>';
    document.body.append(host);

    initSentry();
    Sentry.captureException(new Error("boom"));

    const all = await replaySentAfter(0);
    assert.include(all, "POSITIVE_MARKER");
    for (const secret of [
        "SECRET_NOTE",
        "SECRET_PART",
        "SECRET_NAME",
        "SECRET_LAYER",
        "SECRET_SHADER",
        "SECRET_UNLISTED",
    ]) {
        assert.notInclude(all, secret);
    }
    host.remove();
});

it("sends nothing while usage data is off, and an error's replay again after a later Share", async () => {
    stopSentry();
    Sentry.captureException(new Error("while off"));

    initSentry();
    const marker = document.createElement("span");
    marker.className = "AFTER_RESHARE_MARKER";
    marker.textContent = "y";
    document.body.append(marker);
    const from = sent.length;
    Sentry.captureException(new Error("after share again"));

    const again = await replaySentAfter(from);
    assert.include(again, "after share again");
    assert.include(again, "AFTER_RESHARE_MARKER");
    // The error captured while off was refused by the disabled client, never queued (the transport
    // sends in order, and the later error's envelopes are in), and it is not a breadcrumb of the later one.
    assert.notInclude(sent.join("\n"), "while off");
    marker.remove();
});
