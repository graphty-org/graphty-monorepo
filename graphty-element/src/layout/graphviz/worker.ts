/**
 * @file The module Worker a Graphviz layout runs in. One request per Worker life: the host
 * terminates it after the answer, so a crash or a runaway layout never outlives its request.
 */

import { layout, probe } from "./loader";
import type { GraphvizReply, GraphvizRequest } from "./protocol";

self.addEventListener("message", (event: MessageEvent<GraphvizRequest>) => {
    const request = event.data;
    const answer = request.kind === "probe" ? probe() : layout(request.dot, request.engine);
    void answer.then((reply: GraphvizReply) => {
        self.postMessage(reply);
    });
});
