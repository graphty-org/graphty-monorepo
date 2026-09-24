import { assert, describe, it } from "vitest";

import * as catalog from "../../src/catalog/index";
import {
    type AlgorithmDescriptor,
    type AlgorithmKey,
    ATTRIBUTE_TYPES,
    type AttributeDescriptor,
    type AttributeType,
    COST_CLASSES,
    type CostClass,
    type FormatDescriptor,
    type FunctionDescriptor,
    isAttributeType,
    isCostClass,
    isOptionBound,
    isOptionType,
    isResultShape,
    KNOWN_ALGORITHMS,
    KNOWN_FORMAT_IDS,
    KNOWN_LAYOUT_IDS,
    KNOWN_PALETTE_IDS,
    type LayoutDescriptor,
    type MetricAvailability,
    OPTION_BOUND_SOURCES,
    OPTION_TYPES,
    type OptionBound,
    type OptionDescriptor,
    type OptionType,
    type PaletteDescriptor,
    type QueryValidation,
    RESULT_SHAPES,
    type ResultShape,
    type ScaleDescriptor,
    type ThemeDescriptor,
} from "../../src/catalog/types";

const pagerank: AlgorithmDescriptor = {
    key: "pagerank",
    plainName: "Influence",
    technicalName: "PageRank",
    description: "Ranks a node by the influence that flows into it from the nodes that point at it.",
    category: "centrality",
    shape: "node-metric",
    fields: [
        {
            name: "value",
            plainName: "Influence",
            technicalName: "PageRank score",
            kind: "node",
            type: "number",
            path: "results.pagerank.value",
        },
    ],
    options: [
        {
            name: "dampingFactor",
            plainName: "Damping Factor",
            technicalName: "dampingFactor",
            type: "number",
            default: 0.85,
            min: 0,
            max: 1,
            step: 0.05,
        },
    ],
    costClass: "iterative",
    complexity: "O(k(n + m))",
};

const circular: LayoutDescriptor = {
    id: "circular",
    plainName: "Ring",
    technicalName: "Circular layout",
    description: "Places every node on one circle.",
    family: "geometric",
    kind: "batch",
    maxDimensions: 3,
    sizeRating: "any",
    structuralInputs: ["ordering"],
    options: [],
    engine: "@graphty/layout",
    honoursWeights: false,
};

