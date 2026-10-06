"""The Cytoscape oracle shared by oracle_xgmml.py and oracle_cys.py: Cytoscape Desktop 3.10.5,
driven through CyREST (https://github.com/cytoscape/cyREST, MIT), reads a fixture and reports
what it shows (design/graph-io/cytoscape-and-obo/design.md section 6.3).

It needs a running Cytoscape with CyREST on CYREST_URL (default http://localhost:1234), which
needs Java 17 and an X display; the manually dispatched workflow
.github/workflows/conformance-cytoscape-oracle.yml starts one under xvfb-run and runs
`oracle.py --include-spec xgmml cys`. Python standard library only.

What it writes into "expected": outcome, nodes, edges, graphs, graphNames (cys) and labels (the
node names Cytoscape shows), and for XGMML directed. Positions and per-node values are keyed by
ids Cytoscape renumbers (SUIDs), so they stay hand-written. A fixture with "oracleDisagrees" is
left alone: there the specification overrules Cytoscape on purpose. A cheap stdlib xml.etree count
catches a broken run (Cytoscape answering an empty network for a file that holds nodes); it is
never the source of an expectation.
"""
import json
import os
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

BASE = os.environ.get("CYREST_URL", "http://localhost:1234").rstrip("/")
ORACLE = "cytoscape-3.10.5"
LABELS = 20


def call(method, path, body=None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(f"{BASE}{path}", data=data, method=method,
                                     headers={"Content-Type": "application/json", "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=300) as response:
        text = response.read().decode("utf-8")
    return json.loads(text) if text else None


def command(path, body):
    """A /v1/commands call: its data, or an exception carrying Cytoscape's errors."""
    result = call("POST", f"/v1/commands/{path}", body)
    errors = (result or {}).get("errors") or []
    if errors:
        raise RuntimeError("; ".join(str(e.get("message", e)) for e in errors))
    return (result or {}).get("data")


def fresh():
    command("session/new", {})


def network(suid):
    """Node names, node count, edge count and the per-edge direction of one network."""
    cyjs = call("GET", f"/v1/networks/{suid}")
    nodes = cyjs["elements"].get("nodes", [])
    edges = cyjs["elements"].get("edges", [])
    names = [n["data"].get("name") for n in nodes if n["data"].get("name") is not None]
    directed = [bool(call("GET", f"/v1/networks/{suid}/edges/{e['data']['SUID']}/isDirected")) for e in edges]
    return {"name": cyjs["data"].get("name"), "labels": names, "nodes": len(nodes), "edges": len(edges),
            "directed": any(directed) if directed else None}


def networks():
    return [network(suid) for suid in call("GET", "/v1/networks")]


def failed():
    return {"outcome": "fail", "_oracle": ORACLE}


def summary(net, extra=None):
    out = {"outcome": "pass", "nodes": net["nodes"], "edges": net["edges"],
           "labels": sorted(set(net["labels"]))[:LABELS], "_oracle": ORACLE}
    out.update(extra or {})
    return out


def etree_counts(path):
    """Declared nodes and edges by a plain stdlib parse (the cross-check), or None when it cannot parse."""
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError:
        return None
    nodes = sum(1 for e in root.iter() if e.tag.split("}")[-1] == "node" and (e.get("id") or e.get("label")))
    edges = sum(1 for e in root.iter() if e.tag.split("}")[-1] == "edge" and e.get("source"))
    return nodes, edges


def compute_xgmml(path, fixture):
    if fixture.get("oracleDisagrees"):
        return None
    fresh()
    try:
        command("network/load file", {"file": os.path.abspath(path)})
    except (RuntimeError, urllib.error.HTTPError):
        return failed()
    loaded = networks()
    if not loaded:
        return failed()
    net = loaded[0]
    counts = etree_counts(path)
    if counts is not None and counts[0] > 0 and net["nodes"] == 0:
        raise RuntimeError(f"{path}: Cytoscape shows no node where the file declares {counts[0]}: a broken run")
    extra = {} if net["directed"] is None else {"directed": net["directed"]}
    return summary(net, extra)


def compute_cys(path, fixture):
    if fixture.get("oracleDisagrees"):
        return None
    fresh()
    try:
        command("session/open", {"file": os.path.abspath(path)})
    except (RuntimeError, urllib.error.HTTPError):
        return failed()
    loaded = networks()
    if not loaded:
        return failed()
    options = fixture.get("options", {})
    names = fixture.get("expected", {}).get("graphNames")
    wanted = options.get("graphName")
    if wanted is None and names:
        wanted = names[options.get("graphIndex", 0)]
    chosen = next((n for n in loaded if n["name"] == wanted), None)
    if chosen is None and len(loaded) == 1:
        chosen = loaded[0]
    extra = {"graphs": len(loaded)}
    if chosen is None:
        return {"outcome": "pass", "_oracle": ORACLE, **extra}
    return summary(chosen, extra)
