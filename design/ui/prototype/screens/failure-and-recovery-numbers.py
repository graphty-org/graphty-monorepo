# The numbers behind screens/failure-and-recovery-*.html that kit/fixtures.json does not hold.
# Computed with NetworkX 3.1 from the same graph the kit draws: graph-io/test/corpus/json/miserables.json
# corrected to the published edge list (Old Man's edge goes to Myriel, not a self-loop on Myriel; four
# values of 9 the corpus reads as 0), as kit/gen-canvas.mjs does.
# Run from design/ui/prototype/: python3 screens/failure-and-recovery-numbers.py
import json, networkx as nx
raw = json.load(open("../../../graph-io/test/corpus/json/miserables.json"))
names = [n["name"] for n in raw["nodes"]]
_at = names.index
for l in raw["links"]:
    if l["source"] == l["target"] == _at("Myriel"):
        l["source"] = _at("OldMan")
_nine = {frozenset(map(_at, p)) for p in (("Fantine", "Valjean"), ("Bossuet", "Combeferre"), ("Courfeyrac", "Marius"), ("Gillenormand", "Mlle.Gillenormand"))}
for l in raw["links"]:
    if l.get("value") == 0 and frozenset((l["source"], l["target"])) in _nine:
        l["value"] = 9
G = nx.Graph()
for n in raw["nodes"]:
    G.add_node(n["name"], group=n["group"])
for l in raw["links"]:
    s, t = l["source"], l["target"]
    G.add_edge(names[s] if isinstance(s, int) else s, names[t] if isinstance(t, int) else t, value=l.get("value", 1))

def top(d, k=7):
    return [(n, round(v, 3)) for n, v in sorted(d.items(), key=lambda x: -x[1])[:k]]

def as_similarity(H):
    # value declared a similarity, converted 1/value for distance algorithms; value 0 = no edge
    K = nx.Graph()
    K.add_nodes_from(H)
    K.add_edges_from((u, v, {"length": 1 / d["value"]}) for u, v, d in H.edges(data=True) if d["value"])
    return K

print("edges with value 0:", sum(1 for *_, d in G.edges(data=True) if d["value"] == 0))
print("A, value read as a distance:", top(nx.betweenness_centrality(G, weight="value")))
print("A, value read as a similarity (1/value):", top(nx.betweenness_centrality(as_similarity(G), weight="length")))
s1 = G.subgraph([n for n in G if n != "Valjean"])
print("B, Filter out Valjean:", s1.number_of_nodes(), "nodes", s1.number_of_edges(), "edges,",
      nx.number_connected_components(s1), "components,", nx.number_of_isolates(s1), "isolated")
print("B, closeness (WF-corrected):", top(nx.closeness_centrality(as_similarity(s1), distance="length")))
print("B, closeness without the correction:", top(nx.closeness_centrality(as_similarity(s1), distance="length", wf_improved=False)))
largest = max(nx.connected_components(s1), key=len)
print("C, Largest component after Filter out Valjean leaves out:", sorted(set(s1) - largest))
s123 = s1.subgraph(largest).subgraph([n for n in largest if n != "Javert"])
s13 = s1.subgraph([n for n in s1 if n != "Javert"])
for name, H in (("C, all three steps", s123), ("C, Largest component off", s13)):
    print(name, H.number_of_nodes(), "nodes", H.number_of_edges(), "edges,",
          nx.number_connected_components(H), "components,", nx.number_of_isolates(H), "isolated",
          top(nx.betweenness_centrality(as_similarity(H), weight="length")))

# The same numbers into kit/fixtures.json, scenarios.failureAndRecovery, which the screen and storyboard
# builders read, so the pages never carry a hand-typed value.
def rows(H, d, k=7):
    return [{"label": n, "group": G.nodes[n]["group"], "degree": H.degree(n), "value": f"{v:.3f}"} for n, v in sorted(d.items(), key=lambda x: -x[1])[:k]]
def graph(H):
    return {"nodes": H.number_of_nodes(), "edges": H.number_of_edges(), "components": nx.number_connected_components(H), "isolated": nx.number_of_isolates(H)}
wf = nx.closeness_centrality(as_similarity(s1), distance="length")
wf_rank = sorted(wf, key=lambda n: -wf[n])
household = [n for n in (set(s1) - largest) if s1.degree(n) > 0]
_vc = [sum(1 for *_, d in G.edges(data=True) if d["value"] == v) for v in range(16)]  # the load step's value histogram, 0 to 15
_vmax = max(_vc)
bd = nx.betweenness_centrality(G, weight="value")
bs = nx.betweenness_centrality(as_similarity(G), weight="length")
rank = lambda d: {n: i + 1 for i, n in enumerate(sorted(d, key=lambda n: -d[n]))}
out = {
    "generatedBy": "screens/failure-and-recovery-numbers.py (NetworkX 3.1, the published Les Miserables graph) -- regenerate instead of editing by hand",
    "full": graph(G),
    "valueRange": [min(d["value"] for *_, d in G.edges(data=True)), max(d["value"] for *_, d in G.edges(data=True))],
    "valueBars": [round(100 * c / _vmax) for c in _vc],
    "valueZeroEdges": sum(1 for *_, d in G.edges(data=True) if d["value"] == 0),
    "asDistance": rows(G, bd),
    "asSimilarity": rows(G, bs),
    "rankAsDistance": rank(bd),
    "rankAsSimilarity": rank(bs),
    "withoutValjean": {**graph(s1), "household": len(household), "alone": nx.number_of_isolates(s1), "leftOutByLargest": len(set(s1) - largest),
                        "closenessWF": rows(s1, wf), "myriel": {"rank": wf_rank.index("Myriel") + 1, "value": f"{wf['Myriel']:.3f}"},
                        "closenessUncorrected": rows(s1, nx.closeness_centrality(as_similarity(s1), distance="length", wf_improved=False)),
                        "householdNames": sorted(household)},
    "allThreeSteps": {**graph(s123), "betweenness": rows(s123, nx.betweenness_centrality(as_similarity(s123), weight="length"))},
    "largestOff": {**graph(s13), "betweenness": rows(s13, nx.betweenness_centrality(as_similarity(s13), weight="length"))},
}
fix = json.load(open("kit/fixtures.json"))
fix.setdefault("scenarios", {})["failureAndRecovery"] = out
json.dump(fix, open("kit/fixtures.json", "w"), indent=1)
