# Birthday Surprise Website

A private, interactive birthday surprise experience — a full "story" the
birthday person clicks and taps their way through, not a normal scrolling
webpage. This README is written for a non-programmer — you should only
ever need to touch **`config.js`**.

## 🆕 New: Daily Countdown Calendar

While the countdown is still ticking, the Countdown chapter shows a small
calendar teaser: **one new photo + memory unlocks each day**, counting
backward from the birthday, giving the birthday person a real reason to
come back and check the site daily instead of just seeing the same
countdown every time.

**It's always reachable, even after everything's unlocked.** A small 🗓️
button sits in the bottom-left corner of the screen on every single
chapter of the site — not just the countdown — so she can browse back
through all her daily memories any time she wants, whether that's on day
3 or a year later. It shows a small badge with how many she's opened
(e.g. "12/15"), and tapping it opens the full calendar in an overlay from
wherever she currently is in the story.

- Comes with **15 photos** already set up in `config.js` (`dailyReveal.photos`)
- Each day is revealed through a **different mini-interaction** — tap to
  unblur, scratch it off, solve a quick 2×2 puzzle, flip the card over, or
  pop it open like a party favor — cycling through automatically so it
  never feels repetitive
- **Remembers what's already been opened** across visits (using the
  browser's local storage — see the note below on what that means)
- If someone opens the link late and misses a few days, nothing is lost —
  every day up to today just unlocks at once, no penalty
- If you don't want this at all, set `dailyReveal.enabled` to `false` in
  `config.js` and the countdown chapter goes back to just the plain
  ticking numbers, and the 🗓️ button won't appear at all

**A note on "remembering":** this is a real website with no server or
database behind it, so "remembering what's been opened" is stored in the
birthday person's own browser (`localStorage`). That means it's remembered
if they revisit from the same browser on the same device, but a different
device or browser (or clearing site data) starts fresh. This is a
reasonable, honest trade-off for a link-based gift with no backend — and
if `localStorage` isn't available at all for some reason (a strict private
browsing mode, for instance), the calendar still works perfectly for that
visit, it just won't remember for next time.

## ✅ The project is complete

All 13 chapters described in the original brief are built and working:

1. **Intro** — staggered "Hey {name} ❤️" reveal, glowing "Open Your Surprise" button
2. **Countdown** — live days/hours/minutes/seconds toward `birthdayDate`
3. **Photo Reveal** — tap to unblur a cinematic first photo
4. **Memory Gallery** — polaroid cards with tilts, a zoom lightbox, and heart reactions
5. **Photo Puzzle** — a 3×3 tap-or-drag swap puzzle
6. **Scratch Card** — scratch away a foil layer to reveal a hidden photo
7. **"How much do you mean to me?"** — a playful question where two of the three answers dodge away
8. **Memory Timeline** — a vertical timeline that reveals as you scroll
9. **Birthday Letter** — a typewriter-style love/friendship letter
10. **Birthday Cake** — tap every candle out to make a wish
11. **Fireworks** — a full-screen canvas fireworks celebration
12. **Secret Surprise** — a mysterious extra button with one more note + photo
13. **Final Surprise** — the closing screen, with a button to replay everything

Every chapter unlocks the next — nothing is skippable by scrolling past it,
matching the "interactive story" feel the brief asked for.

## How to open it

Just double-click **`index.html`** and it opens in your browser. If you'd
rather host it somewhere (a link you can text/share), any static web host
works — Netlify, GitHub Pages, or even just emailing the whole folder also
works, since nothing here needs a server or database.

### Developer preview shortcuts (safe to ignore — recipients will never use these)

Add these to the end of the URL in your browser's address bar while you're
personalizing the site, so you don't have to click through everything
every time:

