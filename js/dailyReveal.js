/* ============================================================================
   js/dailyReveal.js
   ----------------------------------------------------------------------------
   The "while you wait" daily calendar shown inside the Countdown chapter.
   One photo + memory unlocks per day, counting backward from
   birthdayConfig.birthdayDate, each revealed through one of five varied
   mini-interactions (blur / scratch / puzzle / flip / pop) so it stays
   interesting across two weeks of visits rather than feeling repetitive.

   Progress (which days have been opened) persists in localStorage, since
   this is a real standalone site the birthday person will revisit across
   many days/sessions — unlike a preview inside a chat, that's exactly
   what localStorage is for here. If localStorage is unavailable (private
   browsing, or a locked-down browser setting), everything still works
   for the current visit; it just won't remember next time.

   Public API:
     DailyReveal.init({ config, elements }) -> { applicable: boolean }
   ============================================================================ */

const DailyReveal = (() => {
  const STORAGE_KEY = "birthdaySurprise:dailyReveal:openedDays:v1";
  const STYLE_ORDER = ["blur", "scratch", "puzzle", "flip", "pop"];
  const REFRESH_INTERVAL_MS = 60 * 1000; // catches a day rolling over without a page reload

  let schedule = [];
  let openedDays = new Set();
  let els = null;

  /* ------------------------------------------------------------------
     Persistence
  ------------------------------------------------------------------ */
  function loadOpenedDays() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed.filter((n) => Number.isInteger(n)) : []);
    } catch (err) {
      console.info("[DailyReveal] localStorage unavailable — progress won't persist across visits:", err.message);
      return new Set();
    }
  }

  function saveOpenedDays() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(openedDays)));
    } catch (err) {
      // Private browsing / storage full / disabled — the site still works
      // for this visit, it just won't remember next time. Not fatal.
    }
  }

  /* ------------------------------------------------------------------
     Scheduling
  ------------------------------------------------------------------ */
  // Day index i (0-based) unlocks at local midnight, (N - i) days before
  // the birthday's calendar date — so the LAST entry unlocks the day
  // before the birthday, and the FIRST unlocks N days before it.
  function computeSchedule(photos, birthdayDate) {
    const total = photos.length;
    const bday = new Date(birthdayDate);
    if (Number.isNaN(bday.getTime())) return [];
    const bdayMidnight = new Date(bday.getFullYear(), bday.getMonth(), bday.getDate());

    return photos.map((photo, i) => {
      const unlockDate = new Date(bdayMidnight);
      unlockDate.setDate(unlockDate.getDate() - (total - i));
      return {
        src: photo.src,
        caption: photo.caption || "",
        style: photo.style && STYLE_ORDER.includes(photo.style) ? photo.style : STYLE_ORDER[i % STYLE_ORDER.length],
        index: i,
        unlockDate
      };
    });
  }

  function isUnlocked(entry, now) {
    return now.getTime() >= entry.unlockDate.getTime();
  }

  /* ------------------------------------------------------------------
     Calendar grid
  ------------------------------------------------------------------ */
  function renderGrid() {
    if (!els?.grid) return;
    const now = new Date();
    els.grid.innerHTML = "";

    schedule.forEach((entry) => {
      const unlocked = isUnlocked(entry, now);
      const opened = openedDays.has(entry.index);

      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "daily-tile";
      tile.disabled = !unlocked;
      tile.classList.toggle("is-locked", !unlocked);
      tile.classList.toggle("is-opened", unlocked && opened);
      tile.classList.toggle("is-ready", unlocked && !opened);

      const icon = document.createElement("span");
      icon.className = "daily-tile-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = !unlocked ? "\ud83d\udd12" : opened ? "\ud83d\udc9d" : "\u2728";

      const label = document.createElement("span");
      label.className = "daily-tile-day";
      label.textContent = `Day ${entry.index + 1}`;

      tile.appendChild(icon);
      tile.appendChild(label);
      tile.setAttribute(
        "aria-label",
        !unlocked
          ? `Day ${entry.index + 1}, locked until ${entry.unlockDate.toLocaleDateString()}`
          : opened
          ? `Day ${entry.index + 1}, already opened — tap to view it again`
          : `Day ${entry.index + 1}, tap to open today's memory`
      );

      tile.addEventListener("click", () => openDay(entry.index));
      els.grid.appendChild(tile);
    });

    const openedCount = schedule.filter((e) => openedDays.has(e.index)).length;

    if (els.hint) {
      const allOpened = schedule.every((e) => !isUnlocked(e, now) || openedDays.has(e.index));
      const anyUnlocked = schedule.some((e) => isUnlocked(e, now));
      els.hint.textContent = anyUnlocked && allOpened
        ? (window.__dailyRevealMessages?.allDoneHint || "")
        : (window.__dailyRevealMessages?.hint || "");
    }

    // The persistent floating button always reflects current progress,
    // however many chapters ahead the birthday person has moved on to.
    if (els.toggleBadge) {
      els.toggleBadge.textContent = openedCount > 0 ? `${openedCount}/${schedule.length}` : "";
    }
    if (els.toggle) {
      els.toggle.setAttribute("aria-label", `View daily memories (${openedCount} of ${schedule.length} opened)`);
    }
  }

  /* ------------------------------------------------------------------
     Scroll lock shared between the per-day modal and the memories
     overlay — only released once NEITHER is open, so closing one while
     the other is still open (e.g. opening a day from inside the
     overlay, then closing just that day) doesn't unlock the background.
  ------------------------------------------------------------------ */
  function syncScrollLock() {
    const modalOpen = !!els?.modal?.classList.contains("is-open");
    const overlayOpen = !!els?.overlay?.classList.contains("is-open");
    document.body.classList.toggle("no-scroll", modalOpen || overlayOpen);
  }

  /* ------------------------------------------------------------------
     Memories overlay — the full calendar grid, reachable at any time.
  ------------------------------------------------------------------ */
  function openOverlay() {
    if (!els?.overlay) return;
    renderGrid(); // pick up anything that unlocked since the page loaded
    els.overlay.classList.remove("hidden");
    void els.overlay.offsetWidth;
    els.overlay.classList.add("is-open");
    syncScrollLock();
    els.overlayClose?.focus();
  }

  function closeOverlay() {
    if (!els?.overlay) return;
    els.overlay.classList.remove("is-open");
    syncScrollLock();
    window.setTimeout(() => els.overlay.classList.add("hidden"), 480);
  }

  function wireOverlay() {
    els.openBtn?.addEventListener("click", openOverlay);
    els.toggle?.addEventListener("click", openOverlay);
    els.overlayClose?.addEventListener("click", closeOverlay);
    els.overlay?.addEventListener("click", (e) => {
      if (e.target === els.overlay) closeOverlay();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.overlay && els.overlay.classList.contains("is-open")) closeOverlay();
    });
  }

  /* ------------------------------------------------------------------
     Per-day modal
  ------------------------------------------------------------------ */
  function openDay(index) {
    const entry = schedule[index];
    if (!entry || !els?.modal) return;

    els.modal.classList.remove("hidden");
    void els.modal.offsetWidth; // reflow so the open transition below runs
    els.modal.classList.add("is-open");
    syncScrollLock();

    if (els.dayLabel) els.dayLabel.textContent = `Day ${entry.index + 1}`;
    if (els.caption) {
      els.caption.textContent = "";
      els.caption.classList.add("hidden");
    }
    if (els.stage) els.stage.innerHTML = "";

    const alreadyOpened = openedDays.has(index);

    function reveal() {
      openedDays.add(index);
      saveOpenedDays();
      if (els.caption) {
        els.caption.textContent = entry.caption;
        els.caption.classList.remove("hidden");
        els.caption.classList.add("anim-slide-up");
      }
      window.ParticleEngine?.floatingHearts?.({ count: 5 });
      window.SoundManager?.playSFX?.("click");
      renderGrid();
    }

    if (alreadyOpened) {
      // Already seen before — show it directly without replaying the
      // mini-game, but keep the moment (no confetti/sound repeat spam).
      const img = document.createElement("img");
      img.className = "daily-modal-photo";
      img.src = entry.src;
      img.alt = "";
      img.setAttribute("data-fallback", "");
      els.stage?.appendChild(img);
      if (els.caption) {
        els.caption.textContent = entry.caption;
        els.caption.classList.remove("hidden");
      }
    } else {
      const renderer = STYLE_RENDERERS[entry.style] || STYLE_RENDERERS.blur;
      renderer(els.stage, entry, reveal);
    }

    els.closeBtn?.focus();
  }

  function closeModal() {
    if (!els?.modal) return;
    els.modal.classList.remove("is-open");
    syncScrollLock();
    window.setTimeout(() => {
      els.modal.classList.add("hidden");
      if (els.stage) els.stage.innerHTML = "";
    }, 480);
  }

  function wireModal() {
    els.closeBtn?.addEventListener("click", closeModal);
    els.modal?.addEventListener("click", (e) => {
      if (e.target === els.modal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.modal && els.modal.classList.contains("is-open")) closeModal();
    });
  }

  /* ------------------------------------------------------------------
     Reveal styles
     Each renderer builds its own UI inside `stage` and calls
     onRevealed() exactly once, the moment the photo is successfully
     revealed. attachImageFallback (from script.js) is applied globally
     via a MutationObserver-free approach: these images all carry
     data-fallback, and script.js re-scans on demand where needed.
  ------------------------------------------------------------------ */
  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function makeImg(src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.loading = "lazy";
    img.setAttribute("data-fallback", "");
    return img;
  }

  const STYLE_RENDERERS = {
    // Tap to unblur — the simplest style, also used as the fallback.
    blur(stage, entry, onRevealed) {
      const frame = document.createElement("button");
      frame.type = "button";
      frame.className = "daily-blur-frame";
      frame.setAttribute("aria-label", "Tap to reveal today's memory");
      const img = makeImg(entry.src);
      const hint = document.createElement("span");
      hint.className = "daily-frame-hint";
      hint.textContent = "Tap to reveal";
      frame.appendChild(img);
      frame.appendChild(hint);
      stage.appendChild(frame);

      let revealed = false;
      frame.addEventListener("click", () => {
        if (revealed) return;
        revealed = true;
        frame.classList.add("is-revealed");
        window.setTimeout(onRevealed, prefersReducedMotion() ? 0 : 500);
      });
    },

    // A canvas "foil" layer, same destination-out scratching technique as
    // the main Scratch Card chapter, generalized to any photo.
    scratch(stage, entry, onRevealed) {
      const frame = document.createElement("div");
      frame.className = "daily-scratch-frame";
      const img = makeImg(entry.src);
      const canvas = document.createElement("canvas");
      canvas.className = "daily-scratch-canvas";
      const hint = document.createElement("span");
      hint.className = "daily-frame-hint";
      hint.textContent = "Scratch to reveal";
      frame.appendChild(img);
      frame.appendChild(canvas);
      frame.appendChild(hint);
      stage.appendChild(frame);

      const THRESHOLD = 0.55;
      const BRUSH = 22;
      let ctx = null;
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
        ctx.globalCompositeOperation = "source-over";
      }

      function finish(skipped) {
        if (revealed) return;
        revealed = true;
        canvas.classList.add("is-cleared");
        window.setTimeout(() => { canvas.style.display = "none"; }, 500);
        hint.classList.add("is-hidden");
        window.setTimeout(onRevealed, skipped ? 0 : 350);
      }

      requestAnimationFrame(() => {
        const rect = frame.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(rect.width * dpr));
        canvas.height = Math.max(1, Math.round(rect.height * dpr));
        canvas.style.width = rect.width + "px";
        canvas.style.height = rect.height + "px";
        ctx = canvas.getContext && canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) { finish(true); return; } // no canvas support — reveal instead of getting stuck
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawFoil(rect.width, rect.height);
      });

      function pointFromEvent(e) {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }
      function scratchAt(p) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(p.x, p.y, BRUSH, 0, Math.PI * 2);
        ctx.fill();
      }
      function scratchLine(a, b) {
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        const steps = Math.max(1, Math.ceil(dist / (BRUSH / 2)));
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          scratchAt({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
      }
      function percentCleared() {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let total = 0, cleared = 0;
        for (let i = 3; i < data.length; i += 24) {
          total++;
          if (data[i] < 20) cleared++;
        }
        return total ? cleared / total : 0;
      }

      canvas.addEventListener("pointerdown", (e) => {
        if (revealed || !ctx) return;
        drawing = true;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        hint.classList.add("is-hidden");
        const p = pointFromEvent(e);
        scratchAt(p);
        lastPoint = p;
      });
      canvas.addEventListener("pointermove", (e) => {
        if (!drawing || revealed || !ctx) return;
        const p = pointFromEvent(e);
        scratchLine(lastPoint || p, p);
        lastPoint = p;
        const now = performance.now();
        if (now - lastCheck > 200) {
          lastCheck = now;
          if (percentCleared() >= THRESHOLD) finish(false);
        }
      });
      const endDraw = (e) => {
        drawing = false;
        lastPoint = null;
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      };
      canvas.addEventListener("pointerup", endDraw);
      canvas.addEventListener("pointercancel", endDraw);
    },

    // A quick 2x2 tap-to-swap puzzle — a lighter version of the main
    // Photo Puzzle chapter's mechanic, sized for a fast daily moment.
    puzzle(stage, entry, onRevealed) {
      const GRID_SIZE = 2;
      const TOTAL = GRID_SIZE * GRID_SIZE;

      const frame = document.createElement("div");
      frame.className = "daily-puzzle-frame";
      const grid = document.createElement("div");
      grid.className = "daily-puzzle-grid";
      frame.appendChild(grid);
      stage.appendChild(frame);

      let order = Array.from({ length: TOTAL }, (_, i) => i);
      do {
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
      } while (order.every((v, i) => v === i));

      const slots = [];
      let selected = null;
      let solved = false;

      function piecePosition(pieceIndex) {
        const col = pieceIndex % GRID_SIZE;
        const row = Math.floor(pieceIndex / GRID_SIZE);
        return `${col * 100}% ${row * 100}%`;
      }
      function render(i) {
        slots[i].style.backgroundPosition = piecePosition(order[i]);
        slots[i].dataset.pieceIndex = String(order[i]);
        slots[i].classList.toggle("is-selected", selected === i);
      }
      function renderAll() {
        for (let i = 0; i < TOTAL; i++) render(i);
      }
      function isSolved() {
        return order.every((p, i) => p === i);
      }
      function swap(a, b) {
        if (a === b || solved) return;
        [order[a], order[b]] = [order[b], order[a]];
        render(a);
        render(b);
        if (isSolved()) {
          solved = true;
          window.setTimeout(onRevealed, prefersReducedMotion() ? 0 : 350);
        }
      }

      for (let i = 0; i < TOTAL; i++) {
        const slot = document.createElement("button");
        slot.type = "button";
        slot.className = "daily-puzzle-slot";
        slot.style.backgroundImage = `url("${entry.src}")`;
        slot.setAttribute("aria-label", `Puzzle piece ${i + 1} of ${TOTAL}`);
        slot.addEventListener("click", () => {
          if (solved) return;
          if (selected === null) {
            selected = i;
            renderAll();
          } else if (selected === i) {
            selected = null;
            renderAll();
          } else {
            const from = selected;
            selected = null;
            swap(from, i);
          }
        });
        grid.appendChild(slot);
        slots.push(slot);
      }
      renderAll();
    },

    // Tap to flip the card over via a 3D CSS transform.
    flip(stage, entry, onRevealed) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "daily-flip-card";
      card.setAttribute("aria-label", "Tap to flip and reveal today's memory");

      const inner = document.createElement("div");
      inner.className = "daily-flip-inner";

      const front = document.createElement("div");
      front.className = "daily-flip-front";
      front.textContent = "\ud83c\udf81";

      const back = document.createElement("div");
      back.className = "daily-flip-back";
      back.appendChild(makeImg(entry.src));

      inner.appendChild(front);
      inner.appendChild(back);
      card.appendChild(inner);
      stage.appendChild(card);

      let revealed = false;
      card.addEventListener("click", () => {
        if (revealed) return;
        revealed = true;
        card.classList.add("is-flipped");
        window.setTimeout(onRevealed, prefersReducedMotion() ? 0 : 500);
      });
    },

    // Tap a little party-favor button to "pop" it open with confetti.
    pop(stage, entry, onRevealed) {
      const wrap = document.createElement("div");
      wrap.className = "daily-pop-wrap";
      const img = makeImg(entry.src);
      img.className = "daily-pop-photo";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "daily-pop-box";
      btn.textContent = "\ud83c\udf89";
      btn.setAttribute("aria-label", "Tap to pop open today's memory");
      wrap.appendChild(img);
      wrap.appendChild(btn);
      stage.appendChild(wrap);

      let revealed = false;
      btn.addEventListener("click", () => {
        if (revealed) return;
        revealed = true;
        const rect = btn.getBoundingClientRect();
        window.ParticleEngine?.confettiBurst?.({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, count: 60 });
        btn.classList.add("is-popped");
        wrap.classList.add("is-revealed");
        window.setTimeout(onRevealed, prefersReducedMotion() ? 0 : 380);
      });
    }
  };

  /* ------------------------------------------------------------------
     Public API
  ------------------------------------------------------------------ */
  return {
    /**
     * @param {{config: object, elements: object}} options
     * `elements` needs: grid, hint, modal, stage, caption, dayLabel,
     * closeBtn, overlay, overlayClose, toggle, toggleBadge, openBtn.
     * Returns { applicable } so the caller can hide the whole calendar
     * section when there's nothing to show (feature disabled, no photos
     * configured, or an invalid birthday date).
     */
    init({ config, elements }) {
      els = elements;
      const cfg = config?.dailyReveal;

      if (!cfg || !cfg.enabled || !Array.isArray(cfg.photos) || cfg.photos.length === 0) {
        return { applicable: false };
      }

      schedule = computeSchedule(cfg.photos, config.birthdayDate);
      if (schedule.length === 0) return { applicable: false }; // invalid birthdayDate

      openedDays = loadOpenedDays();

      // Messages are read by renderGrid() via this small shared spot
      // rather than threading them through every call.
      window.__dailyRevealMessages = {
        hint: config.messages?.dailyCalendarHint || "",
        allDoneHint: config.messages?.dailyCalendarAllDoneHint || ""
      };

      if (els.toggle) els.toggle.hidden = false;

      renderGrid();
      wireModal();
      wireOverlay();
      window.setInterval(renderGrid, REFRESH_INTERVAL_MS);

      return { applicable: true };
    }
  };
})();
