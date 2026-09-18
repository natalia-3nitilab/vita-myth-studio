"""Write the narration with Gemini on Vertex, so the whole pipeline runs on one budget.

The voice, the motion and the render are already free and local. This is the last
hand-made step, and it is the one that decides whether an episode is worth watching — so
the prompt carries the format's actual constraints rather than asking for "a script".

    GOOGLE_CLOUD_PROJECT=<id> python build/script.py "Orpheus and Eurydice" --minutes 10

Writes ../content/<slug>.txt. Existing files are never overwritten.
"""
import os, re, sys, time
from google import genai
from google.genai import types

MODEL = os.environ.get("GEMINI_TEXT_MODEL", "gemini-2.5-pro")
PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT")
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
WPM = 150                      # Kokoro at speed 1.0, measured over 1,490 words

args = [a for a in sys.argv[1:] if not a.startswith("--")]
if not args or not PROJECT:
    sys.exit('usage: GOOGLE_CLOUD_PROJECT=<id> python build/script.py "<topic>" [--minutes 10]')
topic = args[0]
minutes = float(sys.argv[sys.argv.index("--minutes") + 1]) if "--minutes" in sys.argv else 10.0
words = int(minutes * WPM)
slug = re.sub(r"[^a-z0-9]+", "-", topic.lower()).strip("-")
dest = os.path.join(os.path.dirname(__file__), "..", "..", "content", f"{slug}.txt")
if os.path.exists(dest):
    sys.exit(f"{dest} already exists — delete it to regenerate")

# The constraints that actually matter for this renderer, stated as constraints rather than
# left for the model to infer from "write a video script".
BRIEF = f"""Write the narration for a {minutes:.0f}-minute spoken video essay about: {topic}

Length: about {words} words. This is read aloud at {WPM} words per minute.

Form:
- Continuous prose meant to be SPOKEN. No headings, no bullet points, no stage directions,
  no speaker labels, no "[pause]" markers, no scene numbers. Nothing that is not said out loud.
- Paragraphs separated by a blank line. Each paragraph is one movement of the argument.
- Short sentences next to long ones. Vary it. A reader will hear the rhythm.

Substance:
- Open on something concrete the listener can picture, not on a definition.
- Tell the story properly before interpreting it. Earn the interpretation.
- Include at least one reading that complicates the obvious one, and say plainly that both
  readings are available rather than resolving it.
- Name what the story leaves out, if it leaves something out.
- No rhetorical questions stacked in threes. No "but here's the thing". No listicle structure.
- Do not address the audience as "guys" or "folks". Second person is fine, sparingly.
- End on the idea, not on a call to action. Nothing about subscribing.

Accuracy:
- Where a figure or a claim is contested, say so in the prose rather than stating it flatly.
- Do not invent quotations or attribute words to named people unless they are well attested.

Return only the narration text."""

client = genai.Client(vertexai=True, project=PROJECT, location=LOCATION)
t0 = time.time()
r = client.models.generate_content(
    model=MODEL, contents=[BRIEF],
    config=types.GenerateContentConfig(temperature=1.0, max_output_tokens=8192),
)
text = (r.text or "").strip()
if not text:
    sys.exit("model returned no text")

os.makedirs(os.path.dirname(dest), exist_ok=True)
open(dest, "w").write(text + "\n")
n = len(text.split())
u = getattr(r, "usage_metadata", None)
print(f"{dest}: {n} words (~{n/WPM:.1f} min) in {time.time()-t0:.0f}s on {MODEL}")
if u:
    print(f"tokens: {u.prompt_token_count} in, {u.candidates_token_count} out")
