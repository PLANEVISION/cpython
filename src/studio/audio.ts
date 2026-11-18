export class StudioAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private knead: GainNode | null = null
  private wheel: GainNode | null = null
  private tone: GainNode | null = null
  private kiln: GainNode | null = null
  private oscillator: OscillatorNode | null = null
  private last = 0

  async setEnabled(on: boolean) {
    if (!this.ctx) this.build()
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
    if (on) {
      await ctx.resume()
      master.gain.setTargetAtTime(0.85, ctx.currentTime, 0.06)
    } else {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.08)
    }
  }

  sync(stage: number, wheelSpeed: number, fire: number, enabled: boolean) {
    if (!enabled || !this.ctx || !this.knead || !this.wheel || !this.kiln || !this.tone || !this.oscillator) return
    const nowMs = performance.now()
    if (nowMs - this.last < 90) return
    this.last = nowMs
    const now = this.ctx.currentTime
    const pulse = stage === 1 ? 0.55 + 0.45 * Math.sin(nowMs / 260) : 1
    const knead = stage === 1 ? 0.16 * pulse : stage === 0 ? 0.04 : 0
    const wheel = stage === 2 ? 0.05 + Math.min(wheelSpeed, 8) * 0.012 : 0
    const kiln = stage === 5 ? 0.11 + fire * 0.05 : fire > 0.2 ? 0.08 : 0
    this.knead.gain.setTargetAtTime(knead, now, 0.08)
    this.wheel.gain.setTargetAtTime(wheel, now, 0.08)
    this.tone.gain.setTargetAtTime(stage === 2 ? 0.02 + wheelSpeed * 0.004 : 0, now, 0.08)
    this.kiln.gain.setTargetAtTime(kiln, now, 0.12)
    this.oscillator.frequency.setTargetAtTime(64 + wheelSpeed * 16, now, 0.1)
  }

  private build() {
    const ctx = new AudioContext()
    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
    const buffer = this.createNoise(ctx)

    this.knead = this.loop(ctx, buffer, master, 240, 1400)
    this.wheel = this.loop(ctx, buffer, master, 80, 520)
    this.kiln = this.loop(ctx, buffer, master, 30, 240)

    const oscillator = ctx.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.value = 70
    const tone = ctx.createGain()
    tone.gain.value = 0
    oscillator.connect(tone)
    tone.connect(master)
    oscillator.start()

    this.ctx = ctx
    this.master = master
    this.tone = tone
    this.oscillator = oscillator
  }

  private createNoise(ctx: AudioContext) {
    const rate = ctx.sampleRate
    const buffer = ctx.createBuffer(1, rate * 2, rate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 2.4
    }
    return buffer
  }

  private loop(ctx: AudioContext, buffer: AudioBuffer, master: GainNode, low: number, high: number) {
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = (low + high) * 0.5
    filter.Q.value = 0.7
    const gain = ctx.createGain()
    gain.gain.value = 0
    source.connect(filter)
    filter.connect(gain)
    gain.connect(master)
    source.start()
    return gain
  }
}

export const studioAudio = new StudioAudio()
