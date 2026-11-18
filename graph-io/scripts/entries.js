/**
 * The bundle entries of @graphty/graph-io: the root barrel, one entry per format subpath
 * (`@graphty/graph-io/<format>`), one per network source (`@graphty/graph-io/sources/<name>`),
 * and the format-independent `@graphty/graph-io/styles` and `/positions` modules; ENTRIES
 * below is the list. Shared by scripts/build-bundle.js (which emits dist/<name>.js for each) and
 * tools/build-bundle.mjs (which writes the matching dist/<name>.d.ts shim); package.json
 * "exports" must list the same names, which test/build-output.test.ts checks.
 *
 * Keys are the output names under dist/, values the source entry relative to the package root.
 */

export const ENTRIES = Object.freeze({
    "graph-io": "src/index.ts",
    gexf: "src/formats/gexf/index.ts",
    graphml: "src/formats/graphml/index.ts",
    gml: "src/formats/gml/index.ts",
    dot: "src/formats/dot/index.ts",
    pajek: "src/formats/pajek/index.ts",
    csv: "src/formats/csv/index.ts",
    json: "src/formats/json/index.ts",
    neo4j: "src/formats/neo4j/index.ts",
    xgmml: "src/formats/xgmml/index.ts",
    cx2: "src/formats/cx2/index.ts",
    cx: "src/formats/cx/index.ts",
    obo: "src/formats/obo/index.ts",
    cys: "src/formats/cys/index.ts",
    // the default source list, without any importer (@graphty/graph-io/sources)
    sources: "src/sources/index.ts",
    // the network sources, each loaded on first use (@graphty/graph-io/sources/<name>)
    "sources-ndex": "src/sources/ndex/index.ts",
    "sources-cypher": "src/sources/cypher/index.ts",
    "sources-rest": "src/sources/rest/index.ts",
    "sources-sparql": "src/sources/sparql/index.ts",
    "sources-github": "src/sources/github/index.ts",
    "sources-s3": "src/sources/s3/index.ts",
    "sources-zenodo": "src/sources/zenodo/index.ts",
    "sources-gremlin": "src/sources/gremlin/index.ts",
    styles: "src/styles/index.ts",
    positions: "src/positions/index.ts",
});
