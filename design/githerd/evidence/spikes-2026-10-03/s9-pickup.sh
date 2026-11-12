#!/bin/bash
# S9: pickup time (job started_at minus created_at) of every GPU job attempt since 09-03.
R=graphty-org/graphty-monorepo
gh api "/repos/$R/actions/workflows/gpu.yml/runs?created=>=2026-09-03&per_page=100" --paginate --jq '.workflow_runs[]|select(.conclusion!="skipped")|"\(.id) \(.run_attempt)"' | while read id att; do
  for a in $(seq 1 $att); do
    gh api "/repos/$R/actions/runs/$id/attempts/$a/jobs?per_page=100" --jq '.jobs[]|select(.started_at!=null and .labels[0]!=null)|"\(.created_at) \(.started_at) \(.conclusion) \(.labels[0]) '"$id"'/'"$a"'"'
  done
done > s9-jobs.txt
wc -l s9-jobs.txt
python3 - <<'PY'
from datetime import datetime as D
rows=[l.split() for l in open('s9-jobs.txt')]
f=lambda s:D.strptime(s,'%Y-%m-%dT%H:%M:%SZ')
w=sorted(((f(s)-f(c)).total_seconds(),c,lab,run,con) for c,s,con,lab,run in rows)
print('jobs',len(w),'labels',sorted(set(r[2] for r in w)))
d=[x[0] for x in w]
for q in (.5,.9,.95,.99): print(f'p{int(q*100)}', d[min(len(d)-1,int(q*len(d)))],'s')
print('worst 8:'); [print(' ',int(x[0]),'s',x[1],x[4],x[3]) for x in w[-8:]]
PY
