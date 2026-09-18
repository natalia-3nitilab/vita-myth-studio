"""Generate the episode's backgrounds on Vertex with Nano Banana.

One image per story beat, all of them ancient-temple places, so the character is standing
somewhere real instead of in front of a gradient. 16:9, no people (she is the only figure
on screen) and no lettering of any kind — a watermark or a carved inscription in a
background is the same problem as burned-in text in stock footage.

Authentication is Application Default Credentials; nothing is pasted or stored here.

    GOOGLE_CLOUD_PROJECT=<id> ~/ComfyUI/venv/bin/python build/backdrops.py
"""
import io, os, sys, time
from google import genai
from google.genai import types
from PIL import Image

# gemini-2.5-flash-image retires 2 Oct 2026, so it cannot be the default. Pin the old
# model with GEMINI_IMAGE_MODEL while it still exists.
MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")
PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT")
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
OUT = "backdrops"
# Per-image price for the running total below. It is an ESTIMATE used only for the
# printed figure: 3.1 Flash Image prices by resolution ($0.045-$0.15 published), so the
# real charge comes from the billing console, not from here. Override to match.
PRICE = float(os.environ.get("GEMINI_IMAGE_PRICE", "0.045"))

if not PROJECT:
    sys.exit("set GOOGLE_CLOUD_PROJECT")
os.makedirs(OUT, exist_ok=True)

STYLE = ("Painted cinematic matte background for an animated film. Ancient Greek "
         "architecture, weathered marble, believable depth and atmosphere. Rich detail, "
         "painterly, soft volumetric light. Empty of people and animals. "
         "Absolutely no text, lettering, inscriptions, numerals, captions, watermarks, "
         "logos or signatures anywhere in the image. 16:9 wide landscape composition with "
         "the centre foreground clear, so a character can stand there.")

SCENES = {
    "dawn":    "A marble temple on a headland at first light. Fluted columns catching gold. "
               "Long shadows across worn flagstones. Calm sea far below, pale sky.",
    "grove":   "An olive grove beside a small marble shrine, mid-morning. Dappled green "
               "light through silver leaves, warm stone, wildflowers in dry grass.",
    "dusk":    "The steps of a temple at dusk. Violet and rose sky behind the colonnade, "
               "the marble gone blue in shadow, one last band of orange on the horizon.",
    "descent": "A stone stairway descending into the earth between rough-cut walls. "
               "Torch brackets, green-black damp, the light failing as it goes down.",
    "under":   "A vast underground cavern of black basalt columns. A slow dark river, "
               "distant red fires on the far shore, cold mist over the water.",
    "throne":  "A subterranean hall of black marble columns receding into dark. A raised "
               "empty dais far back, shafts of cold violet light from unseen gaps above.",
    "climb":   "A long rising tunnel of fitted stone seen from within, curving upward, "
               "with a small distant opening of white daylight at the very top.",
    "light":   "A temple portico from inside, looking out. Blinding warm daylight flooding "
               "between columns, dust in the air, bleached stone.",
    "cold":    "Ruined temple foundations on an empty plain under flat grey overcast. "
               "Broken column drums in wet grass, low mist, no horizon.",
    "night":   "A ruined colonnade under a dense field of stars, deep blue night, the "
               "marble faintly moonlit, the Milky Way clear above the broken roofline.",
    "reflect": "The interior of a quiet temple cella, warm afternoon. Shafts of light from "
               "high openings, honey-coloured stone, worn floor, deep calm.",
}

client = genai.Client(vertexai=True, project=PROJECT, location=LOCATION)
todo = [(k, v) for k, v in SCENES.items() if not os.path.exists(f"{OUT}/{k}.png")]
print(f"{len(todo)} backdrops to make on {MODEL} — about ${len(todo)*PRICE:.2f}", flush=True)

made, spent, t0 = 0, 0.0, time.time()
for name, scene in todo:
    t = time.time()
    # Vertex answers 429 well before eleven images at 2K. Back off and retry rather than
    # dropping the beat — a missing backdrop silently falls back to a flat gradient.
    r = None
    for attempt in range(6):
        try:
            r = client.models.generate_content(
            model=MODEL,
            contents=[f"{scene} {STYLE}"],
            # The model ignores "16:9" in the prose and letterboxes a square with white
            # bars instead. The aspect ratio is a config field, not a prompt instruction.
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(aspect_ratio="16:9", image_size="2K"),
                ),
            )
            break
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                wait = min(90, 8 * 2 ** attempt)
                print(f"{name}: 429, waiting {wait}s", flush=True)
                time.sleep(wait)
                continue
            print(f"{name} FAILED {str(e)[:150]}", flush=True)
            break
    if r is None:
        print(f"{name} FAILED after retries", flush=True)
        continue
    try:
        data = next(p.inline_data.data for p in r.candidates[0].content.parts
                    if getattr(p, "inline_data", None))
    except Exception as e:
        print(f"{name} no image in response", flush=True)
        continue
    im = Image.open(io.BytesIO(data)).convert("RGB")
    im.save(f"{OUT}/{name}.png")
    made += 1; spent += PRICE
    print(f"{name:9s} {im.size[0]}x{im.size[1]} {time.time()-t:.0f}s  (${spent:.2f})", flush=True)

print(f"DONE {made} backdrops in {(time.time()-t0)/60:.1f} min, "
      f"about ${spent:.2f} at the estimated ${PRICE:.3f}/image ({MODEL})", flush=True)
