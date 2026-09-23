"""Generate deterministic, seamless one-second breath textures (standard library only)."""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 24000
OUT = Path(__file__).resolve().parents[1] / 'apps/mobile/assets/audio'
rng = random.Random(20260922)
for name, low, high in [('breath-in', 450, 4800), ('breath-out', 100, 2200), ('breath-hum', 100, 1200)]:
    # Integer frequencies and phase continuity make the loop seamless at 1 second.
    partials = [(rng.randrange(low, high), rng.random() * math.tau, rng.random()) for _ in range(160)]
    samples = [sum(math.sin(math.tau * hz * i / RATE + phase) * gain for hz, phase, gain in partials) for i in range(RATE)]
    peak = max(abs(x) for x in samples)
    samples = [x / peak * 0.45 for x in samples]
    if name == 'breath-hum':
        samples = [x * 0.15 + 0.30 * math.sin(math.tau * 140 * i / RATE) + 0.08 * math.sin(math.tau * 280 * i / RATE) for i, x in enumerate(samples)]
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as output:
        output.setparams((1, 2, RATE, RATE, 'NONE', 'not compressed'))
        output.writeframes(b''.join(struct.pack('<h', round(x * 32767)) for x in samples))
    print(f'{name}: 1 second, peak {max(abs(x) for x in samples):.3f}, no clipping')
