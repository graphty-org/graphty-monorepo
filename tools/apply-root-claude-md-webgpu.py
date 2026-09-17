#!/usr/bin/env python3
"""Apply the webgpu-graph-algorithms edits to the monorepo root CLAUDE.md.

Two of the edited lines carry non-ASCII characters (the box-drawing tree and the arrows of the
build-order line); the script itself is plain ASCII and spells them as chr() code points. Every
edit anchors on a line that must occur exactly once; nothing is written if an anchor is missing
or ambiguous; a second run changes nothing.

Usage (from the monorepo root):   python3 tools/apply-root-claude-md-webgpu.py CLAUDE.md
"""

import sys

BOX_BRANCH = chr(0x251C) + chr(0x2500) + chr(0x2500)  # the tree prefix of the Monorepo Structure block
ARROW = chr(0x2192)  # the arrow of the build-order line

# (anchor line, lines inserted BEFORE the anchor, lines inserted AFTER the anchor)
INSERTIONS = [
    (
        '| `@graphty/graph-io` (and `@graphty/graph-io/<format>` subpaths: gexf, graphml, gml, dot, pajek, csv, json, neo4j)'
        ' | **graph-io** | "io", "importers" |',
        [],
        [
            '| `@graphty/webgpu-graph-algorithms` (and `@graphty/webgpu-graph-algorithms/browser`, `/node` subpaths)'
            ' | **webgpu-graph-algorithms** | "webgpu", "the GPU package", "the GPU layout" |',
        ],
    ),
    (
        "| `@graphty/graph-io` | `graph-io/` | 0.1.0 | Importers and exporters (GEXF, GraphML, GML, DOT, Pajek, CSV, "
        "JSON, Neo4j) for the graph-format snapshot; subpath exports per format |",
        [],
        [
            "| `@graphty/webgpu-graph-algorithms` | `webgpu-graph-algorithms/` | 0.1.0 | WebGPU-accelerated graph "
            "algorithms and layouts (ForceAtlas2 first) over the graph-format snapshot, for Node (Dawn) and browsers; "
            "never falls back to the CPU |",
        ],
    ),
    (
        BOX_BRANCH + " graph-io/             # @graphty/graph-io package (depends on graph-format)",
        [],
        [BOX_BRANCH + " webgpu-graph-algorithms/  # @graphty/webgpu-graph-algorithms package (depends on graph-format)"],
    ),
    (
        "pnpm run coverage:preview:graph-io         # Port 9057",
        [],
        ["pnpm run coverage:preview:webgpu-graph-algorithms  # Port 9058"],
    ),
    (
        "- Coverage previews: 9051-9054, graph-format 9056, graph-io 9057, webgpu-graph-algorithms 9058",
        ["- webgpu-graph-algorithms demo (vite): 9030"],
        [],
    ),
    (
        "**graphty:**",
        [
            "**webgpu-graph-algorithms:**",
            "- `node` - Node.js on Dawn (`GRAPHTY_GPU_REQUIRE` unset skips without an adapter; CI sets `any` on lavapipe)",
            "- `node-limits` - the GPU lane only (real device limits)",
            "- `browser` - Playwright Chromium with the `GRAPHTY_BROWSER_GPU` flag set (swiftshader in CI) through "
            "`scripts/run-browser-project.js`",
            "",
        ],
        [],
    ),
    (
        "- `graph-io`",
        [],
        ["- `webgpu-graph-algorithms-node`, `webgpu-graph-algorithms-browser`"],
    ),
    (
        "| `deploy-pages.yml` | After CI | Deploy docs to GitHub Pages |",
        [],
        [
            "| `gpu.yml` | Dispatch and labelled same-repo PRs; push and nightly once the `gpu-linux-t4` runner exists "
            "| The webgpu-graph-algorithms NVIDIA T4 lane; never a job of CI, never required |",
            "| `hosts.yml` | Push/PR touching `webgpu-graph-algorithms/` or `graph-format/`, dispatch "
            "| Informational host matrix: Dawn on Metal + WebKit (macOS), Dawn on D3D12 WARP + Chromium (Windows) |",
        ],
    ),
    (
        "- `graph-io/CLAUDE.md` - Importer / exporter contract, adding a format",
        [],
        [
            "- `webgpu-graph-algorithms/CLAUDE.md` - The GPU context and adapter policy, the kernel layers, the lanes "
            "and their environment variables, verified platform facts",
        ],
    ),
    (
        "### TypeScript",
        [
            "### WebGPU",
            "",
            "- Never create fallbacks if WebGPU isn't supported. The GPU package throws (`E_NO_WEBGPU`, `E_NO_ADAPTER`, "
            "`E_TOO_LARGE`, ...) and never runs a CPU path; the CPU packages' dispatchers choose the CPU only when no "
            "accelerator was injected (`design/webgpu/webgpu-acceleration-plan.md` section 2.4).",
            "",
        ],
        [],
    ),
    (
        "- `ci-parity-plan.md` - CI/CD alignment plan",
        [],
        [
            "- `graph-format/graph-format-design.md` - The shared graph data format and the consumer migration",
            "- `webgpu/webgpu-acceleration-plan.md` - WebGPU acceleration: the design, `webgpu/plans/` the contract, "
            "the phase plans and the monorepo integration plan",
        ],
    ),
]

