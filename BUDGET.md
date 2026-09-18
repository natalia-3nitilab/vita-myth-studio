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
| **total** | | **$0.45 – $1.67** |

The backdrop range is the whole variable. Cost moves with the image model and the
resolution you ask for, not with the length of the episode — a 10-minute episode and a
40-minute one use the same eleven images across a different number of frames.

## What $300 buys

Eleven backdrops plus ~$0.02 of script per episode. Re-checked 18 Sep 2026, when the
successor model's price replaced the estimate that used to be in this table.

| at | per episode | episodes | hours of video |
| --- | --- | --- | --- |
| $0.039/image — 2.5 Flash Image, **retires 2 Oct 2026** | $0.45 | ~668 | ~111 |
| $0.045/image — 3.1 Flash Image, low end | $0.52 | ~582 | ~97 |
| $0.150/image — 3.1 Flash Image, high end | $1.67 | ~179 | ~30 |

The honest headline is **180–580 ten-minute episodes**, or **30–97 hours of video**. The
episode count is the more robust of the two claims because it does not depend on how long
you make each episode.

Above ~$0.15 an image the arithmetic changes character: `gemini-3-pro-image` is quoted at
$0.13–$0.24 an image, which is $1.45–$2.66 an episode and 113–207 episodes on the credit.
Still cheap per minute of finished video; no longer "free credit covers a channel".

Render time is the other budget: 7.4 minutes of laptop compute per episode, so 180 episodes
is about 22 hours of rendering, and 580 is about 72. That is the real constraint at volume, not the money.

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

`gemini-2.5-flash-image`, the model the per-episode cost was measured on, is **deprecated
and retires 2 October 2026.** The successor is **`gemini-3.1-flash-image`**, and it prices
by resolution rather than flat — published figures put it at **$0.045–$0.15 an image**,
which is why the table above is a range and not a number.

**The $0.045–$0.15 figures are third-party, not measured here.** Google's own pricing page
did not resolve cleanly when this was checked on 18 Sep 2026, so treat them as an estimate
until you have replaced them with your own measurement:

`backdrops.py` takes no arguments and skips images that already exist, so the way to price
one image is to delete one and let it regenerate just that one:

```bash
rm backdrops/dawn.png
GOOGLE_CLOUD_PROJECT=<id> python episode/build/backdrops.py   # regenerates dawn only
```

Then read the actual charge in the billing console. The script's own "about $X" line is an
estimate from `GEMINI_IMAGE_PRICE` (default $0.045), not a measurement.

Switching model is one environment variable — `episode/build/backdrops.py` reads
`GEMINI_IMAGE_MODEL`. Re-measure before putting any cost figure in a video, a README or a
thumbnail, and quote a range with the model named beside it.

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
