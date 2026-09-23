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
# The plan below is tailored to one specific change set: the M6 phase of the
# WebGPU work (graphty-element running its force layouts and five algorithms on
# an optional GPU peer, branch feat/element-webgpu-m6, fifteen commits). It is
# data, not machinery -- STEPS, SUBJECTS, PATHS and one body_* function each.
# Re-point it at the next change set rather than reusing the messages, and read
# the diff before you write a message, not a summary of it.
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
# One entry per commit, in the order they are made. This change set is the M6
# phase of the WebGPU work on branch feat/element-webgpu-m6: graphty-element
# learning to run its force layouts and five of its algorithms on a GPU, through
# the optional @graphty/webgpu-graph-algorithms peer, with no consumer writing
# probe, construct or recovery code of their own.
#
# The order is the order the work was built in, and it is also the order that
# reads: the peer and the controller first, then the release list and the test
# double, then the layout bridge and the engines on it, then play/pause and drag,
# then the camera fix the big arrangements forced, then the algorithms, then the
# tests, the stories, the application that consumes all of it, the documents, and
# last this script's own re-point.
#
# A FILE BELONGS TO EXACTLY ONE STEP. Several of these files were touched by more
# than one piece of the work -- Graph.ts, LayoutManager.ts, package.json,
# acceleration/types.ts -- and each goes to the earliest step that touched it,
# whose body says what the whole file's diff is for. Splitting a file across
# commits would need `git add -p`, which this script deliberately does not do.
#
# PATHS entries are space-separated pathspecs (no path in this repository has a
# space in it, so the word splitting below is deliberate). Every entry here is a
# single file rather than a directory, because sibling files in the same
# directory belong to different steps -- src/acceleration/narrow.ts and
# src/acceleration/types.ts land in different commits. A directory pathspec would
# swallow the wrong one.
# ---------------------------------------------------------------------------

STEPS=(peer controller release bridge engines running camera adapters gputests stories
       appwiring appui records gpuhelper tooling)

declare -A SUBJECTS=(
    [peer]="build(graphty-element): take webgpu-graph-algorithms 0.5 as the optional peer and pass the ceiling"
    [controller]="feat(graphty-element): one acceleration controller shared by the element and its session"
    [release]="feat(graphty-element): release GPU buffers on snapshot replacement, plus a fake accelerator"
    [bridge]="feat(graphty-element): drive force layouts through the layout package's simulation seam"
    [engines]="feat(graphty-element): register forceatlas2, spring and spring-electrical on the bridge"
    [running]="feat(graphty-element): play, pause and reheat through setRunning, and drag through the simulation"
    [camera]="fix(graphty-element): frame a graph larger than the default far plane"
    [adapters]="feat(graphty-element): route five adapters through accelerated() and label the precision"
    [gputests]="test(graphty-element): accelerated layout and run tests on the fake, SwiftShader and NVIDIA"
    [stories]="docs(graphty-element): the GPU layout stories and the acceleration guide"
    [appwiring]="build(graphty): switch on the element's optional GPU peer"
    [appui]="feat(graphty): an acceleration setting and a status bar chip over the element's capabilities"
    [records]="docs: the decision records, the design amendments and the two gate records"
    [gpuhelper]="refactor(webgpu-graph-algorithms): stop exporting a helper nothing outside its module calls"
    [tooling]="chore(tools): re-point the commit script at the acceleration change set"
)

