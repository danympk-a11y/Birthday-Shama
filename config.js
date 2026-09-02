/* ============================================================================
   config.js
   ----------------------------------------------------------------------------
   THIS IS THE ONLY FILE YOU SHOULD NEED TO EDIT.

   Everything personal about the surprise lives here: the name, the date,
   the photos, the messages, even the colors. The rest of the project
   (index.html, style.css, script.js, js/*.js) is application logic and
   should not need to change when you personalize the site.

   HOW TO EDIT SAFELY:
   - Only change the text between quotes ("...") or backticks (`...`).
   - Keep the commas at the end of each line.
   - If you're not sure, copy this file and edit the copy first.
   ============================================================================ */

const birthdayConfig = {

  /* --------------------------------------------------------------------
     1. WHO IS THIS FOR?
     -------------------------------------------------------------------- */
  name: "Shama Daniel",

  // When the countdown should hit zero. Format: "YYYY-MM-DDTHH:MM:SS"
  birthdayDate: "2026-12-22T00:00:00",

  /* --------------------------------------------------------------------
     2. PHOTOS
     Put your image files inside the /images folder using these exact
     file names, or change the paths below to match your own file names.
     Each photo has a "caption" shown under it in the memory gallery.
     You can add or remove photos by adding/removing entries in this list
     — the gallery grid automatically adjusts to however many you list.

     The FIRST photo in this list (photos[0]) is also used for the big
     cinematic "Do you remember this moment?" reveal, and the LAST photo
     reappears once more on the final screen at the very end — so put
     your most meaningful photo first, and a favorite last.
     -------------------------------------------------------------------- */
  photos: [
    { src: "images/photo1.jpg", caption: "That smile ❤️" },
    { src: "images/photo2.jpg", caption: "One of my favorite memories" },
    { src: "images/photo3.jpg", caption: "This moment >>>" },
    { src: "images/photo4.jpg", caption: "Never forget this day" }
  ],

  // The photo used for the sliding picture puzzle (works best as a square image).
  puzzleImage: "images/puzzle.jpg",

  // The photo hidden underneath the scratch card.
  scratchImage: "images/special.jpg",

  // A photo revealed only after tapping the "One Last Thing..." secret button.
  secretPhoto: "images/secret.jpg",

  /* --------------------------------------------------------------------
     2b. DAILY COUNTDOWN CALENDAR (optional)
     While the countdown is still ticking, the countdown chapter also
     shows a small calendar: one new "memory" (a photo + a short caption)
     unlocks each day, counting backward from birthdayDate, giving the
     birthday person a reason to come back and check the site daily.

     - List at least 15 photos below for a good two-week build-up.
     - Day 1 unlocks photos.length days before the birthday; the last
       entry unlocks the day before. If someone opens the link late and
       misses a few days, everything up to today just unlocks at once —
       nothing is ever permanently missed.
     - Each entry can optionally set "style" to force how it's revealed:
       "blur" (tap to unblur), "scratch" (scratch it off), "puzzle" (a
       quick 2×2 puzzle), "flip" (tap to flip the card over), or "pop"
       (tap to pop it open like a party favor). Leave "style" out and
       the site cycles through all five automatically, in that order,
       so it stays varied without you needing to plan it.
     - If you don't want this feature at all, set enabled to false — the
       countdown chapter will just show the plain ticking numbers, like
       before.
     -------------------------------------------------------------------- */
  dailyReveal: {
    enabled: true,
    photos: [
      { src: "images/daily/day01.jpg", caption: "The first time I knew you were someone special." },
      { src: "images/daily/day02.jpg", caption: "This still makes me laugh every time." },
      { src: "images/daily/day03.jpg", caption: "One of the best days we've had." },
      { src: "images/daily/day04.jpg", caption: "You probably don't even remember this one." },
      { src: "images/daily/day05.jpg", caption: "This is exactly the smile I think of." },
      { src: "images/daily/day06.jpg", caption: "A quiet little moment I never forgot." },
      { src: "images/daily/day07.jpg", caption: "We still talk about this day." },
      { src: "images/daily/day08.jpg", caption: "You have no idea how much this meant to me." },
      { src: "images/daily/day10.jpg", caption: "Pure chaos. 10/10, would do again." },
      { src: "images/daily/day11.jpg", caption: "Tomorrow's the big day. ❤️" }
    ]
  },

  /* --------------------------------------------------------------------
     3. MUSIC & SOUND
     Drop your files into /audio using these names, or point to your own.
     If a file is missing, the site will simply hide/disable that control
     instead of breaking — you can add real files later at any time.
     -------------------------------------------------------------------- */
  music: {
    background: "audio/birthday-song.mp3",     // plays softly once the surprise is opened
    click: "audio/click.mp3",                  // short sound for taps/clicks
    open: "audio/open.mp3",                    // plays when "Open Your Surprise" is tapped
    puzzleSolved: "audio/puzzle-solved.mp3",   // plays when the photo puzzle is solved
    scratchReveal: "audio/scratch-reveal.mp3", // plays when the scratch card finishes revealing
    cakeBlow: "audio/cake-blow.mp3",           // plays when all the candles are blown out
    fireworks: "audio/fireworks.mp3",          // plays during the fireworks celebration
    finalReveal: "audio/final-reveal.mp3"      // plays on the very last screen
  },

  /* --------------------------------------------------------------------
     4. MESSAGES
     Use {name} anywhere you want the birthday person's name inserted
     automatically. Use \n for a new line inside the backtick (`) blocks.
     -------------------------------------------------------------------- */
  messages: {
    // Shown on the very first screen.
    greeting: "Hey {Shama Daniel} ❤️",
    introEyebrow: "A Surprise, Just For You 🎀",
    introLine: "I made something special for you my Guriya...",

    // Shown above the countdown timer.
    countdownLabel: "Something Special Is Coming... ⏳",

    // The daily countdown calendar, shown below the countdown while it's
    // still ticking (only appears if dailyReveal.enabled is true above).
    dailyCalendarEyebrow: "While You Wait... 🗓️",
    dailyCalendarHeading: "A New Memory Every Day",
    dailyCalendarOpenLabel: "Open Daily Memories 🗓️",
    dailyCalendarHint: "Come back each day to unlock a new one ❤️",
    dailyCalendarAllDoneHint: "You've unlocked every memory so far — more tomorrow ✨",

    // Shown above the very first photo, before it's revealed.
    photoRevealEyebrow: "A Memory 💭",
    photoRevealPrompt: "Do you remember this moment? ❤️",
    photoRevealHint: "Tap to remember ✨",

    // Shown above the memory gallery grid.
    galleryEyebrow: "Memory Gallery 📸",
    galleryHeading: "A Few Of My Favorites",

    // Shown above the photo puzzle, and once it's solved.
    puzzleEyebrow: "A Little Game 🖼️",
    puzzlePrompt: "Can you solve this memory? 🧩",
    puzzleSolvedMessage: "You unlocked a memory ❤️",

    // Shown on the scratch card overlay, and once it's revealed.
    scratchEyebrow: "One More Surprise 🎁",
    scratchPrompt: "Scratch here to reveal your surprise ✨",
    scratchMessage: "Happy Birthday {name} ❤️",

    // The playful "how much do you mean to me" question.
    // The first two buttons dodge away when tapped; only the third one
    // ever "works". chooseOneAnswer is revealed once it's tapped.
    chooseOneEyebrow: "Just Curious 🤔",
    chooseOneQuestion: "How much do you think you mean to me?",
    chooseOneOptionA: "A little",
    chooseOneOptionB: "A lot",
    chooseOneOptionCorrect: "More than you know ❤️",
    chooseOneAnswer: "Exactly. There was never really another answer. ❤️",

    // The vertical memory timeline. Add, remove, or edit steps freely —
    // the timeline redraws itself to match however many you list.
    timelineEyebrow: "Our Story 📖",
    timelineHeading: "How We Got Here",
    timelineSteps: [
      { phase: "Then...", title: "Our First Memory" },
      { phase: "After That...", title: "More Beautiful Moments" },
      { phase: "Somehow...", title: "You Became Special" },
      { phase: "And Today...", title: "Your Birthday ❤️" }
    ],

    // The full-screen letter. letterIntro fades in first, then the
    // letter itself types out gradually. Feel free to rewrite it completely.
    letterIntro: "I wanted to tell you something... 💌",
    letter: `Some people enter our lives quietly,
and somehow become a beautiful part of our story.

Today isn't just your birthday.
It's a reminder of how lucky I am
to know someone like you.

I hope this year brings you
everything your heart wishes for.

Happy Birthday, {name} ❤️`,

    // The birthday cake. Tap every candle to blow them all out.
    cakePrompt: "Make a wish... 🎂",
    cakeSuccessMessage: "Wish sent successfully ✨❤️",

    // The full-screen fireworks celebration right after the cake.
    fireworksTitle: "Happy Birthday {name}! 🎉❤️",

    // The mysterious extra button, and what it reveals.
    secretEyebrow: "Almost Done... 👀",
    secretButtonLabel: "One Last Thing... 👀",
    personalNote: "You actually thought that was everything? 😂❤️",

    // The very last screen of the whole experience.
    finalMessage: "Happy Birthday\n{name} ❤️",
    finalSubline: "May your smile always stay this beautiful. 🌸",
    replayLabel: "Replay The Surprise 🔄"
  },

  /* --------------------------------------------------------------------
     5. LOOK & FEEL
     Optional. The site already ships with a premium dark romantic theme,
     but you can nudge the colors or fonts here without touching any CSS.
     Leave this whole block alone if you're happy with the defaults.
     -------------------------------------------------------------------- */
  theme: {
    colors: {
      bgVoid:     "#0b0614",   // deepest background
      bgPlum:     "#1c0f2e",   // panel / card background
      bgPlumLight:"#2a1745",   // elevated surface
      accentRose: "#ff4f87",   // primary accent (buttons, hearts, glow)
      accentVioletColor: "#8b5cf6", // secondary accent (gradients, particles)
      accentGold: "#f3c77e",   // signature accent (candles, stars, sparkle)
      textPrimary:"#f8f2ff",   // main text color
      textMuted:  "#b6a4d4"    // secondary / caption text color
    }
    // fonts are defined in style.css — change there if you want different
    // typefaces, since fonts also need a matching <link> in index.html.
  },

  /* --------------------------------------------------------------------
     6. STORY SETTINGS
     -------------------------------------------------------------------- */
  settings: {
    // Total number of "surprises" in the full experience. Used by the
    // progress thread (the glowing dots).
    totalSurprises: 12,
    enableBackgroundMusic: true,
    enableSoundEffects: true,
    // If true, animations are automatically simplified for anyone whose
    // device/browser has "reduce motion" turned on. Recommended: true.
    respectReducedMotion: true,
    // How many candles the birthday cake has.
    candleCount: 5
  }

};
