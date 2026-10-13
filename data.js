/* Frequency Oasis — course content (from Build 02, text unchanged). */
const lessons = [
  {
    "id": 0,
    "title": "Sound in space",
    "desc": "Propagation, reflection, absorption, diffraction",
    "env": "studio",
    "kicker": "MODULE 01 / FOUNDATIONS",
    "h": "Sound moves through a space, not a diagram.",
    "p": "Direct sound reaches a receiver along the direct path. Reflected sound arrives after interacting with boundaries. Absorption dissipates energy; diffusion redistributes it. They are not interchangeable treatments.",
    "rule": "The path overlays are conceptual. They do not calculate pressure, phase, frequency response, or reflection strength."
  },
  {
    "id": 1,
    "title": "Studio geometry",
    "desc": "Monitor spacing and listening position",
    "env": "studio",
    "kicker": "MODULE 02 / AUDIO STUDIO",
    "h": "Build a stable listening triangle.",
    "p": "A symmetrical left/right setup and a listener near the apex of an equilateral triangle are useful starting points for many stereo nearfield arrangements. Confirm the monitor maker’s aiming guidance, room constraints, and listening distance.",
    "rule": "A plausible triangle does not guarantee a neutral room or correct tonal balance. Verify with listening and suitable measurement."
  },
  {
    "id": 2,
    "title": "Room dimensions",
    "desc": "Axial modes and room proportions",
    "env": "studio",
    "kicker": "MODULE 03 / ROOM ACOUSTICS",
    "h": "Room dimensions leave fingerprints.",
    "p": "In an ideal rectangular room, axial mode frequencies are related to sound speed and room dimension. Real room response also depends on boundary conditions, losses, openings, furniture, and source/listener positions.",
    "rule": "The first axial-mode readout is a simple estimate, not a full modal or bass-response analysis."
  },
  {
    "id": 3,
    "title": "Early reflections",
    "desc": "Reflection paths and stereo cues",
    "env": "studio",
    "kicker": "MODULE 04 / REFLECTIONS",
    "h": "Find the path before choosing the treatment.",
    "p": "Early reflections can affect timbre and stereo localization. Identify likely reflective surfaces, then use listening and appropriate measurements to establish whether they are a meaningful problem.",
    "rule": "Red dashed paths are explanatory sketches, not ray-traced paths or a prediction of reflection level."
  },
  {
    "id": 4,
    "title": "Microphone placement",
    "desc": "Distance, angle, direct/reverb balance",
    "env": "film",
    "kicker": "MODULE 05 / MICROPHONE PLACEMENT",
    "h": "Distance is part of the sound.",
    "p": "Closer placement often improves the direct-to-reverberant ratio and reduces unwanted room sound. The right position still depends on source, microphone pattern, proximity effect, handling noise, framing, and intended perspective.",
    "rule": "The model is top-down and omits vertical angle, polar response, frequency coloration, and actual recorded audio."
  },
  {
    "id": 5,
    "title": "Film dialogue",
    "desc": "Boom position, framing, room tone",
    "env": "film",
    "kicker": "MODULE 06 / FILM PRODUCTION",
    "h": "Capture the voice before repairing it.",
    "p": "Aim the microphone toward the active voice while keeping it safely outside frame. Watch for reflections, clothing noise, background sources, boom shadows, and continuity. Record room tone for editorial use.",
    "rule": "The operator must monitor the real signal and coordinate safely with camera, lighting, performers, and moving equipment."
  },
  {
    "id": 6,
    "title": "Cinema layouts",
    "desc": "Channels and listener coverage",
    "env": "cinema",
    "kicker": "MODULE 07 / CINEMA",
    "h": "Coverage is a listening-area problem.",
    "p": "Speaker positions must follow the intended playback format and room design. Channel calibration, timing, bass management, room response, and coverage across seats all affect the result.",
    "rule": "This drawing is illustrative, not a cinema layout specification or certification check."
  },
  {
    "id": 7,
    "title": "Live sound coverage",
    "desc": "Aiming, spill, monitor positions",
    "env": "live",
    "kicker": "MODULE 08 / LIVE SOUND",
    "h": "Aim coverage; control spill.",
    "p": "Main loudspeakers should cover the intended audience consistently. Stage volume, microphone pickup, monitor geometry, loudspeaker directivity, and open microphones all influence feedback risk.",
    "rule": "The diagram does not predict SPL coverage, gain-before-feedback, phase summation, or safe exposure levels."
  },
  {
    "id": 8,
    "title": "Feedback loop",
    "desc": "Microphones, loudspeakers, gain",
    "env": "live",
    "kicker": "MODULE 09 / FEEDBACK",
    "h": "Feedback is a loop, not a single bad position.",
    "p": "A microphone captures loudspeaker output; amplification returns some of that signal to the loudspeaker. When loop gain reaches unity at a frequency with reinforcing phase, ringing or feedback can occur. Geometry and gain structure both matter.",
    "rule": "Never use this visual model to set safe levels or guarantee gain-before-feedback. Test carefully in the actual system."
  },
  {
    "id": 9,
    "title": "Bass and boundaries",
    "desc": "Boundary interaction and low-frequency control",
    "env": "studio",
    "kicker": "MODULE 10 / BOUNDARIES",
    "h": "Walls change the low-frequency problem.",
    "p": "Boundary interaction can reinforce or cancel parts of the low-frequency response. The result depends on source and listener position, room dimensions, boundary properties, and frequency. Moving equipment can be a useful diagnostic experiment.",
    "rule": "A single boundary gap cannot predict the response. Avoid one-size-fits-all wall-distance rules."
  },
  {
    "id": 10,
    "title": "Controlled diagnosis",
    "desc": "Isolate variables and verify",
    "env": "studio",
    "kicker": "MODULE 11 / DIAGNOSIS",
    "h": "Change one thing. Learn what changed.",
    "p": "Describe the symptom, form a hypothesis, make one controlled change, then compare at matched levels where appropriate. Record conditions. Avoid changing position, EQ, level, and treatment all at once.",
    "rule": "Subjective impressions are useful evidence but can be biased. Pair listening with suitable measurements when possible."
  },
  {
    "id": 11,
    "title": "Final field judgement",
    "desc": "Apply placement reasoning independently",
    "env": "studio",
    "kicker": "MODULE 12 / FIELD JUDGEMENT",
    "h": "Explain the decision, not just the answer.",
    "p": "A defensible placement decision connects the symptom to a physical mechanism, names the constraints, and specifies how the result will be verified. Professional practice includes knowing what the model cannot tell you.",
    "rule": "The built-in quiz is a training assessment, not an accredited qualification or proof of real-world competence."
  }
];

