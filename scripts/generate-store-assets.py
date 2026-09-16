"""Render the existing IN/OUT wordmark for launcher and store requirements."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT = next((ROOT / 'node_modules/@expo-google-fonts/inter').rglob('Inter_800ExtraBold.ttf'))
OUT = ROOT / 'release/assets'
OUT.mkdir(parents=True, exist_ok=True)

def wordmark(image, y, size, monochrome=False):
    font = ImageFont.truetype(str(FONT), size)
    draw = ImageDraw.Draw(image)
    x = (image.width - draw.textlength('IN/OUT', font=font)) / 2
    for text, color in [('IN','#ffffff'),('/','#ffffff' if monochrome else '#adc6ff'),('OUT','#ffffff')]:
        draw.text((x,y),text,font=font,fill=color,anchor='lt')
        x += draw.textlength(text,font=font)

icon = Image.new('RGB',(1024,1024),'#111317')
wordmark(icon,435,178)
icon.save(ROOT/'apps/mobile/assets/icon.png')
icon.resize((512,512),Image.Resampling.LANCZOS).save(OUT/'google-play-icon.png')
for filename, mono in [('adaptive-icon.png',False),('monochrome-icon.png',True)]:
    layer=Image.new('RGBA',(1024,1024))
    wordmark(layer,448,155,mono)
    layer.save(ROOT/'apps/mobile/assets'/filename)
feature=Image.new('RGB',(1024,500),'#111317')
wordmark(feature,112,110)
draw=ImageDraw.Draw(feature)
font=ImageFont.truetype(str(FONT),38)
title="Breathe for what's next."
draw.text(((1024-draw.textlength(title,font=font))/2,280),title,font=font,fill='#adc6ff')
feature.save(OUT/'google-play-feature.png')
print('Created launcher icons and Google Play presentation assets.')