declare -A PATHS=(
    [peer]="graphty-element/package.json
            graphty-element/webgpu.ts
            graphty-element/src/acceleration/types.ts
            graphty-element/src/acceleration/AccelerationController.ts
            graphty-element/test/acceleration/AccelerationController.test.ts
            graphty-element/test/acceleration/webgpu-entry-options.test.ts
            graphty-element/test/packaging/exports-map.test.ts
            layout/src/simulation/index.ts
            layout/CLAUDE.md
            pnpm-lock.yaml"

    [controller]="graphty-element/src/Graph.ts
            graphty-element/src/graphty-element.ts
            graphty-element/src/managers/GraphContext.ts
            graphty-element/src/session/GraphSession.ts
            graphty-element/src/session/types.ts
            graphty-element/src/acceleration/index.ts
            graphty-element/session.ts
            graphty-element/index.ts
            graphty-element/test/session/session.test.ts
            graphty-element/test/acceleration/policies.test.ts
            graphty-element/test/browser/acceleration-attribute.test.ts"

    [release]="graphty-element/src/events.ts
            graphty-element/src/managers/DataManager.ts
            graphty-element/src/managers/EventManager.ts
            graphty-element/src/testing/fakeAccelerator.ts
            graphty-element/test/testing/fake-accelerator.test.ts
            graphty-element/test/browser/release-list.test.ts
            graphty-element/test/unit/internal-events.test.ts"

    [bridge]="graphty-element/src/layout/SimulationLayoutEngine.ts
            graphty-element/src/acceleration/narrow.ts
            graphty-element/src/managers/LayoutManager.ts
            graphty-element/src/managers/UpdateManager.ts
            graphty-element/test/browser/simulation-layout-engine.test.ts
            graphty-element/test/layout/simulation-envelope.test.ts"

    [engines]="graphty-element/src/layout/ForceAtlas2LayoutEngine.ts
            graphty-element/src/layout/SpringLayoutEngine.ts
            graphty-element/src/layout/SpringElectricalLayoutEngine.ts
            graphty-element/src/layout/LayoutEngine.ts
            graphty-element/src/layout/index.ts
            graphty-element/src/catalog/layouts.ts
            graphty-element/src/config/GraphBehavior.ts
            graphty-element/test/layout/simulation-options.test.ts
            graphty-element/test/layout/weighted-layouts.test.ts
            graphty-element/test/catalog/types.test.ts
            graphty-element/test/catalog/registries.test.ts
            graphty-element/test/integration/Edge.integration.test.ts
            graphty-element/test/integration/auto-layout.test.ts
            graphty-element/test/browser/extensions/layout-extension.test.ts"

    [running]="graphty-element/src/NodeBehavior.ts
            graphty-element/test/browser/NodeBehavior-unified-drag.test.ts
            graphty-element/test/browser/graphty-element-api-parity.test.ts
            graphty-element/test/graphty-element/api-parity.test.ts"

    [camera]="graphty-element/src/cameras/OrbitCameraController.ts
            graphty-element/src/cameras/TwoDCameraController.ts
            graphty-element/src/managers/RenderManager.ts
            graphty-element/test/cameras/OrbitCameraController.test.ts
            graphty-element/test/cameras/TwoDCameraController.test.ts
            graphty-element/test/browser/OrbitCameraController.zoomToBoundingBox.test.ts"

    [adapters]="graphty-element/src/algorithms/Algorithm.ts
            graphty-element/src/algorithms/PageRankAlgorithm.ts
            graphty-element/src/algorithms/DijkstraAlgorithm.ts
            graphty-element/src/algorithms/BFSAlgorithm.ts
            graphty-element/src/algorithms/ConnectedComponentsAlgorithm.ts
            graphty-element/src/algorithms/KruskalAlgorithm.ts
            graphty-element/test/algorithms/accelerated-adapters.test.ts
            graphty-element/test/algorithms/metrics/metric-results.test.ts
            graphty-element/test/helpers/mockGraph.ts
            graphty-element/test/session/run-executor.test.ts"

    [gputests]="graphty-element/vitest.config.ts
            graphty-element/tsconfig.strict-consumer.json
            graphty-element/test/types/consumer/webgpu-import.ts
            graphty-element/test/packaging/node-safe-entries.test.ts
            graphty-element/test/browser/webgpu-layout.test.ts
            graphty-element/test/helpers/story-graph.ts
            graphty-element/stories/PerformanceTest.stories.ts
            graphty-element/src/session/runs/types.ts
            .github/workflows/gpu.yml
            .github/workflows/hosts.yml"

    [stories]="graphty-element/stories/LayoutGpu.stories.ts
            graphty-element/docs/guide/acceleration.md
            graphty-element/docs/api/web-component.md
            graphty-element/docs/guide/layouts.md
            graphty-element/docs/.vitepress/config.ts
            docs/.vitepress/config.ts
            graphty-element/CLAUDE.md"

    [appwiring]="graphty/src/main.tsx
            graphty/package.json
            graphty/project.json
            knip.config.ts
            .github/workflows/ci.yml"

    [appui]="graphty/src/components/Graphty.tsx
            graphty/src/components/Graphty.test.tsx
            graphty/src/types/jsx.d.ts
            graphty/src/components/shell/AppShell.tsx
            graphty/src/components/shell/__tests__/AppShell.test.tsx
            graphty/src/components/shell/canvas/CanvasRegion.tsx
            graphty/src/components/shell/defaults/accelerationSettings.ts
            graphty/src/components/shell/defaults/__tests__/accelerationSettings.test.ts
            graphty/src/components/shell/panel/SettingsOverlay.tsx
            graphty/src/components/shell/panel/__tests__/SettingsOverlay.test.tsx
            graphty/src/components/shell/statusbar/StatusBar.tsx
            graphty/src/components/shell/statusbar/StatusBarSlots.tsx
            graphty/src/components/shell/statusbar/statusBarModel.ts
            graphty/src/components/shell/statusbar/formatAcceleration.ts
            graphty/src/components/shell/statusbar/__tests__/StatusBar.test.tsx
            graphty/src/components/shell/statusbar/__tests__/formatAcceleration.test.ts
            graphty/src/stories/StatusBarAcceleration.stories.tsx
            graphty/src/test/fakeSession.ts
            graphty/chromatic.config.json
            graphty/CLAUDE.md"

    [records]="design/decisions/2026-09-21-m6-bridge-is-a-layout-engine.md
            design/decisions/2026-09-21-node-mass-is-resolved-per-load.md
            design/decisions/2026-09-21-spring-electrical-fails-loudly-on-set.md
            design/decisions/2026-09-21-power-iteration-family-waits-for-its-ports.md
            design/decisions/2026-09-21-acceleration-knobs-and-their-homes.md
            design/decisions/2026-09-21-app-stories-draw-the-chip-not-the-gpu.md
            design/decisions/2026-09-21-g12-without-the-nightly-clause.md
            design/decisions/2026-09-19-land-element-graph-store.md
            design/decisions/README.md
            design/README.md
            design/element-api/element-api-design.md
            design/webgpu/webgpu-acceleration-plan.md
            graphty-element/docs/decisions/G6.md
            graphty/docs/decisions/G12.md
            graphty-element/scripts/measure-min-nodes.mjs"

    [gpuhelper]="webgpu-graph-algorithms/src/layouts/spring-electrical.ts"

    [tooling]="tools/commit-changes.sh"
)

