/**
 * A tiny SPARQL endpoint for tests: a fixed set of Wikidata-shaped triples, answered as N-Triples.
 * It understands exactly what the sparql source sends: `VALUES ?s` / `VALUES ?o` blocks, a
 * `langMatches` filter and a trailing `LIMIT n OFFSET m`. Any other query is answered with every
 * triple, one triple per solution, so a caller's CONSTRUCT pages too. A query holding `BROKEN` is
 * refused with a 400.
 */

import { createServer, type Server } from "node:http";
import { type AddressInfo } from "node:net";

const WD = "http://www.wikidata.org/entity/";
const WDT = "http://www.wikidata.org/prop/direct/";
const LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
const XSD = "http://www.w3.org/2001/XMLSchema#";

/** The triples: three laureates, their advisors, labels in two languages, a number. */
export const TRIPLES: readonly string[] = [
    `<${WD}Q937> <${WDT}P184> <${WD}Q57238> .`,
    `<${WD}Q937> <${LABEL}> "Albert Einstein"@en .`,
    `<${WD}Q937> <${LABEL}> "Albert Einstein"@de .`,
    `<${WD}Q937> <${WDT}P1971> "2"^^<${XSD}decimal> .`,
    `<${WD}Q57238> <${LABEL}> "Alfred Kleiner"@en .`,
    `<${WD}Q9095> <${WDT}P184> <${WD}Q47480> .`,
    `<${WD}Q9095> <${LABEL}> "Paul Dirac"@en .`,
    `<${WD}Q47480> <${LABEL}> "Ralph Fowler"@en .`,
    `<${WD}Q47480> <${WDT}P184> <${WD}Q7251> .`,
    `<${WD}Q7251> <${LABEL}> "J. J. Thomson"@en .`,
    `<${WD}Q556543> <${LABEL}> "G\\u00E9rard Mourou"@en .`,
    `<${WD}Q56855591> <${WDT}P184> <${WD}Q556543> .`,
];

/** One answered request. */
interface Answer {
    /** The status. */
    readonly status: number;
    /** The N-Triples, or the error text. */
    readonly body: string;
}

/**
 * The IRIs of a `VALUES ?<name> { ... }` block, or null without one.
 * @param query - the query
 * @param name - the variable
 * @returns the IRIs
 */
function values(query: string, name: string): Set<string> | null {
    const block = new RegExp(String.raw`VALUES \?${name} \{([^}]*)\}`).exec(query)?.[1];
    return block === undefined ? null : new Set(block.match(/<[^>]*>/g) ?? []);
}

/**
 * Answer a query.
 * @param query - the query text
 * @returns the status and body
 */
export function answer(query: string): Answer {
    if (query.includes("BROKEN")) {
        return { status: 400, body: "MalformedQueryException: Encountered BROKEN" };
    }
    const out = values(query, "s");
    const inward = values(query, "o");
    const lang = /langMatches\(lang\(\?o\), "([^"]*)"\)/.exec(query)?.[1];
    const page = /LIMIT (\d+)(?: OFFSET (\d+))?\s*$/.exec(query);
    let solutions = TRIPLES.filter((line) => {
        const [s, , ...rest] = line.split(" ");
        const o = rest.slice(0, -1).join(" ");
        if (out !== null || inward !== null) {
            return (out?.has(s) ?? false) || (inward?.has(o) ?? false);
        }
        return true;
    });
    if (lang !== undefined) {
        solutions = solutions.filter((line) => !/"@[a-z-]+ \.$/.test(line) || line.endsWith(`"@${lang} .`));
    }
    if (page !== null) {
        const offset = Number(page[2] ?? 0);
        solutions = solutions.slice(offset, offset + Number(page[1]));
    }
    return { status: 200, body: solutions.map((l) => `${l}\n`).join("") };
}

/**
 * Serve answer() over HTTP: a POST of `query=...` to any path.
 * @returns the server, its endpoint and the queries it received
 */
export async function startFixture(): Promise<{ server: Server; endpoint: string; queries: string[] }> {
    const queries: string[] = [];
    const server = createServer((req, res) => {
        let body = "";
        req.on("data", (chunk: Buffer) => {
            body += chunk.toString("utf8");
        });
        req.on("end", () => {
            const query = new URLSearchParams(body).get("query") ?? "";
            queries.push(query);
            const { status, body: text } = answer(query);
            res.writeHead(status, {
                "Content-Type": status === 200 ? "application/n-triples;charset=utf-8" : "text/plain",
            }).end(text);
        });
    });
    await new Promise<void>((resolve) => {
        server.listen(0, "127.0.0.1", resolve);
    });
    const { port } = server.address() as AddressInfo;
    return { server, endpoint: `http://127.0.0.1:${String(port)}/sparql`, queries };
}
