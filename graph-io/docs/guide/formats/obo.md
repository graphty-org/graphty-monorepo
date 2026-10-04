# OBO

## At a glance

<!-- generated:begin glance:obo -->

|                         |                               |
| ----------------------- | ----------------------------- |
| Import from             | `@graphty/graph-io/obo`       |
| Format name             | `obo`                         |
| Extensions              | `.obo`                        |
| MIME types              | `text/obo`, `application/obo` |
| Reads                   | yes                           |
| Writes                  | no (read only)                |
| Several graphs per file | no                            |
| Lists its graphs        | no                            |

<!-- generated:end -->

## Loading

## Saving

## How graph-io reads it

## What a saved file keeps and loses

<!-- generated:begin reference:obo -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option     | Type                    | Default      | Meaning                                                                                                                         |
| ---------- | ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `obsolete` | `"keep" \| "drop"`      | `"keep"`     | "keep" (default): obsolete terms are nodes with `is_obsolete` true; "drop": they and their edges are left out.                  |
| `typedefs` | `"metadata" \| "nodes"` | `"metadata"` | "metadata" (default): `[Typedef]` frames go to `meta.extra.obo.typedefs`; "nodes": they are nodes too, with their `is_a` edges. |

## Import issue codes

The codes this format's import report can hold, also exported as `OBO_ISSUE` from `@graphty/graph-io/obo`.

| Code                       | Key                   | Severity | Meaning                                                                                                                                  |
| -------------------------- | --------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `E_EMPTY_INPUT`            | `EMPTY_INPUT`         | error    | The input is empty or whitespace (fatal).                                                                                                |
| `E_INVALID_UTF8`           | `INVALID_UTF8`        | error    | The input holds invalid UTF-8 (fatal).                                                                                                   |
| `E_INVALID_ENCODING`       | `INVALID_ENCODING`    | error    | Invalid bytes in the encoding a BOM or the encoding option chose (fatal).                                                                |
| `W_ENCODING_FALLBACK`      | `ENCODING_FALLBACK`   | warning  | Bytes that are not UTF-8 were read as windows-1252.                                                                                      |
| `W_UNKNOWN_ENCODING`       | `UNKNOWN_ENCODING`    | warning  | A declared encoding the platform cannot decode was ignored.                                                                              |
| `E_MISSING_ID`             | `MISSING_ID`          | error    | A frame without an `id` clause; the frame is skipped.                                                                                    |
| `E_BAD_VALUE`              | `BAD_VALUE`           | error    | A clause whose value cannot be read (a boolean other than true / false, a relationship with one or three values); the clause is skipped. |
| `W_DUPLICATE_NODE`         | `DUPLICATE_NODE`      | warning  | Two frames with one id were merged (spec 4.1.1).                                                                                         |
| `W_DUPLICATE_ATTRIBUTE`    | `DUPLICATE_ATTRIBUTE` | warning  | A single-valued tag given twice for one id (a cardinality violation); the first is kept.                                                 |
| `W_UNKNOWN_ELEMENT`        | `UNKNOWN_ELEMENT`     | warning  | An unknown tag (kept in `obo.unrecognized`) or frame type (skipped), once per name.                                                      |
| `W_DANGLING_REFERENCE`     | `DANGLING_REFERENCE`  | warning  | A target no frame declares: a placeholder node was made, or the edge dropped under addMissingNodes false.                                |
| `W_OBO_SYNTAX`             | `SYNTAX`              | warning  | A line without a colon, an unterminated quote, a def without its xref list, a qualifier block that does not parse, an unescaped brace.   |
| `W_OBO_ID_NOT_FIRST`       | `ID_NOT_FIRST`        | warning  | The frame's `id` is not its first clause; it is used anyway.                                                                             |
| `W_OBO_SYNONYM_SCOPE`      | `SYNONYM_SCOPE`       | warning  | A synonym without a scope in a file that does not say 1.2, or with a scope that is not one of the four.                                  |
| `W_OBO_UNDECLARED`         | `UNDECLARED`          | warning  | A relation, subset or synonym type that nothing declares.                                                                                |
| `W_OBO_ID_KIND_CLASH`      | `ID_KIND_CLASH`       | warning  | One id for a Term and a Typedef (or an Instance); the Term (the first node frame) is the node.                                           |
| `W_OBO_CARDINALITY`        | `CARDINALITY`         | warning  | Fewer than two `intersection_of` or `union_of` clauses on a frame.                                                                       |
| `W_OBO_OBSOLETION`         | `OBSOLETION`          | warning  | An obsolete term with is_a / relationship, or replaced_by / consider on a term that is not obsolete.                                     |
| `W_OBO_DEPRECATED_TAG`     | `DEPRECATED_TAG`      | warning  | An OBO 1.0 / 1.2 tag read as its 1.4 meaning (exact_synonym, xref_analog, use_term, typeref, version).                                   |
| `W_OBO_DEPRECATED_SYNTAX`  | `DEPRECATED_SYNTAX`   | warning  | A backslash line continuation (deprecated in 1.4).                                                                                       |
| `W_OBO_HEADER_NOT_APPLIED` | `HEADER_NOT_APPLIED`  | warning  | A header clause kept in `meta.extra.obo.header` whose meaning is not applied (import, id-mapping, the treat-xrefs macros, owl-axioms).   |
| `W_OBO_OBSOLETE_DROPPED`   | `OBSOLETE_DROPPED`    | warning  | Obsolete terms and their edges left out under obsolete: "drop".                                                                          |
| `W_ID_MERGED`              | `ID_MERGED`           | warning  | Two distinct id texts became one number under ids "number".                                                                              |
| `W_COLUMN_RENAMED`         | `COLUMN_RENAMED`      | warning  | A vocabulary column renamed `<name>#obo` because the sink already holds the name.                                                        |
| `W_ROLE_TAKEN`             | `ROLE_TAKEN`          | warning  | A vocabulary column declared without its role because the sink already holds it.                                                         |
| `W_OPTION_IGNORED`         | `OPTION_IGNORED`      | warning  | A common option the format has no use for (defaultDirected, weightFrom, nodeIdFrom, ...).                                                |
| `W_SINK_OPTION`            | `SINK_OPTION`         | warning  | A builder-policy option the caller passed that the caller's sink does not use.                                                           |

<!-- generated:end -->