# ---------------------------------------------------------------------------
# One body per step. Written for someone reading `git log` a year from now with
# none of this conversation: say what changed and why it had to, not what the
# work was like. A BREAKING CHANGE footer is what semantic-release reads to cut
# a major; none of these is one.
# ---------------------------------------------------------------------------

body_peer() {
    cat <<'BODY'
The element's optional WebGPU peer moved on. webgpu-graph-algorithms 0.5.1 takes its adapter
policy as a rejectSoftware flag and its layout ceiling as a nested layout option, neither of which
the element was passing, so the validated node ceiling was being dropped on the floor. The peer
range becomes >=0.5.1 <1.0.0 and the ./webgpu entry forwards both.

Asking for a software adapter is a new option on the accelerator factory, acceptSoftware, which
the controller sets when the acceleration policy is "required": a reader who demanded acceleration
gets SwiftShader rather than a refusal, while "auto" still declines to call a software rasteriser
an accelerator.

The layout package's simulation seam and its CLAUDE.md said the app was the only importer of the
GPU package. graphty-element's ./webgpu entry point is, and has been since the decision record
they now cite.
BODY
}

body_controller() {
    cat <<'BODY'
A rendered graph built two acceleration controllers: one in Graph for its managers and one in the
custom element for its attributes, so the attribute, the session and the hardware could disagree
about which policy was in force. Graph now builds the only one, before it builds the session,
hands it to the session, exposes it to managers through the graph context, and disposes it last in
shutdown -- after the managers, so a layout and its simulation stop before the device under them
goes away. The element reads that controller and owns only the DOM event that mirrors it.

The capabilities object handed out is now identity-stable: the session property, the session event
and the DOM event carry the same frozen object until the next transition, so comparing it with the
previous one is a valid staleness test.

The session gained an acceleration policy accessor, setAccelerator and a capabilities:changed
event, and ./session exports the two types a consumer needs to call setAccelerator without
importing the element itself. A new acceleration-min-nodes attribute and accelerationMinNodes
property set the size below which a graph is not worth a device, report an out-of-range value
on the console rather than throwing out of attributeChangedCallback.

The policy vocabulary is published with it. The element exported the AccelerationPolicy type and
none of its values, so anything offering a reader the choice had to spell "auto" out itself, free
to disagree with the element the day the element changed its mind. The list in the order a control
offers it, the default an element with no attribute runs under, and the guard the element runs on
the attribute itself are now exported from the root entry point and from ./session.
BODY
}

