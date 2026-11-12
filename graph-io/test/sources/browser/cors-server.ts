/**
 * A vitest globalSetup: an HTTP server on 127.0.0.1 (another origin than the test page on
 * localhost) whose /cors/ routes send CORS headers and whose /plain/ routes send none, plus the
 * address of a port that refuses every request. The browser tests read both with inject().
 */

import { createServer, type Server } from "node:http";
import { type AddressInfo, createServer as createTcpServer, type Server as TcpServer } from "node:net";

import { type TestProject } from "vitest/node";

import { openalexAnswer } from "../rest/openalex-fixture.js";
import { answer } from "../sparql/fixture.js";

declare module "vitest" {
    interface ProvidedContext {
        /** The CORS test server, http://127.0.0.1:<port>. */
        corsServer: string;
        /** An address whose every connection is dropped before any answer. */
        deadServer: string;
    }
}

/**
 * Listen on a free loopback port.
 * @param server - the server
 * @returns its port
 */
function listen(server: Server | TcpServer): Promise<number> {
    return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port));
    });
}

/**
 * Start the servers.
 * @param project - the vitest project
 * @returns the teardown
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
    /** The api_key and Authorization of every OpenAlex stand-in request, until read. */
    const openalexSeen: { apiKey: string | null; authorization: string | null }[] = [];
    const server = createServer((req, res) => {
        const cors = req.url?.startsWith("/cors/") === true;
        if (cors) {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
        }
        if (req.method === "OPTIONS") {
            // the SPARQL endpoint answers no preflight: a SPARQL query must be a simple request
            res.writeHead(cors && !req.url?.endsWith("/sparql") ? 204 : 405).end();
            return;
        }
        if (req.method === "POST" && req.url?.endsWith("/sparql") === true) {
            let body = "";
            req.on("data", (chunk: Buffer) => {
                body += chunk.toString("utf8");
            });
            req.on("end", () => {
                const { status, body: text } = answer(new URLSearchParams(body).get("query") ?? "");
                res.writeHead(status, { "Content-Type": "application/n-triples" }).end(text);
            });
            return;
        }
        const auth = req.headers.authorization ?? null;
        if (req.url?.startsWith("/cors/openalex/") === true) {
            // a stand-in for api.openalex.org: /log hands over what the other routes saw
            const url = new URL(req.url.slice("/cors/openalex".length), "http://stand-in");
            if (url.pathname === "/log") {
                res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(openalexSeen.splice(0)));
                return;
            }
            openalexSeen.push({ apiKey: url.searchParams.get("api_key"), authorization: auth });
            res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(openalexAnswer(url)));
            return;
        }
        if (req.url === "/cors/redirect") {
            // a redirect to another origin, which a credentialed request must never follow
            res.writeHead(302, { Location: "http://localhost:9/elsewhere" }).end();
            return;
        }
        if (req.method === "POST" && req.url === "/cors/db/neo4j/query/v2") {
            // a Neo4j Query API answer in typed JSON: one relationship between two nodes
            const node = (id: string): unknown => ({
                $type: "Node",
                _value: {
                    _element_id: id,
                    _labels: ["Person"],
                    _properties: { name: { $type: "String", _value: id } },
                },
            });
            const rel = {
                $type: "Relationship",
                _value: {
                    _element_id: "r1",
                    _start_node_element_id: "a",
                    _end_node_element_id: "b",
                    _type: "KNOWS",
                    _properties: {},
                },
            };
            res.writeHead(200, { "Content-Type": "application/vnd.neo4j.query.v1.1" });
            res.end(JSON.stringify({ data: { fields: ["a", "r", "b"], values: [[node("a"), rel, node("b")]] }, auth }));
            return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b" }], auth }));
    });
    const port = await listen(server);
    // Held for the whole run: a port closed after reading it could be handed to another listener
    // (vitest's browser server, Playwright) and answer. Each connection is reset unanswered, which
    // the browser's fetch reports as a network error, as it does a port nothing listens on.
    const dead = createTcpServer((socket) => socket.resetAndDestroy());
    const deadPort = await listen(dead);
    project.provide("corsServer", `http://127.0.0.1:${String(port)}`);
    project.provide("deadServer", `http://127.0.0.1:${String(deadPort)}`);
    const close = (s: Server | TcpServer): Promise<void> => new Promise((resolve) => s.close(() => resolve()));
    return async () => {
        const closed = Promise.all([close(server), close(dead)]);
        // close() ends only idle connections and stops the headers-timeout sweep, so a socket
        // Chromium opened and never sent a request on (a preconnect) held the run open forever,
        // with the browser still up. Every test is done here, so end every connection.
        server.closeAllConnections();
        await closed;
    };
}
