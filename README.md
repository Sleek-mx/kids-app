# Sleek Kids

One app for three kids: quick games, homework help, 135 things to make, and six short lessons on how AI actually works.

Live at **https://sleekmx.co.ke/kids/**

This repo is the source of truth for the app. It is plain HTML, CSS and ES modules — no build step, no dependencies, no framework. The built output is copied into `Sleek-mx/sleek-mx-build` under `kids/` because the `sleekmx` Cloudflare Pages project only builds from that repository.

## What is in here

| Section | Contents |
|---|---|
| **Games** | Memory Match, Times Tables, Word Scramble, Maths Sprint, Pattern Echo. Best scores saved in `localStorage`. |
| **Homework** | A self-marking practice quiz with three age bands, plus 173 real KCSE questions across eight subjects with worked answers and an AI explainer. |
| **Make** | 135 activities merged from Ivy's Idea Lab and Liam's Build Lab, with a category filter, search, and eleven short stories. |
| **Learn AI** | Six lessons — what AI is, how it learns, data, failure modes, safety, and prompting — each with key terms and a short quiz. |

## Layout

```
index.html            shell, top bar, bottom tab bar
css/kids.css          the whole design system
js/app.js             hash router + home view
js/ui.js              DOM, storage, sheet, toast, AI fetch helpers
js/games.js           five games
js/homework.js        practice generator + revision bank
js/make.js            activity grid, detail, stories
js/learn.js           lesson list + lesson view
data/activities.json  135 activities (Ivy + Liam + crochet)
data/stories.json     11 stories
data/questions.json   173 exam questions, trimmed to what the UI shows
data/syllabus.json    the six AI lessons
api/explain.js        Cloudflare Pages Function: plain-language answer explainer
sw.js                 offline shell
```

`api/explain.js` is a Pages Function, not part of the static bundle. It ships to `functions/kids/api/explain.js` in `sleek-mx-build`.

## Running locally

```sh
python3 -m http.server 8791
# then open http://127.0.0.1:8791/index.html
```

The AI explainer needs a Pages Function host, so it returns an error under a plain static server. Everything else works.

## Routes

Hash routes, so the app works from any static host and offline:

- `#/` home
- `#/games` · `#/games/<id>`
- `#/homework` · `#/homework/practice` · `#/homework/s/<subject>` · `#/homework/p/<subject>/<paper>` · `#/homework/q/<subject>/<paper>/<question>`
- `#/make` · `#/make/<category>` · `#/make/a/<id>` · `#/make/stories` · `#/make/story/<id>`
- `#/ai` · `#/ai/<lesson-id>`

## Data provenance

- Activities and stories: `Sleek-mx/ivy-lab` and `Sleek-mx/liam-lab`.
- Exam questions: `Sleek-mx/sammies-revision-help` (`public/data/subjects.json`), flattened and stripped of per-paper coverage notes.
- AI syllabus: written for this app.

Those three repos stay alive as their own projects. This app is the combined front door.

## Deploying

1. Copy this directory into `sleek-mx-build/kids/`.
2. Copy `api/explain.js` to `sleek-mx-build/functions/kids/api/explain.js`.
3. Push to `scrollytelling-v1` on `Sleek-mx/sleek-mx-build`.

The `sleekmx` Pages project already has `GROQ_API_KEY`, `NVIDIA_API_KEY`, `NVIDIA_MODEL` and the `nodejs_compat` flag.

## Notes

- Nothing requires an account. Progress lives in `localStorage` only.
- The only outbound request is the text of an exam question sent to the explainer endpoint.
- Service worker cache version is `VERSION` in `sw.js`. Bump it whenever a shell file changes, or returning visitors keep the old copy.
