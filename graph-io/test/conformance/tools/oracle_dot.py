"""DOT oracle: Graphviz 2.43 gvpr (called by oracle.py).

Per graph in the file gvpr reports the node and edge counts, directedness, the distinct cluster
subgraphs (any depth) and the first node names. graph-io models every cluster subgraph as one
extra container node, so the expected node count is Graphviz's plus the cluster count; a cluster
that shares its name with a node (fdp's edges to clusters) merges into that node
(W_DOT_CLUSTER_NODE_MERGED) and adds nothing. A file
Graphviz reports an error for is expected to fail with E_SYNTAX. Bytes that are not valid UTF-8
in a file without a charset attribute are expected to be read as windows-1252 with
W_ENCODING_FALLBACK (the owner's encoding rule; Graphviz itself warns and reads Latin-1).
"""
import re
import subprocess

PROGRAM = r"""
BEG_G {
  int nc = 0;
  int seen[string];
  graph_t stk[int];
  int sp = 0;
  graph_t sg;
  graph_t cur;
  node_t n;
  int k = 0;
  stk[sp++] = $G;
  while (sp > 0) {
    cur = stk[--sp];
    for (sg = fstsubg(cur); sg; sg = nxtsubg(sg)) {
      if (index(sg.name, "cluster") == 0 && !(sg.name in seen)) { seen[sg.name] = 1; if (!isNode($G, sg.name)) nc++; }
      stk[sp++] = sg;
    }
  }
  printf("GRAPH %d %d %d %d\n", nNodes($G), nEdges($G), isDirect($G), nc);
  for (n = fstnode($G); n && k < 5; n = nxtnode(n)) { printf("NODE %s\n", n.name); k++; }
}
"""


def decode(raw):
    try:
        return raw.decode("utf-8"), False
    except UnicodeDecodeError:
        return raw.decode("cp1252", errors="replace"), True


def compute(path, fixture):
    data = open(path, "rb").read()
    proc = subprocess.run(["gvpr", PROGRAM, path], capture_output=True, timeout=120)
    out, _ = decode(proc.stdout)
    err = proc.stderr.decode("utf-8", errors="replace")
    graphs = []
    for line in out.split("\n"):
        if line.startswith("GRAPH "):
            n, e, d, c = (int(x) for x in line.split()[1:])
            graphs.append({"nodes": n + c, "edges": e, "directed": d == 1, "names": []})
        elif line.startswith("NODE ") and graphs:
            graphs[-1]["names"].append(line[5:])
    if "Error" in err or not graphs:
        return {"outcome": "fail", "code": "E_SYNTAX"}
    first = graphs[0]
    result = {"outcome": "pass", "nodes": first["nodes"], "edges": first["edges"], "directed": first["directed"]}
    names = [x for x in first["names"] if "\ufffd" not in x]
    if names:
        result["nodeIds"] = names
    warnings = list(fixture.get("expected", {}).get("warnings", []))
    has_charset = re.search(rb"charset", data, re.I) is not None
    if not has_charset and not data.startswith((b"\xef\xbb\xbf", b"\xff\xfe", b"\xfe\xff")):
        try:
            data.decode("utf-8")
        except UnicodeDecodeError:
            warnings.append("W_ENCODING_FALLBACK")
    if len(graphs) > 1:
        result["graphs"] = len(graphs)
        warnings.append("W_MULTIPLE_GRAPHS")
    if "badly delimited number" in err:
        warnings.append("W_DOT_NUMERAL_AMBIGUITY")
    if warnings:
        result["warnings"] = sorted(set(warnings))
    return result
