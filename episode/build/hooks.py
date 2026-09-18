"""Ten hook variations for the first 15 seconds — a second pass, after the script exists.

Pillar 3: the hook is the most important part of the video and does not survive being
written as the opening paragraph of a long script. It gets its own prompt, ten candidates,
and a human picks one. See docs/PILLARS.md.

    GOOGLE_CLOUD_PROJECT=<id> python build/hooks.py orpheus
"""
import os, sys, json, time
from google import genai
from google.genai import types

MODEL = os.environ.get("GEMINI_TEXT_MODEL", "gemini-2.5-pro")
PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT")
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
WPM = 150
WORDS_15S = int(15 / 60 * WPM)      # about 37 words

slug = sys.argv[1] if len(sys.argv) > 1 else "orpheus"
if not PROJECT:
    sys.exit("set GOOGLE_CLOUD_PROJECT")

here = os.path.dirname(__file__)
src = os.path.join(here, "..", "..", "content", f"{slug}.txt")
if not os.path.exists(src):
    sys.exit(f"no script at {src}")
script = open(src).read().strip()

BRIEF = f"""Here is the narration for a spoken video essay:

---
{script[:6000]}
---

Write **10 alternative hooks** for the FIRST 15 SECONDS of this video — about {WORDS_15S}
words each, spoken aloud.

The hook's only job is to stop someone scrolling and make the next sentence feel necessary.

Rules:
- Each one is a genuinely different angle, not a rewording of the same opening.
- Concrete before abstract. Open on a thing that can be pictured.
- No "in this video", no "have you ever wondered", no stacked rhetorical questions.
- No promise the essay does not keep.
- Broad, not narrow: someone who has never heard of this subject must still want the answer.
- Plain spoken English. No headings, no labels, no stage directions.

Return JSON only: {{"hooks": ["...", "..."]}} — exactly 10 strings, nothing else."""

client = genai.Client(vertexai=True, project=PROJECT, location=LOCATION)
t0 = time.time()
r = client.models.generate_content(
    model=MODEL, contents=[BRIEF],
    config=types.GenerateContentConfig(temperature=1.1, response_mime_type="application/json"),
)
try:
    hooks = json.loads(r.text)["hooks"]
except Exception:
    sys.exit("model did not return the expected JSON: " + (r.text or "")[:200])

dest = os.path.join(here, "..", "..", "content", f"{slug}.hooks.json")
json.dump({"slug": slug, "words_target": WORDS_15S, "hooks": hooks}, open(dest, "w"), indent=1)
print(f"{len(hooks)} hooks in {time.time()-t0:.0f}s -> {dest}\n")
for i, h in enumerate(hooks, 1):
    print(f"{i:2d}. ({len(h.split())}w) {h}")
print("\nPick one and paste it in as the script's opening paragraph.")
