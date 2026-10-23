"""Regenerate the existing completion chimes (no breathing textures)."""
import math
import struct
import wave
from pathlib import Path

RATE = 24000
OUT = Path(__file__).resolve().parents[1] / 'apps/mobile/assets/audio'

def write(name, samples):
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as output:
        output.setparams((1, 2, RATE, len(samples), 'NONE', 'not compressed'))
        output.writeframes(b''.join(struct.pack('<h', round(max(-1, min(1, x)) * 32767)) for x in samples))

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
