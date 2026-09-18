"""Per-frame mouth openness, taken from the narration itself.

Kokoro hands back phonemes but not their timings, so the cheapest honest signal is the
waveform. RMS over a short window tracks syllables closely enough that the mouth opens on
vowels and closes in the gaps, which is the part a viewer actually notices.

Writes audio/envelope.json: one value per 10ms, normalised 0..1.
"""
import json
import numpy as np
import soundfile as sf

HZ = 100                                   # envelope samples per second
audio, sr = sf.read("audio/narration.wav")
if audio.ndim > 1:
    audio = audio.mean(axis=1)

hop = sr // HZ
n = len(audio) // hop
win = hop * 2                              # 20ms window, overlapping
env = np.empty(n, dtype=np.float32)
for i in range(n):
    a = audio[i * hop: i * hop + win]
    env[i] = np.sqrt(np.mean(a * a)) if len(a) else 0.0

# Normalise against a high percentile, not the max: one loud plosive otherwise scales the
# whole episode down and the mouth barely moves.
peak = float(np.percentile(env, 97)) or 1.0
env = np.clip(env / peak, 0.0, 1.0)

# Speech attacks fast and closes slower. A symmetric smooth makes the jaw look rubbery.
out = np.empty_like(env)
prev = 0.0
for i, v in enumerate(env):
    prev = v if v > prev else prev * 0.72 + v * 0.28
    out[i] = prev

json.dump({"hz": HZ, "n": int(n), "env": [round(float(v), 3) for v in out]},
          open("audio/envelope.json", "w"))
print(f"{n} samples at {HZ}Hz ({n/HZ:.1f}s), mean {out.mean():.2f}, peak-ref {peak:.4f}")
