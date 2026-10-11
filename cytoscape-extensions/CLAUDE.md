# CLAUDE.md (cytoscape-extensions)

The root CLAUDE.md covers this package's tests and Storybook (under "Testing Infrastructure"). This file adds what is
specific to it.

## GPU screenshots

Visual review captures every story without WebGPU, so it never sees the GPU path, and it leaves the Large graphs
stories out (`disableSnapshot` on their meta in `stories/LargeGraphs.stories.ts`): there they would only show the
"no WebGPU" placeholder. Instead the large-graph stories (ForceAtlas2, Fruchterman-Reingold and spring-electrical at
2,000, 10,000 and 50,000 nodes) are captured WITH WebGPU on a real NVIDIA card and compared with reference images in
`test/gpu-screenshots/` (Git LFS), by `scripts/gpu-screenshots.mjs`:

- **Where it runs:** at push and on the release train, never in a pull request's CI or on a master push.
    - **Push:** the pre-push gate (`tools/prepush.sh`, step "Large-graph GPU screenshots on the local NVIDIA GPU")
      runs it on the dev machine's card whenever the push affects cytoscape-extensions (or a package it depends on),
      after building the Storybook. A difference fails the push; the step's last line names the stories, and
      `tmp/gpu-screenshots/index.html` of the checkout shows each reference, capture and diff. A machine without an
      NVIDIA card (`nvidia-smi`) prints a `[SKIP]` line instead.
    - **Release:** the release train's T4 job (`.github/workflows/gpu.yml`, step "Large-graph story screenshots").
      A difference fails the T4 job, which holds the release ("Release held: T4 GPU failed on <sha>"); the issue
      quotes the stories that differ, and the run's `gpu-screenshots-<run id>` artifact holds the captures, the
      references, the diffs and an `index.html` showing them side by side.
- **Why the two cards agree:** the T4 and the RTX 4070 SUPER compute bitwise-identical positions for all nine
  stories, and the page is rasterized on the CPU (`--disable-gpu-rasterization --disable-accelerated-2d-canvas`),
  so an unchanged commit gives byte-identical PNGs. The comparison is visual review's own (`compareImages` at the
  gate's default threshold).
- **Run it locally** on the dev machine's NVIDIA card (build the Storybook first, then hold a browser slot):

    ```bash
    pnpm exec nx run cytoscape-extensions:build-storybook
    cd cytoscape-extensions && GRAPHTY_EGL_LIB_DIR=<repo>/tmp/egl/root/usr/lib/x86_64-linux-gnu FC_FONTATIONS=1 \
      npm run gpu-screenshots -- --check
    ```

    `GRAPHTY_EGL_LIB_DIR` is the extracted libEGL tree this machine needs to reach the card (without it headless
    Chromium hangs or falls to SwiftShader; webgpu-graph-algorithms/CLAUDE.md). `--stories <name,...>` runs a subset;
    the report is `tmp/gpu-screenshots/index.html`.

- **Changing the references:** a change that alters how these stories draw (the stories, the layouts, the kernels,
  graph-samples' generators) changes the images. Run `npm run gpu-screenshots -- --update` on a GPU machine, commit
  `test/gpu-screenshots/`, and put the `hold` label on the pull request: only the owner approves new reference
  images, and the pull request merges once they have looked. Nothing else ever writes them, and CI never runs
  `--update`.
- **Story ids:** the stories are found by name in either folder, "Large graphs" (`large-graphs--<name>`) or the
  older "Demo/Force Layouts By Size"; `STORIES` and `FOLDERS` at the top of the script are the one list.
