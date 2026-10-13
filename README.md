# Frequency Oasis — Spatial Sound Engineering

An installable, offline-first field school for sound placement: music studios, film sets, cinema playback and live sound. Move equipment through a room, read the geometry, **hear it**, and learn what still has to be measured in the real world.

No build step, no dependencies, no network calls. Plain HTML, CSS and JavaScript.

## Run it

```bash
python3 -m http.server 8080      # or: npm start
# open http://localhost:8080
```

A service worker (and therefore install and offline use) needs **https or localhost**. Opened straight from disk the app still runs; it just can't install.

## Deploy

Any static host works. GitHub Pages: push, then Settings → Pages → deploy from branch, root. The app uses only relative paths, so project sub-paths are fine. `.nojekyll` is included.

## What's inside

| View | What it does |
| --- | --- |
| 01 Spatial lab | Perspective or plan view of a room. Drag or arrow-key the monitors/listener. Direct paths, reflection paths, coverage, dimension labels, slowed wavefronts, feedback-loop overlay. Live readout of delay, toe-in, stereo angle, L/R arrival and level offsets. **Hear the geometry** renders those cues with Web Audio. |
| 02 Lesson library | 12 field modules, a reference card, a glossary, and a hands-on "Try this" experiment per module. |
| 03 Field missions | 7 practice missions with "Open in lab" shortcuts. |
| 04 Final assessment | 12 questions, 75% threshold, keyboard control, and "revisit these modules" for missed questions. |
| 05 Sound bench | Axial-mode chart (tap a stem to hear it), image-source reflection ledger with timeline, free-field distance/level, temperature-aware speed of sound and comb-filter notch calculator. |
| 06 Field log | Progress ring, notes (each saved with a snapshot of the setup), export to Markdown/JSON, reset. |

Progress and notes live in `localStorage` on the device. Nothing is uploaded.

## Honesty rules (kept from Build 02)

This is a teaching model. It shows geometry, timing and spreading loss. It does **not** calculate SPL coverage, RT60, phase or frequency response, and it is not a certification. Every panel states what it leaves out; please keep that when you extend it.

## Structure

```
Everything lives in one flat folder (no subfolders).

index.html                   app shell
manifest.webmanifest         PWA manifest (icons, shortcuts, screenshots)
sw.js                        cache-first service worker  -> bump VERSION on every release
favicon.ico
style.css                    Build 02 styles (unchanged)
extras.css                   Build 03 additions
data.js                      lessons, missions, quiz (Build 02 text, unchanged)
content-extra.js             challenges, glossary, mission shortcuts, quiz-to-lesson map
app.js                       lab, lessons, missions, assessment, field log, routing
audio.js                     Hear the geometry (Web Audio)
bench.js                     Sound bench
pwa.js                       install prompt, offline status, update toast
icon*.svg, icon-*.png,       SVG sources + PNG set (any, maskable, apple-touch, favicon)
favicon.svg, favicon-32.png,
apple-touch-icon.png
lab-wide.png, lab-narrow.png used by the manifest for the richer install dialog
make-icons.py                regenerates PNG/ICO icons from the SVGs
legacy-base.css,             original Build 02 files, kept for reference only
legacy-core.js,              (nothing in the app loads them)
frequency_oasis_spatial_sound_engineering_v2.html
```

## Releasing

1. Change files.
2. Change `VERSION` in `sw.js` (and add any new file to its `SHELL` list).
3. Deploy. Installed copies show "A new version is ready · Reload".

## Regenerating icons

Edit `icon.svg`, `icon-maskable.svg` or `favicon.svg`, then `python3 make-icons.py` (needs `pip install playwright` and `playwright install chromium`). Maskable art keeps everything inside the central 80% safe zone.

## Keyboard

`1`–`6` switch views · `P` plan view · `Space` play/stop lab sound · focus the canvas then arrows move the listener, `Alt`+arrows move the monitors, `Shift` for bigger steps · assessment: `A` `B` `C` and `Enter`.

## Licence

Add the licence of your choice before publishing.

## Archive

The `legacy-*` files and `frequency_oasis_spatial_sound_engineering_v2.html` are the original Build 02 single-file app and its earlier split, kept for reference. Nothing in the app loads them.
