"""Persistent single-job server worker; no inbound socket or public secret."""
import json, os, re, tempfile, threading, time, urllib.request, urllib.error, urllib.parse
from pathlib import Path
from render import render
KEY=re.compile(r"[a-f0-9]{64}")
UUID=re.compile(r"[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}",re.I)
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None
class API:
    def __init__(self,base,token):
        u=urllib.parse.urlsplit(base)
        if u.scheme not in ("http","https") or u.username or u.password or u.path not in ("","/") or u.query or u.fragment:raise ValueError("Invalid API origin")
        if u.scheme=="http" and u.hostname not in ("backend","api","atsh-website-api","atsh-website-api-internal","localhost","127.0.0.1") and os.environ.get("ALLOW_INTERNAL_HTTP")!="true":raise ValueError("Internal HTTP not allowed")
        if not KEY.fullmatch(token):raise ValueError("Invalid worker token")
        self.base=base.rstrip("/");self.token=token;self.opener=urllib.request.build_opener(NoRedirect())
    def call(self,path,body=None,token=None,mime="application/json",limit=6*1024*1024,timeout=40):
        payload=body if isinstance(body,bytes) else json.dumps(body or {}).encode()
        req=urllib.request.Request(self.base+path,data=payload,method="POST",headers={"Authorization":"Bearer "+(token or self.token),"Content-Type":mime})
        with self.opener.open(req,timeout=timeout) as r:
            b=r.read(limit+1)
            if len(b)>limit:raise ValueError("Response too large")
            return r.status,b
def process(api,job):
    id,token=job["id"],job["jobToken"]
    if not UUID.fullmatch(id) or not KEY.fullmatch(token):raise ValueError("Invalid job")
    status={"stage":"layered_running"};stop=threading.Event();cancel=threading.Event()
    common={"id":id,"jobToken":token};prefix="/api/integrations/layered-worker/"
    def heartbeat():
        last=time.monotonic()
        while not stop.is_set():
            try:api.call(prefix+"heartbeat",{**common,**status});last=time.monotonic()
            except urllib.error.HTTPError as e:
                if e.code in (401,409):cancel.set();return
            except Exception:pass
            if time.monotonic()-last>120:cancel.set();return
            stop.wait(15)
    thread=threading.Thread(target=heartbeat,daemon=True);thread.start()
    result="/api/integrations/content-studio/"+id+"/result"
    def voice(line):
        if cancel.is_set():raise RuntimeError("cancelled")
        _,b=api.call(prefix+"voice",{**common,"lineId":line},limit=4*1024*1024,timeout=105)
        return b
    try:
        with tempfile.TemporaryDirectory(prefix="atsh-layered-") as tmp:
            output=render(job["plan"],voice,Path(tmp),cancel.is_set,lambda s:status.update(stage=s))
            if not cancel.is_set():api.call(result,output.read_bytes(),token,"video/mp4")
        print("Layered job finished",flush=True)
    except Exception as e:
        print("Layered job failed:",type(e).__name__,flush=True)
        if not cancel.is_set():
            try:api.call(result,{"status":"failed"},token)
            except Exception:pass
    finally:stop.set();thread.join(timeout=45)
def main():
    api=API(os.environ["ATSH_API_URL"],os.environ.pop("LAYERED_WORKER_TOKEN"))
    while True:
        try:
            status,b=api.call("/api/integrations/layered-worker/claim")
            if status==200:process(api,json.loads(b))
        except urllib.error.HTTPError as e:
            print("HTTP",e.code,flush=True)
            if e.code==401:raise
        except Exception as e:print("Worker error",type(e).__name__,flush=True)
        time.sleep(10)
if __name__=="__main__":main()
