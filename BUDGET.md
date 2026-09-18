# What it costs, and what $300 of Google trial credit buys

Every number here was measured on a finished 9:20 episode, not estimated.

## Per episode

| stage | what | cost |
| --- | --- | --- |
| script | Gemini 2.5 Pro on Vertex, ~2k output tokens | ~$0.02 |
| voice | Kokoro-82M, local | **free** |
| motion | Mixamo, free with an Adobe account | **free** |
| backdrops | 11 images, one per story beat | $0.43 – $1.11 |
| render | three.js + headless Chrome + ffmpeg, local | **free** |
| **total** | | **$0.45 – $1.13** |

The backdrop range is the whole variable. Cost moves with the image model and the
resolution you ask for, not with the length of the episode — a 10-minute episode and a
40-minute one use the same eleven images across a different number of frames.

## What $300 buys

| at | per episode | episodes | hours of video |
| --- | --- | --- | --- |
| $0.039/image (2.5 Flash Image) | $0.45 | ~660 | ~110 |
| $0.067/image (3.x Flash Image, 1K) | $0.76 | ~390 | ~65 |
| $0.101/image (3.x Flash Image, 2K) | $1.13 | ~265 | ~44 |

Call it **250–400 ten-minute episodes** as the honest headline, or **650+** if you stay on
the cheapest model while it exists.

Render time is the other budget: 7.4 minutes of laptop compute per episode, so 265 episodes
is about 33 hours of rendering. That is the real constraint at volume, not the money.

## Break-even

An episode is profitable once it earns back its backdrop cost. At an RPM of `R` dollars per
thousand views, break-even is `cost / R × 1000` views:

| episode cost | RPM $2 | RPM $4 | RPM $8 |
| --- | --- | --- | --- |
| $0.45 | 225 views | 113 views | 56 views |
| $1.13 | 565 views | 283 views | 141 views |

**RPM is the number you have to supply.** It varies by niche, audience geography and season
far more than anything in this pipeline, and your own channel analytics are the only
reliable source for it. The figures above are arithmetic, not a forecast.

What the pipeline does change is that the floor is very low: a few hundred views covers an
episode. A format where most videos get a few hundred views is survivable here in a way it
is not when each episode costs $500 of per-frame generation.

## Deprecation — read this before quoting any figure

`gemini-2.5-flash-image`, the model these costs were measured on, is **deprecated and
retires 2 October 2026.** Its successor prices images by resolution rather than flat, which
is why the table above has a range instead of a number.

Re-measure before publishing any cost claim. `episode/build/backdrops.py` takes the model
from `GEMINI_IMAGE_MODEL`, so switching is one environment variable.

## Staying inside the free credit

- The $300 Cloud trial applies to **Vertex AI**. For accounts created recently it does not
  apply to the AI Studio Gemini Developer API, which bills from a separate prepaid balance.
  Using the wrong endpoint is the difference between free and not.
- Authentication is Application Default Credentials — `gcloud auth application-default
  login` — so no key is ever pasted into or stored in this repository.
- `backdrops.py` is resumable and skips images that already exist, so a failed run never
  pays twice for the same picture.
- Vertex rate-limits well before eleven images at 2K. The script backs off and retries; a
  dropped image silently falls back to a gradient, which is a quality bug rather than a
  cost one.
