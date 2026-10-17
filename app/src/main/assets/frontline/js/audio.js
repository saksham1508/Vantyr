/**
 * PROJECT FRONTLINE - High-Octane Procedural Audio Synthesizer
 * 100% Web Audio API: Dynamic weapon fire, reloads, grenade detonations,
 * tactical combat music engine (synthwave bassline + percussion), and tactical announcer voice cues.
 */

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.voiceGain = null;

    this.musicVolume = 0.5;
    this.sfxVolume = 0.85;
    this.voiceVolume = 0.9;
    this.masterVolume = 0.8;
    this.hapticsEnabled = true;

    // Music playback state
    this.musicPlaying = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.bpm = 128;

    this.initAudio = this.initAudio.bind(this);
    window.addEventListener('click', this.initAudio, { once: false });
    window.addEventListener('touchstart', this.initAudio, { once: false });
  }

  initAudio() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.masterVolume;

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.sfxVolume;
        this.sfxGain.connect(this.masterGain);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.musicVolume;
        this.musicGain.connect(this.masterGain);

        this.voiceGain = this.ctx.createGain();
        this.voiceGain.gain.value = this.voiceVolume;
        this.voiceGain.connect(this.masterGain);

        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  setMusicVolume(val) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  triggerHaptic(type = 'light') {
    if (!this.hapticsEnabled) return;
    try {
      if (window.AndroidBridge && window.AndroidBridge.vibrate) {
        if (type === 'heavy') window.AndroidBridge.vibrate(70);
        else if (type === 'medium') window.AndroidBridge.vibrate(35);
        else window.AndroidBridge.vibrate(18);
      } else if (navigator.vibrate) {
        if (type === 'heavy') navigator.vibrate(60);
        else if (type === 'medium') navigator.vibrate(30);
        else navigator.vibrate(15);
      }
    } catch (_) {}
  }

  /* ================= PROCEDURAL COMBAT MUSIC ================= */
  startCombatMusic() {
    if (this.musicPlaying || !this.ctx) return;
    this.musicPlaying = true;
    this.musicStep = 0;

    const stepInterval = (60 / this.bpm) / 4; // 16th notes
    const bassline = [
      48, 48, 60, 48,  46, 48, 51, 48,
      44, 44, 56, 44,  46, 44, 48, 46,
      41, 41, 53, 41,  43, 41, 46, 41,
      46, 46, 58, 46,  48, 46, 51, 48
    ];

    const playStep = () => {
      if (!this.musicPlaying || !this.ctx) return;
      const t = this.ctx.currentTime;
      const step = this.musicStep % 32;

      // 1. Kick Drum on beats 0, 4, 8, 12, 16, 20, 24, 28
      if (step % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(120, t);
        kickOsc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
        kickGain.gain.setValueAtTime(0.7, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain);
        kickOsc.start(t);
        kickOsc.stop(t + 0.15);
      }

      // 2. Hi-Hat on offbeats
      if (step % 2 === 1) {
        const bufferSize = this.ctx.sampleRate * 0.03;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const out = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) out[i] = Math.random() * 2 - 1;
        const hat = this.ctx.createBufferSource();
        hat.buffer = noiseBuffer;
        const hatFilter = this.ctx.createBiquadFilter();
        hatFilter.type = 'highpass';
        hatFilter.frequency.setValueAtTime(7000, t);
        const hatGain = this.ctx.createGain();
        hatGain.gain.setValueAtTime(step % 4 === 2 ? 0.25 : 0.12, t);
        hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        hat.connect(hatFilter);
        hatFilter.connect(hatGain);
        hatGain.connect(this.musicGain);
        hat.start(t);
      }

      // 3. Snare / Clap on beats 4, 12, 20, 28
      if (step % 8 === 4) {
        const snareNoise = this.ctx.createBufferSource();
        const bSize = this.ctx.sampleRate * 0.12;
        const nBuffer = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const nOut = nBuffer.getChannelData(0);
        for (let i = 0; i < bSize; i++) nOut[i] = Math.random() * 2 - 1;
        snareNoise.buffer = nBuffer;
        const snareFilter = this.ctx.createBiquadFilter();
        snareFilter.type = 'bandpass';
        snareFilter.frequency.setValueAtTime(1800, t);
        const sGain = this.ctx.createGain();
        sGain.gain.setValueAtTime(0.4, t);
        sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
        snareNoise.connect(snareFilter);
        snareFilter.connect(sGain);
        sGain.connect(this.musicGain);
        snareNoise.start(t);
      }

      // 4. Synthwave Bass Pulse
      const midiNote = bassline[step];
      const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
      const bassOsc = this.ctx.createOscillator();
      const bassFilter = this.ctx.createBiquadFilter();
      const bassGain = this.ctx.createGain();

      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(freq, t);

      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(650, t);
      bassFilter.frequency.exponentialRampToValueAtTime(220, t + 0.14);

      bassGain.gain.setValueAtTime(0.3, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.musicGain);
      bassOsc.start(t);
      bassOsc.stop(t + 0.15);

      this.musicStep++;
    };

    this.musicTimer = setInterval(playStep, stepInterval * 1000);
  }

  stopCombatMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  /* ================= TACTICAL WEAPON SFX ================= */
  playGunshot(weaponType = 'AR-47', isLocalPlayer = true, isSuppressed = false) {
    if (!this.ctx || this.ctx.state !== 'running') this.initAudio();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const sfx = this.sfxGain;

    if (isLocalPlayer) {
      this.triggerHaptic(weaponType === 'SR-50' || weaponType === 'SG-12' ? 'heavy' : 'light');
    }

    if (isSuppressed) {
      // Silenced "Pfft"
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
      gain.gain.setValueAtTime(isLocalPlayer ? 0.35 : 0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain);
      gain.connect(sfx);
      osc.start(t);
      osc.stop(t + 0.1);
      return;
    }

    if (weaponType === 'SG-12') {
      // Heavy Shotgun blast (Multi-frequency thump + wide noise)
      const bufferSize = this.ctx.sampleRate * 0.28;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, t);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(isLocalPlayer ? 1.0 : 0.45, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      whiteNoise.connect(filter);
      filter.connect(nGain);
      nGain.connect(sfx);
      whiteNoise.start(t);

      // Deep kick
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.22);
      oscGain.gain.setValueAtTime(isLocalPlayer ? 0.9 : 0.4, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(oscGain);
      oscGain.connect(sfx);
      osc.start(t);
      osc.stop(t + 0.28);
      return;
    }

    if (weaponType === 'PL-9') {
      // Crisp Pistol Crack
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
      oscGain.gain.setValueAtTime(isLocalPlayer ? 0.6 : 0.25, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(oscGain);
      oscGain.connect(sfx);
      osc.start(t);
      osc.stop(t + 0.12);
      return;
    }

    // Default AR-47, SMG-9, SR-50
    const bufferSize = this.ctx.sampleRate * (weaponType === 'SR-50' ? 0.35 : 0.18);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = weaponType === 'SMG-9' ? 'highpass' : 'bandpass';
    noiseFilter.frequency.setValueAtTime(weaponType === 'SR-50' ? 800 : 1200, t);

    const noiseEnvelope = this.ctx.createGain();
    const noiseVol = isLocalPlayer ? 0.85 : 0.35;
    noiseEnvelope.gain.setValueAtTime(noiseVol, t);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.001, t + (weaponType === 'SR-50' ? 0.3 : 0.12));

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseEnvelope);
    noiseEnvelope.connect(sfx);
    whiteNoise.start(t);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    if (weaponType === 'SR-50') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);
      oscGain.gain.setValueAtTime(isLocalPlayer ? 1.0 : 0.4, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    } else if (weaponType === 'SMG-9') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
      oscGain.gain.setValueAtTime(isLocalPlayer ? 0.6 : 0.25, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.16);
      oscGain.gain.setValueAtTime(isLocalPlayer ? 0.8 : 0.3, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    }
    osc.connect(oscGain);
    oscGain.connect(sfx);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  /* ================= GRENADE EXPLOSION ================= */
  playExplosion() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    this.triggerHaptic('heavy');

    // Massive noise boom
    const bSize = this.ctx.sampleRate * 0.8;
    const nBuf = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
    const nData = nBuf.getChannelData(0);
    for (let i = 0; i < bSize; i++) nData[i] = Math.random() * 2 - 1;
    const boomNoise = this.ctx.createBufferSource();
    boomNoise.buffer = nBuf;

    const bFilter = this.ctx.createBiquadFilter();
    bFilter.type = 'lowpass';
    bFilter.frequency.setValueAtTime(500, t);
    bFilter.frequency.exponentialRampToValueAtTime(80, t + 0.7);

    const bGain = this.ctx.createGain();
    bGain.gain.setValueAtTime(1.2, t);
    bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    boomNoise.connect(bFilter);
    bFilter.connect(bGain);
    bGain.connect(this.sfxGain);
    boomNoise.start(t);

    // Deep sub-bass earthquake vibration
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(80, t);
    sub.frequency.exponentialRampToValueAtTime(20, t + 0.6);
    subGain.gain.setValueAtTime(1.0, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(t);
    sub.stop(t + 0.7);
  }

  playReloadStage(stage = 1) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    if (stage === 1) {
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(260, t + 0.08);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    } else if (stage === 2) {
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(580, t + 0.07);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      this.triggerHaptic('medium');
    } else {
      osc.frequency.setValueAtTime(650, t);
      osc.frequency.exponentialRampToValueAtTime(920, t + 0.06);
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      this.triggerHaptic('medium');
    }
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playHitMarker(isHeadshot = false) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (isHeadshot) {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(1800, t + 0.08);
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      this.triggerHaptic('heavy');
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(750, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      this.triggerHaptic('light');
    }
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  playDamageTaken() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
    this.triggerHaptic('heavy');
  }

  playKillSound() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    [480, 720, 960].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const startT = t + idx * 0.06;
      osc.frequency.setValueAtTime(freq, startT);
      gain.gain.setValueAtTime(0.4, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startT);
      osc.stop(startT + 0.15);
    });
  }

  /* ================= TACTICAL ANNOUNCER CALLOUTS ================= */
  playAnnouncer(callout) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    let freqs = [500, 750];

    if (callout === 'headshot') freqs = [600, 900, 1200];
    else if (callout === 'double_kill') freqs = [440, 554, 659, 880];
    else if (callout === 'triple_kill') freqs = [523, 659, 783, 1046];
    else if (callout === 'killstreak') freqs = [350, 440, 523, 698];
    else if (callout === 'victory') freqs = [392, 523, 659, 783];
    else if (callout === 'defeat') freqs = [392, 349, 329, 261];

    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const startT = t + i * 0.1;
      osc.frequency.setValueAtTime(f, startT);
      gain.gain.setValueAtTime(0.35, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.25);
      osc.connect(gain);
      gain.connect(this.voiceGain);
      osc.start(startT);
      osc.stop(startT + 0.3);
    });
  }

  playFootstep() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.06);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  playUIClick() {
    if (!this.ctx || this.ctx.state !== 'running') this.initAudio();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.04);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.06);
    this.triggerHaptic('light');
  }

  playMatchEnd(isVictory) {
    this.stopCombatMusic();
    this.playAnnouncer(isVictory ? 'victory' : 'defeat');
  }
}

window.soundSystem = new SoundSystem();
