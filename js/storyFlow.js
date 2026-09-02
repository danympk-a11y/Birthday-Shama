/* ============================================================================
   js/storyFlow.js
   ----------------------------------------------------------------------------
   Makes the site behave like a story instead of a normal scrolling page:
   exactly one [data-story-section] is visible at a time, and moving to the
   next one is a deliberate, animated hand-off rather than a scroll.

   Every future phase (photo reveal, gallery, puzzle...) just needs to add
   a new <section class="stage story-section" data-story-section="..."> to
   index.html \u2014 this engine picks it up automatically and nothing about
   this file needs to change.

   Public API:
     StoryFlow.init(containerEl)   -> discovers sections, activates the first
     StoryFlow.goTo(id)            -> animated transition to a section by id
     StoryFlow.next()              -> convenience for "the next one in order"
     StoryFlow.current()           -> the active section element
     StoryFlow.reset()             -> back to the very first section
   ============================================================================ */

const StoryFlow = (() => {
  // Keep in sync with the --dur-med value in style.css.
  const TRANSITION_MS = 480;

  let sections = [];
  let activeIndex = -1;
  let transitioning = false;

  function focusSection(sectionEl) {
    // Moves keyboard/screen-reader focus into the new chapter so users
    // navigating without a mouse land somewhere sensible.
    const target = sectionEl.querySelector("[tabindex='-1'], h1, h2");
    if (target) {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  }

  return {
    init(containerEl, { startAt } = {}) {
      if (!containerEl) return this;
      sections = Array.from(containerEl.querySelectorAll("[data-story-section]"));

      let startIndex = 0;
      if (startAt) {
        const found = sections.findIndex((s) => s.dataset.storySection === startAt);
        if (found > -1) startIndex = found;
      }

      sections.forEach((el, i) => {
        const isStart = i === startIndex;
        el.classList.toggle("is-active", isStart);
        el.classList.toggle("is-visible", isStart);
        el.setAttribute("aria-hidden", isStart ? "false" : "true");
      });
      activeIndex = startIndex;
      return this;
    },

    current() {
      return sections[activeIndex] || null;
    },

    goTo(id) {
      const targetIndex = sections.findIndex((s) => s.dataset.storySection === id);
      if (targetIndex === -1 || targetIndex === activeIndex || transitioning) return;

      transitioning = true;
      const outgoing = sections[activeIndex];
      const incoming = sections[targetIndex];

      outgoing.classList.remove("is-visible");
      outgoing.setAttribute("aria-hidden", "true");

      window.setTimeout(() => {
        outgoing.classList.remove("is-active");
        incoming.classList.add("is-active");
        incoming.setAttribute("aria-hidden", "false");

        // Force a reflow so the browser registers the "not visible yet"
        // starting state before we flip it \u2014 otherwise the transition
        // is skipped and the section just pops in.
        void incoming.offsetWidth;

        requestAnimationFrame(() => {
          incoming.classList.add("is-visible");
          focusSection(incoming);
          activeIndex = targetIndex;
          transitioning = false;
          document.dispatchEvent(
            new CustomEvent("birthday:section-change", { detail: { id, index: targetIndex } })
          );
        });
      }, TRANSITION_MS);
    },

    next() {
      const nextSection = sections[activeIndex + 1];
      if (nextSection) this.goTo(nextSection.dataset.storySection);
    },

    reset() {
      if (sections[0]) this.goTo(sections[0].dataset.storySection);
    }
  };
})();
