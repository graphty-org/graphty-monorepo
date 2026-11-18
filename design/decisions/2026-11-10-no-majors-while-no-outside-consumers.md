# No major releases while nobody outside consumes the packages

Date: 2026-11-10
Decided by: the owner
Changes: how a breaking change is committed and released, as stated in `.github/workflows/README.md`
("Breaking changes and major releases") and the root `CLAUDE.md` ("Public API and breaking
changes"). It supersedes the grouped-major plan of `2026-09-28-one-breaking-release-window.md`
(graphty-element 3.0.0, algorithms 3.0.0 and layout 2.0.0 released together by one merge), which
carries a status banner pointing here.

## The decision

The owner's words: "we have taken a softer stance on 'breaking' since we don't have anyone using
our app yet. merge in the issues we have held as 'breaking' as non-breaking."

- A change that would be breaking lands as an ordinary `feat` or `fix` commit, with no `!` and no
  `BREAKING CHANGE:` footer, so it bumps a minor or a patch, never a major.
- Each such change goes through its own pull request with auto-merge, like any other; nothing is
  held for a grouped major.
- Its commit message says what changed for callers and what to use instead.
- The owner is asked again only when a real outside consumer appears.

## Rejected

**Hold breaking changes for one grouped major.** Grouping protects consumers from migrating twice,
but there are no outside consumers yet, so it protected nobody while holding finished work out of
master for weeks and forcing it through long-lived branches.
