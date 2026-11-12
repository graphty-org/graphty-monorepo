/**
 * The autosave diagnostics collector: receives the lines the diagnostics story
 * (stories/AutosaveDiagnostics.stories.ts) sends with `navigator.sendBeacon`, stamps each with the
 * time it arrived, and appends it to `tmp/autosave-diagnostics/collector.jsonl`. A copy outside the
 * browser survives what the test may do to the browser's storage. GET / lists every line.
 *
 * Start it through servherd, over HTTPS so a page served over HTTPS may post to it:
 *
 *   servherd_start({ name: "autosave-collector", cwd: "<repo>/graphty-element", protocol: "https",
 *     command: "env HTTPS_CERT_PATH={{httpsCert}} HTTPS_KEY_PATH={{httpsKey}} node scripts/autosave-collector.mjs",
 *     env: { PORT: "{{port}}" } })
 *
 * Then open the story with `&collector=https://<host>:<port>` added to its iframe URL.
 */

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { createServer as createHttp } from "node:http";
import { createServer as createHttps } from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT);
if (!port) {
    throw new Error("PORT is not set: start it through servherd, which sets PORT");
}

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../tmp/autosave-diagnostics");
const file = path.join(dir, "collector.jsonl");
mkdirSync(dir, { recursive: true });

const handle = (request, response) => {
    response.setHeader("access-control-allow-origin", "*");
    if (request.method === "POST" && request.url === "/log") {
        let body = "";
        request.on("data", (chunk) => (body += chunk));
        request.on("end", () => {
            let line;
            try {
                line = JSON.parse(body);
            } catch {
                line = { unparsed: body };
            }

            appendFileSync(
                file,
                `${JSON.stringify({ received: new Date().toISOString(), from: request.socket.remoteAddress, ...line })}\n`,
            );
            response.writeHead(204).end();
        });
        return;
    }

    if (request.method === "GET" && request.url === "/") {
        let text = "";
        try {
            text = readFileSync(file, "utf8");
        } catch {
            // Nothing received yet.
        }

        response.writeHead(200, { "content-type": "text/plain; charset=utf-8" }).end(text);
        return;
    }

    response.writeHead(404).end();
};

const tls = process.env.HTTPS_CERT_PATH && process.env.HTTPS_KEY_PATH;
const server = tls
    ? createHttps(
          { cert: readFileSync(process.env.HTTPS_CERT_PATH), key: readFileSync(process.env.HTTPS_KEY_PATH) },
          handle,
      )
    : createHttp(handle);
server.listen(port, process.env.HOST ?? "0.0.0.0", () => {
    console.log(
        `autosave collector on ${tls ? "https" : "http"}://${process.env.HOST ?? "0.0.0.0"}:${port}, writing ${file}`,
    );
});
