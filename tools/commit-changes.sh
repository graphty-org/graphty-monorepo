#!/usr/bin/env bash
#
# commit-changes.sh -- land the working tree as a sequence of conventional commits.
#
# Start here:
#
#   ./tools/commit-changes.sh --dry-run     # read the plan; STAGES NOTHING
#   ./tools/commit-changes.sh               # make the commits
#   ./tools/commit-changes.sh --check       # run prepush:fast first, abort if it fails
#
# WHY THIS SCRIPT EXISTS, and why it does not use `git commit -m`.
#
# .husky/prepare-commit-msg is:
#
#     exec < /dev/tty && npx cz --hook || true
#
# That is Commitizen's INTERACTIVE prompt. A scripted `git commit -m "..."` hands
# control to the wizard, which either replaces the message it was given or hangs
# waiting for an answer nobody is watching -- so the commit never lands. The fix,
# taken from tmp/commit-hardening.sh, is to commit with core.hooksPath pointed at a
# temporary directory holding a copy of .husky/commit-msg and NOTHING else:
# commitlint still validates every message, and prepare-commit-msg is not there to
# run. The directory is removed in an EXIT trap. (.husky currently has no pre-commit
# hook; if one is added, it has to be copied in here too or it will be skipped.)
#
# It does NOT push. Pushing stays a separate, deliberate step -- and the pre-push
# hook (.husky/pre-push -> pnpm run prepush:fast -> tools/prepush.sh) runs the
# validation then.
#
# The plan below is tailored to one specific change set: the P5 phase of the
# WebGPU work (Fruchterman-Reingold and the spring-electrical preset, branch
# feat/gpu-p5-p4, seventeen commits). It is data, not machinery --
# STEPS, SUBJECTS, PATHS and one body_*
# function each. Re-point it at the next change set rather than reusing the
# messages, and read the diff before you write a message, not a summary of it.
#
# The repository releases with semantic-release, so every subject has to be a
# conventional commit: <type>(<scope>): <subject>, where type is one of
# feat / fix / perf / refactor / docs / test / build / ci / chore / style / revert
# and scope comes from commitlint.config.js's scope-enum. Subjects, scopes and body
# line lengths are all checked here, before anything is staged, rather than being
# discovered by a commit-msg failure halfway through the run.

set -euo pipefail

# Associative arrays, so bash 4 or newer. macOS ships bash 3.2 as /bin/bash; the
# shebang finds a newer one on PATH, and this says so rather than failing obscurely
# on an unbound variable.
if [ -z "${BASH_VERSINFO:-}" ] || [ "${BASH_VERSINFO[0]}" -lt 4 ]; then
    echo "commit-changes: needs bash 4 or newer (found ${BASH_VERSION:-unknown})." >&2
    exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DRY_RUN=0
CHECK=0

usage() {
    cat <<'USAGE'
commit-changes.sh -- land the working tree as a sequence of conventional commits.

  ./tools/commit-changes.sh --check     Validate every message against commitlint
                                        and STOP. Stages nothing, commits nothing.

  ./tools/commit-changes.sh --dry-run   Print the plan: every commit, its subject,
                                       its message and its diffstat. STAGES NOTHING
                                       and touches neither the index nor HEAD. Do
                                       this first, every time.
  ./tools/commit-changes.sh             Make the commits. One signing passphrase
                                       prompt per commit; no Commitizen wizard.
  ./tools/commit-changes.sh --check     Run `pnpm run prepush:fast` first and abort
                                       if it fails. Slow (minutes), thorough.
  ./tools/commit-changes.sh --help      This text.

Options: -n/--dry-run, -c/--check, -h/--help.

A commit whose paths have nothing left to commit is skipped with a note, so a
re-run after an interruption picks up where it stopped. Nothing is pushed.
USAGE
}

while [ $# -gt 0 ]; do
    case "$1" in
        -n|--dry-run)
            DRY_RUN=1
            shift
            ;;
        -c|--check)
            CHECK=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        --)
            shift
            break
            ;;
        *)
            echo "commit-changes: unexpected argument '$1'" >&2
            echo "This script carries its own messages; it takes no message argument." >&2
            echo "Try './tools/commit-changes.sh --help'." >&2
            exit 2
            ;;
    esac
done

# ---------------------------------------------------------------------------
# THE PLAN.
#
# One entry per commit, in the order they are made. The order is a build order:
# the dependency before the code that imports it, the library before the app, the
# shell before the deletion of the shell it supersedes, tooling last.
#
# PATHS entries are space-separated pathspecs (no path in this repository has a
# space in it, so the word splitting below is deliberate). A directory pathspec
# takes everything under it, which is what makes the 134-file shell one entry --
# ignored files under it (the __screenshots__ directories) are not added, because
# `git add` without -f leaves ignored paths alone and the preview below uses
# `git ls-files --others --exclude-standard`, which counts the same set.
# ---------------------------------------------------------------------------

# The P5 phase: the two prior-phase docs commits (the G6 sign-off, the P5 / P4 plans, the design
# amendments), then one commit per P5 task in the plan's execution order (T4 after T5, because the
# parity suite covers both models), then the script itself.
STEPS=(g6 plans amendments seams laws fr spring parity accelerator sabotage bench smoke cooling demo decisions gate tools)

