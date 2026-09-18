"""Build the YouTube publish package with Gemini on Vertex — titles, hooks, description, tags.

Runs on the Google budget, not on Claude usage. The artifact page cannot call this itself:
its CSP blocks outbound requests, and an API key must never sit in a published page. So the
page queues a request and this produces the answer.

Everything here follows docs/PILLARS.md:
  - titles are BROAD and come as a set, never one
  - hooks always come as ten, for the first 15 seconds
  - thumbText is 2-5 words, one of only 2-3 focus points

    GOOGLE_CLOUD_PROJECT=<id> python build/package.py orpheus
"""
import os, sys, json, time
from google import genai
from google.genai import types

MODEL = os.environ.get("GEMINI_TEXT_MODEL", "gemini-2.5-pro")
PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT")
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
CHANNEL = os.environ.get("CHANNEL", "Ordinary Myths")

slug = sys.argv[1] if len(sys.argv) > 1 else "orpheus"
if not PROJECT:
    sys.exit("set GOOGLE_CLOUD_PROJECT")
here = os.path.dirname(__file__)
src = os.path.join(here, "..", "..", "content", f"{slug}.txt")
if not os.path.exists(src):
    sys.exit(f"no script at {src}")
script = open(src).read().strip()

BRIEF = f"""You are packaging a YouTube video for a channel called {CHANNEL}.

Non-negotiable rules:
- TITLES MUST BE BROAD. Do not niche down to the specific subject. The number one mistake is
  going too narrow with topic and packaging. Model the shape of titles that win on large
  history, psychology and science channels, not only on myth channels. Six of them.
- Exactly TEN hooks for the first 15 seconds, about 37 words each, written to be spoken.
  Each a genuinely different angle, not a rewording. Concrete before abstract. No "in this
  video", no "have you ever wondered", no three stacked rhetorical questions.
- thumbText: 2 to 5 words, upper case, maximum impact. It is one of only 2-3 focus points
  on the thumbnail, so it cannot carry a sentence.
- description: three or four short paragraphs, then a chapter list.
- tags: twelve, broad before specific.

SCRIPT:
{script[:7000]}

Return JSON only:
{{"titles":[6 strings],"hooks":[10 strings],"description":"...","tags":[12 strings],"thumbText":"..."}}"""

client = genai.Client(vertexai=True, project=PROJECT, location=LOCATION)
t0 = time.time()
r = client.models.generate_content(
    model=MODEL, contents=[BRIEF],
    config=types.GenerateContentConfig(temperature=1.0, response_mime_type="application/json"),
)
try:
    pkg = json.loads(r.text)
except Exception:
    sys.exit("model did not return JSON: " + (r.text or "")[:200])

pkg["built"] = time.strftime("%Y-%m-%d %H:%M")
pkg["model"] = MODEL
dest = os.path.join(here, "..", "..", "content", f"{slug}.package.json")
json.dump(pkg, open(dest, "w"), indent=1)

u = getattr(r, "usage_metadata", None)
print(f"{dest}  in {time.time()-t0:.0f}s")
print(f"  {len(pkg.get('titles',[]))} titles, {len(pkg.get('hooks',[]))} hooks, "
      f"{len(pkg.get('tags',[]))} tags, thumb: {pkg.get('thumbText','')!r}")
if u:
    print(f"  tokens: {u.prompt_token_count} in, {u.candidates_token_count} out")