| Add to the URL                | What it does                                                        |
|--------------------------------|----------------------------------------------------------------------|
| `?preview=countdownComplete`   | Shows the countdown as already finished, instead of waiting for the real date |
| `?jumpTo=countdown`            | Jump straight to the countdown                                       |
| `?jumpTo=photo-reveal`         | Jump straight to the photo reveal                                    |
| `?jumpTo=gallery`              | Jump straight to the memory gallery                                  |
| `?jumpTo=puzzle`               | Jump straight to the photo puzzle                                    |
| `?jumpTo=scratch`              | Jump straight to the scratch card                                    |
| `?jumpTo=choose-one`           | Jump straight to the "how much do I mean to you" question             |
| `?jumpTo=timeline`             | Jump straight to the memory timeline                                  |
| `?jumpTo=letter`               | Jump straight to the birthday letter                                   |
| `?jumpTo=cake`                 | Jump straight to the birthday cake                                      |
| `?jumpTo=fireworks`            | Jump straight to the fireworks celebration                              |
| `?jumpTo=secret`               | Jump straight to the secret surprise                                     |
| `?jumpTo=final`                | Jump straight to the closing screen                                       |

Example: open `index.html?jumpTo=cake` directly to preview the cake without
clicking through everything first. The real link you eventually send
someone should have **no** `?` parameters at all — those are for you only.

## Folder structure

```
birthday-surprise/
├── index.html          the page shell (you shouldn't need to edit this)
├── style.css            all visual design (you shouldn't need to edit this)
├── script.js             application logic (you shouldn't need to edit this)
├── config.js              ★ YOUR CONTENT LIVES HERE ★
│
├── js/                   shared building blocks used by every chapter
│   ├── sectionManager.js    tracks progress / the glowing dot strand
│   ├── storyFlow.js          shows one chapter at a time, animates between them
│   ├── particles.js          confetti, sparkles, floating hearts, fireworks
│   ├── soundManager.js       background music + sound effects
│   └── dailyReveal.js         the daily countdown calendar + its 5 reveal styles
│
├── images/                ★ PUT YOUR PHOTOS HERE ★
│   ├── photo1.jpg            the cinematic "do you remember" reveal photo
│   ├── photo2.jpg             gallery photo
│   ├── photo3.jpg              gallery photo
│   ├── photo4.jpg               gallery photo — also reappears on the final screen
│   ├── puzzle.jpg                 the photo used in the puzzle game (square works best)
│   ├── special.jpg                 the photo hidden under the scratch card
│   ├── secret.jpg                   revealed only by the "One Last Thing..." button
│   └── daily/                        ★ THE 15 DAILY CALENDAR PHOTOS ★
│       ├── day01.jpg                    unlocks first (furthest from the birthday)
│       ├── day02.jpg
│       ├── ...
│       └── day15.jpg                    unlocks last (the day before the birthday)
│
├── audio/                 ★ PUT YOUR MUSIC HERE ★
│   ├── birthday-song.mp3     not included — add your own background music
│   ├── click.mp3               a placeholder click sound is included
│   ├── open.mp3                 not included — plays when the surprise opens
│   ├── puzzle-solved.mp3         not included — plays when the puzzle is solved
│   ├── scratch-reveal.mp3         not included — plays when the scratch card finishes
│   ├── cake-blow.mp3               not included — plays when all candles are out
│   ├── fireworks.mp3                not included — plays during the fireworks
│   └── final-reveal.mp3              not included — plays on the closing screen
│
└── README.md              this file
```

Every audio slot except `click.mp3` is intentionally left empty — the site
is built to never break because of a missing sound file, it just quietly
skips it. Add real files whenever you want; no code changes needed.

## What you can safely edit: `config.js`

Open `config.js` in any text editor (even Notepad or TextEdit). Every
section is labeled with a numbered comment. You can change:

| In `config.js`...                | Controls...                                   |
|-----------------------------------|------------------------------------------------|
| `name`                             | the birthday person's name, used everywhere    |
| `birthdayDate`                     | when the countdown hits zero                    |
| `photos`                           | the cinematic reveal photo (first one), the memory gallery, **and** the final screen's photo (last one) — add or remove entries freely |
| `dailyReveal.enabled`              | turn the daily calendar on/off entirely |
| `dailyReveal.photos`               | the 15+ daily calendar photos + memories — add, remove, or reorder freely; the schedule recalculates automatically |
| `puzzleImage`                      | the photo used in the puzzle game (a square photo divides most evenly) |
| `scratchImage`                     | the photo hidden under the scratch card |
| `secretPhoto`                      | the photo revealed by the secret button |
| `music.*`                          | your song and every sound effect |
| `messages.*`                       | every single piece of writing on the site — questions, prompts, eyebrows, the letter, the timeline steps, the final message, all of it |
| `theme.colors`                     | the site's color palette, if you want to nudge it |
| `settings.candleCount`             | how many candles are on the cake |
| `settings.totalSurprises`          | how many dots appear in the progress strand (leave at 12 unless you add/remove chapters) |

