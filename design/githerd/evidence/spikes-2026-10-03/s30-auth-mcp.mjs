// An HTTP MCP endpoint that demands OAuth: every request gets 401 with a Bearer challenge.
import http from "node:http";
import fs from "node:fs";
const log = new URL("./auth-requests.log", import.meta.url);
const port = Number(process.env.PORT);
http.createServer((req, res) => {
    fs.appendFileSync(log, `${new Date().toISOString()} ${req.method} ${req.url}\n`);
    res.writeHead(401, {
        "content-type": "application/json",
        "www-authenticate": `Bearer resource_metadata="http://127.0.0.1:${port}/.well-known/oauth-protected-resource"`,
    });
    res.end(JSON.stringify({ error: "unauthorized" }));
}).listen(port, "127.0.0.1");
