export const breathTextures = {
  air: { in: require("../assets/audio/breath-in.wav"), out: require("../assets/audio/breath-out.wav") },
  ocean: { in: require("../assets/audio/ocean-in.wav"), out: require("../assets/audio/ocean-out.wav") },
  warm: { in: require("../assets/audio/warm-in.wav"), out: require("../assets/audio/warm-out.wav") },
};
export const humTexture = require("../assets/audio/breath-hum.wav");
export const breathPreviews = { air: require("../assets/audio/preview-air.wav"), ocean: require("../assets/audio/preview-ocean.wav"), warm: require("../assets/audio/preview-warm.wav") };
export const chimes = { "completion-1": require("../assets/audio/supplied/completion-1.mp3"), "completion-2": require("../assets/audio/supplied/completion-2.mp3"), bell: require("../assets/audio/chime-bell.wav"), bloom: require("../assets/audio/chime-bloom.wav") };

export const chimeDurationMs = { bell: 2000, bloom: 2000, "completion-1": 4848, "completion-2": 2472 };
