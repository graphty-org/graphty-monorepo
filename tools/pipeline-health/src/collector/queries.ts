// The collector's GraphQL queries (shapes measured in tmp/health-dashboard-owner/sources.md section 4). Pages of
// 50 pull requests with no nested workflowRun: 100 with it timed out at GitHub (a 502).

const PR_BASE = `
  number title state isDraft reviewDecision baseRefName headRefName headRefOid createdAt updatedAt mergedAt closedAt
  autoMergeRequest { enabledAt } author { login }
  labels(first: 20) { nodes { name } }
  readyEvents: timelineItems(itemTypes: [READY_FOR_REVIEW_EVENT, CONVERT_TO_DRAFT_EVENT], last: 5) {
    nodes { __typename ... on ReadyForReviewEvent { createdAt } ... on ConvertToDraftEvent { createdAt } } }`;

/** Open pull requests also carry their head's checks, for the stocks (4.1 red on the same check, 4.2). */
const PR_CHECKS = `
  commits(last: 1) { nodes { commit { oid committedDate statusCheckRollup { state
    contexts(first: 100) { nodes { __typename
      ... on CheckRun { name status conclusion startedAt detailsUrl }
      ... on StatusContext { context state createdAt } } } } } } }`;

/** Open pull requests the collector reads: one page. A full page may have left some out. */
export const OPEN_PAGE = 50;

/**
 * Open pull requests with their checks (first page only, for the stocks) and the most recently updated ones
 * without checks, paged: both with checks in one query timed out at GitHub (a 504).
 */
export const PR_QUERY = `query($owner: String!, $name: String!, $cursor: String, $withOpen: Boolean!) {
  repository(owner: $owner, name: $name) {
    open: pullRequests(states: OPEN, first: ${OPEN_PAGE}, orderBy: {field: UPDATED_AT, direction: DESC}) @include(if: $withOpen) {
      pageInfo { hasNextPage endCursor } nodes { ${PR_BASE} ${PR_CHECKS} } }
    recent: pullRequests(first: 50, after: $cursor, orderBy: {field: UPDATED_AT, direction: DESC}) {
      pageInfo { hasNextPage endCursor } nodes { ${PR_BASE} } }
  }
}`;

const ISSUE_FIELDS = `number title state stateReason createdAt updatedAt closedAt labels(first: 20) { nodes { name } }`;

export const ISSUE_QUERY = `query($owner: String!, $name: String!, $cursor: String, $held: String!) {
  repository(owner: $owner, name: $name) {
    recent: issues(first: 100, after: $cursor, orderBy: {field: UPDATED_AT, direction: DESC}) {
      pageInfo { hasNextPage endCursor } nodes { ${ISSUE_FIELDS} } }
  }
  held: search(query: $held, type: ISSUE, first: 20) { nodes { ... on Issue { ${ISSUE_FIELDS} } } }
}`;

/** Check runs and their first annotations for a batch of check suites (cancel class, hangs). */
export const SUITE_QUERY = `query($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on CheckSuite { id
      checkRuns(first: 100) { nodes { name conclusion annotations(first: 5) { nodes { message } } } } }
  }
}`;

/**
 * Every check run of a batch of check suites (all attempts) with its annotations, for the flaky-history backfill:
 * tools/test-quarantine.mjs leaves a warning annotation per test it let through. GitHub keeps at most 50 annotations
 * of each level per job, so 50 holds them all.
 */
export const FLAKY_SUITE_QUERY = `query($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on CheckSuite { id
      checkRuns(first: 100, filterBy: {checkType: ALL}) { nodes { databaseId name completedAt
        annotations(first: 50) { nodes { message } } } } }
  }
}`;

export const TAG_QUERY = `query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    refs(refPrefix: "refs/tags/", first: 100, orderBy: {field: TAG_COMMIT_DATE, direction: DESC}) {
      nodes { name target { oid ... on Commit { committedDate } ... on Tag { tagger { date } } } } }
  }
}`;

/** The files of the pull requests waiting on the owner, one alias each (`p<number>`). */
export const ownerFilesQuery = (numbers: number[]): string =>
    `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${numbers
        .map((n) => `p${Math.trunc(n)}: pullRequest(number: ${Math.trunc(n)}) { files(first: 100) { nodes { path } } }`)
        .join(" ")} } }`;

/** The committed quarantine list and CODEOWNERS on the default branch. */
export const REPO_FILES_QUERY = `query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    quarantine: object(expression: "HEAD:tools/test-quarantine.json") { ... on Blob { text } }
    codeowners: object(expression: "HEAD:.github/CODEOWNERS") { ... on Blob { text } }
    ci: object(expression: "HEAD:.github/workflows/ci.yml") { ... on Blob { text } }
    advisory: object(expression: "HEAD:tools/ci-advisory-checks.json") { ... on Blob { text } }
  }
}`;

/** The heads of channel/nightly and channel/production: the commit each channel serves. */
export const CHANNEL_REFS_QUERY = `query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    nightly: ref(qualifiedName: "refs/heads/channel/nightly") { target { oid } }
    production: ref(qualifiedName: "refs/heads/channel/production") { target { oid } }
  }
}`;
