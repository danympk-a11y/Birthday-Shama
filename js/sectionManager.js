/* ============================================================================
   js/sectionManager.js
   ----------------------------------------------------------------------------
   Tracks progress through the birthday "story" and drives the Memory
   Thread (the glowing dot strand). Every future section (countdown,
   gallery, puzzle, scratch card...) calls SectionManager.advance() when
   the user completes it, and everything else (the thread UI, the counter
   text, anyone else listening) reacts automatically.

   Public API:
     SectionManager.init({ total, threadEl, labelEl })
     SectionManager.advance()               -> unlocks the next dot
     SectionManager.setProgress(count)       -> jump to an exact count
     SectionManager.getProgress()            -> { count, total }
     SectionManager.reset()                  -> back to zero (used by Replay)
     SectionManager.onChange(fn)             -> fn({ count, total }) on every change
     SectionManager.initScrollReveal(selector) -> fade/slide-in on scroll,
                                                   reused by gallery/timeline later
   Also dispatches a "birthday:progress" CustomEvent on `document` so
   unrelated modules (sound, analytics, whatever) can react without a
   direct dependency on this file.
   ============================================================================ */

const SectionManager = (() => {
  let state = { count: 0, total: 0 };
  let dotEls = [];
  let labelEl = null;
  const listeners = [];

  function renderThread(threadEl) {
    threadEl.querySelectorAll(".thread-dot").forEach((el) => el.remove());
    dotEls = [];
    for (let i = 0; i < state.total; i++) {
      const dot = document.createElement("span");
      dot.className = "thread-dot";
      dot.setAttribute("data-index", String(i));
      dot.setAttribute("aria-hidden", "true");
      threadEl.appendChild(dot);
      dotEls.push(dot);
    }
  }

  function paint() {
    dotEls.forEach((dot, i) => {
      dot.classList.toggle("is-lit", i < state.count);
      dot.classList.toggle("is-current", i === state.count);
    });
    if (labelEl) {
      labelEl.textContent = `${state.count}/${state.total} surprises unlocked`;
    }
  }

  function notify() {
    const snapshot = { ...state };
    listeners.forEach((fn) => {
      try { fn(snapshot); } catch (err) { console.warn("[SectionManager] listener error:", err); }
    });
    document.dispatchEvent(new CustomEvent("birthday:progress", { detail: snapshot }));
  }

  return {
    init({ total = 12, threadEl = null, labelEl: label = null } = {}) {
      state = { count: 0, total };
      labelEl = label || null;
      if (threadEl) renderThread(threadEl);
      paint();
      return this;
    },

    advance() {
      if (state.count < state.total) state.count += 1;
      paint();
      notify();
      return { ...state };
    },

    setProgress(count) {
      state.count = Math.max(0, Math.min(count, state.total));
      paint();
      notify();
      return { ...state };
    },

    getProgress() {
      return { ...state };
    },

    reset() {
      state.count = 0;
      paint();
      notify();
      return { ...state };
    },

    onChange(fn) {
      if (typeof fn === "function") listeners.push(fn);
      return () => {
        const idx = listeners.indexOf(fn);
        if (idx > -1) listeners.splice(idx, 1);
      };
    },

    /**
     * Generic scroll-reveal utility (used by the memory gallery / timeline
     * in later phases). Adds "is-visible" to any matched element once it
     * enters the viewport, then stops observing it. An optional onReveal
     * callback fires once per element the first time it becomes visible,
     * so callers can layer on their own effects (e.g. a sparkle burst)
     * without this utility needing to know about them.
     */
    initScrollReveal(selector, { onReveal, ...observerOptions } = {}) {
      const els = document.querySelectorAll(selector);
      if (!els.length) return;

      const prefersReducedMotion =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!("IntersectionObserver" in window) || prefersReducedMotion) {
        els.forEach((el, i) => {
          el.classList.add("is-visible");
          if (typeof onReveal === "function") onReveal(el, i);
        });
        return;
      }

      const indexOf = (el) => Array.prototype.indexOf.call(els, el);
      const io = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              if (typeof onReveal === "function") onReveal(entry.target, indexOf(entry.target));
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2, ...observerOptions }
      );

      els.forEach((el) => io.observe(el));
    }
  };
})();
