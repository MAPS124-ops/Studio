class SoundEffects {
  private ctx: AudioContext | null = null;
  private muted = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(value: boolean): void {
    this.muted = value;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.12,
    delay = 0,
    endFreq?: number
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playTurn(pitchOffset = 0): void {
    this.playTone(230 + pitchOffset * 18, 0.045, 'triangle', 0.045, 0, 290 + pitchOffset * 18);
  }

  public playCorrect(streak: number): void {
    const semitoneBoost = Math.min(streak - 1, 8);
    const root = 440 * Math.pow(2, semitoneBoost / 12);
    this.playTone(root, 0.11, 'sine', 0.13, 0);
    this.playTone(root * 1.25, 0.14, 'triangle', 0.12, 0.055);
  }

  public playWrong(): void {
    this.playTone(185, 0.14, 'sawtooth', 0.08, 0, 120);
    this.playTone(135, 0.18, 'triangle', 0.1, 0.08, 95);
  }

  public playBonus(): void {
    this.playTone(587.33, 0.09, 'sine', 0.11, 0);
    this.playTone(783.99, 0.09, 'sine', 0.11, 0.06);
    this.playTone(1046.5, 0.18, 'triangle', 0.12, 0.12);
  }

  public playShieldSave(): void {
    this.playTone(520, 0.1, 'triangle', 0.12, 0, 280);
    this.playTone(660, 0.16, 'sine', 0.1, 0.07);
  }

  public playLevelUp(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.16, 'triangle', 0.11, idx * 0.065);
    });
  }

  public playGameOver(): void {
    this.playTone(330, 0.16, 'triangle', 0.12, 0, 290);
    this.playTone(262, 0.18, 'triangle', 0.12, 0.14, 220);
    this.playTone(196, 0.34, 'sine', 0.13, 0.28, 150);
  }
}

export const soundFx = new SoundEffects();
