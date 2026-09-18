#!/usr/bin/env bash
# What to fetch before the first render. Nothing here is committed to the repository —
# see NOTICE.md for why.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "vrm-episode-studio — asset setup"
echo

if [ ! -d node_modules ]; then
  echo "  1. npm install            (three, @pixiv/three-vrm, playwright-core)"
else
  echo "  1. node modules           OK"
fi

shopt -s nullglob
vrms=(assets/*.vrm)
if [ ${#vrms[@]} -eq 0 ]; then
  cat <<'TXT'
  2. A character              MISSING
     Put any humanoid VRM with visemes in assets/ and point CHARACTER at it:
       CHARACTER=../assets/YourModel.vrm npm run render
     The example uses VRoid's Vita (AvatarSample_F). Download from VRoid Hub or
     VRoid Studio; see NOTICE.md for its conditions of use.
TXT
else
  echo "  2. character              OK (${#vrms[@]} VRM found)"
fi

clips=(assets/anim/*.fbx)
if [ ${#clips[@]} -lt 5 ]; then
  cat <<'TXT'
  3. Motion clips             MISSING
     Sign in at https://www.mixamo.com, then from stage/:
       MIXAMO_TOKEN='eyJ...' node fetch.mjs
     The token is the Authorization header on any mixamo.com/api/v1 request.
     stage/clips.json pins the 40 motions the example plan expects.
TXT
else
  echo "  3. motion clips           OK (${#clips[@]} FBX)"
fi

command -v ffmpeg >/dev/null && echo "  4. ffmpeg                 OK" \
  || echo "  4. ffmpeg                 MISSING — brew install ffmpeg"

echo
echo "Optional: backdrops need GOOGLE_CLOUD_PROJECT and Application Default Credentials."
echo "Without them the stage falls back to procedural gradients and everything still runs."
