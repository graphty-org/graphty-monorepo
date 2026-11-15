/**
 * @file The module Worker an algorithm's CPU port runs in. See `offThread.ts`.
 */

import { accelerated } from "@graphty/algorithms";
import { fromBytes } from "@graphty/graph-format";

import type { OffThreadReply, OffThreadRequest } from "./offThreadProtocol";

/** The CPU port, the same one the page runs. */
const port = accelerated(null) as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;

/**
 * The plain data of a result: its own fields, without the functions a port may add for
 * convenience, which cannot be copied to the page and are not part of what it publishes.
 * @param value - The result.
 * @returns Its data.
 */
function plain(value: unknown): unknown {
    if (value === null || typeof value !== "object" || ArrayBuffer.isView(value)) {
        return value;
    }

    return Object.fromEntries(Object.entries(value).filter(([, field]) => typeof field !== "function"));
}

/**
 * Answer one call.
 * @param event - The call, from the page that started this Worker.
 */
function handle(event: MessageEvent<OffThreadRequest>): void {
    const { id, member, bytes, args } = event.data;
    const reply = (answer: OffThreadReply): void => {
        self.postMessage(answer);
    };

    try {
        void port[member](fromBytes(bytes, { validate: "none" }), ...args).then(
            (value) => {
                reply({ id, ok: true, value: plain(value) });
            },
            () => {
                reply({ id, ok: false });
            },
        );
    } catch {
        reply({ id, ok: false });
    }
}

// A dedicated Worker hears only the page that started it, so there is no origin to check.
self.addEventListener("message", handle);
