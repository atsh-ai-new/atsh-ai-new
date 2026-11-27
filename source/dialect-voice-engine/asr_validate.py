"""Offline review gate: check whether generated Arabic contains the intended words."""
import json,re,sys,unicodedata
from pathlib import Path
from faster_whisper import WhisperModel

def normalize(s):
    s=unicodedata.normalize("NFKC",s)
    s="".join(c for c in s if unicodedata.category(c)!="Mn")
    s=s.translate(str.maketrans("أإآٱىة","اااايه"))
    return re.sub(r"[^\u0621-\u063a\u0641-\u064a]","",s)
def cer(a,b):
    row=list(range(len(b)+1))
    for i,x in enumerate(a,1):
        new=[i]
        for j,y in enumerate(b,1):new.append(min(new[-1]+1,row[j]+1,row[j-1]+(x!=y)))
        row=new
    return row[-1]/max(1,len(a))

def main():
    out=Path(sys.argv[1])
    m=WhisperModel(sys.argv[2],device="cpu",compute_type="int8",cpu_threads=2,local_files_only=True)
    results=[]
    for row in json.loads((out/"metrics.json").read_text()):
        segs,_=m.transcribe(str(out/(row["sample"]+".wav")),language="ar",beam_size=3,condition_on_previous_text=False)
        got=" ".join(s.text for s in segs)
        error=cer(normalize(row["text"]),normalize(got))
        results.append({"sample":row["sample"],"recognized":got,"cer":round(error,3)})
        if error>.45 or not normalize(got):raise ValueError(f"Arabic intelligibility check failed: {results[-1]}")
    (out/"asr.json").write_text(json.dumps(results,ensure_ascii=False,indent=2))
    print(json.dumps(results,ensure_ascii=False))
if __name__=="__main__":main()
