# Plan drafts and reviews (historical record)

These files record how the WebGPU acceleration design was written on 2026-09-13 and 2026-09-14, before any of the
package's code existed. They are superseded by [the accepted design](../webgpu-acceleration-plan.md) and describe
nothing current; read them only for the history of a decision.

- `draft-A.md`, `draft-B.md`, `draft-C.md`: the three competing plan drafts the design was merged from.
- `review/*-review.md` and `review/*-verdicts.md`: the six per-lens reviews of the merged design (completeness,
  design, integration, maintainability, performance, verification) and the verdict on each finding.
- `review/check-report.md`, `review/fix-report.md`, `review/repair-report.md`: the passes that applied the verdicts.
- `review/probes/`: the scripts and logs the reviews ran against Dawn, lavapipe and the NVIDIA card. The package
  reference (`../package-reference.md`, "Verified Platform Facts") cites them as evidence.

Paths in these files were written in the staging repository: `<staging>/` is its root, `tmp/webgpu-plan/` held
these files before they were committed, and `packages/<name>/` is `<name>/` in this monorepo.
