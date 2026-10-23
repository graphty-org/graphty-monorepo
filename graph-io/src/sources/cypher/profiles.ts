/**
 * What differs between openCypher servers (design section 12.2, "the profile"): the id
 * expression, and the server facts `probe` reports. Everything else in the Cypher source is shared.
 */

/** The facts of one server the Cypher source talks to. */
export interface CypherProfile {
    /** "neo4j" or "neptune". */
    readonly name: "neo4j" | "neptune";
    /** true: ids are `elementId(n)` (Neo4j 5 and later); false: `id(n)` (Neo4j before 5, Neptune's `~id`). */
    readonly elementIds: boolean;
    /** The product, as the server names it. */
    readonly product: string;
    /** The server's version, when known. */
    readonly version: string | null;
    /** "enforced": the server refuses writes in this session; "not-enforced": nothing in the request does. */
    readonly readOnly: "enforced" | "not-enforced";
}

/**
 * The Neo4j profile for a version: `elementId()` from 5.0, `id()` before.
 * @param version - the server's version, or null when not known (assumed 5 or later)
 * @param product - the product name
 * @returns the profile
 */
export function neo4jProfile(version: string | null, product = "Neo4j"): CypherProfile {
    const major = version === null ? Number.NaN : Number.parseInt(version, 10);
    return {
        name: "neo4j",
        elementIds: Number.isNaN(major) || major >= 5,
        product,
        version,
        readOnly: "enforced",
    };
}

/**
 * The profile of a Bolt server from its agent string ("Neo4j/3.5.12"). A server that is not Neo4j
 * gets `id()`, which every openCypher server has.
 * @param agent - the server agent
 * @returns the profile
 */
export function profileFromAgent(agent: string): CypherProfile {
    const [product = "", version = ""] = agent.split("/");
    if (product.toLowerCase() === "neo4j") {
        return neo4jProfile(version === "" ? null : version);
    }
    return {
        name: "neo4j",
        elementIds: false,
        product,
        version: version === "" ? null : version,
        readOnly: "enforced",
    };
}

/**
 * The Neptune profile: ids are `id(n)`, the `~id` string, never reused.
 * @param version - the engine version, when known
 * @returns the profile
 */
export function neptuneProfile(version: string | null = null): CypherProfile {
    return { name: "neptune", elementIds: false, product: "Neptune", version, readOnly: "not-enforced" };
}

/**
 * The server facts of a profile, as `probe` and `report.source.server` give them.
 * @param profile - the profile
 * @returns the facts
 */
export function serverFacts(profile: CypherProfile): Readonly<Record<string, string>> {
    return {
        product: profile.product,
        profile: profile.name,
        readOnly: profile.readOnly,
        ...(profile.version === null ? {} : { version: profile.version }),
    };
}
