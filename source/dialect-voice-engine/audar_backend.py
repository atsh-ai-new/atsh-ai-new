"""CPU Audar Flash adapter. Loads only operator-vetted local assets; no inference API."""
import re, time
from pathlib import Path
# The special-token protocol is fixed by the model's published inference example.
CONTROL = re.compile(r"<\|[^\n]*?\|>")
def make_prompt(text, transcript, codes):
    if CONTROL.search(text) or CONTROL.search(transcript) or not codes:
        raise ValueError("Invalid voice prompt")
    if any(type(c) is not int or not 0 <= c < 65536 for c in codes):
        raise ValueError("Invalid speech codes")
    return ("user: Convert the text to speech:"
            f"<|REF_TEXT_START|>{transcript}<|REF_TEXT_END|>"
            "<|REF_SPEECH_START|>" + "".join(f"<|speech_{c}|>" for c in codes)
            + "<|REF_SPEECH_END|>"
            f"<|TARGET_TEXT_START|>{text}<|TARGET_TEXT_END|>\n"
            "assistant:<|TARGET_CODES_START|>")

def generate_speech_codes(llm, prompt, max_tokens=1500, seconds=70):
    end = llm.tokenize(b"<|TARGET_CODES_END|>", add_bos=False, special=True)
    if len(end) != 1: raise RuntimeError("Wrong Audar tokenizer")
    tokens = llm.tokenize(prompt.encode(), add_bos=False, special=True)
    if len(tokens) + max_tokens > 4096: raise ValueError("Voice prompt too long")
    codes=[]; deadline=time.monotonic()+seconds
    for tid in llm.generate(tokens, temp=.65, top_k=40, top_p=.9, repeat_penalty=1.1, reset=True):
        if time.monotonic()>deadline: raise TimeoutError("CPU speech timeout")
        if tid == end[0]:
            if len(codes)<10: raise ValueError("Speech too short")
            return codes
        piece=llm.detokenize([tid], special=True).decode("utf-8", "strict")
        m=re.fullmatch(r"<\|speech_(\d+)\|>",piece)
        if not m or int(m[1])>=65536: raise ValueError("Non-speech model token")
        codes.append(int(m[1]))
        if len(codes)>=max_tokens: raise ValueError("Incomplete speech")
    raise ValueError("Missing end-of-speech token")

def render(entry, text, output):
    # Separate process per utterance, so the calling service can kill on timeout.
    # Local codec cache is installed during staging, never fetched at runtime.
    import torch, soundfile as sf
    from llama_cpp import Llama
    from neucodec import NeuCodec
    torch.set_num_threads(2)
    codec=NeuCodec.from_pretrained(str(entry["codec"])).eval()
    llm=Llama(model_path=str(entry["model"]), n_ctx=4096, n_gpu_layers=0, n_threads=2, verbose=False)
    with torch.inference_mode():
        encoded=codec.encode_code(str(entry["reference"])).reshape(-1).tolist()
        prompt=make_prompt(text,entry["transcript"],encoded)
        codes=generate_speech_codes(llm,prompt)
        wave=codec.decode_code(torch.tensor(codes)[None,None,:]).cpu().numpy()[0,0,:]
        sf.write(str(output),wave,24000)

if __name__=="__main__":
    import sys,json
    entry=json.loads(sys.stdin.read())
    render(entry["voice"],entry["text"],Path(sys.argv[1]))