declare -A SUBJECTS=(
    [g6]="docs(webgpu-graph-algorithms): sign off the G6 algorithms gate record"
    [plans]="docs(webgpu-graph-algorithms): add the P5 and P4 phase plans"
    [amendments]="docs(webgpu-graph-algorithms): record the frontier, Louvain and mask amendments and future work"
    [seams]="feat(webgpu-graph-algorithms): add the option, stats and fixed-mask seams of the P5 layout models"
    [laws]="feat(webgpu-graph-algorithms): add the FR, coulomb and spring laws and integrators to the kernels"
    [fr]="feat(webgpu-graph-algorithms): add the Fruchterman-Reingold model, its factory and its f64 oracle"
    [spring]="feat(webgpu-graph-algorithms): add the spring-electrical preset and its ngraph-checked oracle"
    [parity]="test(webgpu-graph-algorithms): add the P5 parity suites and record their noise floors"
    [accelerator]="feat(webgpu-graph-algorithms): expose fruchtermanReingold and springElectrical on the accelerator"
    [sabotage]="test(webgpu-graph-algorithms): add the P5 sabotage rows and suites"
    [bench]="feat(webgpu-graph-algorithms): add the layout-fr benchmark group and record T-14 on the dev box"
    [smoke]="test(webgpu-graph-algorithms): add the FR and spring browser smoke and the FR frame loop"
    [cooling]="feat(layout): add the cooling option and the nullable spring constants to the layout option types"
    [demo]="feat(webgpu-graph-algorithms): add the P5 models and four SNAP networks to the browser demo"
    [decisions]="docs: record the P5 design decisions beside the WebGPU design"
    [gate]="docs(webgpu-graph-algorithms): close the G5 gate record"
    [tools]="chore(tools): point the commit script at the P5 phase"
)

declare -A PATHS=(
    [g6]="webgpu-graph-algorithms/docs/decisions/G6-algorithms.md"
    [plans]="design/webgpu/plans/2026-09-20-webgpu-p5-fruchterman-reingold.md design/webgpu/plans/2026-09-20-webgpu-p4-grid-pyramid-and-tiers.md design/webgpu/README.md"
    [amendments]="design/webgpu/webgpu-acceleration-plan.md"
    [seams]="webgpu-graph-algorithms/src/layouts/model-common.ts webgpu-graph-algorithms/src/constants.ts webgpu-graph-algorithms/src/types/options.ts webgpu-graph-algorithms/src/types/layout.ts webgpu-graph-algorithms/src/layouts/force-simulation.ts webgpu-graph-algorithms/test/layouts/force-simulation.test.ts webgpu-graph-algorithms/test/device/constants.test.ts"
    [laws]="webgpu-graph-algorithms/src/kernels.ts webgpu-graph-algorithms/src/wgsl/fa2-stats-finalize.wgsl.ts webgpu-graph-algorithms/src/wgsl/fa2-attraction.wgsl.ts webgpu-graph-algorithms/src/wgsl/fa2-repulsion-exact.wgsl.ts webgpu-graph-algorithms/src/wgsl/fa2-integrate.wgsl.ts webgpu-graph-algorithms/src/layouts/forceatlas2.ts webgpu-graph-algorithms/test/helpers/override-matrix.ts webgpu-graph-algorithms/test/kernel/wgsl-compile.test.ts webgpu-graph-algorithms/test/kernel/registry.test.ts webgpu-graph-algorithms/test/kernel/state-roundtrip.test.ts webgpu-graph-algorithms/test/browser/state-roundtrip.test.ts webgpu-graph-algorithms/test/layouts/fa2-options.test.ts"
    [fr]="webgpu-graph-algorithms/src/layouts/fruchterman-reingold.ts webgpu-graph-algorithms/test/oracle/fruchterman-reingold.ts webgpu-graph-algorithms/test/layouts/fr-options.test.ts webgpu-graph-algorithms/test/layouts/fr-behaviour.test.ts webgpu-graph-algorithms/test/layouts/fr-properties.test.ts webgpu-graph-algorithms/test/oracle/oracles.test.ts"
    [spring]="webgpu-graph-algorithms/package.json pnpm-lock.yaml webgpu-graph-algorithms/src/layouts/spring-electrical.ts webgpu-graph-algorithms/test/oracle/spring-electrical.ts webgpu-graph-algorithms/test/oracle/spring-electrical-ngraph.test.ts webgpu-graph-algorithms/test/helpers/story-graph.ts webgpu-graph-algorithms/test/layouts/se-options.test.ts webgpu-graph-algorithms/test/layouts/se-behaviour.test.ts webgpu-graph-algorithms/test/layouts/se-properties.test.ts webgpu-graph-algorithms/test/layouts/se-settle.test.ts"
    [parity]="webgpu-graph-algorithms/test/helpers/fr-parity.ts webgpu-graph-algorithms/test/helpers/se-parity.ts webgpu-graph-algorithms/test/layouts/fr-inspect.test.ts webgpu-graph-algorithms/test/layouts/fr-trace.test.ts webgpu-graph-algorithms/test/layouts/fr-twins.test.ts webgpu-graph-algorithms/test/layouts/fr-layout-oracle.test.ts webgpu-graph-algorithms/test/layouts/fr-lifecycle.test.ts webgpu-graph-algorithms/test/layouts/fr-force-sum.test.ts webgpu-graph-algorithms/test/layouts/fr-distributional.test.ts webgpu-graph-algorithms/test/layouts/se-inspect.test.ts webgpu-graph-algorithms/test/layouts/se-trace.test.ts webgpu-graph-algorithms/test/layouts/se-force-sum.test.ts webgpu-graph-algorithms/test/layouts/se-distributional.test.ts webgpu-graph-algorithms/test/helpers/fa2-parity.ts webgpu-graph-algorithms/test/noise-floor.test.ts webgpu-graph-algorithms/benchmarks/results/noise-floor.json webgpu-graph-algorithms/test/fixtures/noise"
    [accelerator]="webgpu-graph-algorithms/src/types/accelerator.ts webgpu-graph-algorithms/src/accelerator.ts webgpu-graph-algorithms/src/index.ts webgpu-graph-algorithms/test/index.test.ts webgpu-graph-algorithms/test/accelerator.test.ts webgpu-graph-algorithms/test/types/public-api.test-d.ts webgpu-graph-algorithms/test/types/accelerator.test-d.ts webgpu-graph-algorithms/test/types/options.test-d.ts webgpu-graph-algorithms/test/types/conformance.test-d.ts"
    [sabotage]="webgpu-graph-algorithms/test/helpers/sabotage.ts webgpu-graph-algorithms/test/sabotage/fr.test.ts webgpu-graph-algorithms/test/sabotage/se.test.ts"
    [bench]="webgpu-graph-algorithms/benchmarks/layout-fr.bench.ts webgpu-graph-algorithms/benchmarks/layout-exact.bench.ts webgpu-graph-algorithms/benchmarks/run.ts webgpu-graph-algorithms/test/benchmarks.test.ts webgpu-graph-algorithms/README.md webgpu-graph-algorithms/benchmarks/results/nvidia-lovelace-driver580.json"
    [smoke]="webgpu-graph-algorithms/test/helpers/frame-loop.ts webgpu-graph-algorithms/test/layouts/fr-frame-loop.test.ts webgpu-graph-algorithms/test/browser/spring-layouts.test.ts"
    [cooling]="layout/src/simulation/types.ts webgpu-graph-algorithms/test/layouts/fr-adaptive.test.ts"
    [demo]="webgpu-graph-algorithms/demo/main.ts webgpu-graph-algorithms/demo/index.html"
    [decisions]="design/decisions/2026-09-20-spring-electrical-settles-by-the-shared-rule.md design/decisions/2026-09-20-spring-electrical-integrates-like-ngraph.md design/decisions/2026-09-20-fr-reheat-restarts-the-temperature-not-the-budget.md design/decisions/README.md design/README.md"
    [gate]="webgpu-graph-algorithms/docs/decisions/G5.md webgpu-graph-algorithms/CLAUDE.md"
    [tools]="tools/commit-changes.sh"
)

