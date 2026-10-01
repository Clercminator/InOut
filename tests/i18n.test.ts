import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { t, setLanguage, getLanguage, locale, message, protocolTitle, countLabel } from '../apps/mobile/src/i18n';
import es from '../apps/mobile/src/locales/es.json';
import pt from '../apps/mobile/src/locales/pt.json';
import content from '../release/content.json';

test('Spanish and Portuguese catalogs cover the same messages and retain all interpolation slots', () => {
  assert.deepEqual(Object.keys(es).sort(), Object.keys(pt).sort());
  const slots = (s: string) => [...s.matchAll(/\{\d+\}/g)].map(m => m[0]).sort();
  for (const [language, catalog] of Object.entries({ es, pt })) {
    for (const [source, translation] of Object.entries(catalog)) {
      assert.ok(translation.trim(), `${language}: ${source}`);
      assert.deepEqual(slots(source), slots(translation), `${language}: ${source}`);
    }
    for (const section of [...content.safety, ...content.privacy, ...content.support]) {
      assert.ok(section.body in catalog);
      assert.notEqual(t(section.body, language as 'es' | 'pt'), section.body);
    }
  }
});

test('composed breathing instructions, counters and results use translated grammar', () => {
  assert.equal(t('Next: Hold · 4s', 'es'), 'Siguiente: Pausa · 4s');
  assert.equal(t('Next: Hold · 4s', 'pt'), 'A seguir: Segure · 4s');
  assert.equal(t('1 of 3 practice days', 'pt'), '1 de 3 dias de prática');
  assert.equal(t('4s inhale · 4s hold · 4s exhale · 4s hold', 'es'), '4s inhala · 4s pausa · 4s exhala · 4s pausa');
  assert.equal(t('Tension down 4 points', 'pt'), 'A tensão diminuiu 4 pontos');
  assert.equal(t('Tension up 1 point', 'es'), 'La tensión subió 1 punto');
  assert.equal(t('DONE · VIEW HISTORY  →', 'es'), 'LISTO · VER HISTORIAL →');
  assert.equal(t('Hold. 4 seconds remaining. Cycle 6 of 12', 'es'), 'Pausa. Quedan 4 segundos. Ciclo 6 de 12');
  assert.equal(t('0 sessions · no paired ratings yet', 'pt'), '0 sessões · ainda sem avaliações antes e depois');
  assert.equal(t('Free · All ten breathing protocols included', 'pt'), 'Grátis · Os dez protocolos de respiração incluídos');
  assert.equal(t('Next: Sip in a little more · 2s', 'pt'), 'A seguir: Inspire um pouco mais · 2s');
  assert.equal(t('0 saved routines · 0 logged sessions', 'pt'), '0 rotinas salvas · 0 sessões registradas');
  assert.equal(t('Last 14 days · Since 11/09/2026', 'pt'), 'Últimos 14 dias · Desde 11/09/2026');
});

test('user names stay literal while built-in protocol names and dates follow the selected language', () => {
  try {
    setLanguage('pt');
    assert.equal(getLanguage(), 'pt');
    assert.equal(locale(), 'pt-BR');
    assert.equal(new Date(2026, 8, 24).toLocaleDateString(locale(), { month: 'long' }), 'setembro');
    assert.equal(protocolTitle({ id: 'box', name: 'Box Breathing' }), 'Respiração quadrada');
    assert.equal(protocolTitle({ id: 'custom-user', name: 'Focus' }), 'Focus');
    assert.equal(message('Start {0}', ['Focus']), 'Iniciar Focus');
    assert.equal(t('My completely personal phrase'), 'My completely personal phrase');
  } finally { setLanguage('en'); }
});

test('every supported voice has all thirteen bundled offline cues', () => {
  const names = ['inhale', 'top-up', 'exhale', 'complete', 'hold', 'hum', 'rest', 'recover', 'natural', 'inhale-left', 'inhale-right', 'exhale-left', 'exhale-right'];
  for (const language of ['es', 'pt']) for (const name of names) {
    const file = new URL(`../apps/mobile/assets/audio/${language}/${name}.mp3`, import.meta.url);
    assert.ok(readFileSync(file).byteLength > 1000);
  }
});


test('counts use natural singular and plural forms in both languages', () => {
  assert.equal(countLabel(1, 'session', 'es'), '1 sesión');
  assert.equal(countLabel(2, 'session', 'es'), '2 sesiones');
  assert.equal(countLabel(0, 'session', 'pt'), '0 sessões');
  assert.equal(countLabel(1, 'session', 'pt'), '1 sessão');
  assert.equal(countLabel(1, 'practiceDay', 'pt'), '1 dia de prática');
  assert.equal(countLabel(2, 'practiceDay', 'pt'), '2 dias de prática');
  assert.equal(countLabel(1, 'cycle', 'es'), '1 ciclo');
  assert.equal(countLabel(1, 'repeat', 'pt'), '1 repetição');
  assert.equal(countLabel(1, 'milestone', 'en'), '1 milestone');
  assert.equal(t('12 this week', 'es'), '12 esta semana');
  assert.equal(t('12 this week', 'pt'), '12 nesta semana');
  assert.equal(t('12 this day', 'pt'), '12 hoje');
  assert.equal(t('12 this month', 'es'), '12 este mes');
});

test('reflection and breathing vocabulary is idiomatic and badges never retain English labels', () => {
  assert.equal(t('State Shift', 'es'), 'Antes y después');
  assert.equal(t('State Shift', 'pt'), 'Antes e depois');
  assert.equal(t('Hum softly as you breathe out', 'es'), 'Exhala con un zumbido suave');
  assert.equal(t('Hum softly as you breathe out', 'pt'), 'Expire fazendo um zumbido suave');
  assert.equal(t('★ 3 practice days', 'pt'), '★ 3 dias de prática');
  assert.equal(t('✓ Mint palette', 'es'), '✓ Paleta menta');
  assert.equal(t('Move up 2', 'pt'), 'Mover item 2 para cima');
  assert.equal(t('Remove 2', 'es'), 'Quitar elemento 2');
});