describe("catalogue descriptors", () => {
    it("survives a JSON round trip unchanged", () => {
        assert.deepEqual(JSON.parse(JSON.stringify(pagerank)), pagerank);
        assert.deepEqual(JSON.parse(JSON.stringify(circular)), circular);
    });

    it("carries a plain name and a technical name on every descriptor", () => {
        const format: FormatDescriptor = {
            id: "graphml",
            plainName: "GraphML",
            extensions: [".graphml"],
            mimeTypes: ["application/graphml+xml"],
            canImport: true,
            canExport: true,
            options: [],
        };
        const palette: PaletteDescriptor = {
            id: "viridis",
            plainName: "Viridis",
            kind: "sequential",
            colors: ["#440154", "#21918c", "#fde725"],
            capacity: null,
            colorblindSafe: ["deuteranopia", "protanopia"],
        };
        const scale: ScaleDescriptor = {
            name: "quantile",
            plainName: "Even groups",
            domainKind: "numeric",
            options: [],
        };
        const theme: ThemeDescriptor = {
            name: "paper",
            plainName: "Paper",
            document: {
                version: 1,
                layers: [{ name: "base", selector: { match: "everything" }, set: { "node.color": "#333333" } }],
            },
        };
        const fn: FunctionDescriptor = {
            name: "contains",
            arity: [2, 2],
            description: "True when the first argument contains the second.",
            returns: "boolean",
        };

        assert.deepEqual(
            [format.plainName, palette.plainName, scale.plainName, theme.plainName, fn.name],
            ["GraphML", "Viridis", "Even groups", "Paper", "contains"],
        );
    });

    it("describes an attribute and a metric as data", () => {
        const attribute: AttributeDescriptor = {
            path: "data.betweenness_centrality",
            token: "[betweenness_centrality]",
            name: "betweenness_centrality",
            plainName: "Bridging",
            technicalName: "Betweenness centrality",
            kind: "node",
            type: "number",
            origin: "computed",
            completeness: 1,
            sampleValues: [0, 0.25, 0.5],
        };
        const metric: MetricAvailability = {
            key: "betweenness",
            plainName: "Bridging",
            technicalName: "Betweenness centrality",
            available: false,
            reason: "This graph has 2.1 million edges, above the exact computation cap.",
            costClass: "cubic",
            estimateSeconds: 900,
            hasRun: false,
            runIds: [],
        };

        assert.deepEqual(JSON.parse(JSON.stringify({ attribute, metric })), { attribute, metric });
    });

    it("reports an unresolved path beside a syntactically valid query", () => {
        const validation: QueryValidation = {
            ok: false,
            unresolvedPaths: [
                {
                    path: "results.betweeness.value",
                    reason: "unknown-run",
                    candidates: ["results.betweenness.value"],
                },
            ],
        };

        assert.isUndefined(validation.error);
        assert.lengthOf(validation.unresolvedPaths[0].candidates, 1);
    });

    it("accepts a plugin's name wherever a built-in key is accepted", () => {
        const plugin: AlgorithmKey = "acme.triangle-density";

        assert.notInclude(KNOWN_ALGORITHMS, plugin);
        assert.include(KNOWN_ALGORITHMS, "betweenness");
    });

    it("lists the built-in layouts, formats and palettes at runtime", () => {
        assert.include(KNOWN_LAYOUT_IDS, "circular");
        assert.include(KNOWN_FORMAT_IDS, "graphml");
        assert.include(KNOWN_PALETTE_IDS, "okabe-ito");
    });

    it("reaches the emitter and every runtime list through the barrel", () => {
        assert.strictEqual(typeof catalog.optionsFromZod, "function");
        assert.strictEqual(catalog.KNOWN_ALGORITHMS, KNOWN_ALGORITHMS);
        assert.strictEqual(catalog.OPTION_TYPES, OPTION_TYPES);
        assert.strictEqual(catalog.RESULT_SHAPES, RESULT_SHAPES);
        assert.strictEqual(catalog.COST_CLASSES, COST_CLASSES);
        assert.strictEqual(catalog.ATTRIBUTE_TYPES, ATTRIBUTE_TYPES);
        assert.strictEqual(catalog.OPTION_BOUND_SOURCES, OPTION_BOUND_SOURCES);
        assert.strictEqual(catalog.KNOWN_LAYOUT_IDS, KNOWN_LAYOUT_IDS);
        assert.strictEqual(catalog.KNOWN_FORMAT_IDS, KNOWN_FORMAT_IDS);
        assert.strictEqual(catalog.KNOWN_PALETTE_IDS, KNOWN_PALETTE_IDS);
        assert.isTrue(catalog.isOptionType("enum"));
        assert.isTrue(catalog.isCostClass("heavy"));
        assert.isTrue(catalog.isResultShape("community"));
        assert.isTrue(catalog.isAttributeType("category"));
        assert.isTrue(catalog.isOptionBound({ from: "graph.nodeCount" }));
    });
});

describe("guards", () => {
    it("accepts every option type it publishes", () => {
        for (const type of OPTION_TYPES) {
            const narrowed: OptionType = type;
            assert.isTrue(isOptionType(narrowed));
        }

        assert.isFalse(isOptionType("slider"));
        assert.isFalse(isOptionType(7));
    });

    it("accepts every cost class it publishes", () => {
        for (const costClass of COST_CLASSES) {
            const narrowed: CostClass = costClass;
            assert.isTrue(isCostClass(narrowed));
        }

        assert.isFalse(isCostClass("cheap"));
        assert.isFalse(isCostClass(undefined));
    });

    it("accepts every result shape it publishes", () => {
        assert.lengthOf(RESULT_SHAPES, 11);
        for (const shape of RESULT_SHAPES) {
            const narrowed: ResultShape = shape;
            assert.isTrue(isResultShape(narrowed));
        }

        assert.isFalse(isResultShape("node-table"));
    });

    it("accepts every attribute type it publishes", () => {
        for (const type of ATTRIBUTE_TYPES) {
            const narrowed: AttributeType = type;
            assert.isTrue(isAttributeType(narrowed));
        }

        assert.isFalse(isAttributeType("date"));
    });

    it("tells a literal bound from a bound that has to be measured", () => {
        const literal: OptionDescriptor = {
            name: "k",
            plainName: "K",
            type: "integer",
            min: 1,
            max: 12,
        };
        const measured: OptionDescriptor = {
            name: "k",
            plainName: "K",
            type: "integer",
            min: 1,
            max: { from: "graph.maxCore" },
        };

        assert.isFalse(isOptionBound(literal.max));
        assert.isTrue(isOptionBound(measured.max));
        assert.isFalse(isOptionBound(null));
        assert.isFalse(isOptionBound({}));
        assert.isFalse(isOptionBound("graph.maxCore"));
    });

    it("accepts a bound reference a plugin invented", () => {
        const custom: OptionBound = { from: "graph.acme.longestChain" };

        assert.isTrue(isOptionBound(custom));
        for (const source of OPTION_BOUND_SOURCES) {
            assert.isTrue(isOptionBound({ from: source }));
        }
    });
});
