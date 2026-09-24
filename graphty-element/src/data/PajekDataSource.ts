import type { AdHocData } from "../config/common.js";
import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "./DataSource.js";

// Pajek has no additional config currently, so just use the base config
type PajekDataSourceConfig = BaseDataSourceConfig;

interface ParsedVertex {
    id: string;
    label?: string;
    x?: number;
    y?: number;
    z?: number;
}

interface ParsedEdge {
    src: string;
    dst: string;
    weight?: number;
    directed: boolean;
}

/**
 * The direction a Pajek file declares, or null when it declares none.
 *
 * Pajek states direction by which SECTION an edge is written in: a line under `*Arcs` is a
 * directed arc, a line under `*Edges` is an undirected edge. There is no graph-level statement to
 * appeal to, which means a file carrying both sections has described a mixed graph -- and the
 * element's snapshot has one direction flag for the whole graph.
 *
 * A mixed file is read as DIRECTED, because that is the reading that loses least: an arc stored in
 * an undirected graph GAINS a path that the file denies, from target back to source, and every
 * degree, reachability and centrality answer downstream is then computed over an edge the author
 * never wrote. An undirected edge stored in a directed graph loses its reverse direction, which is
 * visible, countable and reported here. Each edge also keeps its own `directed` flag on its record.
 *
 * A file with no edge lines at all falls back to the section HEADERS: `*Arcs` with nothing under it
 * still says this file lists arcs. A file with neither header states nothing.
 * @param edges - every edge line parsed, each carrying the section it came from
 * @param headers - which section headers appeared, however empty
 * @param headers.arcs - whether an `*Arcs` header appeared
 * @param headers.edges - whether an `*Edges` header appeared
 * @returns the declaration, or null when the file stated nothing
 */
function declareFromSections(
    edges: readonly ParsedEdge[],
    headers: { arcs: boolean; edges: boolean },
): { directed: boolean; statedBy: string; conflictingEdges: number } | null {
    const arcs = edges.filter((edge) => edge.directed).length;
    if (arcs > 0) {
        return { directed: true, statedBy: "*Arcs", conflictingEdges: edges.length - arcs };
    }

    if (edges.length > 0) {
        return { directed: false, statedBy: "*Edges", conflictingEdges: 0 };
    }

    if (headers.arcs) {
        return { directed: true, statedBy: "*Arcs", conflictingEdges: 0 };
    }

    return headers.edges ? { directed: false, statedBy: "*Edges", conflictingEdges: 0 } : null;
}

/**
 * Data source for loading graph data from Pajek NET format files.
 * Supports vertices, edges (arcs), and undirected edges with coordinates and weights.
 */
export class PajekDataSource extends DataSource {
    static readonly type = "pajek";

    private config: PajekDataSourceConfig;

    /**
     * Creates a new PajekDataSource instance.
     * @param config - Configuration options for Pajek parsing and data loading
     */
    constructor(config: PajekDataSourceConfig) {
        super(config.errorLimit ?? 100, config.chunkSize);
        this.config = config;
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.config;
    }

    /**
     * Fetches and parses Pajek NET format data into graph chunks.
     * @yields DataSourceChunk objects containing parsed nodes and edges
     */
    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        // Get Pajek content
        const content = await this.getContent();

        // Parse Pajek NET format
        const { vertices, edges, headers } = this.parsePajek(content);

        // Convert to AdHocData
        const nodes = vertices.map((v) => this.vertexToNode(v));
        const edgeData = edges.map((e) => this.edgeToEdgeData(e));

        // Declared BEFORE the first chunk is yielded, so the direction reaches the builder while it
        // still holds no edges.
        const declared = declareFromSections(edges, headers);
        if (declared !== null) {
            this.declareDirection(declared.directed, declared.statedBy, declared.conflictingEdges);
        }

