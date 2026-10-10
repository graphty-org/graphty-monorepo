// Fake Anthropic API for spike S15: answers /<mode>/v1/messages with the error of <mode>.
// Every request is logged as one JSON line to requests.log beside this file.
import http from "node:http";
import fs from "node:fs";
const log = new URL("./requests.log", import.meta.url);
const errors = {
    rate_limit: [429, "rate_limit_error", "Number of request tokens has exceeded your per-minute rate limit"],
    overloaded: [529, "overloaded_error", "Overloaded"],
    auth: [401, "authentication_error", "invalid x-api-key"],
    billing: [400, "invalid_request_error", "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."],
    server: [500, "api_error", "Internal server error"],
};
http.createServer((req, res) => {
    const [, mode, ...rest] = req.url.split("/");
    fs.appendFileSync(log, JSON.stringify({ at: new Date().toISOString(), method: req.method, mode, path: "/" + rest.join("/") }) + "\n");
    const e = errors[mode];
    if (!e || !rest.join("/").startsWith("v1/messages")) {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ type: "error", error: { type: "not_found_error", message: "not found" } }));
        return;
    }
    res.writeHead(e[0], { "content-type": "application/json", "request-id": "req_fake_" + mode });
    res.end(JSON.stringify({ type: "error", error: { type: e[1], message: e[2] } }));
}).listen(Number(process.env.PORT), "127.0.0.1");
