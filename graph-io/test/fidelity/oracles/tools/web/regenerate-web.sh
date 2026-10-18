#!/usr/bin/env bash
# Regenerates the web-library oracles (Cytoscape.js, sigma.js, vis-network) into oracles/:
# <sample>.svg, <sample>.oracle.json and <sample>.png (../rasterize.mjs) for every sample whose reference program is
# one of those libraries. How each SVG is made: web-oracle.mjs.
#
#   graph-io/test/fidelity/oracles/tools/web/regenerate-web.sh [<sample-id> ...]
#
# Installs the pinned libraries of package.json here (npm ci) on first use. The samples run one after
# another, each in its own headless Chromium, under one of the machine's shared browser slots
# (WITH_BROWSER, default <main checkout>/tmp/with-browser.sh, when it exists). Set
# ORACLE_SCREENSHOT_DIR to also save what Chromium showed, for checking an oracle against the live
# drawing.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
out=$(cd "$here/../.." && pwd)
test=$(cd "$out/../.." && pwd)
main=$(dirname "$(git -C "$here" rev-parse --path-format=absolute --git-common-dir)")
WITH_BROWSER=${WITH_BROWSER:-$main/tmp/with-browser.sh}
export FC_FONTATIONS=1

[[ -d "$here/node_modules" ]] || npm ci --prefix "$here" --no-audit --no-fund
if [[ -z "${WEB_ORACLE_SLOT:-}" && -x "$WITH_BROWSER" ]]; then
    WEB_ORACLE_SLOT=1 exec "$WITH_BROWSER" "$0" "$@"
fi

J=$test/corpus/styles/json/fidelity
SAMPLES=(
    "cyjs cyjs-genemania $test/fidelity/samples/cyjs-genemania.json"
    "cyjs cyjs-glycolysis $test/corpus/styles/json/iVis-at-Bilkent_cytoscape.js-cosep__glycolysis.json"
    "cyjs json-cyjs-winecheese $J/cyjs-winecheese.json.gz"
    "cyjs json-cyjs-tokyo $J/cyjs-tokyo.json.gz"
    "cyjs json-cyjs-graphmaker $J/cyjs-graphmaker.json"
    "cyjs json-cyjs-synth-nodes $J/cyjs-synth-nodes.json"
    "cyjs json-cyjs-synth-edges $J/cyjs-synth-edges.json"
    "cyjs json-cyjs-synth-edges-saved $J/cyjs-synth-edges-saved.json"
    "cyjs json-cyjs-perf $J/cyjs-perf.json.gz"
    "cyjs json-cyjs-sbgn-sciluna $J/cyjs-sbgn-sciluna.json"
    "sigma json-sigma-lesmis $J/sigma-lesmis.json"
    "sigma json-graphology-synth $J/graphology-synth.json"
    "sigma json-gephi-worldcup $J/gephi-worldcup.json.gz"
    "vis json-vis-unix $J/vis-unix.json"
    "vis json-vis-siblings $J/vis-siblings.json"
    "vis json-vis-transparency $J/vis-transparency.json"
    "vis json-vis-world $J/vis-world.json"
    "vis json-vis-lesmiserables $J/vis-lesmiserables.json"
    "vis json-vis-synth $J/vis-synth.json"
    "vis json-vis-nodelegend $J/vis-nodelegend.json"
)
# the Cytoscape.js specimen sheets (written by generators/specimens/cytoscapejs.mjs)
for f in "$test/fidelity/specimens/cytoscapejs"/specimen-*.json; do
    SAMPLES+=("cyjs cytoscapejs-$(basename "$f" .json) $f")
done
# the Gephi JSON specimen sheets (written by generators/specimens/gephi-json.mjs), drawn by sigma.js
for f in "$test/fidelity/specimens/gephi-json"/specimen-*.json; do
    SAMPLES+=("sigma gephi-json-$(basename "$f" .json) $f")
done

for s in "${SAMPLES[@]}"; do
    read -r family id file <<<"$s"
    if [[ $# -eq 0 || " $* " == *" $id "* ]]; then
        node "$here/web-oracle.mjs" "$family" "$id" "$file" "$out"
        node "$here/../rasterize.mjs" "$out/$id.svg"
    fi
done
