"""Private CPU voice provider. Every identity requires a separately licensed, verified local model."""
import hmac,hashlib,json,logging,os,re,subprocess,tempfile,wave,sys
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from threading import BoundedSemaphore
from pathlib import Path
from voice_quality import check_pcm16
EGYPTIAN_IDS={f"{dialect}-{role}" for dialect in ("egyptian","alexandrian","saidi") for role in ("male","female","child-male","child-female","teen-male","teen-female")}
IDS=EGYPTIAN_IDS | {f"{dialect}-{gender}" for dialect in ("saudi","gulf") for gender in ("male","female")}
def youth_voice(id):
    return "-child-" in id or "-teen-" in id
def local_asset(root, value, suffix=None, directory=False):
    if not isinstance(value,str) or not value:raise ValueError("Missing asset path")
    path=(root/value).resolve()
    if not path.is_relative_to(root) or (directory and not path.is_dir()) or (not directory and (not path.is_file() or (suffix and path.suffix!=suffix))):
        raise ValueError("Missing or invalid local asset")
    return path
def sha(path):
    with path.open("rb") as f:return hashlib.file_digest(f,"sha256").hexdigest()
REPLICA_Q4_SHA256="8583aa11b17f7851520bfc9cdc08f368737941f72b948b3bad6490ad628de03d"
REJECTED_MODEL_HASHES={"1578a9b27d01a0626227225b148179628b770607dd61bdbbc41865bd399106b1"}
def registry(root, config, candidates=False):
    root=Path(root).resolve(); result={}; seen=set()
    if not isinstance(config,dict):raise ValueError("Invalid voice registry")
    for id, entry in config.items():
        if id not in IDS or not isinstance(entry,dict):raise ValueError("Invalid voice ID")
        # A candidate is never exposed to production even if the files exist.
        if not candidates and entry.get("approved") is not True and not (entry.get("engine")=="voicetut" and entry.get("provisional") is True and os.environ.get("ENABLE_PROVISIONAL_EGYPTIAN")=="1"):continue
        engine=entry.get("engine","piper")
        if engine=="piper":
            model=local_asset(root,entry.get("model"),".onnx")
            local_asset(root,str(model)+".json",".json")
            speaker=entry.get("speaker")
            if speaker is not None and (type(speaker) is not int or speaker<0):raise ValueError("Invalid speaker")
            config_data=json.loads(Path(str(model)+".json").read_text())
            count=config_data.get("num_speakers",1)
            if type(count) is not int or count<1 or (speaker is not None and speaker>=count) or (count>1 and speaker is None):raise ValueError("Explicit valid speaker required")
            model_hash=sha(model)
            if model_hash in REJECTED_MODEL_HASHES:raise ValueError("Model rejected by listening review")
            identity=(model_hash,speaker or 0)
            item={"engine":engine,"model":str(model),"speaker":speaker}
        elif engine=="replica":
            from replica_backend import APPROVED_PILOT
            if id not in APPROVED_PILOT:raise ValueError("Unreviewed Replica identity")
            model=local_asset(root,entry.get("model"),".gguf")
            if sha(model)!=REPLICA_Q4_SHA256:raise ValueError("Replica model digest mismatch")
            identity=(engine,id)
            item={"engine":engine,"model":str(model)}
        elif engine=="audar":
            if entry.get("commercialRights") is not True:raise ValueError("Reference rights not confirmed")
            model=local_asset(root,entry.get("model"),".gguf")
            codec=local_asset(root,entry.get("codec"),directory=True)
            reference=local_asset(root,entry.get("reference"),".wav")
            transcript=entry.get("transcript")
            if not isinstance(transcript,str) or not transcript.strip() or len(transcript)>500 or "<|" in transcript:raise ValueError("Reference transcript required")
            with wave.open(str(reference),"rb") as w:
                if w.getnchannels()!=1 or w.getframerate()!=16000 or w.getsampwidth()!=2 or not 5<=w.getnframes()/16000<=15:raise ValueError("Reference must be 5-15 s mono PCM16 at 16 kHz")
            if youth_voice(id) and entry.get("source")!="synthetic" and entry.get("guardianConsent") is not True:
                raise ValueError("Youth reference requires documented guardian consent or licensed synthetic source")
            with wave.open(str(reference),"rb") as w:
                identity=("reference",hashlib.sha256(w.readframes(w.getnframes())).hexdigest())
            item={"engine":engine,"model":str(model),"codec":str(codec),"reference":str(reference),"transcript":transcript}
        elif engine=="voicetut":
            if id not in EGYPTIAN_IDS or entry.get("commercialRights") is not True:raise ValueError("Egyptian voice rights not confirmed")
            if entry.get("source") not in ("synthetic","human"):raise ValueError("Document reference origin")
            if youth_voice(id) and entry.get("source")!="synthetic" and entry.get("guardianConsent") is not True:raise ValueError("Youth reference requires consent")
            model=local_asset(root,entry.get("model"),directory=True)
            reference=local_asset(root,entry.get("reference"),".wav")
            transcript=entry.get("transcript")
            if not isinstance(transcript,str) or not transcript.strip() or len(transcript)>500 or "<|" in transcript:raise ValueError("Reference transcript required")
            with wave.open(str(reference),"rb") as w:
                if w.getnchannels()!=1 or w.getsampwidth()!=2 or w.getframerate() not in (16000,24000) or not 2<=w.getnframes()/w.getframerate()<=15:raise ValueError("Invalid VoiceTut reference")
                identity=("reference",hashlib.sha256(w.readframes(w.getnframes())).hexdigest())
            if sha(reference)!=entry.get("referenceSha256"):raise ValueError("Voice reference digest mismatch")
            item={"engine":engine,"model":str(model),"reference":str(reference),"transcript":transcript,"provisional":entry.get("approved") is not True}
        else:raise ValueError("Unknown engine")
        if identity in seen:raise ValueError("Do not reuse a voice identity under a different dialect/gender")
        seen.add(identity);result[id]=item
    return result
