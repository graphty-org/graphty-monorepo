/**
 * @file The module Worker a Graphviz layout runs in. One request per Worker life: the host
 * terminates it after the answer, so a crash or a runaway layout never outlives its request.
 */

import { layout, probe } from "./loader";
import type { GraphvizReply, GraphvizRequest } from "./protocol";

/**
 * Answer one request.
 * @param event - the request, from the page that started this Worker
 */
function handle(event: MessageEvent<GraphvizRequest>): void {
    const request = event.data;
    const answer = request.kind === "probe" ? probe() : layout(request.dot, request.engine, request.pinned);
    void answer.then((reply: GraphvizReply) => {
        self.postMessage(reply);
    });
}

// A dedicated Worker hears only the page that started it, so there is no origin to check.
self.addEventListener("message", handle);
