/* Frequency Oasis — Build 03 additions to the course content.
   Nothing here replaces data.js; it layers challenges, mission shortcuts,
   quiz-to-lesson links and a glossary on top of it. */

/* One hands-on "try this" per lesson. `preset` is applied to the lab when the
   learner presses "Set up this experiment". Keys: env, w, d, h, srcY, lisY,
   lisX, spacing, overlay{}, plan (bool), go (view to open afterwards). */
const challenges = [
  {
    text: 'Switch on reflection paths, then widen the room to 9 m. Which reflected path changes length the most — and what does that do to its arrival time?',
    preset: { env: 'studio', w: 9, overlay: { direct: true, reflections: true }, plan: true },
  },
  {
    text: 'Make the toe-in read about 30° and the stereo angle about 60°. Then run the placement check and note which numbers moved.',
    preset: { env: 'studio', spacing: 1.8, srcY: 1, lisY: 2.56, lisX: 0, overlay: { direct: true, labels: true } },
  },
  {
    text: 'Set width and depth both to 4 m. Open the Sound bench and look for coincident axial modes. What does a square room do to the mode series?',
    preset: { env: 'studio', w: 4, d: 4, go: 'bench' },
  },
  {
    text: 'Turn on reflections in plan view and slide the listener 1.2 m to one side. Which wall now has a reflection arriving within roughly 20 ms of the direct sound?',
    preset: { env: 'studio', lisX: 1.2, plan: true, overlay: { direct: true, reflections: true }, go: 'bench' },
  },
  {
    text: 'Move the talent from about 1.2 m to about 3 m from the boom. In a free field that is roughly an 8 dB drop in direct level. What happens to the direct-to-reverberant balance in a real room?',
    preset: { env: 'film', srcY: 1, lisY: 2.2, overlay: { direct: true, labels: true } },
  },
  {
    text: 'Place the boom as close as the frame allows. List what else must be checked on a real set: shadows, handling noise, clothing rustle, and background sources.',
    preset: { env: 'film', srcY: 1.4, lisY: 2.4, overlay: { direct: true, reflections: true } },
  },
  {
    text: 'Switch on coverage zones, then move the seat 1 m off-centre. Read the L/R arrival offset. Why does a single sweet spot fail in a cinema?',
    preset: { env: 'cinema', lisX: 1, lisY: 3.4, overlay: { direct: true, coverage: true }, plan: true },
  },
  {
    text: 'With coverage on, drag the audience marker to the side wall. What would you measure to see whether the coverage is actually consistent?',
    preset: { env: 'live', lisX: 1.6, lisY: 4, overlay: { direct: true, coverage: true }, plan: true },
  },
  {
    text: 'Show the feedback loop overlay, trace it with your finger, then write down two changes that lower loop gain without lowering the performance.',
    preset: { env: 'live', overlay: { direct: true, loop: true }, plan: true },
  },
  {
    text: 'Move the monitors from 1.2 m to 0.4 m from the front wall and back again. Compare the front-wall reflection delay in the Sound bench ledger.',
    preset: { env: 'studio', srcY: 0.4, lisY: 1.8, go: 'bench' },
  },
  {
    text: 'Save a field note that states a hypothesis. Change exactly one control. Save a second note with only what changed in the readout.',
    preset: { env: 'studio', overlay: { direct: true, labels: true } },
  },
  {
    text: 'Build a layout you would defend. Run the placement check, then write the decision, the constraint, and how you would verify it in the real room.',
    preset: { env: 'studio' },
  },
];

/* Where "Open in lab" takes each mission (index matches `missions`). */
const missionPresets = [
  { env: 'studio', spacing: 1.8, srcY: 1, lisY: 2.56, lisX: 0, overlay: { direct: true, labels: true } },
  { env: 'studio', srcY: 0.4, lisY: 2.4 },
  { env: 'studio', overlay: { direct: true, reflections: true }, plan: true },
  { env: 'film', overlay: { direct: true, reflections: true } },
  { env: 'cinema', overlay: { direct: true, coverage: true }, plan: true },
  { env: 'live', overlay: { direct: true, loop: true }, plan: true },
  { env: 'studio', focusNotes: true },
];

/* Which lesson to revisit when an assessment question is missed
   (index matches `quiz`, value is an index into `lessons`). */
const quizLessonMap = [1, 9, 3, 4, 5, 6, 8, 2, 0, 2, 10, 11];

const glossary = [
  ['Direct sound', 'The first arrival: sound that travels the shortest path from source to listener before touching any boundary.'],
  ['Early reflection', 'A copy of the sound that bounces off a surface and arrives shortly after the direct sound. A 20 ms window is a common teaching rule of thumb, not a standard; audibility depends on level, direction and programme.'],
  ['Precedence effect', 'Hearing fuses the direct sound with closely following copies and localises toward the first arrival. The limits depend on signal type and level.'],
  ['Comb filtering', 'Interference between a signal and a delayed copy of itself. It makes regularly spaced peaks and notches; the first notch sits near 1 ÷ (2 × delay).'],
  ['Axial mode', 'A standing-wave resonance between one pair of parallel surfaces. In an idealised rectangular room, f = n × c ÷ (2L).'],
  ['Speaker-boundary interference', 'A nearby wall returns a reflection so soon after the direct sound that it can reinforce or cancel low frequencies. Which frequencies depends on the distances involved.'],
  ['Absorption', 'Conversion of sound energy into heat inside a material. It is frequency-dependent; thin foam does not absorb bass.'],
  ['Diffusion', 'Scattering of sound in many directions instead of removing it. It redistributes energy rather than absorbing it.'],
  ['Direct-to-reverberant ratio', 'How much direct sound reaches the receiver compared with room-reflected sound. Moving closer raises it.'],
  ['Inverse-square law', 'In a free field, level from a point-like source falls about 6 dB each time distance doubles. Rooms are not free fields.'],
  ['Loop gain', 'The total gain around a microphone → amplifier → loudspeaker → air → microphone loop. Near unity with reinforcing phase, it rings.'],
  ['Toe-in', 'Angling a loudspeaker inward toward the listening position. In an equilateral layout each monitor toes in about 30°.'],
  ['Phantom centre', 'The image of a centred source created by matching signals from the left and right loudspeakers.'],
  ['Nearfield', 'Listening close enough that direct sound dominates over the room’s contribution.'],
  ['Room tone', 'A recording of a location’s ambience with no dialogue, used in editing to fill gaps and smooth cuts.'],
  ['RT60', 'Reverberation time: how long sound takes to decay by 60 dB. This app does not calculate it.'],
];
