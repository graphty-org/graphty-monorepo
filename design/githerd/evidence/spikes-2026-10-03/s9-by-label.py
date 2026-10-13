from datetime import datetime as D
f=lambda s:D.strptime(s,'%Y-%m-%dT%H:%M:%SZ')
by={}
for c,s,con,lab,run in (l.split() for l in open('s9-jobs.txt')):
    by.setdefault(lab,[]).append(((f(s)-f(c)).total_seconds(),c,con,run))
for lab,w in by.items():
    w.sort(); d=[x[0] for x in w]
    print(lab,'n',len(d),'first',min(x[1] for x in w),'median',d[len(d)//2],'max',d[-1],'top3',[(int(x[0]),x[1],x[2]) for x in w[-3:]])
