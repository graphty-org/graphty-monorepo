/**
 * A sample mapping: the resolved dependency graph of one package version from deps.dev
 * (https://deps.dev). The body already holds a node array and an edge array whose ends are node
 * positions, so the body is a container and `#` gives each package its position as its id.
 * Catalog data for the `rest` source's samples.
 */

import { type RestMapping } from "../params.js";

/** The deps.dev dependencies mapping: `system` (npm, pypi, ...), `package` and `version`. */
export const DEPS_DEV_MAPPING: RestMapping = Object.freeze<RestMapping>({
    version: 1,
    endpoint: "https://api.deps.dev",
    load: "dependencies",
    directed: true,
    requests: {
        dependencies: {
            path: "/v3/systems/{system}/packages/{package}/versions/{version}:dependencies",
            records: ".",
            entity: "graph",
        },
    },
    entities: {
        graph: {
            id: "nodes",
            node: false,
            edges: [
                {
                    each: "edges[]",
                    from: "fromNode",
                    to: "toNode",
                    type: "depends_on",
                    entity: "package",
                    fields: { requirement: "requirement" },
                },
            ],
            embedded: [{ at: "nodes[]", entity: "package" }],
        },
        package: {
            id: "#",
            fields: {
                name: "versionKey.name",
                version: "versionKey.version",
                system: "versionKey.system",
                relation: "relation",
            },
        },
    },
});
