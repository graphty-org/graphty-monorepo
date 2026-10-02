# githerd

githerd keeps a GitHub repository's pipeline moving when most of the work is done by Claude Code
sessions and GitHub Actions. One daemon per repository watches the default branch, the open pull
requests and the issue backlog; it pages the owner when the default branch breaks and stays
broken, gives every Claude session one shared picture of who is doing what through MCP tools, and
starts short, bounded Claude runs for what a script cannot fix. Every GitHub write goes through
deterministic code in the daemon, and in dry-run mode (the default) each write is recorded instead
of performed.

The package is private, plain `.mjs` with JSDoc types, and has no runtime dependencies. A
repository turns it on with a `githerd.config.json` at its root on the default branch.

The design is `design/githerd/githerd-design.md`; the build order is
`design/githerd/githerd-plan.md`.

## Commands

```bash
node githerd/bin/githerd.mjs version    # or: pnpm exec githerd version
```

## Development

```bash
pnpm exec nx run githerd:test        # unit tests (vitest, node)
pnpm exec nx run githerd:coverage    # with the 80/75 coverage thresholds
pnpm exec nx run githerd:lint        # eslint and tsc over the JSDoc types
./tools/run-knip.sh --workspace githerd
```
