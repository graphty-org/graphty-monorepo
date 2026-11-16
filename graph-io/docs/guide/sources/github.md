# GitHub

::: warning Experimental
Network sources are experimental: the source id `github`, its parameters and what it lists may
still change.
:::

The `github` source reads graph files kept in a GitHub repository: it lists the repository's files
and loads one of them, in whatever format graph-io reads. graph-io detects the format from the
file's name and its first bytes, exactly as it does for a file you open. Public repositories need no
account. It works in Node and in browsers.

It is not one of the built-in sources, so import it from its own path and pass it to
`listFromSource` and `loadFromSource` (or register it once with `registerSource(githubSource)` to
call it by its id, `"github"`).

<!-- generated:begin example:sources/github-list-load -->

```ts
import { listFromSource, loadFromSource } from "@graphty/graph-io";
import { githubSource } from "@graphty/graph-io/sources/github";

// the sample files of this guide, kept in graphty's own repository
const repository = "graphty-org/graphty-monorepo";

// browse: the GraphML files in one folder of the default branch
const listing = await listFromSource(githubSource, {
    params: { repository, path: "graph-io/docs/samples" },
    search: ".graphml",
});
for (const item of listing.items) {
    console.log(item.name);
}

// load one: graph-io detects the format from the file name and its first bytes
const { snapshot, format } = await loadFromSource(githubSource, { repository, path: listing.items[0].name });
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
```

<!-- generated:end -->

<!-- generated:begin output:sources/github-list-load -->

```text
graph-io/docs/samples/got-network.graphml
graphml: 107 nodes, 352 edges
```

<!-- generated:end -->

## Parameters

| Parameter    | What it is                                                                      |
| ------------ | ------------------------------------------------------------------------------- |
| `repository` | the repository, `owner/name`; required                                          |
| `path`       | loading: the file's path in the repository; required. Listing: a folder to list |
| `ref`        | a branch, tag or commit; default the repository's default branch                |

The endpoint defaults to `https://api.github.com/`. For GitHub Enterprise Server, pass its API
address (`https://github.example.com/api/v3/`) as `endpoint`.

## Listing

`listFromSource(githubSource, { params, search, size, cursor })` lists every file of the repository
at `ref` (folders are not listed), optionally only those under the folder `params.path` and only
those whose path holds `search` (any case). Each item's `name` is the file's path and its `params`
load it. A listing gives `size` files (100 unless you say) and `next`, the `cursor` of the next
page, or null on the last.

Every file is listed, graph files or not; narrow the list with `search` (`".graphml"`) when you
want one kind.

## Links

`parseGithubUrl(url)` reads a link a reader pastes: a repository page
(`https://github.com/owner/name`), a file or folder page (`.../blob/main/data/graph.graphml`,
`.../tree/main/data`) or a raw file link (`https://raw.githubusercontent.com/owner/name/main/data/graph.graphml`).
It returns `{ repository, ref, path }` to load or list with. Anything else is rejected with
`E_SOURCE_PARAM` (`name: "url"`).

## Tokens and rate limits

Without a token GitHub allows 60 requests an hour from one address; a load is one request and a
listing one or two. A token (`credentials.bearer(token)`, a fine-grained personal access token with
read access to contents) raises that to 5,000 and reaches private repositories. It is sent only to
the endpoint, never stored with the parameters and never written in an error or a report.

## Errors

| Code                 | When                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `E_SOURCE_NOT_FOUND` | no such repository or file: `params.what` is `"repository"` or `"file"`. GitHub answers a private repository this way without a token |
| `E_SOURCE_QUOTA`     | the rate limit is used up; `params.retryAfterMs` is how long until GitHub resets it                                                   |
| `E_SOURCE_FORBIDDEN` | the token may not read the repository                                                                                                 |
| `E_SOURCE_AUTH`      | GitHub refused the token                                                                                                              |
| `E_SOURCE_RESPONSE`  | the file is in no format graph-io reads                                                                                               |
| `E_SOURCE_PARAM`     | `repository` is not `owner/name`, or `path` or `ref` holds an empty, `.` or `..` part                                                 |