# ---------------------------------------------------------------------------
# The message bodies. One function each, a quoted heredoc so backticks, `$` and
# `${...}` in the prose stay literal. Keep every line at or under 100 characters:
# that is commitlint's body-max-line-length, and it is checked before staging.
# ---------------------------------------------------------------------------

body_g6() {
    cat <<'BODY'
The G6 algorithms record was written before any of the M8a commits existed and
carried placeholders for the hashes, the released versions, the lane runs and
the signature. They are filled: the nine commits 061c9626 .. 8bc1cda1 merged to
master as pull request 15 (ffd6b329); algorithms 1.7.2 became 1.8.0 and
webgpu-graph-algorithms 0.3.0 became 0.5.0 in the release of 2026-09-20; ci.yml
35515822729, hosts.yml 35515822757 and the gpu.yml run on the merge commit
35519114142 are all green. No measured number changed.
BODY
}

body_plans() {
    cat <<'BODY'
Two implementation plans for the WebGPU package's layout phases. The P5 plan
lands Fruchterman-Reingold and the spring-electrical preset on the exact tier
that P3 built: three pair laws, two integrators and two statistics as override
axes on the four existing FA2 kernels, two f64 oracles (the second checked
against ngraph.forcelayout), the accelerator members, the parity, sabotage and
noise-floor rows of every branch, the layout-fr benchmark group and the G5
record. Its section 0 records why it runs before P4 (the tree has no grid
kernel, and the LAW override reaches the grid's near-field kernel as one more
declaration) and its four departures from the design, three of which carry a
decision record.

The P4 plan is the scale layer that follows on the same branch: the grid
primitives, the degree tiers, windowed execution, the grid pyramid under all
three layout models, calibrateLayout, and the G4 record.

design/webgpu/README.md indexes both.
BODY
}

body_amendments() {
    cat <<'BODY'
Section 16 amends the P8 / P11 algorithm phases in four parts: the visited
pre-check before the frontier claim in BFS, SSSP and betweenness's forward
pass; contraction by bitmap when the emitted frontier is dense; the Louvain
gain floor; and edge / node masks that run an algorithm on a filtered graph
without a new snapshot. The mask binding is for the algorithm kernels only:
16.4's item 5 puts the layouts out of its scope, so no layout kernel's binding
table changes.

Section 17 is the future-work register: every algorithm the design does not
schedule, with the GPU case for each, so a later phase starts from a written
argument rather than a blank page.

No review-log entry: that practice was retired on 2026-09-19
(design/decisions/README.md), and the amendments are dated in their headings.
BODY
}

