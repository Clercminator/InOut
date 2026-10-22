"""Generate Maestro flows from the app's own localization catalog."""
import json
import re
import sys
from pathlib import Path

language, output = sys.argv[1:]
catalog = json.loads(Path('apps/mobile/src/locales/es.json').read_text(encoding='utf-8')) if language == 'es' else {}

def label(text):
    translated = catalog.get(text, text)
    if language == 'es' and translated == text:
        raise ValueError(f'Missing Spanish selector: {text}')
    return json.dumps(re.escape(translated), ensure_ascii=False)

def tap(text):
    return f'- tapOn: {label(text)}\n'

def visible(text):
    return f'- assertVisible: {label(text)}\n'

def shot(name):
    return '- waitForAnimationToEnd:\n    timeout: 1500\n- assertNotVisible: "(?i).*TEST AD.*|.*DEVELOPMENT DEMO.*|.*Loading.*|.*Cargando.*"\n' + f'- takeScreenshot: {name}\n'

flow = 'appId: com.imrtech.inout\n---\n- launchApp:\n    clearState: true\n'
flow += tap('Personalize InOut') + tap('Skip personalization') + tap('I understand') + tap('Continue') + tap("Let's get started") + tap('Close subscription offer')
flow += visible('Explore protocols') + shot('01-home')
flow += tap('Explore protocols') + visible('Find your rhythm.') + shot('03-protocol-library')
flow += tap('Go back') + tap('Challenges') + visible('Test yourself. Build a habit. Take it into your day.') + shot('04-challenges')
flow += '- openLink: "inout://pre?id=physiological-sigh"\n- tapOn: { text: "Open|Abrir", optional: true }\n'
flow += tap('Skip rating & continue') + tap('Start practice')
flow += visible('Pause') + shot('02-breathing-session')
flow += f'- extendedWaitUntil:\n    visible: {label("How tense are you now?")}\n    timeout: 120000\n'
flow += tap('Skip & save session')
flow += '- openLink: "inout://progress"\n- tapOn: { text: "Open|Abrir", optional: true }\n'
flow += visible('Your practice, taking shape.') + shot('05-results')
Path(output).write_text(flow, encoding='utf-8')