body_release() {
    cat <<'BODY'
GPU buffers are not garbage collected, so a snapshot the accelerator has uploaded has to be handed
back explicitly. Graph now keeps the snapshot it is showing and releases it -- and its undirected
copy, when that is a separate snapshot -- when a freeze replaces it and again at shutdown, feature
testing the accelerator's release member so an accelerator without one is still fine.

Clearing a dataset freezes no replacement, so the replacement event never fired at that boundary
and the buffers for a graph that no longer exists were kept. The data manager now emits a new
element-internal snapshot-dropped event while the outgoing store still answers, which is what a
listener needs to ask for the derived view it is freeing. Like snapshot-replaced it never reaches
the DOM.

Also adds a fake accelerator for tests: an in-process object with the peer's shape, whose
simulations move nodes by a fixed step, honour the fixed mask and the in-flight limit, and can be
told to fail with a given code. It is reachable from no entry point.
BODY
}

body_bridge() {
    cat <<'BODY'
Force layouts ran a fixed number of CPU iterations inside the element. They now run through the
layout package's simulation seam, which is the same interface a GPU accelerator implements, so one
layout runs on the CPU or on the device with no branch in the element.

The new simulation layout engine holds one simulation. It asks the acceleration controller whether
this capability at this node count should run accelerated before every build, loads the element's
own position column so publishing positions costs nothing, packs the pin lane into the
simulation's fixed mask, and steps without waiting -- a rejected step is reported with the peer's
own code and stops further submissions rather than quietly finishing on the CPU.

The layout manager builds it when an engine declares a simulation type, swaps the simulation when
the accelerator changes underneath it, reloads it when a freeze replaces the snapshot, and steps it
once per frame in place of the multiplier loop. Every other engine keeps its existing path
unchanged.

One defect found on the way: the CPU simulations do not seed, and a node nothing has placed reads
NaN, which a force turns into NaN forever, so the node never appears. The bridge seeds unplaced
rows before every load and leaves finite ones alone, so an existing arrangement survives a freeze
that added nodes.

Positions are published in the element's own envelope rather than in simulation units. Every other
layout here lands in roughly a plus-or-minus-100 box, and every visual size the element draws --
node size, edge width, label size, arrow size -- is an absolute scene unit tuned for that box. The
simulations are the only layouts that never rescale what they compute, and a settled ForceAtlas2
reaches about 23,000 units across, so its one-unit nodes drew a thirtieth of a pixel wide. The
bridge fits the arrangement's widest radius to the layout's scalingFactor at every publish and
divides that fit out again on everything written back in -- a drag, a pin, a seed -- so a node
still lands where the pointer put it.
BODY
}

body_engines() {
    cat <<'BODY'
ForceAtlas2 and Spring are simulations now rather than one-shot passes: both lost their own layout
loops and their legacy per-engine option schemas and are thin declarations over the simulation
bridge. The catalogue calls them live layouts, because that is what they are -- they keep running
until the arrangement settles and reheat on a drag or a pin.

spring-electrical joins them as a seventeenth built-in engine, with ngraph's vocabulary and
defaults. It has no CPU implementation, so selecting it without an accelerator fails loudly and
leaves the running layout running; its catalogue row says it requires one, which is what lets a
picker grey it out instead of leaving the reader to discover it by catching a refusal.

Behind all three is the option mapping: the published names are validated and translated to the
simulation's, ForceAtlas2's scaling factor and weight flag are renamed, gravity is no longer
negative, and a new node mass option takes a record by node id, a column name, or nothing. Two
frame-loop knobs, iterationsPerStep and maxInFlight, join the layout behaviour.
BODY
}