const missions = [
  [
    "Studio triangle",
    "Arrange a plausible symmetric stereo layout and document spacing, listening distance, and aiming assumptions."
  ],
  [
    "Boundary experiment",
    "Move the source relative to a boundary. State what may change and identify the measurement you would use to verify it."
  ],
  [
    "Reflection diagnosis",
    "Enable conceptual reflection paths. Identify a likely reflection surface and propose a controlled test."
  ],
  [
    "Dialogue capture",
    "Switch to film mode. Choose a microphone position that balances distance, perspective, frame safety, and noise."
  ],
  [
    "Cinema coverage",
    "Switch to cinema mode. Explain why format guidance and calibration are required beyond a top-down diagram."
  ],
  [
    "Feedback prevention",
    "Switch to live mode. Identify the microphone/loudspeaker loop and list two changes that could improve stability."
  ],
  [
    "Controlled comparison",
    "Write a field note that states one hypothesis, one variable, one verification method, and one limitation."
  ]
];

const quiz = [
  {
    "q": "The phantom center pulls to one side in a stereo nearfield setup. What should you investigate first?",
    "a": [
      "Add stereo widening to the master bus",
      "Check symmetry, monitor angles, listening position, and channel matching",
      "Boost the quieter side by 3 dB without checking the room"
    ],
    "c": 1,
    "e": "Stereo localization depends on relative level and timing. Verify geometry and channel matching before processing."
  },
  {
    "q": "Why can moving a monitor closer to a wall change bass response?",
    "a": [
      "Boundary interaction changes low-frequency radiation and interference",
      "The wall automatically absorbs bass",
      "The audio file sample rate changes"
    ],
    "c": 0,
    "e": "Boundaries can reinforce or cancel frequency components depending on geometry and boundary conditions."
  },
  {
    "q": "What is the strongest way to diagnose a suspected early reflection?",
    "a": [
      "Buy the thickest-looking foam panels",
      "Identify the path, then use listening and appropriate measurements",
      "Turn up the speakers until the reflection disappears"
    ],
    "c": 1,
    "e": "First establish whether the reflection is meaningful and where it comes from; then select treatment and verify."
  },
  {
    "q": "On a film set, what often improves dialogue isolation before post-processing?",
    "a": [
      "Move the mic closer while respecting frame and safety constraints",
      "Place the mic farther away",
      "Assume the camera mic is always best"
    ],
    "c": 0,
    "e": "Closer placement often improves direct-to-reverberant ratio, but perspective, pattern, framing, and handling still matter."
  },
  {
    "q": "Why record room tone?",
    "a": [
      "To replace every dialogue line",
      "To support editorial continuity and fill natural gaps",
      "To calibrate cinema subwoofers"
    ],
    "c": 1,
    "e": "Room tone provides a location-specific ambient bed that helps smooth edits."
  },
  {
    "q": "What should guide cinema surround speaker placement?",
    "a": [
      "A random symmetrical arrangement",
      "The applicable playback format and room design requirements",
      "Only the shape of the screen"
    ],
    "c": 1,
    "e": "Channel layout, calibration, timing, and coverage must follow the intended playback system."
  },
  {
    "q": "Which combination helps reduce feedback risk in live sound?",
    "a": [
      "More open mics and more stage volume",
      "Sensible mic/speaker geometry, gain structure, and controlled stage volume",
      "Aim every monitor directly into every microphone"
    ],
    "c": 1,
    "e": "Feedback is a loop-gain problem. Position, directivity, open mics, and gain all matter."
  },
  {
    "q": "The room sounds boomy on one bass note. What is the most defensible response?",
    "a": [
      "Assume the monitors are broken",
      "Check listening position and room response with listening and measurement",
      "Apply a high-shelf boost"
    ],
    "c": 1,
    "e": "Position-dependent modes and response peaks are plausible. Test before choosing treatment or EQ."
  },
  {
    "q": "What does the propagation-time readout represent?",
    "a": [
      "The exact arrival time of every reflection",
      "An estimate of direct-path travel time using about 343 m/s",
      "The room reverberation time"
    ],
    "c": 1,
    "e": "It estimates direct distance divided by an assumed speed of sound; it does not model reflections."
  },
  {
    "q": "Which formula estimates idealized axial modes along a room dimension?",
    "a": [
      "f = n × c / (2L)",
      "f = distance × gain",
      "f = room volume × SPL"
    ],
    "c": 0,
    "e": "For an ideal rectangular room, fₙ = n c/(2L). Real-room response requires more context than one formula."
  },
  {
    "q": "What improves the validity of comparing two placement changes?",
    "a": [
      "Change several variables and rely on memory",
      "Change one variable at a time and compare under controlled conditions",
      "Always choose the louder result"
    ],
    "c": 1,
    "e": "Controlled comparisons reduce confounds; level matching helps avoid mistaking louder for better."
  },
  {
    "q": "Can this prototype certify a room’s RT60 or exact frequency response?",
    "a": [
      "Yes, from the perspective drawing",
      "Yes, if the room is rectangular",
      "No; it needs validated acoustic modelling or real measurement"
    ],
    "c": 2,
    "e": "The current model is spatial and geometric. It does not calculate RT60 or a full frequency response."
  }
];
