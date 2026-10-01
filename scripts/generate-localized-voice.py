"""Generate and level-match bundled EN/ES/PT speech (edge-tts, imageio-ffmpeg, mutagen)."""
import asyncio
import argparse
import json
import math
import subprocess
import imageio_ffmpeg
from mutagen.mp3 import MP3
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[1] / 'apps/mobile/assets/audio'
NAMES = ['inhale', 'top-up', 'exhale', 'complete', 'hold', 'hum', 'rest', 'recover',
         'natural', 'inhale-left', 'inhale-right', 'exhale-left', 'exhale-right']
VOICES = {
    'en': ('en-US-JennyNeural', ['Inhale', 'A little more', 'Exhale', 'Session complete',
        'Hold', 'Hum softly', 'Rest', 'Recover', 'Breathe naturally',
        'Inhale left', 'Inhale right', 'Exhale left', 'Exhale right']),
    'es': ('es-MX-DaliaNeural', ['Inhala', 'Un poco más', 'Exhala', 'Sesión completa',
        'Pausa', 'Haz un zumbido suave', 'Descansa', 'Recupérate', 'Respira naturalmente',
        'Inhala por la izquierda', 'Inhala por la derecha', 'Exhala por la izquierda', 'Exhala por la derecha']),
    'pt': ('pt-BR-FranciscaNeural', ['Inspire', 'Um pouco mais', 'Expire', 'Sessão concluída',
        'Segure', 'Faça um zumbido suave', 'Descanse', 'Recupere-se', 'Respire naturalmente',
        'Inspire pela esquerda', 'Inspire pela direita', 'Expire pela esquerda', 'Expire pela direita']),
}

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", choices=NAMES)
    only = parser.parse_args().only
    limit = asyncio.Semaphore(3)
    staging = ROOT.parents[3] / 'artifacts/audio-voice-source'
    staging.mkdir(parents=True, exist_ok=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    async def generate(language, voice, name, phrase):
        target = ROOT / language / f'{name}.mp3'
        target.parent.mkdir(parents=True, exist_ok=True)
        raw = staging / f'{language}-{name}-raw.mp3'
        normalized = staging / f'{language}-{name}.mp3'
        async with limit:
            await edge_tts.Communicate(phrase, voice, rate="-5%").save(str(raw))
            # Remove service padding without cutting pauses inside a spoken phrase.
            trim = "silenceremove=start_periods=1:start_duration=0.015:start_threshold=-45dB"
            filters = f"{trim},areverse,{trim},areverse,loudnorm=I=-20:TP=-3:LRA=7,apad=pad_dur=0.06"
            subprocess.run([ffmpeg, '-y', '-v', 'error', '-i', str(raw), '-af', filters,
                '-ar', '24000', '-ac', '1', '-b:a', '96k', str(normalized)], check=True)
            if normalized.stat().st_size < 1000:
                raise RuntimeError(f'Incomplete voice asset: {normalized}')
            print(f'{language}/{name}: {MP3(normalized).info.length:.2f}s', flush=True)
    await asyncio.gather(*(generate(language, voice, name, phrase)
        for language, (voice, phrases) in VOICES.items() for name, phrase in zip(NAMES, phrases) if not only or name == only))
    # Install only after all requested recordings have succeeded.
    for language in VOICES:
        for name in NAMES:
            if not only or name == only:
                (ROOT / language / f'{name}.mp3').write_bytes((staging / f'{language}-{name}.mp3').read_bytes())
    durations = {language: [math.ceil(MP3(ROOT / language / f'{name}.mp3').info.length * 1000) for name in NAMES] for language in VOICES}
    (ROOT.parent.parent / 'src/voice-durations.json').write_text(json.dumps(durations, indent=2) + '\n', encoding='utf-8')

if __name__ == '__main__':
    asyncio.run(main())
