"""Private CPU voice provider. Every identity requires a separately licensed, verified local model."""
import hmac,json,os,re,subprocess,tempfile,wave
from http.server import BaseHTTPRequestHandler,HTTPServer
from pathlib import Path
IDS={f"{dialect}-{gender}" for dialect in ("egyptian","alexandrian","saidi","saudi","gulf") for gender in ("male","female")}
def registry(root, config):
    root=Path(root).resolve(); result={}; seen=set()
    for id, entry in config.items():
        if id not in IDS or not isinstance(entry,dict):raise ValueError("Invalid voice ID")
        model=(root/entry["model"]).resolve()
        if not model.is_relative_to(root) or model.suffix!=".onnx" or not model.is_file() or not Path(str(model)+".json").is_file():raise ValueError("Missing model or config")
        speaker=entry.get("speaker")
        if speaker is not None and (type(speaker) is not int or speaker<0):raise ValueError("Invalid speaker")
        identity=(model,speaker)
        if identity in seen:raise ValueError("Do not reuse a voice identity under a different dialect/gender")
        seen.add(identity);result[id]=identity
    return result
def synthesize(models,body):
    voice=body.get("voiceId")
    if voice not in models:raise ValueError("Unavailable voice")
    text=body.get("pronunciation") or body.get("text")
    if not isinstance(text,str) or not 0<len(text.strip())<=90 or not re.search("[\u0600-\u06ff]",text) or re.search("[A-Za-z]",text):raise ValueError("Arabic text required")
    speed=body.get("speed",1);pitch=body.get("pitch",0);intonation=body.get("intonation",1)
    if not isinstance(speed,(int,float)) or not .8<=speed<=1.2 or pitch!=0 or intonation!=1:raise ValueError("Dialect models use their authentic pitch and intonation")
    model,speaker=models[voice]
    with tempfile.TemporaryDirectory(prefix="atsh-voice-") as tmp:
        target=Path(tmp)/"raw.wav"; output=Path(tmp)/"voice.wav"
        cmd=["piper","-m",str(model),"-f",str(target),"--length-scale",str(1/speed)]
        if speaker is not None:cmd+=["--speaker",str(speaker)]
        subprocess.run(cmd,input=text.encode("utf-8"),check=True,timeout=20,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        subprocess.run(["ffmpeg","-v","error","-nostdin","-i",str(target),"-ac","1","-ar","16000","-c:a","pcm_s16le","-t","32",str(output)],check=True,timeout=5)
        with wave.open(str(output),"rb") as stream:
            if not 0<stream.getnframes()<=512000:raise ValueError("Invalid voice duration")
        return output.read_bytes()
def main():
    models=registry(os.environ.get("VOICE_MODEL_ROOT","/models"),json.loads(os.environ.get("VOICE_MODELS_JSON","{}")))
    token=os.environ["CHARACTER_DIALECT_SERVICE_TOKEN"]
    if not re.fullmatch("[a-f0-9]{64}",token):raise ValueError("64 hex token required")
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):pass
        def authorized(self):return hmac.compare_digest(self.headers.get("Authorization","").encode(),("Bearer "+token).encode())
        def reply(self,status,body=b"",mime="application/json"):
            self.send_response(status);self.send_header("Content-Type",mime);self.send_header("Content-Length",str(len(body)));self.send_header("Cache-Control","no-store");self.end_headers();self.wfile.write(body)
        def do_GET(self):
            if not self.authorized():return self.reply(401)
            if self.path!="/voices":return self.reply(404)
            self.reply(200,json.dumps({"voices":sorted(models)}).encode())
        def do_POST(self):
            if not self.authorized():return self.reply(401)
            if self.path!="/voice-preview":return self.reply(404)
            try:
                n=int(self.headers.get("Content-Length","0"))
                if not 0<n<=8192:raise ValueError()
                self.connection.settimeout(5)
                body=json.loads(self.rfile.read(n))
                if not isinstance(body,dict):raise ValueError()
                audio=synthesize(models,body)
            except ValueError:return self.reply(400)
            except Exception:return self.reply(502)
            self.reply(200,audio,"audio/wav")
    HTTPServer(("0.0.0.0",8080),Handler).serve_forever()
if __name__=="__main__":main()
