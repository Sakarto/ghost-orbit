import { describe, expect, it, vi } from "vitest";
import { createGhostTransmission } from "@/lib/spooky-audio";

describe("haunted radio processing", () => {
  it("filters at 350–3200 Hz and adds a dampened 180 ms feedback echo with gain modulation", () => {
    const nodes: any[] = [];
    const makeNode = () => {
      const node = {
        type: "", frequency: { value: 0 }, gain: { value: 0 }, delayTime: { value: 0 }, playbackRate: { value: 1 },
        connect: vi.fn((target) => target), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(),
      };
      nodes.push(node);
      return node;
    };
    class FakeContext {
      state = "running";
      sampleRate = 100;
      destination = {};
      createBufferSource = makeNode;
      createBiquadFilter = makeNode;
      createGain = makeNode;
      createOscillator = makeNode;
      createDelay = makeNode;
      createConvolver = makeNode;
      createBuffer = () => ({ getChannelData: () => new Float32Array(180) });
    }
    vi.stubGlobal("AudioContext", FakeContext);
    const buffer = {} as AudioBuffer;
    const ended = vi.fn();
    const stop = createGhostTransmission(buffer, ended);
    expect(nodes[0].buffer).toBe(buffer);
    expect(nodes[0].playbackRate.value).toBe(0.86);
    expect(nodes[0].start).toHaveBeenCalledOnce();
    expect(nodes.find((n) => n.gain.value === 1.35)?.connect).toHaveBeenCalled();
    expect(nodes.find((n) => n.type === "highpass")?.frequency.value).toBe(350);
    expect(nodes.filter((n) => n.type === "lowpass").map((n) => n.frequency.value)).toEqual([3200, 1800]);
    expect(nodes.find((n) => n.delayTime.value > 0)?.delayTime.value).toBe(0.18);
    expect(nodes.find((n) => n.gain.value === 0.32)?.connect).toHaveBeenCalledWith(nodes.find((n) => n.delayTime.value === 0.18));
    expect(nodes.find((n) => n.frequency.value === 4.3)?.start).toHaveBeenCalledOnce();
    stop();
    stop();
    expect(nodes[0].stop).toHaveBeenCalledOnce();
    expect(nodes[0].onended).toBeNull();
    for (const node of nodes) expect(node.disconnect).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});