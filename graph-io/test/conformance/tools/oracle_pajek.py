"""Pajek oracle for tools/oracle.py.

Two oracles, chosen per fixture by its "oracle" field:

- "networkx-3.1": networkx.read_pajek. It keys nodes by LABEL, so its node keys become "labels";
  it only reads single-section .net files correctly (an *Edges section swallows every later line,
  duplicate labels collapse), so it is used for those and cross-checked against the counter below.
- "pajek-manual-counter": a small reader written from the Pajek 6.02 manual (sections 2, 5.3,
  5.4): *Network / *Vertices n [n1] / *Arcs / *Edges / *Arcslist / *Edgeslist / *Matrix (with
  :k relations and optional counts), one-mode and two-mode, project files (.paj) with several
  networks and *Partition / *Vector objects, % comments, CR / LF / CRLF, and the encoding rule
  graph-io follows (BOM, else the explicit "encoding" option, else UTF-8, else windows-1252).

Node ids are vertex numbers (graph-io's default nodeIdFrom "id"). Returns None for fixtures whose
expectation is written by hand ("oracle": "spec").
"""
import codecs
import re
import networkx as nx

OBJECTS = ("partition", "vector", "permutation", "cluster", "hierarchy", "events")


def decode(data, encoding=None):
    if data.startswith(codecs.BOM_UTF8):
        return data[3:].decode("utf-8")
    if data.startswith(codecs.BOM_UTF16_LE):
        return data[2:].decode("utf-16-le")
    if data.startswith(codecs.BOM_UTF16_BE):
        return data[2:].decode("utf-16-be")
    if encoding:
        return data.decode(encoding)
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("cp1252")


def tokens(line):
    """Blank-separated tokens; a double-quoted token keeps its spaces. Returns (text, quoted) pairs."""
    return [(t[1:-1], True) if t.startswith('"') else (t, False) for t in re.findall(r'"[^"]*"|\S+', line)]


def is_number(text):
    try:
        float(text)
        return True
    except ValueError:
        return False


def entities(text):
    return re.sub(r"&#(\d+);", lambda m: chr(int(m.group(1))), text)


def new_network(name=None):
    return {"name": name, "n": None, "n1": None, "labels": {}, "edges": [], "section": None, "row": 0}


def count(path, encoding=None):
    """Read a Pajek file into a list of networks."""
    with open(path, "rb") as f:
        text = decode(f.read(), encoding)
    networks = []
    net = None
    in_object = False
    for raw in re.split(r"\r\n|\r|\n", text):
        line = raw.strip()
        if not line or line.startswith("%"):
            continue
        if line.startswith("*"):
            head = line[1:].split()
            key = head[0].lower() if head else ""
            if key == "network":
                net = new_network(line.split(None, 1)[1] if len(head) > 1 else "")
                networks.append(net)
                in_object = False
            elif key in OBJECTS:
                in_object = True
            elif key == "vertices":
                if in_object:
                    continue
                if net is None or net["n"] is not None:
                    net = new_network()
                    networks.append(net)
                nums = [int(t) for t in head[1:3] if t.lstrip("-").isdigit()]
                net["n"] = nums[0]
                net["n1"] = nums[1] if len(nums) > 1 else None
                net["section"] = "vertices"
            elif key in ("arcs", "edges", "arcslist", "edgeslist", "matrix"):
                in_object = False
                net["section"] = key
                net["row"] = 0
            else:
                raise ValueError("unknown section " + line)
            continue
        if in_object or net is None:
            continue
        sec = net["section"]
        pairs = tokens(line)
        t = [text for text, _ in pairs]
        if t and t[0].endswith(":") and sec in ("arcs", "edges", "arcslist", "edgeslist"):
            t = t[1:]  # a per-line relation number, "k: v1 v2" (multi-relational networks)
        if sec == "vertices":
            # a label is always the second token unless the line is only numbers (coordinates)
            coords_only = len(t) > 1 and not pairs[1][1] and all(is_number(x) for x in t[1:])
            if len(t) > 1 and not coords_only:
                net["labels"][int(t[0])] = entities(t[1])
        elif sec in ("arcs", "edges"):
            weight = float(t[2]) if len(t) > 2 and is_number(t[2]) else 1.0
            net["edges"].append((abs(int(t[0])), abs(int(t[1])), sec == "arcs", weight))
        elif sec in ("arcslist", "edgeslist"):
            u = abs(int(t[0]))
            for v in t[1:]:
                net["edges"].append((u, abs(int(v)), sec == "arcslist", 1.0))
        elif sec == "matrix":
            net["row"] += 1
            n, n1 = net["n"], net["n1"]
            cols = (n - n1) if n1 else n
            offset = n1 if n1 else 0
            for j, value in enumerate(t[:cols]):
                w = float(value)
                if w != 0:
                    net["edges"].append((net["row"], offset + j + 1, True, w))
    return networks


def expectation(networks):
    net = networks[0]
    kinds = {e[2] for e in net["edges"]}
    out = {"outcome": "pass", "nodes": net["n"], "edges": len(net["edges"])}
    two_mode_matrix = net["n1"] is not None and net["section"] == "matrix"
    if kinds and not two_mode_matrix:
        out["directed"] = True in kinds
    labels = list(net["labels"].values())
    if labels:
        picks = labels[:3] + [l for l in labels if any(ord(c) > 127 for c in l)][:3] + labels[-1:]
        out["labels"] = list(dict.fromkeys(picks))
    checks = []
    for u, v, _, w in net["edges"][:3]:
        checks.append({"source": u, "target": v, "weight": w})
    if checks:
        out["edgeChecks"] = checks
    if len(networks) > 1:
        out["graphs"] = len(networks)
    return out


def compute(path, fixture):
    oracle = fixture.get("oracle")
    encoding = (fixture.get("options") or {}).get("encoding")
    if oracle == "pajek-manual-counter":
        return expectation(count(path, encoding))
    if oracle == "networkx-3.1":
        try:
            G = nx.read_pajek(path)
        except Exception as err:  # networkx cannot read it: leave the fixture alone
            print("networkx cannot read", path, err)
            return None
        mine = expectation(count(path, encoding))
        if (G.number_of_nodes(), G.number_of_edges()) != (mine["nodes"], mine["edges"]):
            print("networkx and the counter disagree on", path,
                  (G.number_of_nodes(), G.number_of_edges()), (mine["nodes"], mine["edges"]))
        out = dict(mine)
        out.update({"nodes": G.number_of_nodes(), "edges": G.number_of_edges(), "directed": G.is_directed()})
        labels = [str(n) for n in G.nodes]
        out["labels"] = list(dict.fromkeys(labels[:3] + labels[-1:]))
        return out
    return None


if __name__ == "__main__":
    import sys

    for p in sys.argv[1:]:
        print(p, expectation(count(p)))