body_seams() {
    cat <<'BODY'
The shared ground the two P5 models stand on, before either exists.
src/layouts/model-common.ts holds the twelve option / value helpers, the
Overrides alias, U32_MODULUS and the two buffer constants that were private to
forceatlas2.ts; this commit copies them and the next one deletes the originals
and imports them, so no FA2 line moves here. constants.ts gains FR_DEFAULTS,
FR_START_TEMPERATURE, FR_REHEAT_FRACTION and SE_DEFAULTS (ngraph.forcelayout
3.3.1's values); options.ts the two resolved option records; layout.ts the two
stats records and their per-iteration trace records.

ModelInputs gains an optional `fixed` mask (the FR option), validated against
ceil(n / 32) words in load()'s check phase and applied after the resize block,
before any submit; a throwing load leaves the mask as it was. No reheat is
triggered by it. force-simulation.test.ts pins that; constants.test.ts pins
the two tables. model-common.ts is imported by nothing until the next commit.
BODY
}

body_laws() {
    cat <<'BODY'
The three pair laws, the two integrators and the two extra statistics become
override axes on the FA2 kernels rather than new kernel ids: LAW on K2 / K3
(0 FA2, 1 Fruchterman-Reingold, 2 Coulomb / Hooke), APPLY on K5 (0 FA2, 1 the
temperature-capped FR step, 2 ngraph's semi-implicit Euler with the unit speed
clamp) and STATS_MODE on K1 (0 FA2, 1 folds the temperature, 2 the kinetic
energy). The binding tables are unchanged; the spring velocity lives in the
oldForce slot, which the FR / spring models free by compiling K5 with
SWING_MODE 1. Kinetic energy rides partials B, overwritten by K5 under APPLY 2.

Fa2Params grows from 96 to 128 bytes with seven f32 model fields after `pad`
(frK, temperature, springLength, springCoefficient, coulomb, dragCoefficient,
timeStep) and pad1; Fa2State.reserved0 becomes temperature, kineticEnergy and
a vec2f reserve; Fa2Trace.pad0 becomes modelScalar. FA2's paramsFor is
untouched because UniformBlock.write zeroes absent fields. Coincident pairs
under LAW 1 / 2 take the FA2 antisymmetric kick with the law evaluated at the
distance floor.

The FA2 paths (LAW 0, APPLY 0, STATS_MODE 0) are the existing text plus one
reduction K5 and one accumulator K1 never read under mode 0; the FA2 suites
stay bitwise identical to their committed noise fixtures. The compile-matrix
pins move (P1 37 -> 53, P3 22 -> 61) and the four tests that pin the exact
block layouts and override lists follow: registry, the two state round trips
and fa2-options.
BODY
}

body_fr() {
    cat <<'BODY'
createFruchtermanReingold(ctx, snapshot, options?) over ForceSimulation with
LAW 1 / APPLY 1 / STATS_MODE 1: k defaults to 1 / sqrt(n), the temperature
schedule is 0.1 - dt * index clamped at 0 with dt = 0.1 / (iterations + 1),
`fixed` resolves at load through the seam of the previous commit, mass is 1
and weights none, and reheat() re-arms the temperature at floor(0.7 *
iterations) while the iteration budget restarts at 0 (the decision record of
the next docs commit says why). setParams({ fixed }) is E_INVALID_ARGUMENT
with a hint naming setFixed; iterations 0 is accepted and means settled at
load, as the resolver documents.

test/oracle/fruchterman-reingold.ts is the f64 oracle with an f32 variant and
per-stage capture, hand-checked by three cases in oracles.test.ts. The three
suites are the option resolution and error branches, the behaviour pins
(temperature trace, reheat, fixed nodes, a failed load leaving the simulation
unloaded) and the fast-check properties (fixed nodes never move, setPosition
lands, settle within the budget, the displacement bound with its f32
rounding term stated in the file). The oracle carries its own copies of the
reduction helpers that are module-private to the FA2 oracle.
BODY
}

body_spring() {
    cat <<'BODY'
createSpringElectrical(ctx, snapshot, options?) is the ngraph.forcelayout
preset over the same simulation with LAW 2 / APPLY 2 / STATS_MODE 2: Coulomb
repulsion with ngraph's `gravity` (-12) as the constant, Hooke springs at
springLength 10 / springCoefficient 0.8, drag 0.9, timeStep 0.5, mass
1 + degree / 3, semi-implicit Euler with the unit speed clamp, seeds in
[-1, 1). It settles by the shared rule of design 7.17 and reports the kinetic
energy per iteration; FA2's centre gravity is 0 for it.

ngraph.forcelayout ^3.3.1 and ngraph.graph ^20.0.1 become devDependencies,
imported by the oracle cross-check and the story-graph helper only. The oracle
(test/oracle/spring-electrical.ts) is checked against ngraph itself: one
iteration with theta 0 and explicit positions agrees to 1e-9 in f64, and a
1,000-step run on the 150-node story graph (deduped on the unordered pair, so
both sides see the same 249 springs) agrees on the edge-length distribution.
The suites pin the options, the behaviour (the kineticEnergy trace under both
step patterns), the fast-check properties (the speed clamp with the f32
division margin measured on the RTX 4070) and the settle within 1,000 steps
under both rules.

pnpm-lock.yaml carries the two entries; pnpm 10 also normalised unrelated
peer-resolution keys in the same write.
BODY
}

body_parity() {
    cat <<'BODY'
The parity suites of both models and the one recording run that derives every
P5 tolerance. fr-parity.ts and se-parity.ts hold the stage readers and the
caps tables (every cap's basis is a noise row id); fa2-parity.ts exports three
readers they share. Per model: inspect() stage comparison per kernel branch,
the trace against the f32 / f64 oracles, the subgroup twins, the layout oracle
at the admitted horizons, lifecycle, the force-sum invariant where the law is
antisymmetric, and distributional parity over 100 iterations. The FR layout
member at horizon 10 is recorded on karate with the fixed mask, the only
configuration the file's own admission rule accepts there.

noise-floor.test.ts gains 42 P5 members (10 FR, 10 spring, 22 widening) and
46 fr- / se- tolerances, 20 of them .cross; noise-floor.json gains 44 rows and
test/fixtures/noise 158 files, all written by the recording run on the RTX
4070 and lavapipe and never by hand.
BODY
}

body_accelerator() {
    cat <<'BODY'
GpuAccelerator gains fruchtermanReingold(snapshot, options?) and
springElectrical(snapshot, options?), the two optional members of the layout
package's LayoutAccelerator, each returning the simulation the factories of
the two previous feat commits build; createAccelerator wires them and its
header stops saying they arrive with P5. The barrel exports the two factories,
FR_DEFAULTS / SE_DEFAULTS and the four stats / trace record types.

The pinned lists follow: index.test.ts's value list and its never-exported
list (now the two model classes and the two resolvers, as it already names
ForceAtlas2Model), accelerator.test.ts's member checks and the error cases
(`k: -1` and `iterations: -1` are E_INVALID_ARGUMENT; iterations 0 is not),
and the four type tests: public-api pins the eight new names, conformance
compiles this accelerator against the real LayoutAccelerator.
BODY
}

body_sabotage() {
    cat <<'BODY'
SABOTAGE_P5 is a separate table of 25 mutations over the LAW / APPLY /
STATS_MODE branches of K1, K2, K3 and K5, measured only by the two P5 suites,
so coverage.test.ts's row-name pins and fa2.test.ts's FA2 checks are
untouched. fr.test.ts and se.test.ts run every row in check mode against the
stage and trace comparisons of the parity commit and assert each one is
caught at its derived tolerance. Every FA2 `find` string the rows anchor on is
kept intact.

One K5 row, the ignored Euler mass, is caught by the trajectory check rather
than the one-iteration stage check: from v = 0 the first step saturates the
unit speed clamp on every karate node, so the mass reaches the output only
once |dt F / m| falls under 1. The row says so.
BODY
}

body_bench() {
    cat <<'BODY'
The layout-fr group times step(1) of createFruchtermanReingold and
createSpringElectrical on the exact tier at 10k and 100k, through warmClock
and reportedRow, now exported from layout-exact.bench.ts in a model-agnostic
shape with a group parameter. run.ts registers it; benchmarks.test.ts covers
it.

T-14 on the dev box (RTX 4070 SUPER, session 2026-09-20T19:25:37Z):
0.617 ms per FR iteration at 10k and 16.367 ms at 100k, the spring preset
1.11x FR at 100k. The README's dev-box table carries the row; its T4 row is an
OPEN marker until the gpu-linux-t4 lane runs on the labelled PR, which is the
one number this phase cannot capture locally.
BODY
}

body_smoke() {
    cat <<'BODY'
test/helpers/frame-loop.ts takes two generic parameters so any model runs
under it; its body reads no FA2 field. fr-frame-loop.test.ts is the FR frame
loop: 600 ticks on karate under the default budget with settled reported, the
setPosition-during-flight override and the pause run on random1k, whose
temperature trace is bitwise the unpaused run's (no reheat on resume).
test/browser/spring-layouts.test.ts is the Chromium smoke of both models:
load, step, settle within the calibrated batches, dispose leaving the pool
empty, and the same in-flight override.
BODY
}

body_cooling() {
    cat <<'BODY'
FruchtermanReingoldOptions gains `cooling`: "linear" (the default, today's
schedule) or "adaptive", Yifan Hu's step control -- the temperature grows by
1 / 0.9 after five consecutive iterations whose free force energy fell and
shrinks by 0.9 when it rose, so the run settles on its own instead of
spending its whole budget; `iterations` is then only a cap, 10,000 when not
given. The GPU package implements it as a flag bit in the params (no new
pipeline key): K5 folds sum |F|^2 over the free nodes into the partials slot
the spring preset already uses and K1 updates the temperature in the state
block, which K5 reads back in place of the uniform's. Measured on the SNAP
Brightkite graph (58k nodes): the linear schedule settles only when its
2,000-iteration budget ends; adaptive settles at 200.

SpringElectricalOptions.gravity and .springCoefficient accept null, and null
(or absent) now means ngraph's constant times min(1, 300 / n). ngraph's values
were tuned for a few hundred nodes; on tens of thousands every node moved at
the unit speed clamp for thousands of iterations (3,350 on Brightkite, the
kinetic energy never decaying). With the size rule Brightkite settles at
1,200 with the energy decayed 4x, Gnutella at 800. The 150-node ngraph parity
fixtures pass their constants explicitly and are unchanged.

fr-adaptive.test.ts pins the option, the trace against the f32 oracle, the
trace's structure (every step x0.9, x1/0.9 or unchanged), the reheat restart
and the settle on random1k. The FR and spring commits carry the model, kernel
and oracle sides of both changes.
BODY
}

body_demo() {
    cat <<'BODY'
A "Layout model" select runs the resident snapshot under createForceAtlas2,
createFruchtermanReingold or createSpringElectrical with the same seed, settle
rule and iterations-per-frame; the stats box prints whatever numeric field a
model's stats record adds beyond LayoutStatsBase, so it needs no per-model
code. Four SNAP edge lists join the graph list (ca-CondMat, email-Enron,
Brightkite, Gnutella31: 23k to 63k nodes, all under the 65,536-node exact
tier the demo pins), fetched gzipped from the gitignored tmp/datasets/ through
vite's /@fs route and inflated by the browser's DecompressionStream; ids are
renumbered densely and each unordered pair is kept once. A dataset load that
is superseded by a newer selection is dropped rather than installed. An
"adaptive cooling" switch runs Fruchterman-Reingold under the adaptive
schedule (the default) or the linear one with a 2,000-iteration budget.
BODY
}

body_decisions() {
    cat <<'BODY'
Three decision records for the P5 departures from the WebGPU design. The
spring-electrical preset settles by the shared rule of 7.17 and reports the
kinetic energy, rather than by ngraph's absolute per-body test, so the element
has one settle semantics. It integrates like ngraph (semi-implicit Euler, unit
speed clamp) rather than by the velocity-Verlet variant 7.20 names, because
the gate compares its layout with ngraph's. A Fruchterman-Reingold reheat
restarts the temperature index at 70% of the budget but the iteration budget
at 0, because ForceSimulation.reheat() resets the count for every model and
the hook carries no iteration argument.

design/decisions/README.md indexes the three; design/README.md's counts move
to 13 decisions and 13 webgpu documents.
BODY
}

body_gate() {
    cat <<'BODY'
docs/decisions/G5.md records the P5 gate as measured on the dev box: the
deliverables of spec 13 row P5 mapped to their evidence, the adapters
exercised, T-14, the cross-adapter noise floors, coverage over the thresholds,
the baselines committed, and the findings. The T4 lane rows and the commit
list are OPEN markers until the branch runs on the labelled PR.

CLAUDE.md names the four kernels' P5 branches in the wgsl inventory, the three
model files under layouts, the layout-fr benchmark group, the two models as
landed in "Adding a Layout Model", and a Settled-at-G5 table with the measured
wall times of the four gate runs.
BODY
}

body_tools() {
    cat <<'BODY'
The step list now names the seventeen commits of the P5 phase: the G6 sign-off,
the two phase plans, the design amendments, the eleven P5 tasks in the plan's
execution order, the cooling option, the demo, then this script.
BODY
}

# ---------------------------------------------------------------------------
# Preflight: refuse anywhere the result would be a surprise.
# ---------------------------------------------------------------------------

if ! git rev-parse --git-dir >/dev/null 2>&1; then
    echo "commit-changes: not inside a git repository." >&2
    exit 1
fi

if [ -d "$(git rev-parse --git-path rebase-merge)" ] ||
   [ -d "$(git rev-parse --git-path rebase-apply)" ] ||
   [ -f "$(git rev-parse --git-path MERGE_HEAD)" ] ||
   [ -f "$(git rev-parse --git-path CHERRY_PICK_HEAD)" ]; then
    echo "commit-changes: a merge, rebase or cherry-pick is in progress. Finish it first." >&2
    exit 1
fi

if [ -n "$(git ls-files --unmerged)" ]; then
    echo "commit-changes: the tree has unresolved conflicts:" >&2
    git diff --name-only --diff-filter=U >&2
    exit 1
fi

if [ -z "$(git status --porcelain)" ]; then
    echo "commit-changes: nothing to commit -- the working tree is clean."
    exit 0
fi

# A dirty index would be swept into the first commit whose `git add` ran after it,
# and the owner would not see it in that commit's preview. In a dry run it is only
# worth a warning, since nothing is staged either way.
if ! git diff --cached --quiet; then
    if [ "$DRY_RUN" = "1" ]; then
        echo "commit-changes: NOTE -- the index already holds staged changes:"
        git diff --cached --name-only | sed 's/^/  /'
        echo "  A real run refuses until they are unstaged ('git reset')."
        echo
    else
        echo "commit-changes: the index already holds staged changes:" >&2
        git diff --cached --name-only | sed 's/^/  /' >&2
        echo >&2
        echo "They would be swept into the first commit below without appearing in its" >&2
        echo "preview. Unstage them first: git reset" >&2
        exit 1
    fi
fi

if ! [ -f .husky/commit-msg ]; then
    echo "commit-changes: .husky/commit-msg is missing." >&2
    echo "That hook is the commitlint check this script deliberately keeps. Restore it" >&2
    echo "before committing, or the messages go unvalidated." >&2
    exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"

# ---------------------------------------------------------------------------
# Temporary state: the rendered messages, and the hooks directory that holds
# commit-msg without prepare-commit-msg.
# ---------------------------------------------------------------------------

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/commit-changes.XXXXXX")"
HOOKS_DIR="$WORK_DIR/githooks"

cleanup() {
    rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$HOOKS_DIR"
cp .husky/commit-msg "$HOOKS_DIR/commit-msg"
chmod +x "$HOOKS_DIR/commit-msg"

# Let gpg-agent find the terminal, so pinentry can prompt for the signing
# passphrase here instead of failing invisibly.
if tty -s; then
    GPG_TTY="$(tty)"
    export GPG_TTY
fi

# ---------------------------------------------------------------------------
# Validation, in full, before a single file is staged.
# ---------------------------------------------------------------------------

# The types semantic-release and commitlint's conventional preset accept.
CONVENTIONAL_TYPES='feat|fix|perf|refactor|docs|test|build|ci|chore|style|revert'
# Kept in step with commitlint.config.js's scope-enum, which is enforced at level 2:
# a scope outside this list is rejected by the commit-msg hook, mid-run.
VALID_SCOPES="graph-format graph-io webgpu-graph-algorithms algorithms layout graphty-element
              compact-mantine remote-logger graphty gpu-3d-force-layout deps release ci docs tools workspace"
# commitlint's body-max-line-length, from @commitlint/config-conventional.
BODY_MAX_LINE=100
SUBJECT_MAX=100

# Renders one step's message -- subject, blank line, body -- to $WORK_DIR/<step>.msg.
# The rendered file is what `git commit -F -` later reads, so what is validated here
# is byte for byte what commitlint sees.
render_message() {
    local step="$1"
    {
        printf '%s\n\n' "${SUBJECTS[$step]}"
        # A step id may carry a hyphen; a shell function name may not.
        "body_${step//-/_}"
    } > "$WORK_DIR/$step.msg"
}

validate_step() {
    local step="$1"
    local subject="${SUBJECTS[$step]}"
    local ok=0

    if ! printf '%s' "$subject" | grep -Eq "^($CONVENTIONAL_TYPES)(\([a-z0-9._-]+\))?!?: .+"; then
        echo "commit-changes: [$step] subject is not a conventional commit." >&2
        echo "  got:      $subject" >&2
        echo "  expected: <type>(<scope>): <subject>" >&2
        echo "  types:    ${CONVENTIONAL_TYPES//|/ }" >&2
        ok=1
    fi

    case "$subject" in
        *.)
            echo "commit-changes: [$step] subject ends in a full stop; commitlint refuses one." >&2
            ok=1
            ;;
    esac

    if [ "${#subject}" -gt "$SUBJECT_MAX" ]; then
        echo "commit-changes: [$step] subject is ${#subject} characters; the limit is $SUBJECT_MAX." >&2
        ok=1
    fi

    # The scope, when there is one, has to be in commitlint's enum.
    local scope
    scope="$(printf '%s' "$subject" | sed -n 's/^[a-z]*(\([^)]*\)).*/\1/p')"
    if [ -n "$scope" ]; then
        local found=0 candidate
        for candidate in $VALID_SCOPES; do
            if [ "$scope" = "$candidate" ]; then
                found=1
                break
            fi
        done
        if [ "$found" = "0" ]; then
            echo "commit-changes: [$step] scope '$scope' is not in commitlint.config.js's scope-enum." >&2
            echo "  allowed: $(echo "$VALID_SCOPES" | tr -s ' \n' ' ')" >&2
            ok=1
        fi
    fi

    # Body lines, which commitlint caps as well. A long line there fails the commit
    # after the files are staged, which is the worst moment to find out.
    local line_no=0 line
    while IFS= read -r line; do
        line_no=$((line_no + 1))
        if [ "${#line}" -gt "$BODY_MAX_LINE" ]; then
            echo "commit-changes: [$step] message line $line_no is ${#line} characters (limit $BODY_MAX_LINE):" >&2
            echo "  $line" >&2
            ok=1
        fi
    done < "$WORK_DIR/$step.msg"

    return "$ok"
}

VALIDATION_FAILED=0
for step in "${STEPS[@]}"; do
    if [ -z "${SUBJECTS[$step]:-}" ] || [ -z "${PATHS[$step]:-}" ]; then
        echo "commit-changes: [$step] has no subject or no paths. Fix the plan." >&2
        VALIDATION_FAILED=1
        continue
    fi
    render_message "$step"
    validate_step "$step" || VALIDATION_FAILED=1
done

if [ "$VALIDATION_FAILED" != "0" ]; then
    echo >&2
    echo "commit-changes: nothing was staged and nothing was committed." >&2
    exit 1
fi

# --check means CHECK, and stops here. It used to set a variable nothing read, so
# the run fell through into the commit loop below and committed -- a flag that
# lied by its name, which is worse than no flag. (2026-09-13.)
if [ "$CHECK" = "1" ]; then
    echo
    echo "All ${#STEPS[@]} messages pass commitlint. Nothing was staged or committed."
    echo "To preview what each commit would take: ./tools/commit-changes.sh --dry-run"
    exit 0
fi

# ---------------------------------------------------------------------------
# Helpers that read the tree without touching the index.
# ---------------------------------------------------------------------------

# Echoes the subset of a step's pathspecs that still have something to commit.
# `git status --porcelain -- <pathspec>` is empty for a path that is clean, gone or
# never existed, and unlike `git add` it does not fail on a pathspec that matches
# nothing -- which is what makes a re-run after a partial run safe.
pending_paths() {
    local path
    for path in $1; do
        if [ -n "$(git status --porcelain -- "$path")" ]; then
            printf '%s\n' "$path"
        fi
    done
}

# True when a changed path belongs to some step, so the leftover report at the end
# can name what the plan does not cover.
claimed_by_plan() {
    local changed="${1%/}"
    local step path
    for step in "${STEPS[@]}"; do
        for path in ${PATHS[$step]}; do
            case "$changed" in
                "$path"|"$path"/*)
                    return 0
                    ;;
            esac
        done
    done
    return 1
}

report_leftovers() {
    local leftovers=()
    local line path
    # -uall so an untracked directory is reported file by file and a leftover inside
    # one cannot hide behind a directory the plan claims.
    while IFS= read -r line; do
        [ -n "$line" ] || continue
        # Porcelain: two status columns, a space, then the path -- or "old -> new"
        # for a rename, where the new name is the one to test.
        path="${line:3}"
        case "$path" in
            *" -> "*)
                path="${path##* -> }"
                ;;
        esac
        path="${path%\"}"
        path="${path#\"}"
        if ! claimed_by_plan "$path"; then
            leftovers+=("$path")
        fi
    done < <(git status --porcelain -uall)

    if [ "${#leftovers[@]}" != "0" ]; then
        echo "Changed files no commit in this plan claims (${#leftovers[@]}):"
        printf '  %s\n' "${leftovers[@]}"
        echo
        echo "They are still in the working tree, uncommitted and unstaged. Either add them"
        echo "to a step in this script or commit them yourself."
        echo
    fi
}

# ---------------------------------------------------------------------------
# Optional full validation, before anything is committed.
# ---------------------------------------------------------------------------

if [ "$CHECK" = "1" ]; then
    echo "Running prepush:fast before committing (lint, build and the fast tests)..."
    if ! pnpm run prepush:fast; then
        echo >&2
        echo "commit-changes: prepush:fast failed. Nothing staged, nothing committed." >&2
        exit 1
    fi
    echo
fi

# ---------------------------------------------------------------------------
# The run.
# ---------------------------------------------------------------------------

echo "Branch:  $BRANCH"
echo "Commits: ${#STEPS[@]}"
if [ "$DRY_RUN" = "1" ]; then
    echo "Mode:    DRY RUN -- nothing is staged, nothing is committed, the index is untouched"
else
    echo "Mode:    committing. One signing passphrase prompt per commit; no Commitizen wizard"
fi
echo

MADE=0
SKIPPED=0

for step in "${STEPS[@]}"; do
    subject="${SUBJECTS[$step]}"
    pending="$(pending_paths "${PATHS[$step]}")"

    echo "-----------------------------------------------------------------------"
    echo "[$step] $subject"
    echo

    if [ -z "$pending" ]; then
        echo "  Nothing left to commit under this step's paths -- already committed. Skipping."
        echo
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # What this commit will contain, read from the tree rather than from the index.
    # shellcheck disable=SC2086 # deliberate word splitting: pathspecs, no spaces
    tracked_stat="$(git diff --stat HEAD -- $pending)"
    # shellcheck disable=SC2086
    untracked="$(git ls-files --others --exclude-standard -- $pending)"

    if [ -n "$tracked_stat" ]; then
        echo "  Tracked changes:"
        printf '%s\n' "$tracked_stat" | sed 's/^/  /'
    fi

    if [ -n "$untracked" ]; then
        untracked_count="$(printf '%s\n' "$untracked" | wc -l | tr -d ' ')"
        echo "  New files ($untracked_count):"
        printf '%s\n' "$untracked" | head -n 10 | sed 's/^/    /'
        if [ "$untracked_count" -gt 10 ]; then
            echo "    ... and $((untracked_count - 10)) more"
        fi
    fi
    echo

    if [ "$DRY_RUN" = "1" ]; then
        echo "  Message:"
        sed 's/^/  | /' "$WORK_DIR/$step.msg"
        echo
        continue
    fi

    # shellcheck disable=SC2086
    git add -- $pending

    if git diff --cached --quiet; then
        echo "  Staged nothing after all -- skipping rather than making an empty commit."
        echo
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # core.hooksPath is the whole trick: commit-msg (commitlint) runs from the
    # temporary directory, and Commitizen's prepare-commit-msg is not in it.
    git -c core.hooksPath="$HOOKS_DIR" commit -F - < "$WORK_DIR/$step.msg"

    echo
    echo "  $(git log -1 --format='%h %G? %s')"
    echo
    MADE=$((MADE + 1))
done

echo "-----------------------------------------------------------------------"
echo

report_leftovers

if [ "$DRY_RUN" = "1" ]; then
    echo "Dry run. Nothing was staged and nothing was committed; the index is untouched."
    echo "To make these commits: ./tools/commit-changes.sh"
    exit 0
fi

echo "Made $MADE commit(s) on '$BRANCH'; skipped $SKIPPED."
echo
git log --oneline -n "${#STEPS[@]}" | cat
echo
echo "Not pushed. Next:"
echo "  git push origin $BRANCH"
echo
echo "The pre-push hook runs tools/prepush.sh -- lint, knip, build and the fast tests"
echo "across every package, not just the ones touched here. Expect a few minutes."
