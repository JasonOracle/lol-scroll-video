# LOL Hextech Mayhem — a Scroll-Scrubbed Video Landing Page

English | [简体中文](README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Upstream](https://img.shields.io/badge/upstream-oso95%2Fscroll--world-8a7bb5)](https://github.com/oso95/scroll-world)
[![Backend](https://img.shields.io/badge/AI%20backend-Agnes%20%28free%29-0AC8B9)](https://www.agnes-ai.com/)

> Scroll the page and the camera dives from outside a hextech miniature world into its
> heart, then flies on to the next scene without a single cut — the whole page is one
> continuous camera take you scrub back and forth with your mouse wheel.

![demo](docs/demo.mp4)

![screenshot](docs/screenshot.png)

*(English summary — the full write-up lives in the [Chinese README](README.md).)*

![screenshot](docs/screenshot.png)

## The story

I stumbled on a "scroll video" effect on Douyin (Chinese TikTok): the scrollbar becomes
a timeline, the camera dives into a miniature world as you scroll, and the scenes flow
into each other with no visible cuts. Tracking the effect down led me to the excellent
open-source project [oso95/scroll-world](https://github.com/oso95/scroll-world) — whose
default pipeline runs on paid services (Higgsfield / Monid).

Around the same time I had access to [Agnes](https://www.agnes-ai.com/)'s free
image model (`agnes-image-2.5-flash`) and video model (`agnes-video-2.5-flash`) APIs —
free for now and good enough for this. So I adapted the project to run **entirely on
Agnes** and generated this League-of-Legends-Hextech-themed demo: five isometric
miniature islands, from the Hexgate all the way to a Super Mega Death Rocket lifting off.

**Every visual is AI-generated, at zero cost.**

## What's inside

Five scene stills → five "dive-in" clips → four seamless connector clips
(9 × 720p videos, ~48 MB) plus a dependency-free scroll-scrub engine.

- **Frame-locked seams** — every connector's first/last frame is the *actual rendered
  frame* of its neighbouring clip, plus a short crossfade: no visible cuts
- **Static & dependency-free** — vanilla-JS engine builds its own DOM/CSS; drop it on
  any static host
- **Blob scrubbing** — clips load as blobs, no HTTP Range support needed
- **Old-machine auto-tuning** — probes CPU cores / RAM / modern CSS support and sheds
  particles, glass blur and distant clips on weak devices *without touching video quality*
- **Default-on background music** — gapless Web Audio loop; if autoplay policy blocks
  it, any first interaction completes the start

## Quick start

```bash
git clone https://github.com/JasonOracle/lol-scroll-video.git
cd lol-scroll-video
python -m http.server 8765
# open http://localhost:8765/
```

> Serve over HTTP (opening `index.html` directly breaks cross-origin video loading).
> The background track is **not included** for copyright reasons — drop your own loop
> at `assets/bgm.mp3` (14–30 s, pre-lowered to BGM level) and it loops gaplessly.

## Make it yours

Everything on the page is driven by one config object in `index.html` (scenes, copy,
theme colors, camera pacing). Assets come from the pipeline sketched above: shared
style preamble + per-scene prompts → Agnes 4K img2img stills → keyframe-mode dives →
connectors built from the *actual rendered frames* of neighbouring clips → encode and
wire. The full pipeline scripts, model qualification probes and war stories live in the
upstream skill: [oso95/scroll-world](https://github.com/oso95/scroll-world).

### Agnes integration notes (hard-won)

- `keyframe` mode with `first_frame`/`last_frame` **really frame-locks** (verified:
  output frame 0 ≡ input still, PSNR ~25 dB at 720p)
- Output aspect **follows the input image** — the `aspect_ratio` param is ignored;
  feed 16:9 images if you want 16:9 clips
- Frames travel as inline **base64 Data URIs** (≤1280w JPEG, ~200 KB), no image host needed
- The free tier allows **one video task at a time** (parallel submit → HTTP 429);
  image generation is rate-limited too (~50 s spacing)
- A 720p clip takes 2–12 minutes; run the whole chain detached and poll

## Credits & disclaimer

- [oso95/scroll-world](https://github.com/oso95/scroll-world) — upstream project and
  inspiration; the scrub engine, seam methodology and pipeline design come from it (MIT)
- [Agnes AI](https://www.agnes-ai.com/) — free image / video model APIs
- This is a **fan-made demo** not affiliated with Riot Games. League of Legends and all
  related names are trademarks of Riot Games. Non-commercial use only.

## License

[MIT](LICENSE) © 2026 JasonOracle
