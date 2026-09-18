"""Narrate the episode with Kokoro, keeping the clock for every sentence.

The shot plan is cut against meaning, not a metronome, so the assembler needs to know
exactly when each sentence starts. Kokoro already hands back one audio chunk per
sentence-ish span together with the text it spoke, so the timings come for free here and
whisper is never needed: a timing taken from the synthesiser cannot mishear itself.
"""
import json, re, sys, time
import numpy as np, soundfile as sf
from kokoro import KPipeline

# The script lives in content/, separate from the engine — see README. Pass a path or a slug.
import os as _os
SCRIPT = _os.environ.get("SCRIPT", "../content/orpheus.txt")
if not _os.path.exists(SCRIPT) and _os.path.exists(f"../content/{SCRIPT}.txt"):
    SCRIPT = f"../content/{SCRIPT}.txt"
TEXT = open(SCRIPT).read().strip()
VOICE = sys.argv[1] if len(sys.argv) > 1 else "af_bella"
SPEED = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
SR = 24000

pipe = KPipeline(lang_code="a")
t0 = time.time()
audio_parts, segments, cursor = [], [], 0.0
# A beat of room between paragraphs: the source channel lands each archetype with a
# pause, and without one the three sections run together into a single wall of voice.
paragraphs = [p.strip() for p in TEXT.split("\n\n") if p.strip()]
# Sentence by sentence, not paragraph by paragraph. A shot lands on a sentence group, so
# the assembler needs a boundary at every full stop; paragraph-sized chunks average
# fifteen seconds and there is no way to cut inside one without guessing.
def sentences(para):
    parts = re.split(r'(?<=[.!?"])\s+', para)
    out = []
    for s in parts:
        s = s.strip()
        if not s:
            continue
        # A stray fragment ("What's up?" after a quote) belongs to the line before it.
        if out and len(s.split()) <= 2:
            out[-1] += " " + s
        else:
            out.append(s)
    return out

for pi, para in enumerate(paragraphs):
    for sent in sentences(para):
      for graphemes, _phonemes, audio in pipe(sent, voice=VOICE, speed=SPEED):
        a = np.asarray(audio, dtype=np.float32)
        dur = len(a) / SR
        segments.append({"i": len(segments), "para": pi, "text": graphemes.strip(),
                         "start": round(cursor, 3), "end": round(cursor + dur, 3),
                         "dur": round(dur, 3)})
        audio_parts.append(a); cursor += dur
      # Kokoro renders each sentence cold, so consecutive lines butt straight up against
      # one another with no breath at all. A tenth of a second is the difference between
      # speech and a list being read out.
      audio_parts.append(np.zeros(int(SR * 0.12), dtype=np.float32)); cursor += 0.12
    if pi < len(paragraphs) - 1:
        gap = np.zeros(int(SR * 0.42), dtype=np.float32)
        audio_parts.append(gap); cursor += 0.42

audio = np.concatenate(audio_parts)
sf.write("audio/narration.wav", audio, SR)
json.dump({"voice": VOICE, "speed": SPEED, "duration": round(len(audio) / SR, 2),
           "segments": segments}, open("audio/segments.json", "w"), indent=1)
print(f"{VOICE} @ {SPEED}: {len(audio)/SR:.1f}s ({len(audio)/SR/60:.1f} min), "
      f"{len(segments)} segments, rendered in {time.time()-t0:.0f}s")