def synthesize(models,body):
    voice=body.get("voiceId")
    if voice not in models:raise ValueError("Unavailable voice")
    text=body.get("pronunciation") or body.get("text")
    if not isinstance(text,str) or not 0<len(text.strip())<=90 or not re.search("[\u0600-\u06ff]",text) or re.search("[A-Za-z]",text) or "<|" in text:raise ValueError("Arabic text required")
    speed=body.get("speed",1);pitch=body.get("pitch",0);intonation=body.get("intonation",1)
    if not isinstance(speed,(int,float)) or not .8<=speed<=1.2 or pitch!=0 or intonation!=1:raise ValueError("Dialect models use their authentic pitch and intonation")
    entry=models[voice]
    with tempfile.TemporaryDirectory(prefix="atsh-voice-") as tmp:
        target=Path(tmp)/"raw.wav"; output=Path(tmp)/"voice.wav"
        if entry["engine"]=="piper":
            cmd=["piper","-m",entry["model"],"-f",str(target),"--length-scale",str(1/speed)]
            if entry["speaker"] is not None:cmd+=["--speaker",str(entry["speaker"])]
            subprocess.run(cmd,input=text.encode("utf-8"),check=True,timeout=20,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            filters=[]
        elif entry["engine"]=="voicetut":
            from voicetut_backend import render
            render(entry,text,speed,target)
            filters=[]
        elif entry["engine"]=="replica":
            from replica_backend import render
            render(entry["model"],voice,text,target)
            filters=[] if speed==1 else ["-af",f"atempo={speed}"]
        else:
            subprocess.run([sys.executable,str(Path(__file__).with_name("audar_backend.py")),str(target)],
                           input=json.dumps({"voice":entry,"text":text}).encode(),check=True,timeout=83,
                           stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            filters=["-af",f"atempo={speed}"]
        subprocess.run(["ffmpeg","-v","error","-nostdin","-i",str(target),*filters,"-ac","1","-ar","16000","-c:a","pcm_s16le","-t","33",str(output)],check=True,timeout=5)
        with wave.open(str(output),"rb") as stream:
            if not 0<stream.getnframes()<=512000:raise ValueError("Invalid voice duration")
        check_pcm16(output)
        return output.read_bytes()
def main():
    root=os.environ.get("VOICE_MODEL_ROOT","/models")
    manifest=os.environ.get("VOICE_MODELS_JSON")
    config=json.loads(manifest if manifest else Path(os.environ.get("VOICE_PROFILES_FILE",str(Path(root)/"profiles.json"))).read_text())
    if len(sys.argv)>1 and sys.argv[1]=="--audition":
        # Offline admin-only review, no candidate ever enters production API.
        from audition import samples
        selected=sys.argv[3:]
        if selected:
            if any(v not in config for v in selected):raise ValueError("Unknown audition voice")
            config={v:config[v] for v in selected}
        models=registry(root,config,candidates=True)
        out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
        for voice in sorted(models):
            (out/(voice+".wav")).write_bytes(synthesize(models,{"voiceId":voice,"text":samples[voice.split("-")[0]],"speed":1}))
            print("Generated candidate for review:",voice,flush=True)
        return
    models=registry(root,config)
    if any(v["engine"]=="audar" for v in models.values()):
        import importlib.util
        if any(importlib.util.find_spec(m) is None for m in ("llama_cpp","neucodec","torch","soundfile")):
            raise RuntimeError("Build the Audar runtime before enabling approved profiles")
    if any(v["engine"]=="voicetut" for v in models.values()):
        from voicetut_backend import load_model
        for model in {v["model"] for v in models.values() if v["engine"]=="voicetut"}:load_model(model)
    if any(v["engine"]=="replica" for v in models.values()):
        from replica_backend import runtime
        runtime()
    token=os.environ["CHARACTER_DIALECT_SERVICE_TOKEN"]
    if not re.fullmatch("[a-f0-9]{64}",token):raise ValueError("64 hex token required")
    slot=BoundedSemaphore(1)
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):pass
        def authorized(self):return hmac.compare_digest(self.headers.get("Authorization","").encode(),("Bearer "+token).encode())
        def reply(self,status,body=b"",mime="application/json"):
            self.send_response(status);self.send_header("Content-Type",mime);self.send_header("Content-Length",str(len(body)));self.send_header("Cache-Control","no-store");self.end_headers();self.wfile.write(body)
        def do_GET(self):
            if not self.authorized():return self.reply(401)
            if self.path!="/voices":return self.reply(404)
            self.reply(200,json.dumps({"voices":sorted(models),"provisional":[k for k,v in models.items() if v.get("provisional")]}).encode())
        def do_POST(self):
            if not self.authorized():return self.reply(401)
            if self.path!="/voice-preview":return self.reply(404)
            try:
                n=int(self.headers.get("Content-Length","0"))
                if not 0<n<=8192:raise ValueError()
                self.connection.settimeout(5)
                body=json.loads(self.rfile.read(n))
                if not isinstance(body,dict):raise ValueError()
                if not slot.acquire(blocking=False):return self.reply(429)
                try:audio=synthesize(models,body)
                finally:slot.release()
            except ValueError:return self.reply(400)
            except Exception as exc:
                logging.warning("Voice synthesis failed: %s",type(exc).__name__)
                return self.reply(502)
            self.reply(200,audio,"audio/wav")
    ThreadingHTTPServer((os.environ.get("VOICE_BIND_HOST","0.0.0.0"),int(os.environ.get("VOICE_PORT","8080"))),Handler).serve_forever()
if __name__=="__main__":main()

