"""Generate soft, periodic breath textures and matching previews (requires numpy)."""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 24000
OUT = Path(__file__).resolve().parents[1] / 'apps/mobile/assets/audio'
# Four-second periodic, spectrally shaped noise avoids metallic partials and short loops.
import numpy as np
rng = np.random.default_rng(20260929)
textures = {}
SIZE = RATE * 4
freq = np.fft.rfftfreq(SIZE, 1 / RATE)
for name, low, high in [('breath-in', 180, 2200), ('breath-out', 90, 1200), ('breath-hum', 80, 700),
                        ('ocean-in', 90, 1400), ('ocean-out', 55, 850), ('warm-in', 100, 850), ('warm-out', 45, 500)]:
    shape = (freq / np.maximum(freq + low, 1)) ** 2 / np.sqrt(1 + (freq / high) ** 6)
    spectrum = (rng.normal(size=len(freq)) + 1j * rng.normal(size=len(freq))) * shape
    spectrum[0] = 0
    samples = np.fft.irfft(spectrum, n=SIZE)
    samples *= 0.10 / np.sqrt(np.mean(samples ** 2))
    if name == 'breath-hum':
        t = np.arange(SIZE) / RATE
        samples = samples * 0.10 + 0.11 * np.sin(math.tau * 130 * t) + 0.025 * np.sin(math.tau * 260 * t)
    samples *= min(1, 0.48 / np.max(np.abs(samples)))
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as output:
        output.setparams((1, 2, RATE, SIZE, 'NONE', 'not compressed'))
        output.writeframes((samples * 32767).round().astype('<i2').tobytes())
    print(f'{name}: 4 seconds, peak {np.max(np.abs(samples)):.3f}, RMS {np.sqrt(np.mean(samples ** 2)):.3f}')
    textures[name] = samples

def write(name, samples):
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as output:
        output.setparams((1, 2, RATE, len(samples), 'NONE', 'not compressed'))
        output.writeframes(b''.join(struct.pack('<h', round(max(-1, min(1, x)) * 32767)) for x in samples))

for style, prefix in [('air', 'breath'), ('ocean', 'ocean'), ('warm', 'warm')]:
    # Six-second preview: two seconds in, a hold, two seconds out, a rest.
    samples = []
    for i in range(RATE * 6):
        t = i / RATE
        phase = t if t < 2 else t - 3
        direction = 'in' if t < 2 else 'out'
        gain = 0.5 * math.sin(math.pi * phase / 2) ** 0.65 if 0 <= phase < 2 else 0
        samples.append(textures[prefix + '-' + direction][i % SIZE] * gain)
    write('preview-' + style, samples)
for style, notes in [('bell', [660, 880]), ('bloom', [523, 659, 784])]:
    samples = []
    for i in range(RATE * 2):
        t = i / RATE
        value = 0
        for n, hz in enumerate(notes):
            age = t - n * 0.15
            if age >= 0:
                value += 0.16 * min(1, age / 0.02) * math.exp(-age * 4) * math.sin(math.tau * hz * age)
        samples.append(value)
    write('chime-' + style, samples)
