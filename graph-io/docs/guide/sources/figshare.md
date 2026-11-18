# Figshare

::: warning Experimental
Network sources are experimental: the source id `figshare`, its parameters and what it lists may
still change.
:::

The `figshare` source reads graph files published in a public [Figshare](https://figshare.com)
item: it lists the item's files and loads one of them, in whatever format graph-io reads. graph-io
detects the format from the file's name and its first bytes, exactly as it does for a file you open.
Public items need no account.

It is not one of the built-in sources, so import `figshareSource` from
`@graphty/graph-io/sources/figshare` and pass it to `listFromSource` and `loadFromSource` (or
register it once with `registerSource(figshareSource)` to call it by its id, `"figshare"`). For
example, `loadFromSource(figshareSource, { article: "1234567", file: "network.graphml" })` loads the
file `network.graphml` of the item `https://figshare.com/articles/dataset/<title>/1234567`.

Figshare's download address redirects to storage that sends no CORS headers, so a web page can list
an item's files but not load them: in a browser the load fails with `E_SOURCE_BLOCKED`. Node loads
them.

## Parameters

| Parameter | What it is                                                        |
| --------- | ----------------------------------------------------------------- |
| `article` | the item's number, the digits at the end of its page's address    |
| `file`    | loading: the file's name in the item; required. Listing: not used |

The endpoint defaults to `https://api.figshare.com/v2/`. A load is two requests: the item's file
list, then the file.

## Listing

`listFromSource(figshareSource, { params: { article }, search, size, cursor })` lists the item's
files, optionally only those whose name holds `search` (any case). Each item's `name` is the file's
name and its `params` load it. A listing gives `size` files (100 unless you say), `total`, and
`next`, the `cursor` of the next page, or null on the last. Only an item's first 1,000 files are
listed.

## Links

`parseFigshareUrl(url)` reads a link a reader pastes: an item page
(`https://figshare.com/articles/dataset/Network/1234567`, with or without a version after the
number, also on an institution's `<name>.figshare.com`), an API link
(`https://api.figshare.com/v2/articles/1234567`) or a Figshare DOI
(`https://doi.org/10.6084/m9.figshare.1234567.v2`). It returns `{ article }` to list with. Anything
else is rejected with `E_SOURCE_PARAM` (`name: "url"`).

## Errors

| Code                 | When                                                         |
| -------------------- | ------------------------------------------------------------ |
| `E_SOURCE_NOT_FOUND` | no such item, or no file of that name in it                  |
| `E_SOURCE_BLOCKED`   | in a browser: the file's download host sends no CORS headers |
| `E_SOURCE_RESPONSE`  | the file is in no format graph-io reads                      |
| `E_SOURCE_PARAM`     | `article` is not a number, or `file` is empty                |
