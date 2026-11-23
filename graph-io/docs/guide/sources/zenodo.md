# Zenodo

::: warning Experimental
Network sources are experimental: the source id `zenodo`, its parameters and what it lists may
still change.
:::

The `zenodo` source reads graph files published in a [Zenodo](https://zenodo.org) record: it lists
the record's files and loads one of them, in whatever format graph-io reads. graph-io detects the
format from the file's name and its first bytes, exactly as it does for a file you open. Public
records need no account. It works in Node and in browsers.

It is not one of the built-in sources, so import `zenodoSource` from
`@graphty/graph-io/sources/zenodo` and pass it to `listFromSource` and `loadFromSource` (or
register it once with `registerSource(zenodoSource)` to call it by its id, `"zenodo"`). For
example, `loadFromSource(zenodoSource, { record: "1234567", file: "network.graphml" })` loads the
file `network.graphml` of the record `https://zenodo.org/records/1234567`.

## Parameters

| Parameter | What it is                                                          |
| --------- | ------------------------------------------------------------------- |
| `record`  | the record's number, the digits at the end of its page's address    |
| `file`    | loading: the file's name in the record; required. Listing: not used |

The endpoint defaults to `https://zenodo.org/api/`. For Zenodo's test site, pass
`https://sandbox.zenodo.org/api/` as `endpoint`.

## Listing

`listFromSource(zenodoSource, { params: { record }, search, size, cursor })` lists the record's
files, optionally only those whose name holds `search` (any case). Each item's `name` is the file's
name and its `params` load it. A listing gives `size` files (100 unless you say), `total`, and
`next`, the `cursor` of the next page, or null on the last.

## Links

`parseZenodoUrl(url)` reads a link a reader pastes: a record page
(`https://zenodo.org/records/1234567`), a file link (`https://zenodo.org/records/1234567/files/network.graphml?download=1`),
an API file link (`https://zenodo.org/api/records/1234567/files/network.graphml/content`) or a
Zenodo DOI (`https://doi.org/10.5281/zenodo.1234567`). It returns `{ record, file }` to load, or
`{ record }` to list. Anything else is rejected with `E_SOURCE_PARAM` (`name: "url"`).

## Tokens

A restricted record's files need a Zenodo access token, passed as `credentials.bearer(token)`. It is
sent only to the endpoint, never stored with the parameters and never written in an error or a
report.

## Errors

| Code                 | When                                                               |
| -------------------- | ------------------------------------------------------------------ |
| `E_SOURCE_NOT_FOUND` | no such record or file                                             |
| `E_SOURCE_FORBIDDEN` | the file is restricted and the token (or no token) may not read it |
| `E_SOURCE_AUTH`      | Zenodo refused the token                                           |
| `E_SOURCE_RESPONSE`  | the file is in no format graph-io reads                            |
| `E_SOURCE_PARAM`     | `record` is not a number, or `file` is empty, `.` or `..`          |
