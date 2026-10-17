/**
 * A vitest globalSetup: an HTTP server on 127.0.0.1 (another origin than the test page on
 * localhost) whose /cors/ routes send CORS headers and whose /plain/ routes send none, plus the
 * address of a port nothing listens on. The browser tests read both with inject().
 */

import { createServer, type Server } from "node:http";
import { type AddressInfo } from "node:net";

import { type TestProject } from "vitest/node";

declare module "vitest" {
    interface ProvidedContext {
        /** The CORS test server, http://127.0.0.1:<port>. */
        corsServer: string;
        /** An address nothing listens on. */
        deadServer: string;
    }
}

/**
 * Listen on a free loopback port.
 * @param server - the server
 * @returns its port
 */
function listen(server: Server): Promise<number> {
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
    const server = createServer((req, res) => {
        const cors = req.url?.startsWith("/cors/") === true;
        if (cors) {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
        }
        if (req.method === "OPTIONS") {
            res.writeHead(cors ? 204 : 405).end();
            return;
        }
        const auth = req.headers.authorization ?? null;
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
    const dead = createServer();
    const deadPort = await listen(dead);
    await new Promise<void>((resolve) => dead.close(() => resolve()));
    project.provide("corsServer", `http://127.0.0.1:${String(port)}`);
    project.provide("deadServer", `http://127.0.0.1:${String(deadPort)}`);
    return () => new Promise<void>((resolve) => server.close(() => resolve()));
}
