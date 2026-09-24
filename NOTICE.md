# Third-party assets and their terms

No third-party asset is committed to this repository. `scripts/setup.sh` points at the
sources. This is deliberate: the character and the motion files are licensed for **use**,
not for **redistribution**, and a GitHub repository is redistribution.

## Character — VRoid sample models (pixiv)

The example uses **Vita**, renamed `AvatarSample_F` in VRoid Studio v0.14.0.

Not CC0 — pixiv retains copyright. The published conditions of use permit the .vroid and
VRM files to be used by anyone in any activity, for-profit or not, with no credit required,
and name taking video as an example of permitted use.

Prohibited by those terms, and relevant here: redistributing the VRM file (free or paid),
re-licensing it as CC0, building a character-creation service from it, or implying pixiv
endorses your work.

<https://vroid.pixiv.help/hc/en-us/articles/4402394424089>
<https://vroid.com/en/studio/guidelines>

Any VRM with a standard humanoid rig and the `aa/ih/ou/ee/oh` viseme set will work.

## Motion — Mixamo (Adobe)

Animations are exported from Mixamo, which is free with an Adobe account. `stage/fetch.mjs`
automates the export for a pinned list of motions; it needs a token, which it reads from
`MIXAMO_TOKEN` or a git-ignored `token.txt` and stores nowhere else.

Mixamo's catalogue API is public; exports require an Adobe IMS token. Review Adobe's terms
for your use before publishing work made with them.

## Backdrops — Gemini image generation on Vertex AI (Google)

Generated per project. The pipeline does not commit them, but rendered examples of them
do appear in this repository: `docs/images/backdrops.png` and the screenshots embedded in
`dashboard/index.html`. Those are rendered images, not model files.

The model is whatever `GEMINI_IMAGE_MODEL` names — `gemini-3.1-flash-image` by default, since `gemini-2.5-flash-image` retires
2 October 2026. Authentication is Application Default Credentials, so no key is ever
pasted into or read back from this repository. Review Google's terms for
generated-content ownership and usage.

The pipeline runs without this step — missing backdrops fall back to procedural gradients.

## Voice — Kokoro-82M

Apache-2.0. Runs locally.

## Libraries

three.js (MIT), @pixiv/three-vrm (MIT), playwright-core (Apache-2.0), ffmpeg (LGPL/GPL
depending on build).
