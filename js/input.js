// Keyboard + touch input. Exposes held-state flags the game polls each frame.

export class InputManager {
  constructor() {
    this.left = false;
    this.right = false;
    this.launch = false;
    this.onPause = null;
    this.onFirstInput = null;   // for audio context resume
    this._firstFired = false;
  }

  _first() {
    if (!this._firstFired && this.onFirstInput) { this._firstFired = true; this.onFirstInput(); }
  }

  attachKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this._first();
      switch (e.code) {
        case 'ArrowLeft': case 'KeyZ': case 'KeyA': this.left = true; break;
        case 'ArrowRight': case 'KeyM': case 'Slash': case 'KeyL': this.right = true; break;
        case 'Space': case 'ArrowDown': case 'ShiftLeft': case 'ShiftRight': this.launch = true; e.preventDefault(); break;
        case 'KeyP': case 'Escape': if (this.onPause) this.onPause(); break;
      }
    });
    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyZ': case 'KeyA': this.left = false; break;
        case 'ArrowRight': case 'KeyM': case 'Slash': case 'KeyL': this.right = false; break;
        case 'Space': case 'ArrowDown': case 'ShiftLeft': case 'ShiftRight': this.launch = false; break;
      }
    });
  }

  // Left half of the canvas drives the left flipper, right half the right flipper.
  attachTouch(canvas) {
    const setFromTouches = (touches) => {
      let l = false, r = false;
      const rect = canvas.getBoundingClientRect();
      for (const t of touches) {
        const x = t.clientX - rect.left;
        if (x < rect.width / 2) l = true; else r = true;
      }
      this.left = l; this.right = r;
    };
    const onTouch = (e) => {
      this._first();
      setFromTouches(e.touches);
      if (e.cancelable) e.preventDefault();
    };
    canvas.addEventListener('touchstart', onTouch, { passive: false });
    canvas.addEventListener('touchmove', onTouch, { passive: false });
    canvas.addEventListener('touchend', onTouch, { passive: false });
    canvas.addEventListener('touchcancel', onTouch, { passive: false });
  }

  // Used by an on-screen launch button (touch devices).
  bindLaunchButton(el) {
    const down = (e) => { this._first(); this.launch = true; if (e.cancelable) e.preventDefault(); };
    const up = (e) => { this.launch = false; if (e.cancelable) e.preventDefault(); };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
  }
}
