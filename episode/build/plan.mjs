/**
 * Turn the narration into a shot plan: what she is doing, where the camera is, what is
 * behind her, and what her face is doing — all decided from the sentence being spoken.
 *
 * The first version cycled through motions and framings on a counter. It produced a
 * character waving cheerfully through the death of Eurydice, which is worse than having no
 * character on screen. Every choice here is keyed off the text instead.
 */

// Ordered; first match wins. `clip` may be a list, and consecutive shots never repeat one.
export const RULES = [
  { re: /\b(sang|sing|sung|song|music|musician|lyre|sweetly|nightingale)/i,
    clip: ['gesture-happy', 'gesture-talk'], frame: 'mid',      emotion: ['relaxed', 0.4] },
  { re: /\b(died|death|dead|widower|snake|bitten|lost her|losing)/i,
    clip: ['idle-sad', 'crying'],            frame: 'close',    emotion: ['sad', 0.7] },
  { re: /\b(grief|griev|mourn|wept|weep|weeps|crying|tears|sorrow)/i,
    clip: ['crying', 'idle-sad'],            frame: 'close',    emotion: ['sad', 0.8] },
  { re: /\b(went down|descend|descent|climb|climbing|stair|cave|tunnel|upward|underworld)/i,
    clip: ['walk-start', 'walk', 'look-nervous'], frame: 'wide' },
  { re: /\b(turn(ed)? around|look(ed)? back|behind him|last moment|daylight on)/i,
    clip: ['reacting', 'look-around'],       frame: 'close',    emotion: ['sad', 0.5] },
  { re: /\b(reach|bring her back|recover|undo it|get her back|save)/i,
    clip: ['reach-out'],                     frame: 'mid' },
  { re: /\b(hades|persephone|throne|gods?|beg|plead|pray|condition)/i,
    clip: ['praying', 'reach-out'],          frame: 'mid' },
  { re: /\b(yes|granted|gave him|agreed|concession|allowed)/i,
    clip: ['relieved', 'agreeing'],          frame: 'mid',      emotion: ['relaxed', 0.4] },
  // "not" alone matched 17% of an essay-voiced script and she spent the episode shaking
  // her head. A contradiction needs an explicit phrase, not the word.
  { re: /\b(never|refus\w+|denied|impossible|is a lie|not the answer|not the point|did not manage|nobody|no one)\b/i,
    clip: ['head-no', 'dismiss'],            frame: 'midclose' },
  { re: /\b(why|question|ask(s|ing)?|wonder|puzzle|what is|how )/i,
    clip: ['thinking'],                      frame: 'midclose' },
  { re: /\b(you|your|picture it|imagine|anyone who|everybody|everyone)/i,
    clip: ['gesture-point', 'gesture-talk'], frame: 'midclose' },
  { re: /\b(story|stories|myth|telling|tellings|greeks?|version|reading)/i,
    clip: ['gesture-talk', 'acknowledge'],   frame: 'mid' },
  { re: /\b(walk|walked|walking|road|journey|went)/i,
    clip: ['walk', 'walk-start'],            frame: 'wide' },
];

// Framings in head heights. Composed so she reads at a usable size in every one — the
// previous wide shot put her at about a sixth of frame height, which is a landscape with a
// figure in it, not a shot of a character.
// Units are the model's full height (top of the hair), so a framing means the same thing on
// any character. Distances are derived from the 32 degree lens: to show a band of height
// 2h you sit h/tan(16 degrees) away, which is 3.49h. Each one leaves deliberate headroom.
export const FRAMES = {
  wide:     { cam: [0.50,  0.62, 2.10], look: [0,    0.55, 0], push: 0.06 },  // whole figure
  mid:      { cam: [0.36,  0.82, 1.22], look: [0,    0.78, 0], push: 0.05 },  // waist up
  // Tight shots track the live head, so a clip that lowers it does not leave the camera
  // staring at the top of her scalp.
  midclose: { cam: [0.26,  0.90, 0.78], look: [0,    0.89, 0], push: 0.04, track: 'head' },
  close:    { cam: [0.17,  0.95, 0.50], look: [0,    0.93, 0], push: 0.03, track: 'head' },
  low:      { cam: [-0.48, 0.40, 1.80], look: [0,    0.58, 0], push: 0.05 },  // low angle, whole figure
  offset:   { cam: [0.62,  0.84, 1.38], look: [0.03, 0.76, 0], push: 0.04 },  // three-quarter
};

// When no rule fires, fall back to something that at least suits the mood.
export const MOOD_CLIPS = {
  dawn:   ['idle', 'gesture-talk', 'thinking', 'lean'],
  grove:  ['idle-happy', 'gesture-happy', 'greeting', 'look-around'],
  dusk:   ['idle-sad', 'head-no', 'thinking', 'shrug'],
  descent:['walk-start', 'look-nervous', 'walk'],
  under:  ['thinking', 'look-around', 'idle-sad', 'praying'],
  throne: ['praying', 'gesture-point', 'acknowledge', 'gesture-talk'],
  climb:  ['walk', 'look-nervous', 'walk-start'],
  light:  ['relieved', 'gesture-happy', 'greeting'],
  reflect:['gesture-talk', 'thinking', 'acknowledge', 'gesture-point', 'idle'],
  cold:   ['idle-sad', 'walk-sad', 'shrug', 'crying'],
  night:  ['idle', 'thinking', 'lean', 'look-around'],
};
const MOOD_FRAME = { dawn:'mid', grove:'wide', dusk:'midclose', descent:'wide', under:'mid',
                     throne:'mid', climb:'wide', light:'midclose', reflect:'mid',
                     cold:'wide', night:'close' };

/** Pick clip / framing / emotion for one shot's text. */
export function direct(text, mood, prev, available) {
  const ok = (c) => !available || available.has(c);
  for (const r of RULES) {
    if (!r.re.test(text)) continue;
    const opts = [].concat(r.clip).filter(c => ok(c) && c !== prev.clip);
    if (!opts.length) continue;
    return { clip: opts[0], frameName: r.frame, emotion: r.emotion };
  }
  const pool = (MOOD_CLIPS[mood] ?? MOOD_CLIPS.reflect).filter(c => ok(c) && c !== prev.clip);
  const clip = pool.length ? pool[prev.n % pool.length] : 'idle';
  // Rotate framing on the fallback so explanatory stretches do not sit on one lens.
  const order = ['mid', 'midclose', 'wide', 'offset', 'close', 'low'];
  let frameName = MOOD_FRAME[mood] ?? 'mid';
  if (frameName === prev.frameName) frameName = order[prev.n % order.length];
  return { clip, frameName, emotion: null };
}