        // Use shared chunking helper
        yield* this.chunkData(nodes, edgeData);
    }

    private parsePajek(content: string): {
        vertices: ParsedVertex[];
        edges: ParsedEdge[];
        headers: { arcs: boolean; edges: boolean };
    } {
        const lines = content.split("\n").map((line) => line.trim());
        const vertices: ParsedVertex[] = [];
        const edges: ParsedEdge[] = [];
        // A section header with no lines under it still says what kind of list this file is, which
        // is the only statement a file with no edges at all makes about its direction.
        const headers = { arcs: false, edges: false };

        let section: "none" | "vertices" | "arcs" | "edges" = "none";

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];

            // Skip blank lines
            if (!line) {
                continue;
            }

            // Check for section headers
            if (line.toLowerCase().startsWith("*vertices")) {
                section = "vertices";
                continue;
            }

            if (line.toLowerCase().startsWith("*arcs")) {
                section = "arcs";
                headers.arcs = true;
                continue;
            }

            if (line.toLowerCase().startsWith("*edges")) {
                section = "edges";
                headers.edges = true;
                continue;
            }

            // Process line based on current section
            if (section === "vertices") {
                const vertex = this.parseVertexLine(line, lineNum);
                if (vertex) {
                    vertices.push(vertex);
                }
            } else if (section === "arcs") {
                const edge = this.parseEdgeLine(line, lineNum, true);
                if (edge) {
                    edges.push(edge);
                }
            } else if (section === "edges") {
                const edge = this.parseEdgeLine(line, lineNum, false);
                if (edge) {
                    edges.push(edge);
                }
            }
        }

        return { vertices, edges, headers };
    }

    private parseVertexLine(line: string, lineNum: number): ParsedVertex | null {
        try {
            // Vertex format: id "label" x y z
            // Or: id x y z
            // Or: id "label"
            // Or: id

            // Extract vertex ID (first token)
            const { tokens, quotedIndices } = this.tokenizeLine(line);
            if (tokens.length === 0) {
                return null;
            }

            const id = tokens[0];
            let label: string | undefined;
            let x: number | undefined;
            let y: number | undefined;
            let z: number | undefined;

            // Check if second token is a quoted string (label)
            let coordStartIndex = 1;
            if (tokens.length > 1 && quotedIndices.has(1)) {
                label = tokens[1];
                coordStartIndex = 2;
            }

            // Parse coordinates
            if (tokens.length > coordStartIndex) {
                const xVal = parseFloat(tokens[coordStartIndex]);
                if (!isNaN(xVal)) {
                    x = xVal;
                }
            }

            if (tokens.length > coordStartIndex + 1) {
                const yVal = parseFloat(tokens[coordStartIndex + 1]);
                if (!isNaN(yVal)) {
                    y = yVal;
                }
            }

            if (tokens.length > coordStartIndex + 2) {
                const zVal = parseFloat(tokens[coordStartIndex + 2]);
                if (!isNaN(zVal)) {
                    z = zVal;
                }
            }

            return { id, label, x, y, z };
        } catch (error) {
            const canContinue = this.errorAggregator.addError({
                message: `Failed to parse vertex line ${lineNum + 1}: ${error instanceof Error ? error.message : String(error)}`,
                category: "parse-error",
                line: lineNum + 1,
            });

            if (!canContinue) {
                throw new Error(`Too many errors (${this.errorAggregator.getErrorCount()}), aborting parse`);
            }

            return null;
        }
    }

    private parseEdgeLine(line: string, lineNum: number, directed: boolean): ParsedEdge | null {
        try {
            // Edge format: src dst weight
            // Or: src dst
            const { tokens } = this.tokenizeLine(line);

            if (tokens.length < 2) {
                throw new Error("Edge must have at least source and target");
            }

            const src = tokens[0];
            const dst = tokens[1];
            let weight: number | undefined;

            if (tokens.length > 2) {
                const weightVal = parseFloat(tokens[2]);
                if (!isNaN(weightVal)) {
                    weight = weightVal;
                }
            }

            return { src, dst, weight, directed };
        } catch (error) {
            const canContinue = this.errorAggregator.addError({
                message: `Failed to parse edge line ${lineNum + 1}: ${error instanceof Error ? error.message : String(error)}`,
                category: "parse-error",
                line: lineNum + 1,
            });

            if (!canContinue) {
                throw new Error(`Too many errors (${this.errorAggregator.getErrorCount()}), aborting parse`);
            }

            return null;
        }
    }

    private tokenizeLine(line: string): { tokens: string[]; quotedIndices: Set<number> } {
        const tokens: string[] = [];
        const quotedIndices = new Set<number>();
        let current = "";
        let inQuotes = false;

        for (const char of line) {
            if (char === '"') {
                if (inQuotes) {
                    // End of quoted string
                    quotedIndices.add(tokens.length);
                    tokens.push(current);
                    current = "";
                    inQuotes = false;
                } else {
                    // Start of quoted string
                    if (current.trim()) {
                        tokens.push(current.trim());
                        current = "";
                    }

                    inQuotes = true;
                }

                continue;
            }

            if (inQuotes) {
                current += char;
            } else if (/\s/.test(char)) {
                if (current.trim()) {
                    tokens.push(current.trim());
                    current = "";
                }
            } else {
                current += char;
            }
        }

        if (current.trim()) {
            tokens.push(current.trim());
        }

        return { tokens, quotedIndices };
    }

    private vertexToNode(vertex: ParsedVertex): AdHocData {
        const node: Record<string, unknown> = {
            id: vertex.id,
        };

        if (vertex.label !== undefined) {
            node.label = vertex.label;
        }

        if (vertex.x !== undefined) {
            node.x = vertex.x;
        }

        if (vertex.y !== undefined) {
            node.y = vertex.y;
        }

        if (vertex.z !== undefined) {
            node.z = vertex.z;
        }

        return node as AdHocData;
    }

    private edgeToEdgeData(edge: ParsedEdge): AdHocData {
        const edgeData: Record<string, unknown> = {
            source: edge.src,
            target: edge.dst,
            directed: edge.directed,
        };

        if (edge.weight !== undefined) {
            edgeData.weight = edge.weight;
        }

        return edgeData as AdHocData;
    }
}
