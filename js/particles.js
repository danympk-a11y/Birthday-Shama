/* ============================================================================
   js/particles.js
   ----------------------------------------------------------------------------
   A small, dependency-free canvas particle engine shared by every visual
   surprise in the site: confetti, sparkles, floating hearts, and the
   rocket-and-burst fireworks show used in the Fireworks chapter.

   Public API:
     ParticleEngine.init(canvasEl)
     ParticleEngine.confettiBurst({ x, y, count })
     ParticleEngine.sparkle({ x, y, count })
     ParticleEngine.floatingHearts({ count })
     ParticleEngine.fireworksShow({ duration }) -> returns a stop() function
   ============================================================================ */

const ParticleEngine = (() => {
  let canvas, ctx;
  let dpr = 1;
  let width = 0, height = 0;
  let particles = [];
  let rafId = null;
  let heartsLayer = null;
  let reducedMotion = false;

  const PALETTE = ["#ff4f87", "#8b5cf6", "#f3c77e", "#f8f2ff", "#ff9ec7"];

  function resize() {
    if (!canvas || !ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2); // cap for perf on old phones
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  }

  function loop() {
    ctx.clearRect(0, 0, width, height);
    particles = particles.filter((p) => p.life > 0);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.rotation += p.rotationSpeed;
      p.life -= p.decay;

      // Rockets fly straight up, then explode into a burst once they
      // reach their apex (vy crosses back toward 0) or their target height.
      if (p.isRocket && !p.exploded && (p.vy >= -0.4 || p.y <= p.targetY)) {
        p.exploded = true;
        p.life = 0;
        explode(p.x, p.y, p.burstColor);
      }

      ctx.save();
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === "spark") {
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = (Math.PI / 2) * i;
          ctx.lineTo(Math.cos(a) * p.size, Math.sin(a) * p.size);
          ctx.lineTo(Math.cos(a + Math.PI / 4) * p.size * 0.3, Math.sin(a + Math.PI / 4) * p.size * 0.3);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        // rectangle confetti
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    });

    if (particles.length > 0) {
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null; // stop the loop entirely when idle \u2014 saves battery
    }
  }

  function ensureLoop() {
    if (rafId === null) rafId = requestAnimationFrame(loop);
  }

  function spawn(list) {
    if (!ctx) return;
    particles = particles.concat(list);
    ensureLoop();
  }

  function randomBetween(a, b) {
    return a + Math.random() * (b - a);
  }

  function explode(x, y, color) {
    const n = reducedMotion ? 10 : 36;
    const list = Array.from({ length: n }, () => {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(1.5, reducedMotion ? 3 : 6);
      return {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.05,
        drag: 0.97,
        size: randomBetween(3, 6),
        color: color || PALETTE[Math.floor(Math.random() * PALETTE.length)],
        shape: "spark",
        rotation: randomBetween(0, Math.PI * 2),
        rotationSpeed: randomBetween(-0.15, 0.15),
        life: 1,
        decay: randomBetween(0.012, 0.022)
      };
    });
    particles = particles.concat(list);
  }

  function launchFirework(x) {
    if (!ctx) return;
    const originX = x ?? randomBetween(width * 0.15, width * 0.85);
    const targetY = randomBetween(height * 0.18, height * 0.5);
    const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    spawn([
      {
        x: originX,
        y: height,
        vx: randomBetween(-0.4, 0.4),
        vy: -randomBetween(8.5, 11.5),
        gravity: 0.1,
        drag: 1,
        size: 3.5,
        color: "#fff8ee",
        shape: "circle",
        rotation: 0,
        rotationSpeed: 0,
        life: 1,
        decay: 0.001, // rockets are removed by exploding, not by decay
        isRocket: true,
        exploded: false,
        targetY,
        burstColor: color
      }
    ]);
  }

  return {
    init(canvasEl) {
      canvas = canvasEl;
      if (!canvas) {
        console.warn("[ParticleEngine] no canvas element provided \u2014 visuals will be skipped.");
        return this;
      }
      ctx = canvas.getContext && canvas.getContext("2d");
      reducedMotion =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!ctx) {
        // Extremely old / unusual browser without 2D canvas support.
        // Fail quietly \u2014 hearts still work below since they're DOM/CSS based.
        console.warn("[ParticleEngine] canvas 2D context unavailable \u2014 confetti/sparkle disabled, floating hearts still work.");
      } else {
        resize();
        window.addEventListener("resize", onResize);
        window.addEventListener("orientationchange", onResize);
      }

      // A lightweight DOM layer for CSS-animated floating hearts, kept
      // separate from the canvas since DOM + CSS handles a handful of
      // slow-moving hearts more cheaply than the canvas loop does.
      heartsLayer = document.createElement("div");
      heartsLayer.id = "hearts-layer";
      heartsLayer.style.cssText = "position:fixed;inset:0;z-index:41;pointer-events:none;overflow:hidden;";
      document.body.appendChild(heartsLayer);

      return this;
    },

    confettiBurst({ x, y, count = 60 } = {}) {
      if (!ctx) return;
      const originX = x ?? width / 2;
      const originY = y ?? height / 2;
      const n = reducedMotion ? Math.round(count / 4) : count;

      const list = Array.from({ length: n }, () => {
        const angle = randomBetween(0, Math.PI * 2);
        const speed = randomBetween(2, reducedMotion ? 4 : 9);
        return {
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          gravity: 0.18,
          drag: 0.985,
          size: randomBetween(6, 12),
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          shape: Math.random() > 0.5 ? "rect" : "circle",
          rotation: randomBetween(0, Math.PI * 2),
          rotationSpeed: randomBetween(-0.2, 0.2),
          life: 1,
          decay: randomBetween(0.008, 0.016)
        };
      });
      spawn(list);
    },

    sparkle({ x, y, count = 14 } = {}) {
      if (!ctx) return;
      const n = reducedMotion ? Math.round(count / 3) : count;
      const list = Array.from({ length: n }, () => {
        const angle = randomBetween(0, Math.PI * 2);
        const speed = randomBetween(0.5, 2.5);
        return {
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: 0.01,
          drag: 0.96,
          size: randomBetween(3, 6),
          color: "#f3c77e",
          shape: "spark",
          rotation: randomBetween(0, Math.PI * 2),
          rotationSpeed: randomBetween(-0.1, 0.1),
          life: 1,
          decay: randomBetween(0.02, 0.035)
        };
      });
      spawn(list);
    },

    floatingHearts({ count = 8 } = {}) {
      if (!heartsLayer) return;
      const n = reducedMotion ? Math.min(2, count) : count;
      for (let i = 0; i < n; i++) {
        const heart = document.createElement("span");
        heart.textContent = "\u2764\ufe0f";
        heart.setAttribute("aria-hidden", "true");
        const left = randomBetween(8, 92);
        const duration = randomBetween(4, 7);
        const delay = randomBetween(0, 0.6);
        const size = randomBetween(14, 26);
        heart.style.cssText = `
          position:absolute; left:${left}%; bottom:-5%;
          font-size:${size}px;
          animation: floatUp ${duration}s ease-in ${delay}s forwards;
          filter: drop-shadow(0 0 6px rgba(255,79,135,0.55));
        `;
        heartsLayer.appendChild(heart);
        heart.addEventListener("animationend", () => heart.remove());
        // Safety net in case animationend doesn't fire (e.g. tab backgrounded)
        setTimeout(() => heart.remove(), (duration + delay + 1) * 1000);
      }
    },

    /**
     * A tiny emoji that pops up and fades at a specific point — used as
     * lightweight, fun feedback on every button tap across the site.
     */
    emojiPop({ x, y, emoji = "\u2728" } = {}) {
      if (!heartsLayer) return;
      const el = document.createElement("span");
      el.textContent = emoji;
      el.setAttribute("aria-hidden", "true");
      const size = randomBetween(16, 22);
      const duration = reducedMotion ? 320 : 620;
      el.style.cssText = `
        position:absolute; left:${x}px; top:${y}px;
        font-size:${size}px;
        animation: emojiPop ${duration}ms ease-out forwards;
      `;
      heartsLayer.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
      setTimeout(() => el.remove(), duration + 200); // safety net
    },

    /**
     * Launches a self-sustaining fireworks display for roughly `duration`
     * milliseconds: rockets fire from the bottom of the screen at random
     * intervals, each exploding into a radial burst near its apex.
     * Returns a stop() function to end the show early (e.g. if the user
     * navigates to the next chapter before it naturally finishes).
     */
    fireworksShow({ duration = 6000 } = {}) {
      if (!ctx) {
        // No canvas support: still deliver *something* celebratory via
        // the DOM-based hearts layer rather than showing nothing at all.
        this.floatingHearts({ count: 10 });
        return () => {};
      }
      let active = true;
      const effectiveDuration = reducedMotion ? Math.min(duration, 2500) : duration;
      const endTimeEffective = performance.now() + effectiveDuration;

      const scheduleNext = () => {
        if (!active || performance.now() > endTimeEffective) return;
        launchFirework();
        window.setTimeout(scheduleNext, randomBetween(reducedMotion ? 700 : 450, reducedMotion ? 1100 : 950));
      };
      scheduleNext();

      return () => { active = false; };
    }
  };
})();
