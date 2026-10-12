// Audio FX disabled by preference
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }

  init() {}
  playClick() {}
  playSelect() {}
  playCorrect() {}
  playWrong() {}
  playTick() {}
  playFanfare() {}
}

window.soundFx = new SoundFX();
