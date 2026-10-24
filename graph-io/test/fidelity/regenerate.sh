#!/usr/bin/env bash
# Regenerates the committed reference scenes (scenes/<sample>/<route>.ref.json) from the reference
# tools. Every extractor validates its scene and fails on a missing or empty tool output.
#
#   graph-io/test/fidelity/regenerate.sh [all | ci | <sample> ...]
#
# "ci" rebuilds only the two routes CI can run (graphviz-json from the pinned wasm Graphviz, and
# cyjs-computed from the package's own Cytoscape.js devDependency) into $OUT_DIR (default: a
# temporary directory) instead of scenes/, so they can be diffed against the committed ones.
#
# Tools (TOOLS.md lists versions and licenses) come from $STYLE_FIDELITY_TOOLS, default
# <main checkout>/tmp/style-fidelity/tools: jre17/ (Temurin JDK 17), gephi/ (Gephi Toolkit jar),
# conda-graphviz/ (Graphviz 14.1.2 CLI), npm-graphviz/ (@hpcc-js/wasm-graphviz 1.29.2), sigma/
# (graphology-gexf, sigma), py/ (networkx 3.7), drawio/ (draw.io 32.4.1 source). Cytoscape desktop
# must already run under servherd with CyREST on $CYREST_PORT. Browser steps run under
# $WITH_BROWSER (default tools/with-browser.sh of this checkout), the machine's
# shared browser slots.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
main=$(dirname "$(git -C "$here" rev-parse --path-format=absolute --git-common-dir)")
TOOLS=${STYLE_FIDELITY_TOOLS:-$main/tmp/style-fidelity/tools}
WITH_BROWSER=${WITH_BROWSER:-$(git -C "$here" rev-parse --show-toplevel)/tools/with-browser.sh}
C=$here/../corpus/styles
R=$here/references
mode=${1:-all}
if [[ "$mode" == "ci" ]]; then
    S=${OUT_DIR:-$(mktemp -d)}
else
    S=$here/scenes
fi
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
export FC_FONTATIONS=1

want() { [[ "$mode" == "all" || " $* " == *" $mode "* ]]; }
browser() {
    [[ -x "$WITH_BROWSER" ]] || { echo "regenerate.sh: no browser gate at $WITH_BROWSER (set WITH_BROWSER)" >&2; exit 2; }
    "$WITH_BROWSER" "$@"
}
cyrest() {
    [[ -n "${CYREST_PORT:-}" ]] || { echo "regenerate.sh: set CYREST_PORT to the running Cytoscape desktop's CyREST port" >&2; exit 2; }
    node "$R/cyrest.mjs" "$CYREST_PORT" "$@"
}
py() { PYTHONPATH="$TOOLS/py${PYTHONPATH:+:$PYTHONPATH}" python3 "$@"; }
finish() { node "$R/common.mjs" finish "$1"; }
G=$TOOLS/conda-graphviz/bin
gv_version() { "$G/dot" -V 2>&1 | awk '{print $5}'; }

# DOT: Graphviz itself (pinned wasm build, so CI can rebuild it)
if want dot-profile ci; then
    GRAPHVIZ_WASM_DIR=${GRAPHVIZ_WASM_DIR:-$TOOLS/npm-graphviz} node "$R/graphviz.mjs" \
        "$C/dot/graphviz-gallery-directed-profile.gv" "$S/dot-profile/graphviz-json.ref.json"
fi

# Cytoscape.js JSON: Cytoscape.js itself (the package's devDependency, so CI can rebuild it)
if want cyjs-genemania ci; then
    browser node "$R/cyjs.mjs" "$here/samples/cyjs-genemania.json" "$here/samples/cyjs-genemania.json" cyjs-computed \
        "$S/cyjs-genemania/cyjs-computed.ref.json"
fi
if want cyjs-glycolysis ci; then
    f=$C/json/iVis-at-Bilkent_cytoscape.js-cosep__glycolysis.json
    browser node "$R/cyjs.mjs" "$f" "$f" cyjs-computed "$S/cyjs-glycolysis/cyjs-computed.ref.json"