body_running() {
    cat <<'BODY'
Pausing a layout only stopped it being stepped. That is right for a layout that runs a fixed number
of passes and wrong for a simulation: one that settled while paused was still settled when play was
pressed, so the graph never moved again. Resuming now reheats a settled simulation. setRunning
joins isRunning on the custom element, so pausing and resuming no longer needs the Graph object.

Dragging a node now tells the simulation. A drag sets a temporary fixed bit, so the forces leave
the node where the reader is holding it, and releasing clears it -- or keeps it and pins the node,
when pin-on-drag is on, which is the rule the pin lane already followed. Both calls sit in the
unified drag handler, so a controller drag in VR behaves like a mouse drag.
BODY
}

body_camera() {
    cat <<'BODY'
A graph wider than Babylon's default 10,000-unit far plane was drawn with its far half clipped
away, and what survived was then pushed off the canvas edges: zoomToBoundingBox fitted the box and
the fit was immediately cut back down to maxZoomDistance, a 2,000-unit ceiling meant for the
interactive zoom-out of a small graph. ForceAtlas2 settles into a box about 23,000 units across, so
it met both at once.

Both camera controllers now derive the far plane from the box they were asked to frame, in the one
place every writer of the camera distance passes through, and the fit keeps only its
minimum-distance floor. maxZoomDistance stays the ceiling a reader pulls back against, and it
follows the fitted graph instead of overriding it, so a large graph can still be pulled away from.

The tests that pinned the old clamp now assert the opposite: the fit exceeds the configured ceiling
for a box tens of thousands of units across, and Babylon reports that box completely inside the
frustum, in perspective and in orthographic.

Framing the box is half of why a settled ForceAtlas2 drew nothing. The other half is that a node
is one scene unit across whatever the layout does, which in a box 23,000 units wide is a thirtieth
of a pixel; that half is the publishing envelope, which landed with the simulation bridge.
BODY
}

body_adapters() {
    cat <<'BODY'
Five algorithms can run on an accelerator: PageRank, Dijkstra, breadth-first search, connected
components and Kruskal's minimum spanning tree. Each goes through one choke point that asks the
controller whether to accelerate, runs the same adapter code whichever answer comes back, and
returns the precision, which every result now reports. No branch turns a failure from a running
accelerator into a CPU answer.

An adapter that cannot express a request on the accelerated port says so rather than pretending:
PageRank with a personalization vector, with initial ranks or over an undirected graph, and a
breadth-first search with a target to stop at, each stay on the reference implementation and
record the reason in the result's caveats.

Edge results are read back through the declared-to-merged edge map rather than the merged edge's
survivor, so both halves of a reciprocal pair are flagged. Naming a node the graph does not have
is now an option-range error carrying the option and the value, where breadth-first search used to
return null.

A defect this uncovered: PageRank's personalization and initial ranks were unreachable. Options
are resolved through a schema and neither was in one, so a personalized run silently ran
unpersonalized. Both are now kept from the arguments they were given.
BODY
}

body_gputests() {
    cat <<'BODY'
The tests that prove acceleration works. A browser suite mounts the element with acceleration
required over a fixed 150-node graph and asserts that the accelerator attaches and names its
backend, that all three force layouts settle on it, that a drag moves and pins a node across a
re-settle, that a run reports single precision, and that the arrangement the device produces
matches the CPU's to within a quarter of its edge lengths.

The browser project takes the two Chromium flag sets from the GPU package, selected by an
environment variable, so the same suite runs on SwiftShader or on a real card. With the variable
unset the project launches exactly as the five CI shards do.

The acceleration entry's import graph is now checked -- no Babylon, no Lit, and the GPU package
reached from that file and from nowhere else -- and the published declarations are compiled the
way a third party compiles them, with library checking off, so a leaked ambient WebGPU type fails
this build instead of a consumer's. That compile is what turned up a run's result and error being
declared as optional rather than optional-or-undefined, which a getter cannot satisfy under
exactOptionalPropertyTypes.

The graph the accelerator is measured on moved out of the performance story into a shared helper,
so the picture a reader watches and the graph the tests measure are one graph. The GPU workflow
runs the new layout suite, and the host matrix triggers on element changes too, because the
release waits on both.
BODY
}

