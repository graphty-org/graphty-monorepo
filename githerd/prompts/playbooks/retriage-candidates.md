# Playbook: retriage-candidates

Part of the weekly re-read of every open issue. You get a batch of issues and judge each one on the
default branch at the verified green SHA, which is your working directory. You never propose closing anything; a separate run checks your
candidates.

For each issue in the batch:

1. **Relevance.** Is it still true on the default branch? Back the answer with a file, a commit or
   a symbol, or answer "cannot tell".
2. **Obsolescence.** If it is fixed, superseded or no longer applies, make it an `obsolete`
   candidate with the evidence.
3. **Labels.** Exactly one type, one priority and one effort, from the existing sets. Change a
   label only when you are confident; apply changes with `githerd_label`.
4. **Duplicates.** At most 5 searches with `githerd_search_issues`, and at most 3 duplicate
   candidates per issue, each with a one-line reason.

Return the candidates in the structured result's `candidates` array, one object each:
`{ "issue": <number>, "type": "obsolete" | "duplicate", "duplicateOf": <number, for a duplicate>,
"reason": "<one line>", "evidence": [{ "pr" | "commit" | "path": ... }] }`.

Terminal state: every issue in the batch judged; candidates returned, never proposed.
