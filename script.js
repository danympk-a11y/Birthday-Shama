/* ============================================================================
   script.js
   ----------------------------------------------------------------------------
   Main application entry point. Reads birthdayConfig (config.js) and wires
   together the shared engines (SoundManager, ParticleEngine, SectionManager)
   loaded before this file.

   PHASE 2 STATUS:
   Real chapters so far: Intro -> Countdown -> (chapter break). Every
   future phase adds its own init function below and a matching
   <section data-story-section="..."> in index.html \u2014 StoryFlow and
   SectionManager don't need to change for that to work.

   Dev/preview shortcuts (safe to leave in \u2014 recipients will never type
   these, only you will while personalizing the site):
     ?jumpTo=countdown          start the page on a given chapter
     ?preview=countdownComplete forces the countdown to already be finished,
                                 so you can see the celebration without
                                 waiting for the real date
   ============================================================================ */

(function () {
  "use strict";

  /* ------------------------------------------------------------------
     0. Config guard \u2014 fail loudly in the console, not on screen,
        if someone deletes/breaks config.js.
  ------------------------------------------------------------------ */
  if (typeof birthdayConfig === "undefined") {
    console.error("[app] config.js did not load \u2014 check that it exists and is linked before script.js.");
    return;
  }

  /* ------------------------------------------------------------------
     1. Small helpers reused across every phase
  ------------------------------------------------------------------ */

  // Replaces {name} tokens in any config string with the configured name.
  function renderTemplate(str) {
    if (typeof str !== "string") return "";
    return str.replace(/\{name\}/g, birthdayConfig.name || "");
  }

  // Applies birthdayConfig.theme.colors onto the CSS custom properties
  // defined in style.css, so config.js stays the single source of truth.
  function applyTheme(theme) {
    if (!theme || !theme.colors) return false;
    const map = {
      bgVoid: "--bg-void",
      bgPlum: "--bg-plum",
      bgPlumLight: "--bg-plum-light",
      accentRose: "--accent-rose",
      accentVioletColor: "--accent-violet",
      accentGold: "--accent-gold",
      textPrimary: "--text-primary",
      textMuted: "--text-muted"
    };
    const root = document.documentElement.style;
    let applied = 0;
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (map[key] && value) {
        root.setProperty(map[key], value);
        applied++;
      }
    });
    return applied > 0;
  }

  // Real, reliable viewport height on mobile browsers that don't fully
  // support 100dvh yet. Sets --vh so any future CSS can fall back to
  // calc(var(--vh, 1vh) * 100) if needed.
  function fixMobileViewportHeight() {
    const setVh = () => {
      document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    };
    setVh();
    window.addEventListener("resize", setVh);
    window.addEventListener("orientationchange", setVh);
  }

  // Any <img data-fallback> that fails to load gets a graceful placeholder
  // class instead of a broken-image icon. Our shipped placeholder JPGs
  // mean this shouldn't normally fire, but it protects against a user
  // renaming/removing a file incorrectly later.
  function attachImageFallback(scopeEl = document) {
    scopeEl.querySelectorAll("img[data-fallback]").forEach((img) => {
      img.addEventListener("error", function onError() {
        img.removeEventListener("error", onError);
        img.classList.add("img-fallback");
        img.alt = img.alt || "Photo coming soon";
      });
    });
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // Splits a millisecond duration into whole days/hours/minutes/seconds,
  // clamped at zero so an already-past date never shows negative numbers.
  function formatCountdown(diffMs) {
    const clamped = Math.max(0, diffMs);
    const totalSeconds = Math.floor(clamped / 1000);
    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60
    };
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  /* ------------------------------------------------------------------
     2. Boot sequence
  ------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", () => {
    fixMobileViewportHeight();
    applyTheme(birthdayConfig.theme);
    attachImageFallback();

    const params = new URLSearchParams(window.location.search);

    // --- Sound ---
    SoundManager.init(birthdayConfig.music || {}, birthdayConfig.settings || {});

    // Every element with class="btn" plays a short sound on click, using
    // whichever effect is named in its data-sfx attribute (or "click" if
    // it doesn't have one), and pops a small emoji at the tap point for a
    // touch of extra delight — new buttons in later phases get both for
    // free just by using class="btn".
    const TAP_EMOJIS = ["\u2728", "\u2764\ufe0f", "\ud83c\udf89", "\ud83d\udcab", "\ud83c\udf1f", "\ud83d\ude0a"];
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn");
      if (!btn || btn.disabled) return;
      SoundManager.playSFX(btn.dataset.sfx || "click");
      const rect = btn.getBoundingClientRect();
      ParticleEngine.emojiPop({
        x: rect.left + rect.width / 2 + (Math.random() * 24 - 12),
        y: rect.top + (Math.random() * 10 - 5),
        emoji: TAP_EMOJIS[Math.floor(Math.random() * TAP_EMOJIS.length)]
      });
    });

    // --- Particles ---
    const canvas = document.getElementById("particle-canvas");
    ParticleEngine.init(canvas);

    // --- Section / progress manager (the Memory Thread) ---
    SectionManager.init({
      total: (birthdayConfig.settings && birthdayConfig.settings.totalSurprises) || 12,
      threadEl: document.getElementById("memory-thread"),
      labelEl: document.getElementById("thread-progress-label")
    });

    // --- Music toggle button (fixed, bottom-right) ---
    const musicToggle = document.getElementById("music-toggle");
    if (musicToggle) {
      const updateMusicButton = () => {
        const muted = SoundManager.isMuted();
        musicToggle.textContent = muted ? "\uD83D\uDD07" : "\uD83C\uDFB5";
        musicToggle.setAttribute("aria-pressed", String(!muted));
        musicToggle.setAttribute("aria-label", muted ? "Unmute background music" : "Mute background music");
      };
      musicToggle.addEventListener("click", () => {
        SoundManager.unlock();
        SoundManager.toggleMute();
        updateMusicButton();
      });
      document.addEventListener("sound:unavailable", (e) => {
        if (e.detail?.key === "background") {
          musicToggle.disabled = true;
          musicToggle.title = "Add audio/birthday-song.mp3 to enable music";
        }
      });
      updateMusicButton();
    }

    // Unlock audio on the very first tap/click anywhere, per mobile
    // autoplay rules \u2014 required regardless of which control is used.
    const firstGesture = () => {
      SoundManager.unlock();
      window.removeEventListener("pointerdown", firstGesture);
    };
    window.addEventListener("pointerdown", firstGesture, { once: true });

    // --- Story flow: one chapter visible at a time ---
    const sectionContainer = document.getElementById("section-container");
    StoryFlow.init(sectionContainer, { startAt: params.get("jumpTo") });

    // Register every chapter's listeners BEFORE announcing the starting
    // chapter below \u2014 otherwise a ?jumpTo= landing straight on, say,
    // "countdown" would fire "birthday:section-change" before
    // initCountdown() had a listener attached to hear it, and the timer
    // would never start.
    initIntro({ renderTemplate });
    initCountdown({ params });
    const lightbox = initLightbox();
    initPhotoReveal();
    initGallery({ lightbox });
    initPuzzle();
    initScratchCard();
    initChooseOne();
    initTimeline();
    initLetter();
    initCake();
    initFireworks();
    initSecret();
    initFinal();

    // StoryFlow.init() sets the starting chapter directly (no animated
    // hand-off, since there's nothing to transition from). Chapters that
    // need to *do* something on arrival (start a timer, fill in text)
    // listen for "birthday:section-change" \u2014 fire it once for whichever
    // chapter we actually started on, including via ?jumpTo=...
    const startSection = StoryFlow.current();
    if (startSection) {
      document.dispatchEvent(
        new CustomEvent("birthday:section-change", { detail: { id: startSection.dataset.storySection } })
      );
    }
  });

  /* ====================================================================
     CHAPTER 1 \u2014 Intro
  ==================================================================== */
  function initIntro({ renderTemplate }) {
    const eyebrowEl = document.getElementById("intro-eyebrow");
    const nameEl = document.getElementById("intro-name");
    const lineEl = document.getElementById("intro-line");
    const openBtn = document.getElementById("open-surprise-btn");

    if (eyebrowEl) eyebrowEl.textContent = birthdayConfig.messages?.introEyebrow || "";
    if (nameEl) nameEl.textContent = birthdayConfig.name || "friend";
    if (lineEl) lineEl.textContent = renderTemplate(birthdayConfig.messages?.introLine || "");

    openBtn?.addEventListener("click", () => {
      SoundManager.unlock(); // starts background music, per the brief
      const rect = openBtn.getBoundingClientRect();
      ParticleEngine.confettiBurst({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, count: 70 });
      ParticleEngine.floatingHearts({ count: 8 });
      StoryFlow.goTo("countdown");
    });
  }

  /* ====================================================================
     CHAPTER 2 \u2014 Countdown
  ==================================================================== */
  function initCountdown({ params }) {
    const card = document.getElementById("countdown-card");
    const eyebrow = document.getElementById("countdown-eyebrow");
    const grid = document.getElementById("countdown-grid");
    const summary = document.getElementById("countdown-summary");
    const completeBlock = document.getElementById("countdown-complete");
    const continueBtn = document.getElementById("countdown-continue-btn");
    const dayEl = document.getElementById("cd-days");
    const hourEl = document.getElementById("cd-hours");
    const minEl = document.getElementById("cd-minutes");
    const secEl = document.getElementById("cd-seconds");

    if (eyebrow) eyebrow.textContent = birthdayConfig.messages?.countdownLabel || eyebrow.textContent;

    initDailyCalendar();

    const parsedTarget = new Date(birthdayConfig.birthdayDate).getTime();
    const targetTime = Number.isNaN(parsedTarget) ? Date.now() : parsedTarget;
    if (Number.isNaN(parsedTarget)) {
      console.warn("[app] birthdayConfig.birthdayDate isn't a valid date \u2014 treating the countdown as already complete.");
    }

    // ?preview=countdownComplete lets you see the celebration instantly
    // instead of waiting for the real date while you're setting things up.
    const forceComplete = params.get("preview") === "countdownComplete";

    let intervalId = null;
    let completed = false;

    function render() {
      const diff = forceComplete ? -1 : targetTime - Date.now();
      if (diff <= 0) {
        finish();
        return;
      }
      const { days, hours, minutes, seconds } = formatCountdown(diff);
      if (dayEl) dayEl.textContent = String(days);
      if (hourEl) hourEl.textContent = pad2(hours);
      if (minEl) minEl.textContent = pad2(minutes);
      if (secEl) secEl.textContent = pad2(seconds);
    }

    function finish() {
      if (completed) return;
      completed = true;
      if (intervalId) clearInterval(intervalId);
      card?.classList.add("is-complete");
      completeBlock?.classList.remove("hidden");
      if (summary) summary.textContent = "It's here \u2014 you can continue whenever you're ready.";

      ParticleEngine.confettiBurst({ count: 90 });
      ParticleEngine.floatingHearts({ count: 10 });
      window.setTimeout(() => {
        const rect = (continueBtn || card).getBoundingClientRect();
        ParticleEngine.sparkle({ x: rect.left + rect.width / 2, y: rect.top, count: 20 });
      }, 300);

      SectionManager.advance();
    }

    function start() {
      if (intervalId) clearInterval(intervalId);
      completed = false;
      card?.classList.remove("is-complete");
      completeBlock?.classList.add("hidden");
      if (grid) grid.setAttribute("aria-hidden", "true");
      if (summary) {
        summary.textContent = birthdayConfig.name
          ? `Counting down to ${birthdayConfig.name}'s birthday.`
          : "Counting down to the big day.";
      }
      render();
      intervalId = window.setInterval(render, 1000);
    }

    document.addEventListener("birthday:section-change", (e) => {
      if (e.detail?.id === "countdown") start();
    });

    continueBtn?.addEventListener("click", () => StoryFlow.goTo("photo-reveal"));
  }

  /* ====================================================================
     Daily countdown calendar (lives inside the Countdown chapter)
     Delegates all the real logic to js/dailyReveal.js; this just wires
     up the DOM elements and shows/hides the whole section depending on
     whether there's anything valid to schedule.
  ==================================================================== */
  function initDailyCalendar() {
    const teaser = document.getElementById("daily-calendar-teaser");
    const eyebrowEl = document.getElementById("daily-calendar-eyebrow");
    const headingEl = document.getElementById("daily-calendar-heading");
    const openBtn = document.getElementById("daily-calendar-open-btn");
    const overlayEyebrow = document.getElementById("daily-memories-eyebrow");
    const overlayHeading = document.getElementById("daily-memories-heading");
    if (!teaser) return;

    const result = DailyReveal.init({
      config: birthdayConfig,
      elements: {
        grid: document.getElementById("daily-calendar-grid"),
        hint: document.getElementById("daily-calendar-hint"),
        modal: document.getElementById("daily-modal"),
        stage: document.getElementById("daily-modal-stage"),
        caption: document.getElementById("daily-modal-caption"),
        dayLabel: document.getElementById("daily-modal-day-label"),
        closeBtn: document.getElementById("daily-modal-close"),
        overlay: document.getElementById("daily-memories-overlay"),
        overlayClose: document.getElementById("daily-memories-close"),
        toggle: document.getElementById("daily-memories-toggle"),
        toggleBadge: document.getElementById("daily-toggle-badge"),
        openBtn
      }
    });

    teaser.hidden = !result.applicable;
    if (result.applicable) {
      if (eyebrowEl) eyebrowEl.textContent = birthdayConfig.messages?.dailyCalendarEyebrow || "";
      if (headingEl) headingEl.textContent = birthdayConfig.messages?.dailyCalendarHeading || "";
      if (openBtn) openBtn.textContent = birthdayConfig.messages?.dailyCalendarOpenLabel || "Open Daily Memories";
      if (overlayEyebrow) overlayEyebrow.textContent = birthdayConfig.messages?.dailyCalendarEyebrow || "";
      if (overlayHeading) overlayHeading.textContent = birthdayConfig.messages?.dailyCalendarHeading || "";
    }
  }

  /* ====================================================================
     CHAPTER 3 \u2014 Photo Reveal
     A single, cinematic photo (photos[0]) hidden behind blur until the
     user taps it. Advances progress the moment it's revealed \u2014 that
     tap *is* the surprise, unlike Continue which is just navigation.
  ==================================================================== */
  function initPhotoReveal() {
    const eyebrowEl = document.getElementById("photo-reveal-eyebrow");
    const questionEl = document.getElementById("reveal-question");
    const frame = document.getElementById("reveal-frame");
    const photoEl = document.getElementById("reveal-photo");
    const hintEl = document.getElementById("reveal-hint");
    const continueBtn = document.getElementById("reveal-continue-btn");

    const heroPhoto = birthdayConfig.photos?.[0];

    if (eyebrowEl) eyebrowEl.textContent = birthdayConfig.messages?.photoRevealEyebrow || "";
    if (questionEl) questionEl.textContent = birthdayConfig.messages?.photoRevealPrompt || "";
    if (hintEl) hintEl.textContent = birthdayConfig.messages?.photoRevealHint || "Tap to reveal";

    if (photoEl && heroPhoto) {
      photoEl.src = heroPhoto.src;
      photoEl.alt = heroPhoto.caption || "A photo memory";
    } else if (frame) {
      // No photos configured at all \u2014 don't leave a dead, unlabeled tap
      // target; explain what's missing instead of failing silently.
      frame.disabled = true;
      if (hintEl) hintEl.textContent = "Add a photo in config.js to see this moment";
    }

    let revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      frame.classList.add("is-revealed");
      const rect = frame.getBoundingClientRect();
      ParticleEngine.sparkle({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, count: 22 });
      ParticleEngine.floatingHearts({ count: 6 });
      SectionManager.advance();

      window.setTimeout(() => {
        continueBtn?.classList.remove("hidden");
        continueBtn?.classList.add("anim-slide-up");
      }, 1100);
    }

    frame?.addEventListener("click", reveal);
    continueBtn?.addEventListener("click", () => StoryFlow.goTo("gallery"));
  }

  /* ====================================================================
     CHAPTER 4 \u2014 Memory Gallery
     Polaroid cards are built entirely from birthdayConfig.photos, so the
     grid always matches however many photos are listed there.
  ==================================================================== */
  function initGallery({ lightbox }) {
    const eyebrowEl = document.getElementById("gallery-eyebrow");
    const headingEl = document.getElementById("gallery-heading");
    const grid = document.getElementById("polaroid-grid");
    const continueBtn = document.getElementById("gallery-continue-btn");
    const photos = birthdayConfig.photos || [];

    // A small, fixed set of tilt angles so cards look hand-placed rather
    // than perfectly aligned, while staying identical across reloads.
    const ROTATIONS = [-4, 3, -2.5, 5, -5, 2, -3.5, 4.5];

    if (eyebrowEl) eyebrowEl.textContent = birthdayConfig.messages?.galleryEyebrow || "";
    if (headingEl) headingEl.textContent = birthdayConfig.messages?.galleryHeading || "";

    if (grid && photos.length) {
      photos.forEach((photo, i) => {
        const card = document.createElement("figure");
        card.className = "polaroid";
        card.style.setProperty("--rot", `${ROTATIONS[i % ROTATIONS.length]}deg`);

        const photoBtn = document.createElement("button");
        photoBtn.type = "button";
        photoBtn.className = "polaroid-photo-btn";
        photoBtn.setAttribute("aria-label", `View larger photo: ${photo.caption || "memory"}`);

        const img = document.createElement("img");
        img.src = photo.src;
        img.alt = photo.caption || "A photo memory";
        img.loading = "lazy";
        img.setAttribute("data-fallback", "");
        photoBtn.appendChild(img);

        const row = document.createElement("div");
        row.className = "polaroid-caption-row";

        const caption = document.createElement("span");
        caption.className = "polaroid-caption";
        caption.textContent = photo.caption || "";

        const heartBtn = document.createElement("button");
        heartBtn.type = "button";
        heartBtn.className = "heart-btn";
        heartBtn.setAttribute("aria-pressed", "false");
        heartBtn.setAttribute("aria-label", "React with a heart");
        heartBtn.textContent = "\u2764\uFE0F";

        row.appendChild(caption);
        row.appendChild(heartBtn);
        card.appendChild(photoBtn);
        card.appendChild(row);
        grid.appendChild(card);

        photoBtn.addEventListener("click", () => lightbox.open(photo));

        heartBtn.addEventListener("click", () => {
          const loved = heartBtn.classList.toggle("is-loved");
          heartBtn.setAttribute("aria-pressed", String(loved));
          if (loved) {
            const rect = heartBtn.getBoundingClientRect();
            ParticleEngine.sparkle({ x: rect.left + rect.width / 2, y: rect.top, count: 10 });
            SoundManager.playSFX("click");
          }
        });
      });
    }

    attachImageFallback(grid || document);

    continueBtn?.addEventListener("click", () => {
      SectionManager.advance();
      StoryFlow.goTo("puzzle");
    });
  }

  /* ====================================================================
     Shared lightbox \u2014 used by the gallery today; any later chapter can
     reuse it the same way (lightbox.open({ src, caption })).
  ==================================================================== */
  function initLightbox() {
    const el = document.getElementById("lightbox");
    const img = document.getElementById("lightbox-img");
    const caption = document.getElementById("lightbox-caption");
    const closeBtn = document.getElementById("lightbox-close");
    let lastFocused = null;

    function open(photo) {
      if (!el || !photo) return;
      lastFocused = document.activeElement;
      img.src = photo.src;
      img.alt = photo.caption || "A photo memory";
      caption.textContent = photo.caption || "";
      el.classList.remove("hidden");
      document.body.classList.add("no-scroll");
      // reflow before adding is-open so the fade/scale transition runs
      void el.offsetWidth;
      el.classList.add("is-open");
      closeBtn?.focus();
    }

    function close() {
      if (!el) return;
      el.classList.remove("is-open");
      document.body.classList.remove("no-scroll");
      window.setTimeout(() => el.classList.add("hidden"), 480);
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    closeBtn?.addEventListener("click", close);
    el?.addEventListener("click", (e) => {
      if (e.target === el) close(); // click on the dark backdrop
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && el && !el.classList.contains("hidden")) close();
    });

    return { open, close };
  }

  /* ====================================================================
     CHAPTER 5 \u2014 Photo Puzzle
     A 3\u00d73 "swap" puzzle: tap two pieces, or drag one onto another, to
     swap them. Unlike a sliding puzzle, any pair of pieces can swap at
     any time, so every shuffle is solvable \u2014 no need to check parity.
  ==================================================================== */
  function initPuzzle() {
    const eyebrowEl = document.getElementById("puzzle-eyebrow");
    const questionEl = document.getElementById("puzzle-question");
    const grid = document.getElementById("puzzle-grid");
    const solvedText = document.getElementById("puzzle-solved-text");
    const continueBtn = document.getElementById("puzzle-continue-btn");
    if (!grid) return;

    const GRID_SIZE = 3;
    const TOTAL = GRID_SIZE * GRID_SIZE;
    const puzzleImage = birthdayConfig.puzzleImage;

    if (eyebrowEl) eyebrowEl.textContent = birthdayConfig.messages?.puzzleEyebrow || "";
    if (questionEl) questionEl.textContent = birthdayConfig.messages?.puzzlePrompt || "";

    let slots = [];           // DOM refs, index = slot position
    let slotOrder = [];       // slotOrder[slotIndex] = which original piece sits there
    let selected = null;      // tap-to-select state
    let solved = false;
    let built = false;
    let justDragged = false;  // guards against a drag also being read as a tap

    function pieceBackgroundPosition(pieceIndex) {
      const col = pieceIndex % GRID_SIZE;
      const row = Math.floor(pieceIndex / GRID_SIZE);
      const step = 100 / (GRID_SIZE - 1); // 50% steps for a 3x3 grid
      return `${col * step}% ${row * step}%`;
    }

    function render(slotIndex) {
      const slot = slots[slotIndex];
      if (!slot) return;
      const pieceIndex = slotOrder[slotIndex];
      slot.style.backgroundPosition = pieceBackgroundPosition(pieceIndex);
      slot.dataset.pieceIndex = String(pieceIndex);
      const isSelected = selected === slotIndex;
      slot.classList.toggle("is-selected", isSelected);
      slot.setAttribute("aria-pressed", String(isSelected));
    }

    function renderAll() {
      for (let i = 0; i < TOTAL; i++) render(i);
    }

    function isSolved() {
      return slotOrder.every((pieceIndex, slotIndex) => pieceIndex === slotIndex);
    }

    function shuffle() {
      const order = Array.from({ length: TOTAL }, (_, i) => i);
      do {
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
      } while (order.every((v, i) => v === i)); // never start already solved
      slotOrder = order;
      solved = false;
      selected = null;
      grid.classList.remove("is-solved");
      solvedText?.classList.add("hidden");
      continueBtn?.classList.add("hidden");
      renderAll();
    }

    function swap(a, b) {
      if (a === b || solved) return;
      [slotOrder[a], slotOrder[b]] = [slotOrder[b], slotOrder[a]];
      render(a);
      render(b);
      [slots[a], slots[b]].forEach((el) => {
        el.classList.remove("just-swapped");
        void el.offsetWidth; // restart the animation even if it just played
        el.classList.add("just-swapped");
      });
      SoundManager.playSFX("click");
      if (isSolved()) onSolved();
    }

    function onSolved() {
      solved = true;
      selected = null;
      renderAll();
      grid.classList.add("is-solved");

      const rect = grid.getBoundingClientRect();
      ParticleEngine.confettiBurst({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, count: 100 });
      ParticleEngine.floatingHearts({ count: 8 });
      // a few staggered sparkle bursts across the now-complete photo, standing
      // in for "fireworks" until the dedicated fireworks show in Phase 6
      [0.25, 0.5, 0.75].forEach((t, i) => {
        window.setTimeout(() => {
          ParticleEngine.sparkle({
            x: rect.left + rect.width * t,
            y: rect.top + rect.height * (i % 2 ? 0.7 : 0.3),
            count: 16
          });
        }, 220 * (i + 1));
      });
      SoundManager.playSFX("puzzleSolved");

      if (solvedText) {
        solvedText.textContent = birthdayConfig.messages?.puzzleSolvedMessage || "";
        solvedText.classList.remove("hidden");
        solvedText.classList.add("anim-slide-up");
      }
      window.setTimeout(() => continueBtn?.classList.remove("hidden"), 500);

      SectionManager.advance();
    }

    function wireSlotInteraction(slot, index) {
      const DRAG_THRESHOLD = 6; // px of movement before a tap counts as a drag
      let drag = null;

      slot.addEventListener("pointerdown", (e) => {
        if (solved) return;
        drag = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
        try { slot.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      });

      slot.addEventListener("pointermove", (e) => {
        if (!drag || e.pointerId !== drag.pointerId || solved) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (!drag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          drag.moved = true;
          slot.classList.add("is-dragging");
        }
        if (drag.moved) slot.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
      });

      function endDrag(e, cancelled) {
        if (!drag || e.pointerId !== drag.pointerId) return;
        try { slot.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        slot.classList.remove("is-dragging");
        slot.style.transform = "";

        if (drag.moved && !cancelled && !solved) {
          const target =
            typeof document.elementFromPoint === "function"
              ? document.elementFromPoint(e.clientX, e.clientY)
              : null;
          const targetSlot = target?.closest(".puzzle-slot");
          const targetIndex = targetSlot ? slots.indexOf(targetSlot) : -1;
          if (targetIndex > -1 && targetIndex !== index) {
            justDragged = true; // the click event that follows should be ignored
            selected = null;
            swap(index, targetIndex);
          }
        }
        drag = null;
      }

      slot.addEventListener("pointerup", (e) => endDrag(e, false));
      slot.addEventListener("pointercancel", (e) => endDrag(e, true));

      // Handles a plain tap/click AND keyboard activation (Enter/Space on a
      // focused button) \u2014 both fire "click" natively, so this one listener
      // covers tap-to-select for mouse, touch, and keyboard alike.
      slot.addEventListener("click", () => {
        if (justDragged) { justDragged = false; return; }
        if (solved) return;
        if (selected === null) {
          selected = index;
          renderAll();
        } else if (selected === index) {
          selected = null;
          renderAll();
        } else {
          const from = selected;
          selected = null;
          swap(from, index);
        }
      });
    }

    function build() {
      if (built) return;
      built = true;
      for (let i = 0; i < TOTAL; i++) {
        const slot = document.createElement("button");
        slot.type = "button";
        slot.className = "puzzle-slot";
        slot.style.backgroundImage = `url("${puzzleImage}")`;
        slot.setAttribute("aria-label", `Puzzle piece ${i + 1} of ${TOTAL}`);
        grid.appendChild(slot);
        slots.push(slot);
        wireSlotInteraction(slot, i);
      }
      shuffle();
    }

    document.addEventListener("birthday:section-change", (e) => {
      if (e.detail?.id === "puzzle") build();
    });

    continueBtn?.addEventListener("click", () => StoryFlow.goTo("scratch"));
  }

  /* ====================================================================
     CHAPTER 6 \u2014 Scratch Card
     A canvas "foil" layer over birthdayConfig.scratchImage. Scratching
     erases the foil via destination-out compositing; once roughly half
     is cleared, the rest fades away automatically.
  ==================================================================== */
  function initScratchCard() {
    const eyebrowEl = document.getElementById("scratch-eyebrow");
    const frame = document.getElementById("scratch-frame");
    const photoEl = document.getElementById("scratch-photo");
    const canvas = document.getElementById("scratch-canvas");
    const hintEl = document.getElementById("scratch-hint");
    const messageEl = document.getElementById("scratch-message");
    const continueBtn = document.getElementById("scratch-continue-btn");
    const skipBtn = document.getElementById("scratch-skip-btn");
    if (!frame || !canvas) return;

    const COMPLETE_THRESHOLD = 0.55; // matches the brief's "50-60% scratched"
    const BRUSH_RADIUS = 26;

    if (eyebrowEl) eyebrowEl.textContent = birthdayConfig.messages?.scratchEyebrow || "";
    if (photoEl && birthdayConfig.scratchImage) {
      photoEl.src = birthdayConfig.scratchImage;
      photoEl.alt = "Your surprise";
    }
    if (hintEl) hintEl.textContent = birthdayConfig.messages?.scratchPrompt || "";

    let ctx = null;
    let built = false;
    let revealed = false;
    let drawing = false;
    let lastPoint = null;
    let lastCheck = 0;

    function drawFoil(w, h) {
      ctx.clearRect(0, 0, w, h);
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, "#ff4f87");
      gradient.addColorStop(0.5, "#8b5cf6");
      gradient.addColorStop(1, "#f3c77e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // faint diagonal hatch for a metallic "scratch-off" texture
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 2;
      for (let x = -h; x < w; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + h, h);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function setupCanvas() {
      const rect = frame.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";

      ctx = canvas.getContext && canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        // No 2D canvas support at all: don't leave the surprise stuck
        // behind an unscratchable layer \u2014 just reveal it.
        completeReveal(true);
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFoil(rect.width, rect.height);
    }

    function pointFromEvent(e) {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function scratchAt(p) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(p.x, p.y, BRUSH_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    function scratchLine(a, b) {
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.ceil(dist / (BRUSH_RADIUS / 2)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        scratchAt({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }

    // Samples ~1 in every 6 pixels' alpha channel rather than every pixel,
    // and is only called a few times a second (see onMove) \u2014 fast enough
    // to run during active scratching on a mid-range phone.
    function computeScratchedPercent() {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let total = 0;
      let cleared = 0;
      for (let i = 3; i < data.length; i += 24) {
        total++;
        if (data[i] < 20) cleared++;
      }
      return total ? cleared / total : 0;
    }

    function completeReveal(skipped) {
      if (revealed) return;
      revealed = true;
      canvas.classList.add("is-cleared");
      window.setTimeout(() => { canvas.style.display = "none"; }, 650);
      hintEl?.classList.add("is-hidden");

      const rect = frame.getBoundingClientRect();
      [0.3, 0.5, 0.7].forEach((t, i) => {
        window.setTimeout(() => {
          ParticleEngine.sparkle({
            x: rect.left + rect.width * t,
            y: rect.top + rect.height * (0.3 + i * 0.2),
            count: 14
          });
        }, i * 180);
      });
      ParticleEngine.floatingHearts({ count: 6 });
      SoundManager.playSFX("scratchReveal");

      if (messageEl) {
        messageEl.textContent = renderTemplate(birthdayConfig.messages?.scratchMessage || "");
        messageEl.classList.remove("hidden");
        messageEl.classList.add("anim-slide-up");
      }
      window.setTimeout(() => continueBtn?.classList.remove("hidden"), skipped ? 0 : 500);

      SectionManager.advance();
    }

    function onDown(e) {
      if (revealed || !ctx) return;
      drawing = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      hintEl?.classList.add("is-hidden");
      const p = pointFromEvent(e);
      scratchAt(p);
      lastPoint = p;
    }

    function onMove(e) {
      if (!drawing || revealed || !ctx) return;
      const p = pointFromEvent(e);
      scratchLine(lastPoint || p, p);
      lastPoint = p;
      const now = performance.now();
      if (now - lastCheck > 200) {
        lastCheck = now;
        if (computeScratchedPercent() >= COMPLETE_THRESHOLD) completeReveal(false);
      }
    }

    function onUp(e) {
      drawing = false;
      lastPoint = null;
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    // Accessibility / inclusivity fallback: scratching is an inherently
    // gestural interaction that doesn't have a natural keyboard equivalent,
    // so this gives keyboard users, screen-reader users, or anyone who just
    // doesn't want to scratch a direct way to see the surprise anyway.
    skipBtn?.addEventListener("click", () => completeReveal(true));

    continueBtn?.addEventListener("click", () => StoryFlow.goTo("choose-one"));

    document.addEventListener("birthday:section-change", (e) => {
      if (e.detail?.id === "scratch" && !built) {
        built = true;
        setupCanvas();
      }
    });
  }

  /* ====================================================================
     CHAPTER 7 — "How much do you mean to me?"
     The first two buttons dodge to a random spot inside the playground
     when tapped (twice each, then they fade out); only the third button
     ever "works". Positions are computed lazily on click, using live
     getBoundingClientRect() calls, so no setup-on-arrival is needed.
  ==================================================================== */
  function initChooseOne() {
    const eyebrowEl = document.getElementById("choose-eyebrow");
    const questionEl = document.getElementById("choose-question");
    const playground = document.getElementById("choose-playground");
    const btnA = document.getElementById("choose-btn-a");
    const btnB = document.getElementById("choose-btn-b");
    const btnCorrect = document.getElementById("choose-btn-correct");
    const answerText = document.getElementById("choose-answer-text");
    const continueBtn = document.getElementById("choose-continue-btn");
    if (!playground) return;

    const MAX_DODGES = 2;
    const dodgeCounts = new WeakMap();
    let resolved = false;

    if (eyebrowEl) eyebrowEl.textContent = birthdayConfig.messages?.chooseOneEyebrow || "";
    if (questionEl) questionEl.textContent = birthdayConfig.messages?.chooseOneQuestion || "";
    if (btnA) btnA.textContent = birthdayConfig.messages?.chooseOneOptionA || "A little";
    if (btnB) btnB.textContent = birthdayConfig.messages?.chooseOneOptionB || "A lot";
    if (btnCorrect) btnCorrect.textContent = birthdayConfig.messages?.chooseOneOptionCorrect || "More than you know";

    function dodge(btn) {
      const rect = playground.getBoundingClientRect();
      if (!rect.width || !rect.height) return; // not laid out yet — nothing to dodge within
      const bw = btn.offsetWidth || 100;
      const bh = btn.offsetHeight || 44;

      if (!btn.classList.contains("is-floating")) {
        const btnRect = btn.getBoundingClientRect();
        btn.style.left = `${btnRect.left - rect.left}px`;
        btn.style.top = `${btnRect.top - rect.top}px`;
        btn.classList.add("is-floating");
        void btn.offsetWidth; // reflow so the jump below actually transitions
      }

      const maxX = Math.max(0, rect.width - bw);
      const maxY = Math.max(0, rect.height - bh);
      btn.style.left = `${Math.random() * maxX}px`;
      btn.style.top = `${Math.random() * maxY}px`;
    }

    function wireDodger(btn) {
      if (!btn) return;
      dodgeCounts.set(btn, 0);
      btn.addEventListener("click", () => {
        if (resolved) return;
        const count = (dodgeCounts.get(btn) || 0) + 1;
        dodgeCounts.set(btn, count);
        dodge(btn);
        if (count >= MAX_DODGES) {
          btn.classList.add("is-spent");
          btn.disabled = true;
        }
      });
    }

    wireDodger(btnA);
    wireDodger(btnB);

    btnCorrect?.addEventListener("click", () => {
      if (resolved) return;
      resolved = true;
      [btnA, btnB].forEach((b) => { if (b) { b.disabled = true; b.classList.add("is-spent"); } });

      const rect = btnCorrect.getBoundingClientRect();
      ParticleEngine.confettiBurst({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      ParticleEngine.floatingHearts({ count: 8 });

      if (answerText) {
        answerText.textContent = birthdayConfig.messages?.chooseOneAnswer || "";
        answerText.classList.remove("hidden");
        answerText.classList.add("anim-slide-up");
      }
      window.setTimeout(() => continueBtn?.classList.remove("hidden"), 500);

      SectionManager.advance();
    });

    continueBtn?.addEventListener("click", () => StoryFlow.goTo("timeline"));
  }

  /* ====================================================================
     CHAPTER 8 — Memory Timeline
     Built once at boot; SectionManager.initScrollReveal (backed by
     IntersectionObserver) reveals each item as the user scrolls down
     into this chapter, with a small sparkle burst per item.
  ==================================================================== */
  function initTimeline() {
    const eyebrowEl = document.getElementById("timeline-eyebrow");
    const headingEl = document.getElementById("timeline-heading");
    const list = document.getElementById("timeline-list");
    const continueBtn = document.getElementById("timeline-continue-btn");
    if (!list) return;

    if (eyebrowEl) eyebrowEl.textContent = birthdayConfig.messages?.timelineEyebrow || "";
    if (headingEl) headingEl.textContent = birthdayConfig.messages?.timelineHeading || "";

    const steps = birthdayConfig.messages?.timelineSteps || [];
    steps.forEach((step) => {
      const li = document.createElement("li");
      li.className = "timeline-item";

      const phaseEl = document.createElement("span");
      phaseEl.className = "timeline-phase";
      phaseEl.textContent = renderTemplate(step.phase || "");

      const titleEl = document.createElement("span");
      titleEl.className = "timeline-title font-display";
      titleEl.textContent = renderTemplate(step.title || "");

      li.appendChild(phaseEl);
      li.appendChild(titleEl);
      list.appendChild(li);
    });

    SectionManager.initScrollReveal(".timeline-item", {
      onReveal: (el) => {
        const rect = el.getBoundingClientRect();
        ParticleEngine.sparkle({ x: rect.left + 8, y: rect.top + 8, count: 10 });
      }
    });

    continueBtn?.addEventListener("click", () => {
      SectionManager.advance();
      StoryFlow.goTo("letter");
    });
  }

  /* ====================================================================
     CHAPTER 9 — Birthday Letter
     letterIntro fades in first; the letter then "types out" gradually.
     The full text is always available to screen readers immediately via
     the visually-hidden companion paragraph, rather than being typed at
     them character by character.
  ==================================================================== */
  function initLetter() {
    const introEl = document.getElementById("letter-intro");
    const bodyEl = document.getElementById("letter-body");
    const fullEl = document.getElementById("letter-body-full");
    const continueBtn = document.getElementById("letter-continue-btn");
    if (!bodyEl) return;

    const letterText = renderTemplate(birthdayConfig.messages?.letter || "");
    if (introEl) introEl.textContent = birthdayConfig.messages?.letterIntro || "";
    if (fullEl) fullEl.textContent = letterText;

    let started = false;

    function typeText(text, el, onDone) {
      if (prefersReducedMotion()) {
        el.textContent = text;
        onDone();
        return;
      }
      let i = 0;
      el.textContent = "";
      function step() {
        i++;
        el.textContent = text.slice(0, i);
        if (i < text.length) {
          const ch = text[i - 1];
          const delay = /[.,!?]/.test(ch) ? 220 : ch === "\n" ? 260 : 22 + Math.random() * 22;
          window.setTimeout(step, delay);
        } else {
          onDone();
        }
      }
      step();
    }

    function start() {
      if (started) return;
      started = true;
      window.setTimeout(() => {
        typeText(letterText, bodyEl, () => {
          continueBtn?.classList.remove("hidden");
          continueBtn?.classList.add("anim-fade-in");
          SectionManager.advance();
        });
      }, 1200); // lets letterIntro's own fade-in finish first
    }

    document.addEventListener("birthday:section-change", (e) => {
      if (e.detail?.id === "letter") start();
    });

    continueBtn?.addEventListener("click", () => StoryFlow.goTo("cake"));
  }

  /* ====================================================================
     CHAPTER 10 — Birthday Cake
     Candles are built once on arrival. Blowing out the last one triggers
     the dim/confetti/sparkle mini-celebration described in the brief.
  ==================================================================== */
  function initCake() {
    const promptEl = document.getElementById("cake-prompt");
    const candlesContainer = document.getElementById("cake-candles");
    const dimOverlay = document.getElementById("cake-dim-overlay");
    const successText = document.getElementById("cake-success-text");
    const continueBtn = document.getElementById("cake-continue-btn");
    if (!candlesContainer) return;

    if (promptEl) promptEl.textContent = birthdayConfig.messages?.cakePrompt || "";

    const CANDLE_COUNT = Math.max(1, Math.min(12, birthdayConfig.settings?.candleCount || 5));
    let built = false;
    let litCount = 0;

    function blowOut(candle) {
      if (candle.classList.contains("is-out")) return;
      candle.classList.add("is-out");
      candle.disabled = true;

      const smoke = document.createElement("span");
      smoke.className = "candle-smoke";
      smoke.setAttribute("aria-hidden", "true");
      candle.appendChild(smoke);
      smoke.addEventListener("animationend", () => smoke.remove());

      SoundManager.playSFX("click");
      litCount--;
      if (litCount <= 0) onAllBlownOut();
    }

    function onAllBlownOut() {
      dimOverlay?.classList.add("is-dimmed");
      const rect = candlesContainer.getBoundingClientRect();
      ParticleEngine.confettiBurst({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, count: 90 });
      ParticleEngine.floatingHearts({ count: 8 });
      [0.3, 0.5, 0.7].forEach((t, i) => {
        window.setTimeout(() => {
          ParticleEngine.sparkle({ x: rect.left + rect.width * t, y: Math.max(0, rect.top - 20), count: 16 });
        }, i * 200);
      });
      SoundManager.playSFX("cakeBlow");

      if (successText) {
        successText.textContent = birthdayConfig.messages?.cakeSuccessMessage || "";
        successText.classList.remove("hidden");
        successText.classList.add("anim-slide-up");
      }
      window.setTimeout(() => continueBtn?.classList.remove("hidden"), 600);

      SectionManager.advance();
    }

    function build() {
      if (built) return;
      built = true;
      for (let i = 0; i < CANDLE_COUNT; i++) {
        const candle = document.createElement("button");
        candle.type = "button";
        candle.className = "candle";
        candle.setAttribute("aria-label", `Candle ${i + 1} of ${CANDLE_COUNT} — tap to blow it out`);

        const stick = document.createElement("span");
        stick.className = "candle-stick";
        stick.setAttribute("aria-hidden", "true");

        const flame = document.createElement("span");
        flame.className = "candle-flame";
        flame.setAttribute("aria-hidden", "true");

        candle.appendChild(stick);
        candle.appendChild(flame);
        candle.addEventListener("click", () => blowOut(candle));
        candlesContainer.appendChild(candle);
      }
      litCount = CANDLE_COUNT;
    }

    document.addEventListener("birthday:section-change", (e) => {
      if (e.detail?.id === "cake") build();
    });

    continueBtn?.addEventListener("click", () => StoryFlow.goTo("fireworks"));
  }

  /* ====================================================================
     CHAPTER 11 — Fireworks Celebration
     Reuses the shared #particle-canvas via ParticleEngine.fireworksShow.
  ==================================================================== */
  function initFireworks() {
    const titleEl = document.getElementById("fireworks-title");
    const continueBtn = document.getElementById("fireworks-continue-btn");
    if (!titleEl) return;

    titleEl.textContent = renderTemplate(birthdayConfig.messages?.fireworksTitle || "");

    let stopShow = null;
    let started = false;

    function start() {
      if (started) return;
      started = true;
      SoundManager.playSFX("fireworks");
      stopShow = ParticleEngine.fireworksShow({ duration: 6500 });
      ParticleEngine.floatingHearts({ count: 6 });
      window.setTimeout(() => ParticleEngine.floatingHearts({ count: 6 }), 2000);
      window.setTimeout(() => continueBtn?.classList.remove("hidden"), 2200);
      SectionManager.advance();
    }

    document.addEventListener("birthday:section-change", (e) => {
      if (e.detail?.id === "fireworks") {
        start();
      } else if (stopShow) {
        stopShow(); // stop launching new rockets once the user moves on
        stopShow = null;
      }
    });

    continueBtn?.addEventListener("click", () => StoryFlow.goTo("secret"));
  }

  /* ====================================================================
     CHAPTER 12 — Secret Surprise
     A quiet, mysterious button that reveals one more note + photo in
     place, without navigating away.
  ==================================================================== */
  function initSecret() {
    const eyebrowEl = document.getElementById("secret-eyebrow");
    const secretBtn = document.getElementById("secret-button");
    const revealBlock = document.getElementById("secret-reveal");
    const noteEl = document.getElementById("secret-note");
    const photoEl = document.getElementById("secret-photo");
    const continueBtn = document.getElementById("secret-continue-btn");
    if (!secretBtn) return;

    if (eyebrowEl) eyebrowEl.textContent = birthdayConfig.messages?.secretEyebrow || "";
    secretBtn.textContent = birthdayConfig.messages?.secretButtonLabel || "One Last Thing...";

    secretBtn.addEventListener("click", () => {
      secretBtn.classList.add("hidden");
      if (noteEl) noteEl.textContent = birthdayConfig.messages?.personalNote || "";
      if (photoEl && birthdayConfig.secretPhoto) {
        photoEl.src = birthdayConfig.secretPhoto;
        photoEl.alt = "One more memory";
      }
      revealBlock?.classList.remove("hidden");
      revealBlock?.classList.add("anim-slide-up");

      const rect = secretBtn.getBoundingClientRect();
      ParticleEngine.confettiBurst({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, count: 50 });
      ParticleEngine.floatingHearts({ count: 6 });

      SectionManager.advance();
    });

    continueBtn?.addEventListener("click", () => StoryFlow.goTo("final"));
  }

  /* ====================================================================
     CHAPTER 13 — Final Surprise
     The cinematic closing screen. Replay fully reloads the page so every
     chapter's internal state (timers, canvases, shuffles, typed letter)
     resets cleanly, rather than hand-resetting each one individually.
  ==================================================================== */
  function initFinal() {
    const nameEl = document.getElementById("final-name");
    const sublineEl = document.getElementById("final-subline");
    const photoEl = document.getElementById("final-photo");
    const replayBtn = document.getElementById("replay-btn");
    if (!nameEl) return;

    nameEl.textContent = renderTemplate(birthdayConfig.messages?.finalMessage || "");
    if (sublineEl) sublineEl.textContent = birthdayConfig.messages?.finalSubline || "";
    if (replayBtn) replayBtn.textContent = birthdayConfig.messages?.replayLabel || "Replay The Surprise";

    const photos = birthdayConfig.photos || [];
    const finalPhoto = photos[photos.length - 1];
    if (photoEl && finalPhoto) {
      photoEl.src = finalPhoto.src;
      photoEl.alt = finalPhoto.caption || "A photo memory";
    }

    let started = false;
    function start() {
      if (started) return;
      started = true;
      SoundManager.playSFX("finalReveal");
      ParticleEngine.confettiBurst({ count: 80 });
      ParticleEngine.floatingHearts({ count: 10 });
      window.setInterval(() => ParticleEngine.floatingHearts({ count: 3 }), 2600);
      SectionManager.advance();
    }

    document.addEventListener("birthday:section-change", (e) => {
      if (e.detail?.id === "final") start();
    });

    replayBtn?.addEventListener("click", () => {
      window.location.href = window.location.pathname;
    });
  }
})();