# (anchor line, replacement line)
REPLACEMENTS = [
    (
        "- Coverage previews: 9051-9054, graph-format 9056, graph-io 9057",
        "- Coverage previews: 9051-9054, graph-format 9056, graph-io 9057, webgpu-graph-algorithms 9058",
    ),
    (
        "- gpu-3d-force-layout: 9060",
        "- compact-mantine Storybook: 9060",
    ),
    (
        "| `ci.yml` | Push/PR | Build, lint, sharded tests (18 parallel jobs) |",
        "| `ci.yml` | Push/PR | Build, lint, sharded tests (20 parallel jobs) |",
    ),
    (
        "The CI runs 18 parallel test jobs:",
        "The CI runs 20 parallel test jobs:",
    ),
    (
        "  - Build order enforced by TypeScript: `graph-format` " + ARROW + " `graph-io` " + ARROW + " `algorithms` "
        + ARROW + " `layout` " + ARROW + " `graphty-element` " + ARROW + " `graphty`",
        "  - Build order enforced by TypeScript: `graph-format` " + ARROW + " `graph-io` " + ARROW
        + " `webgpu-graph-algorithms` " + ARROW + " `algorithms` " + ARROW + " `layout` " + ARROW
        + " `graphty-element` " + ARROW + " `graphty`",
    ),
]


def index_of(lines, anchor):
    """The index of the one line equal to `anchor`, or an error naming the problem."""
    hits = [i for i, line in enumerate(lines) if line == anchor]
    if len(hits) != 1:
        raise SystemExit(f"anchor found {len(hits)} times (need exactly 1): {anchor!r}")
    return hits[0]


def apply(text):
    lines = text.split("\n")
    # replacements first: one insertion anchors on a replaced line
    for anchor, replacement in REPLACEMENTS:
        if replacement in lines and anchor not in lines:
            continue  # already applied
        lines[index_of(lines, anchor)] = replacement
    for anchor, before, after in INSERTIONS:
        new_lines = [line for line in before + after if line != ""]
        if new_lines and all(line in lines for line in new_lines):
            continue  # already applied
        i = index_of(lines, anchor)
        lines[i:i + 1] = before + [anchor] + after
    return "\n".join(lines)


def main(argv):
    if len(argv) != 2:
        raise SystemExit("usage: apply-root-claude-md-webgpu.py <path to the monorepo root CLAUDE.md>")
    path = argv[1]
    with open(path, encoding="utf-8") as handle:
        original = handle.read()
    updated = apply(original)
    if updated == original:
        print("CLAUDE.md already up to date")
        return
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(updated)
    print(f"CLAUDE.md updated ({updated.count(chr(10)) - original.count(chr(10))} lines added)")


if __name__ == "__main__":
    main(sys.argv)
