// Spike: a minimal stdio MCP server with one tool, block(seconds, progress), that logs timing.
import { appendFileSync } from "node:fs";
import { createInterface } from "node:readline";
const log = (m) => appendFileSync(process.env.LOG, `${new Date().toISOString()} ${m}\n`);
const send = (o) => process.stdout.write(JSON.stringify(o) + "\n");
const inflight = new Map();
createInterface({ input: process.stdin }).on("line", (line) => {
    const msg = JSON.parse(line);
    if (msg.method === "initialize") {
        send({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: msg.params.protocolVersion,
            capabilities: { tools: {} }, serverInfo: { name: "spike", version: "0" } } });
    } else if (msg.method === "tools/list") {
        send({ jsonrpc: "2.0", id: msg.id, result: { tools: [{ name: "block",
            description: "Waits the given number of seconds, then returns.",
            inputSchema: { type: "object", properties: { seconds: { type: "number" } }, required: ["seconds"] } }] } });
    } else if (msg.method === "tools/call") {
        const s = msg.params.arguments.seconds, t0 = Date.now(), token = msg.params._meta?.progressToken;
        log(`call ${msg.id} start seconds=${s} progressToken=${token ?? "none"}`);
        let n = 0;
        const tick = token !== undefined && process.env.PROGRESS
            ? setInterval(() => send({ jsonrpc: "2.0", method: "notifications/progress", params: { progressToken: token, progress: ++n } }), 20000) : null;
        const timer = setTimeout(() => { clearInterval(tick); inflight.delete(msg.id);
            log(`call ${msg.id} done after ${(Date.now() - t0) / 1000}s`);
            send({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: `waited ${s}s` }] } }); }, s * 1000);
        inflight.set(msg.id, { timer, tick, t0 });
    } else if (msg.method === "notifications/cancelled") {
        const c = inflight.get(msg.params.requestId);
        log(`call ${msg.params.requestId} CANCELLED after ${c ? (Date.now() - c.t0) / 1000 : "?"}s reason=${msg.params.reason}`);
        if (c) { clearTimeout(c.timer); clearInterval(c.tick); }
    } else if (msg.id !== undefined) {
        send({ jsonrpc: "2.0", id: msg.id, result: {} });
    }
});
