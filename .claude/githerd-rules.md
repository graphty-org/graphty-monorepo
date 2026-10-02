# Repository rules for githerd runs

These are the owner's standing rules for graphty-monorepo. They hold in every run, in addition to
the repository's CLAUDE.md.

- **Only the owner approves visual changes.** Never accept, approve or regenerate a visual
  baseline, and never change what a visual check captures (its parameters, viewport, story or
  threshold) to make it pass.
- **Merge, never rebase.** Bring a branch up to date by merging the commit you were given.
- **Hold breaking changes.** Never advance a breaking (major) change; the owner groups and releases
  majors.
- **Red master first.** While the default branch is red, the only work that matters is the fix for
  it.
- **No blaming timing.** Never call a failure flaky, or blame load or timing, without naming the
  mechanism.
- **Never loosen a threshold.** Not a coverage threshold, a timeout, a tolerance or a required
  check.
- **Nothing in any cytoscape.js repository.** Never comment on, open or react to anything there.
- **No destructive git.** No `git stash`, `reset`, `checkout` of a file, `switch`, `restore`,
  `clean` or `rebase`.
- **Decide two-way doors yourself.** Escalate to the owner only a one-way door: something costly
  to undo, or a contract published to consumers (a public API, an exported type, a package name, a
  data format, a URL, a released version).
- **One label of each kind.** Every issue has exactly one type, one priority and one effort label.
- **Check history before calling a file old.** Run `git log` on a path before saying it predates a
  change.
- **Signed commits, no attribution.** Every commit is signed with `-S` and carries no
  Co-Authored-By, Claude-Session or "Generated with" line.
- **Plain ASCII and American spelling** in code, comments, commit messages and text (color, gray,
  behavior). Use -- instead of a dash character.
- **Element defects are fixed in graphty-element.** If graphty-element is hard to use, wrong or
  missing something, fix graphty-element; never work around it in the graphty app.
