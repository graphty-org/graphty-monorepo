#!/usr/bin/env bash
# Regenerates the web-library oracles (Cytoscape.js, sigma.js, vis-network) into oracles/:
# <sample>.svg, <sample>.oracle.json and <sample>.png (../rasterize.mjs) for every sample whose reference program is
# one of those libraries. How each SVG is made: web-oracle.mjs.
#
#   graph-io/test/fidelity/oracles/tools/web/regenerate-web.sh [<sample-id> ...]
#
# The pinned libraries are graph-io's devDependencies (pnpm install). The samples run one after
# another, each in its own headless Chromium, under one of the machine's shared browser slots
# (WITH_BROWSER, default tools/with-browser.sh of this checkout, when it exists). Set
# ORACLE_SCREENSHOT_DIR to also save what Chromium showed, for checking an oracle against the live
# drawing.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
out=$(cd "$here/../.." && pwd)
test=$(cd "$out/../.." && pwd)
WITH_BROWSER=${WITH_BROWSER:-$(git -C "$here" rev-parse --show-toplevel)/tools/with-browser.sh}
export FC_FONTATIONS=1

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
# the vis-network specimen sheets (written by generators/specimens/vis-network.mjs)
for f in "$test/fidelity/specimens/vis-network"/specimen-*.json; do
    SAMPLES+=("vis vis-network-$(basename "$f" .json) $f")
done
# the Gephi JSON specimen sheets (written by generators/specimens/gephi-json.mjs), drawn by sigma.js
for f in "$test/fidelity/specimens/gephi-json"/specimen-*.json; do
    SAMPLES+=("sigma gephi-json-$(basename "$f" .json) $f")
done

# the graphology specimen pages (written by generators/specimens/graphology.mjs): each file under sigma's default
# settings, plus one sigma setting on the pages pages.json names (a settings JSON object without spaces)
while read -r page file settings; do
    SAMPLES+=("sigma graphology-$page $test/fidelity/specimens/graphology/$file $settings")
done < <(node -e 'for (const p of require(process.argv[1]).pages) console.log(p.id, p.file, JSON.stringify(p.settings))' \
    "$test/fidelity/specimens/graphology/pages.json")

for s in "${SAMPLES[@]}"; do
    read -r family id file settings <<<"$s"
    if [[ $# -eq 0 || " $* " == *" $id "* ]]; then
        node "$here/web-oracle.mjs" "$family" "$id" "$file" "$out" ${settings:+"$settings"}
        node "$here/../rasterize.mjs" "$out/$id.svg"
    fi
done