**To add your own photos:** replace the files in `/images` with your own
photos, keeping the *same file names* — that's the easiest way, since
`config.js` already points to those names. Want more or fewer gallery
photos? Add or remove entries in the `photos:` list — the gallery grid,
the opening reveal (first photo), and the closing screen (last photo) all
update automatically.

**To change the timeline:** edit the `timelineSteps` list in `config.js` —
add, remove, or reorder entries and the timeline redraws itself to match.

**To set up the daily calendar:** replace the files in `/images/daily`
with your own photos (same file names, or update the paths in
`dailyReveal.photos`), and write a short "memory" caption for each — this
is the text shown once that day is opened. Want it to run longer or
shorter than 15 days? Just add or remove entries; the unlock schedule
recalculates automatically so the last entry always unlocks the day
before the birthday, however many you list. Want a *specific* day to
always use a certain reveal style? Add `style: "scratch"` (or `"blur"`,
`"puzzle"`, `"flip"`, `"pop"`) to that entry — otherwise it cycles through
all five automatically.

**To rewrite the letter:** edit the `letter` backtick string in
`messages`. Use a blank line for a paragraph break, exactly like the
example already there.

You never need to open `index.html`, `style.css`, `script.js`, or anything
inside `/js` to personalize the site.

## How the experience is built (for your own curiosity)

- **One chapter visible at a time.** `js/storyFlow.js` shows exactly one
  `<section>` at a time and animates between them — this is what makes it
  feel like a story/game rather than a scrolling page.
- **The glowing dot strand** (right side on desktop, bottom on phones) is
  `js/sectionManager.js` — it lights up a dot every time you complete one
  of the 12 "surprises" (everything after the intro).
- **Nothing can crash from a missing file.** Every image has a graceful
  fallback, and every sound effect is simply skipped if the file isn't
  there yet — try it: `birthday-song.mp3` isn't included, and the music
  button just stays quietly disabled instead of erroring.
- **Mobile-first throughout:** no horizontal scroll anywhere, every tap
  target is comfortably sized, the puzzle and scratch card use the
  Pointer Events API so mouse/touch/pen all work identically, and
  `prefers-reduced-motion` is respected everywhere (including skipping
  the letter's typing animation and shortening the fireworks show).
- **Accessibility touches:** the scratch card has a "prefer not to
  scratch?" fallback for anyone who can't or doesn't want to use a
  gestural interaction; the letter's full text is always available to
  screen readers immediately, not typed at them; focus moves to each new
  chapter as you arrive; every interactive element is keyboard-operable.

## A note on a bug that was caught and fixed

Early on, every emoji and arrow written directly into `index.html` (like
the ❤️, →, and 🎁 symbols) was accidentally written as a JavaScript-style
`\u` escape code, which only means anything inside an actual JavaScript
string — plain HTML has no idea what to do with it, so those characters
were showing up as broken text instead of symbols. It's fixed now (and the
whole project was re-tested afterward to confirm), but it's a good example
of the kind of thing that's easy to miss just by reading code, and only
shows up when you actually look at the rendered page — which is exactly
why "does it actually run correctly" checks matter as much as "does the
code look right."

## Testing

Every chapter has been walked through automatically end-to-end — including
solving the puzzle via the same two-click sequence a real user would use,
confirming the countdown, cake, and fireworks all reach their celebration
states correctly, and verifying the progress strand reaches exactly 12/12
by the final screen. A real browser is still the best judge of *feel*
(how the puzzle drag responds, how satisfying the scratch card is) — that
part is worth trying yourself on your phone before sending it to anyone.

The daily calendar was tested with simulated dates covering a full mix of
locked, ready-to-open, and already-opened days (rather than waiting for
real days to pass), all 5 reveal styles were each solved/opened
end-to-end, and the "remembers what you opened" behavior was verified
both with storage available (it persists correctly) and without (it
degrades gracefully — nothing breaks, it just won't remember next visit).
