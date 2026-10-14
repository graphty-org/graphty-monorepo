/**
 * The style fidelity samples: one real styled file per format (two for Cytoscape.js JSON), and the
 * routes whose reference scenes are committed for it under `scenes/<id>/<route>.ref.json`, best
 * first. SAMPLES.md says why each file was chosen and what each route can and cannot judge.
 */
import type { RouteId } from "./routes.js";

export interface FidelitySample {
    /** The directory under scenes/. */
    id: string;
    /** graph-io's format name. */
    format: string;
    /** The file, relative to graph-io/test/ (stored compressed when it ends in .gz). */
    file: string;
    license: string;
    /** Reference routes, the direct one first. */
    routes: RouteId[];
}

const styles = (path: string): string => `corpus/styles/${path}`;

export const SAMPLES: readonly FidelitySample[] = [
    {
        id: "dot-profile",
        format: "dot",
        file: styles("dot/graphviz-gallery-directed-profile.gv"),
        license: "EPL-2.0",
        routes: ["graphviz-json"],
    },
    {
        id: "gexf-miserables",
        format: "gexf",
        file: styles("gexf/gexfjs-miserables.gexf"),
        license: "MIT",
        routes: ["gephi-noscale", "sigma"],
    },
    {
        id: "graphml-yed-voctomix",
        format: "graphml",
        file: styles("graphml/yed-shapenode/voc__voctomix__schema.graphml"),
        license: "MIT",
        routes: ["yed-file", "drawio"],
    },
    {
        id: "gml-yed-need4stacks",
        format: "gml",
        file: styles("gml/spupyrev_bob__need4stacks261.gml"),
        license: "MIT",
        routes: ["yed-file", "cytoscape-gml", "gml2gv"],
    },
    {
        id: "pajek-b",
        format: "pajek",
        file: styles("pajek/graphstream_gs-core__B.net"),
        license: "LGPL-3.0-or-later OR CECILL-C",
        routes: ["pajek-file", "graphviz-n2"],
    },
    {
        id: "xgmml-basicdataviz",
        format: "xgmml",
        file: styles("xgmml/BasicDataVizDemo.xgmml.gz"),
        license: "CC0-1.0",
        routes: ["cytoscape-desktop", "cyjs-hop"],
    },
    {
        id: "cx-ndex-90f78bcd",
        format: "cx",
        file: styles("cx/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx"),
        license: "CC-BY-4.0",
        routes: ["cytoscape-desktop", "cyjs-hop"],
    },
    {
        id: "cx2-ndex-90f78bcd",
        format: "cx2",
        file: styles("cx2/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx2"),
        license: "CC-BY-4.0",
        routes: ["cytoscape-desktop", "cyjs-hop"],
    },
    {
        id: "cys-annotation-example",
        format: "cys",
        file: styles("cys/cytoscape-tutorials-AnnotationExample.cys"),
        license: "CC0-1.0",
        routes: ["cytoscape-desktop", "cyjs-hop"],
    },
    {
        id: "cyjs-scsweb",
        format: "json",
        file: styles("json/scsweb2020_graph-maker__aggregate-cy-graph.json.gz"),
        license: "MIT",
        routes: ["cyjs-computed"],
    },
    {
        id: "cyjs-handmade",
        format: "json",
        file: "fidelity/samples/cyjs-handmade.json",
        license: "MIT",
        routes: ["cyjs-computed"],
    },
];
