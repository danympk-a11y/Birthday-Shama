/* ============================================================================
   js/soundManager.js
   ----------------------------------------------------------------------------
   Owns all audio: the background song and short one-off sound effects
   (click, puzzle-solved, cake-blow, etc. added in later phases).

   Design goals this module guarantees for the rest of the app:
     - A missing or broken audio file NEVER throws or breaks the page.
       It just quietly marks that sound "unavailable" and moves on.
     - Mobile browsers block audio until a real user gesture happens, so
       nothing plays until unlock() is called from a click/tap handler.
     - Everything is driven from birthdayConfig \u2014 no file paths live here.

   Public API:
     SoundManager.init(musicConfig, settings)
     SoundManager.unlock()            -> call from the first user gesture
     SoundManager.toggleMute()        -> returns new muted state (boolean)
     SoundManager.isMuted()
     SoundManager.isBackgroundAvailable()
     SoundManager.playSFX(name)
     SoundManager.setVolume(0..1)
   ============================================================================ */

const SoundManager = (() => {
  let background = null;
  let sfx = {};
  let muted = false;
  let unlocked = false;
  let settings = { enableBackgroundMusic: true, enableSoundEffects: true };
  let backgroundAvailable = false;

  function makeAudio(src) {
    if (!src) return null;
    const audio = new Audio();
    audio.src = src;
    audio.preload = "auto";
    return audio;
  }

  function safePlay(audio) {
    if (!audio) return Promise.resolve(false);
    const p = audio.play();
    if (p && typeof p.catch === "function") {
      return p.then(() => true).catch((err) => {
        console.info("[SoundManager] playback was blocked or the file is missing:", audio.src, err.message);
        return false;
      });
    }
    return Promise.resolve(true);
  }

  return {
    /**
     * @param {{background?:string, click?:string, [key:string]:string}} musicConfig
     * @param {{enableBackgroundMusic?:boolean, enableSoundEffects?:boolean}} appSettings
     */
    init(musicConfig = {}, appSettings = {}) {
      settings = { ...settings, ...appSettings };

      const { background: bgSrc, ...effectSrcs } = musicConfig;

      if (bgSrc && settings.enableBackgroundMusic) {
        background = makeAudio(bgSrc);
        background.loop = true;
        background.volume = 0.55;
        background.addEventListener("canplaythrough", () => { backgroundAvailable = true; }, { once: true });
        background.addEventListener("error", () => {
          backgroundAvailable = false;
          console.info("[SoundManager] background music file not found \u2014 music controls will stay disabled:", bgSrc);
          document.dispatchEvent(new CustomEvent("sound:unavailable", { detail: { key: "background" } }));
        });
      }

      sfx = {};
      Object.entries(effectSrcs).forEach(([key, src]) => {
        const audio = makeAudio(src);
        if (!audio) return;
        audio.addEventListener("error", () => {
          console.info(`[SoundManager] sound effect "${key}" file not found \u2014 it will be skipped silently:`, src);
        });
        sfx[key] = audio;
      });

      return this;
    },

    /** Call this from inside a real user gesture handler (click/touchstart). */
    unlock() {
      if (unlocked) return;
      unlocked = true;
      if (background && settings.enableBackgroundMusic && !muted) {
        safePlay(background);
      }
    },

    toggleMute() {
      muted = !muted;
      if (background) {
        background.muted = muted;
        if (!muted && unlocked) safePlay(background);
      }
      return muted;
    },

    isMuted() {
      return muted;
    },

    isBackgroundAvailable() {
      return backgroundAvailable;
    },

    setVolume(v) {
      const vol = Math.max(0, Math.min(1, v));
      if (background) background.volume = vol;
    },

    playSFX(name) {
      if (!settings.enableSoundEffects) return;
      const clip = sfx[name];
      if (!clip) return; // unknown or missing effect \u2014 silently skip
      try {
        clip.currentTime = 0;
        safePlay(clip);
      } catch (err) {
        console.info(`[SoundManager] could not play sound effect "${name}":`, err.message);
      }
    }
  };
})();
