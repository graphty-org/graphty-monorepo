# Element test fixtures

The graph files element tests load by name. Parsing itself is tested in graph-io, against its own
corpus in `graph-io/test/corpus/`; every file here except the two `unnamed-endpoints` fixtures is
a copy of the file at the same path there, whose `manifest.json` records its source, licence and
expected counts.

- `csv/unnamed-endpoints.csv` and `json/unnamed-endpoints.json` are written for the element: a
  table and a node-link document whose endpoint columns use names the element does not guess, so
  a load must be refused with `E_EDGE_ENDPOINTS_UNRESOLVED`.

Delete a file here when the last test that names it goes.
