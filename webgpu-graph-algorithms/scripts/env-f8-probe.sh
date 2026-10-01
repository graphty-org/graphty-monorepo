#!/usr/bin/env bash
# TEMPORARY (pull request #24, G-ENV finding ENV-F8): PageRank on this card under Dawn 0.6.1 and 0.4.0, each with the
# dense-row loops as they are now (counting down) and as they were (counting up to a runtime bound), interleaved
# twice so drift shows; then the SPIR-V guard counts of both shapes under both builds. Removed once answered.
# Run from webgpu-graph-algorithms after the build. Never fails the job: it is a measurement, not a gate.
set -u
out=benchmarks/out/env-f8
mkdir -p "$out"
w04=$(mktemp -d)
npm install --silent --no-save --prefix "$w04" webgpu@0.4.0 >/dev/null 2>&1 || echo "npm install webgpu@0.4.0 failed"
m04="$w04/node_modules/webgpu"
m06="$(cd node_modules/webgpu && pwd -P)"
# the "before" source: the three dense twins put back to the up-counting loop, nothing else changed
rm -rf tmp/env-f8 && mkdir -p tmp/env-f8 && cp -r src tmp/env-f8/src
node -e '
const fs = require("fs");
for (const f of ["spmv-pull", "segmented-reduce", "fa2-attraction"]) {
    const p = `tmp/env-f8/src/wgsl/${f}.wgsl.ts`;
    const s = fs.readFileSync(p, "utf8");
    const re = /for \(var left = select\(0u, hi - lo, hi > lo\); left > 0u; left = left - 1u\) \{[^\n]*\n\s*let arc = hi - left;[^\n]*\n/;
    if (!re.test(s)) { console.error(`no dense loop in ${f}`); process.exit(1); }
    fs.writeFileSync(p, s.replace(re, "for (var arc = lo; arc < hi; arc = arc + 1u) {\n"));
}' || exit 0
run() { node --import tsx scripts/env-f8-probe.mjs "$@" 2>&1 | grep -E '^(RESULT|GUARD)|Error' | tee -a "$out/probe.txt"; }
for round in 1 2; do
    run --mod "$m06" --src src --tag "r$round 0.6.1 down"
    run --mod "$m06" --src tmp/env-f8/src --tag "r$round 0.6.1 up"
    run --mod "$m04" --src src --tag "r$round 0.4.0 down"
    run --mod "$m04" --src tmp/env-f8/src --tag "r$round 0.4.0 up"
done
for v in 06 04; do
    m=$([ $v = 06 ] && echo "$m06" || echo "$m04")
    for shape in down up; do
        s=$([ $shape = down ] && echo src || echo tmp/env-f8/src)
        node --import tsx scripts/env-f8-probe.mjs --mod "$m" --src "$s" --dump > "$out/dump-$v-$shape.txt" 2>&1
        run --parse "$out/dump-$v-$shape.txt" --tag "$v $shape"
    done
done
exit 0
