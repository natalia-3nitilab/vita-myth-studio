# The three pillars

Natalia's operating rules for this channel, from her own source material. Everything the
pipeline generates — topics, titles, thumbnails, hooks — is checked against these.

## Pillar 1 — Ideation

**Do not invent. Model what is already proven.**

Pick the topic by finding the biggest winners in the niche and modelling the first videos on
them. The more closely proven winners are modelled, the harder it is to flop. Originality is
spent on the *execution*, not on the concept.

### Niche checklist

A niche qualifies when the channel you are modelling is:

- under ~100k subscribers — room to compete
- started in the last 1–6 months — hot right now
- has a viral long-form video, 100k+ views — proven demand
- growing systematically — climbing views, not a one-hit wonder
- recreatable cheaply — stock plus AI voice, no face, no studio

Two bonuses that raise the ceiling:

- other small channels in the same niche are also getting views — proof it is beatable
- it attracts an American audience — YouTube pays more for those viewers

## Pillar 2 — Packaging

Packaging is the thumbnail and the title together. A video with good content and
unattractive packaging does not get clicked, so packaging is not a finishing step.

**The number one beginner mistake is going too narrow with topic and packaging.** Think of
topic and packaging as a funnel: wide at the top.

### Titles

- **Keep them broad.** Do not niche down.
- Model from winners in your niche **and from other niches**.

### Thumbnails

- **2–3 focus points, maximum.**
- Text + main subject + contrasting background.
- **Simple and big beats detailed.**

## Pillar 3 — Scriptwriting

**Prompt the hook separately.** The hook is the most important part of the video, and it
does not survive being generated as the opening paragraph of a long script.

After the script exists, run a second prompt: *give me 10 hook variations for the first 15
seconds* — then pick the strongest.

## How the pipeline applies these

| pillar | where it lands |
| --- | --- |
| Ideation | topic selection before `build/script.py` runs |
| Packaging | the approve step: title options and the generated thumbnail |
| Scriptwriting | a separate hook pass after the script, ten variations, one chosen |

The generator must never ship a single title or a single hook. Titles come as a set to
choose from, and hooks always come as ten.
