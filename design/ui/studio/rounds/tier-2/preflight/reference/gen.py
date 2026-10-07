# Writes the tier 2 study files in tool/files (bus-stops, trails, players, passes, team, team-v2)
# and prints NetworkX reference values; the answer key uses graphty-element's values (probe.mjs).
import networkx as nx, csv, random, itertools
F="/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tool/files/"
def uniq(g,a,b,w=None):
    ps=list(nx.all_shortest_paths(g,a,b,weight=w)); return ps
def write(name,hdr,rows):
    with open(F+name,"w",newline="") as f:
        w=csv.writer(f,lineterminator="\n"); w.writerow(hdr); w.writerows(rows)
# bus stops: minutes between stops
bus=[("Depot","Market",4),("Market","Library",6),("Library","Harbor",5),("Depot","School",9),("School","Harbor",12),
     ("Market","Park",3),("Park","Clinic",4),("Clinic","Harbor",3),("Library","Clinic",7),("School","Stadium",5),
     ("Stadium","Harbor",6),("Park","Museum",5),("Museum","Clinic",2),("Depot","Station",15),("Station","Harbor",14),
     ("Station","Stadium",4),("Museum","Library",4)]
g=nx.Graph(); [g.add_edge(a,b,minutes=m) for a,b,m in bus]
print("bus", g.number_of_nodes(), g.number_of_edges(), "hops", uniq(g,"Depot","Harbor"), "minutes", uniq(g,"Depot","Harbor","minutes"), nx.path_weight(uniq(g,"Depot","Harbor","minutes")[0] if True else None,"minutes") if False else nx.shortest_path_length(g,"Depot","Harbor",weight="minutes"))
write("bus-stops.csv",["from","to","minutes"],bus)
tr=[("Trailhead","Pine Fork",3.0),("Pine Fork","Summit",6.0),("Trailhead","Creek",1.5),("Creek","Meadow",2.0),("Meadow","Ridge",2.5),
    ("Ridge","Summit",1.5),("Creek","Lake",3.0),("Lake","Summit",4.5),("Pine Fork","Meadow",1.0),("Lake","Falls",2.0),("Falls","Ridge",3.5),
    ("Trailhead","Lookout",4.0),("Lookout","Ridge",3.0)]
g2=nx.Graph(); [g2.add_edge(a,b,km=k) for a,b,k in tr]
print("trails", g2.number_of_nodes(), g2.number_of_edges(), "hops", uniq(g2,"Trailhead","Summit"), "km", uniq(g2,"Trailhead","Summit","km"), nx.shortest_path_length(g2,"Trailhead","Summit",weight="km"))
write("trails.csv",["from","to","km"],tr)
# T4 B: players + passes, one pass names an unknown id
players=[("s01","Ana Torres","Keeper"),("s02","Bea Lund","Defender"),("s03","Cleo Park","Defender"),("s04","Dina Moss","Defender"),
 ("s05","Eve Grant","Midfield"),("s06","Fay Osei","Midfield"),("s07","Gia Russo","Midfield"),("s08","Hope Ward","Forward"),
 ("s09","Iris Chen","Forward"),("s10","June Kaur","Forward")]
passes=[("s01","s02",11),("s01","s03",9),("s02","s03",6),("s02","s05",14),("s03","s04",7),("s03","s06",10),("s04","s07",8),
 ("s05","s06",17),("s05","s08",12),("s06","s07",15),("s06","s09",13),("s07","s10",9),("s08","s09",8),("s09","s10",7),
 ("s05","s09",5),("s04","s11",3),("s02","s08",4),("s01","s04",5)]
write("players.csv",["id","name","position"],players); write("passes.csv",["from","to","passes"],passes)
# T21 B: team and team-v2 (two new hires, five new links, weights unchanged otherwise)
team=[("Abe","Bo",3),("Abe","Cy",5),("Bo","Cy",2),("Cy","Di",4),("Di","Ed",3),("Ed","Flo",5),("Flo","Gil",2),("Gil","Di",3),
 ("Ed","Hal",4),("Hal","Ida",2),("Ida","Jo",5),("Jo","Hal",3),("Bo","Kit",4),("Kit","Lu",2),("Lu","Abe",3),("Jo","Kit",1)]
team2=team+[("Mo","Abe",2),("Mo","Di",5),("Nia","Mo",4),("Nia","Di",5),("Kit","Nia",3)]
write("team.csv",["source","target","weight"],team); write("team-v2.csv",["source","target","weight"],team2)
for n,rows in [("team",team),("team-v2",team2)]:
    g=nx.Graph(); [g.add_edge(a,b,weight=w) for a,b,w in rows]
    print(n,g.number_of_nodes(),g.number_of_edges(),[(k,round(v,4)) for k,v in sorted(nx.pagerank(g,weight="weight").items(),key=lambda x:-x[1])[:3]])
for n in ["friends.csv","friends-v2.csv"]:
    g=nx.Graph(); [g.add_edge(r["source"],r["target"],weight=int(r["weight"])) for r in csv.DictReader(open(F+n))]
    print(n,[(k,round(v,4)) for k,v in sorted(nx.pagerank(g,weight="weight").items(),key=lambda x:-x[1])[:3]])
