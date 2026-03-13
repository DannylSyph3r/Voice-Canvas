declare class AudioWorkletProcessor {
  readonly port: MessagePort
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Map<string, Float32Array>,
  ): boolean
}
declare function registerProcessor(
  name: string,
  processorCtor: new (...args: unknown[]) => AudioWorkletProcessor,
): void

class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0]
    if (channel && channel.length > 0) {
      const int16 = new Int16Array(channel.length)
      for (let i = 0; i < channel.length; i++) {
        const clamped = Math.max(-1, Math.min(1, channel[i]))
        int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
      }
      this.port.postMessage(int16.buffer, [int16.buffer])
    }
    return true
  }
}

registerProcessor('pcm-capture', PcmCaptureProcessor)
