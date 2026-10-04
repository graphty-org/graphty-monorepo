# Playbook: retriage-filter

Another run flagged some issues as obsolete or as duplicates. Check each claim on its own, with a
fresh eye. A wrong close costs more than a missed one.

For each candidate in the run context:

1. Read the issue and, for a duplicate, the other issue (`githerd_gh_get`).
2. Check the claimed reason and evidence against the default branch and the two bodies. Ignore
   how confident the claim sounds.
3. Confirm only when the evidence holds: the cited pull request is merged or the cited commit is
   on the default branch, and for a duplicate both issues ask for the same thing.
4. For each confirmed candidate, call `githerd_propose` (`kind: "close-issue"`, with
   `duplicateOf` for a duplicate, the evidence and the reason). Reject everything else.

List every candidate in the structured result's `candidates` array as
`{ "issue": <number>, "verdict": "confirmed" | "rejected", "reason": "<one line>" }`.

Terminal state: every candidate confirmed and proposed, or rejected with a reason.