body_stories() {
    cat <<'BODY'
Three Storybook stories for accelerated layout: two driven by the deterministic fake, which run
anywhere and can take visual baselines, and one on a real device, which cannot. Every caption
follows the element's capabilities event, so the picture says what actually ran.

The guide behind them documents activation in two lines, the optional peer install, the three
policies, how to read what is active from the session or from the DOM event, what the precision
caveat means, which layouts and algorithms are accelerated today, the three knobs and the errors
that can come back. The element's own error messages already pointed at that page, which did not
exist until now.

A defect the story found: the package listed the built acceleration entry as having side effects
but not its source, so a bundler tree-shook the registration import away whole and a machine with
a working card reported no accelerator at all. The source entry joins the three registration
modules already listed for the same reason.
BODY
}

body_appwiring() {
    cat <<'BODY'
The application switches the element's optional WebGPU peer on with one import in main.tsx, and
that is the entire integration: the element probes, constructs, attaches, applies its node
threshold, watches for device loss and reports what is active. Nothing in this application touches
WebGPU.

Switching it on means installing it, so the GPU package joins the app's dependencies -- on the
element's behalf, which is what the knip entry beside it says -- and the app's lint target now
waits on its dependencies being built, because against a stale dist a type error is what a consumer
sees.

The CI step that builds a few packages by name no longer needs graph-format: the app reaches it
through the GPU package now. graph-io still has no dependent at all, so it keeps its place there.

Unrelated, and here only because it shares a file: the Storybook script's certificate path named a
file that does not exist.
BODY
}

body_appui() {
    cat <<'BODY'
A reader can now choose whether the graph uses a GPU, and see what it got. The choice is an
acceleration policy -- automatic, off or required -- set in a new Performance group in the settings
panel, written on the element as an attribute and remembered between visits. Its default is the
element's own, imported rather than spelled out, so the two cannot drift apart.

What is actually running is read back from the element's capabilities and drawn as a status bar
chip: the backend and the device when one attached, the reason when none did, and a dot that
follows the state. Both the chip and the panel follow the element's capabilities event, so they
report what happened rather than what was asked for.

The React wrapper takes the policy as a JSX prop rather than setting it in an effect, so the policy
is in force before the element's connectedCallback starts probing, and it exposes the element's
session, which is where the capabilities live. The custom element's JSX declaration moves to the
file every other tag attribute is declared in.

The policy list, the default and the type guard behind all of that are imported from the element's
./session entry point, which publishes them. No policy string, and no rule about what a policy may
be, is written down in this application.
BODY
}

body_records() {
    cat <<'BODY'
Seven decision records, for the choices this work made that the design did not anticipate: that
the simulation bridge is a layout engine rather than a new extension point, that node mass is
resolved at each load rather than once, that spring-electrical refuses loudly when there is no
accelerator, that the remaining power-iteration algorithms wait for their ports, where each
acceleration knob lives, that the application's acceleration stories draw the status chip from a
fixed status while the real device stays the element's story, and that the application's gate asks
for the GPU lane green on master rather than a week of a nightly lane that does not exist. The
design documents they amend carry dated notes pointing at them, and the decisions index and its
count are updated.

Gate records are repository history rather than documentation -- they name dev-box hardware and
open questions -- so the element's documentation site now excludes them. Both are here. The
element's lists twenty checks with the evidence behind each and names what this machine could not
produce: Chromatic baselines, the NVIDIA T4 lane, and coverage on the default project, which is
eleven points short of the target on lines. The application's lists thirteen, four of them open --
two on Chromatic, one on the GPU lane after the merge, one on a pull request -- and three more
never run at all, the live look at the status chip on a running application against the dev box's
card.

One row of the element's record is already out of date: it was written before the policy list, the
default and the guard were exported, so it reads the application as not compiling against the
element. It does, from the commit that published them.

The threshold below which a graph is too small to accelerate stays at zero, and the script that
measured it is committed beside the number: it serves the element's own source, drives a browser
and prints the frame time at each size. On the dev box the accelerator is at or below the CPU from
the smallest size measured upward.
BODY
}

body_gpuhelper() {
    cat <<'BODY'
springSizeFactor scales spring-electrical's two coefficient defaults by the node count. It is
called twice, both times in the file that defines it, and nothing in this package or outside it
imports it, so exporting it only gave the unused-code check something to report. It becomes
module-private. The package's published surface does not change.
BODY
}

body_tooling() {
    cat <<'BODY'
The step list, the subjects and the paths describe this change set. The machinery -- the
commitlint pre-validation, the temporary hooks directory that keeps commit-msg while leaving
Commitizen's interactive prompt out of the run, and the leftover report -- is unchanged.
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
