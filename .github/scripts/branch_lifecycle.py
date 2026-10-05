#!/usr/bin/env python3
from __future__ import annotations
import json, os, re, sys
from urllib import error, parse, request

API="https://api.github.com"
TASK=re.compile(r"^(?:task|wip)/(?P<key>(?:OR|SUR)-[0-9]+)-[0-9]{8}-[a-z0-9][a-z0-9-]*$")\nLEGACY_TASK=re.compile(r"^task/(?P<key>(?:OR|SUR)-[0-9]+)-[a-z0-9][a-z0-9-]*$")
LEGACY_TASK=re.compile(r"^task/(?P<key>(?:OR|SUR)-[0-9]+)-[a-z0-9][a-z0-9-]*$")
PAUSED=re.compile(r"^paused/(?P<key>(?:OR|SUR)-[0-9]+)-[0-9]{8}-[a-z0-9][a-z0-9-]*$")

def api(repo,token,method,path):
    req=request.Request(f"{API}/repos/{repo}{path}",method=method,headers={
        "Accept":"application/vnd.github+json","Authorization":f"Bearer {token}",
        "X-GitHub-Api-Version":"2022-11-28","User-Agent":"pixelgaps-branch-lifecycle"})
    try:
        with request.urlopen(req,timeout=20) as r:
            body=r.read()
            return r.status,json.loads(body) if body else None
    except error.HTTPError as exc:
        body=exc.read().decode("utf-8",errors="replace")
        try: detail=json.loads(body)
        except json.JSONDecodeError: detail={"message":body}
        return exc.code,detail

def integrated(repo,token,head,main):
    if head==main: return True
    status,payload=api(repo,token,"GET",f"/compare/{head}...{main}")
    if status!=200 or not isinstance(payload,dict):
        raise RuntimeError(f"compare failed HTTP {status}: {payload}")
    return str(((payload.get("merge_base_commit") or {}).get("sha")) or "")==head

def delete(repo,token,name):
    status,payload=api(repo,token,"DELETE","/git/refs/"+parse.quote(f"heads/{name}",safe=""))
    if status!=204: raise RuntimeError(f"delete {name} failed HTTP {status}: {payload}")

def main():
    repo=os.environ.get("GITHUB_REPOSITORY",""); token=os.environ.get("GITHUB_TOKEN","")
    if not repo or not token: raise SystemExit("GITHUB_REPOSITORY and GITHUB_TOKEN required")
    status,branches=api(repo,token,"GET","/branches?per_page=100")
    if status!=200 or not isinstance(branches,list): raise SystemExit(f"branch list failed: {status}")
    main_item=next((x for x in branches if x.get("name")=="main"),None)
    main_sha=str(((main_item or {}).get("commit") or {}).get("sha") or "")
    if not main_sha: raise SystemExit("main SHA unavailable")
    deleted=[]; active=[]; paused=[]; unmanaged=[]
    for item in branches:
        name=str(item.get("name") or "")
        if name=="main": continue
        head=str((item.get("commit") or {}).get("sha") or "")
        known=bool(TASK.fullmatch(name) or LEGACY_TASK.fullmatch(name) or PAUSED.fullmatch(name))
        if known and integrated(repo,token,head,main_sha):
            delete(repo,token,name); deleted.append(name)
        elif PAUSED.fullmatch(name): paused.append(name)
        elif TASK.fullmatch(name) or LEGACY_TASK.fullmatch(name): active.append(name)
        else: unmanaged.append(name)
    print(json.dumps({"policy":"pixelgaps-task-branch-lifecycle","deleted_integrated":sorted(deleted),
                      "active":sorted(active),"paused":sorted(paused),"unmanaged":sorted(unmanaged)},sort_keys=True))
    if unmanaged:
        print("Unmanaged branch refs require explicit discard or Jira-backed pause classification",file=sys.stderr)
        return 1
    return 0

if __name__=="__main__": raise SystemExit(main())