fi
[[ "$mode" == "ci" ]] && { echo "ci scenes in $S"; exit 0; }

# GEXF: Gephi, and graphology-gexf (sigma's reader) for the file's own edge colors
if want gexf-miserables; then
    JAVA_HOME=$(echo "$TOOLS"/jre17/jdk-17*) GEPHI_JAR=$TOOLS/gephi/gephi-toolkit-0.11.3-all.jar \
        node "$R/gephi.mjs" "$C/gexf/gexfjs-miserables.gexf" "$S/gexf-miserables/gephi-noscale.ref.json"
    SIGMA_DIR=$TOOLS/sigma node "$R/sigma.mjs" "$C/gexf/gexfjs-miserables.gexf" "$S/gexf-miserables/sigma.ref.json"
fi

# yEd GraphML: the file's own drawing, and draw.io's GraphML codec
if want graphml-yed-voctomix; then
    f=$C/graphml/yed-shapenode/voc__voctomix__schema.graphml
    python3 "$R/yed_facts.py" "$f" | finish "$S/graphml-yed-voctomix/yed-file.ref.json"
    DRAWIO_WEBAPP=$TOOLS/drawio/app/drawio/src/main/webapp browser node "$R/drawio.mjs" "$f" "$S/graphml-yed-voctomix/drawio.ref.json"
fi

# yEd GML: the file's own drawing (networkx), Cytoscape's GML reader, and gml2gv
if want gml-yed-pmodel; then
    f=$C/gml/ImperialCollegeLondon_pyrealm__pmodel.gml
    py "$R/yed_gml.py" "$f" | finish "$S/gml-yed-pmodel/yed-file.ref.json"
    cyrest "$f" "$f" cytoscape-gml "$S/gml-yed-pmodel/cytoscape-gml.ref.json"
    "$G/gml2gv" "$f" > "$work/pmodel.dot"
    "$G/neato" -n2 -Tjson "$work/pmodel.dot" > "$work/pmodel.json"
    node "$R/graphviz.mjs" --json "$work/pmodel.json" gml2gv "$f" "Graphviz gml2gv, neato -n2" "$(gv_version)" \
        "gml2gv <file> | neato -n2 -Tjson" "$S/gml-yed-pmodel/gml2gv.ref.json"
fi

# Pajek: the file's own values (it stores no coordinates, so nothing to pin in Graphviz)
if want pajek-iliad; then
    python3 "$R/pajek_file.py" "$C/pajek/kjhealy_kjhnet__iliad_killedby.net" | finish "$S/pajek-iliad/pajek-file.ref.json"
fi

# XGMML, CX, CX2, sessions: Cytoscape desktop, and its Cytoscape.js export drawn by Cytoscape.js
desktop() { # <sample dir> <file as stored>
    local name=$1 stored=$2 load=$2
    if [[ "$stored" == *.gz ]]; then
        load=$work/$(basename "${stored%.gz}")
        gunzip -c "$stored" > "$load"
    fi
    cyrest "$load" "$stored" cytoscape-desktop "$S/$name/cytoscape-desktop.ref.json" "$work/$name.cydoc.json"
    browser node "$R/cyjs.mjs" "$work/$name.cydoc.json" "$stored" cyjs-hop "$S/$name/cyjs-hop.ref.json"
}
want xgmml-basicdataviz && desktop xgmml-basicdataviz "$C/xgmml/BasicDataVizDemo.xgmml.gz"
want cx-ndex-90f78bcd && desktop cx-ndex-90f78bcd "$C/cx/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx"
want cx2-ndex-90f78bcd && desktop cx2-ndex-90f78bcd "$C/cx2/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx2"
want cys-annotation-example && desktop cys-annotation-example "$C/cys/cytoscape-tutorials-AnnotationExample.cys"
echo "done"
