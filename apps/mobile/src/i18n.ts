import es from './locales/es.json';
import pt from './locales/pt.json';
import { protocols } from '@inout/protocols';
import type { Protocol, SessionRecord } from '@inout/shared-types';

export type Language = 'en' | 'es' | 'pt';
export const languages = [
  { id: 'en', name: 'English', locale: 'en-US' },
  { id: 'es', name: 'Español', locale: 'es-419' },
  { id: 'pt', name: 'Português', locale: 'pt-BR' },
] as const;
export const isLanguage = (value: unknown): value is Language => languages.some(item => item.id === value);
let language: Language = 'en';
const listeners = new Set<() => void>();
export const getLanguage = () => language;
export const locale = () => languages.find(item => item.id === language)!.locale;
export const subscribeLanguage = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function setLanguage(value: Language) {
  if (value === language) return;
  language = value;
  listeners.forEach(listener => listener());
}

const catalogs: Record<string, Record<string, string>> = { es, pt };
const normalized = Object.fromEntries(Object.entries(catalogs).map(([lang, entries]) => [lang,
  new Map(Object.entries(entries).map(([key, value]) => [key.toLowerCase(), value])),
]));

/** Translate app-owned copy only. User-authored values bypass this at their display sites. */
export function t(source: string, selected: Language = language): string {
  if (selected === 'en') return source;
  const text = source.replace(/\s+/g, ' ').trim();
  const translated = translate(text, selected);
  return translated === text ? source : (source.match(/^\s*/)?.[0] ?? '') + translated + (source.match(/\s*$/)?.[0] ?? '');
}
function translate(source: string, selected: Language): string {
  if (selected === 'en' || !source) return source;
  const text = source.replace(/\s+/g, ' ').trim();
  const exact = catalogs[selected][text];
  if (exact) return source.replace(text, exact);
  const insensitive = normalized[selected].get(text.toLowerCase());
  if (insensitive) {
    const translated = text === text.toUpperCase() ? insensitive.toUpperCase()
      : text === text.toLowerCase() ? insensitive.toLowerCase() : insensitive;
    return translated;
  }
  const badge = /^([★✓○]\s*)(.+)$/.exec(text);
  if (badge) return badge[1] + t(badge[2], selected);
  // Full sentences that include separators take precedence over composing labels.
  for (const template of templates[selected].filter(item => item.compound)) {
    const match = template.expression.exec(text);
    if (match) return template.value.replace(/\{(\d+)\}/g, (_, index) => t(match[Number(index) + 1], selected));
  }
  // Separators are presentation, not part of a protocol name or label.
  const pieces = text.split(/(\s*·\s*|\s*→\s*|\n)/);
  if (pieces.length > 1) return pieces.map((piece, index) => index % 2 ? piece : t(piece, selected)).join('');
  for (const template of templates[selected].filter(item => !item.compound)) {
    const match = template.expression.exec(text);
    if (match) return template.value.replace(/\{(\d+)\}/g, (_, index) => t(match[Number(index) + 1], selected));
  }
  // Translate a known sentence with a display-only final period.
  if (text.endsWith('.')) {
    const body = text.slice(0, -1);
    const translated = t(body, selected);
    if (translated !== body) return translated + '.';
  }
  return source;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const templates = Object.fromEntries(Object.entries(catalogs).map(([lang, entries]) => [lang,
  Object.entries(entries).filter(([key]) => /\{\d+\}/.test(key)).sort(([a], [b]) => b.replace(/\{\d+\}/g, '').length - a.replace(/\{\d+\}/g, '').length).map(([key, value]) => ({
    expression: new RegExp('^' + key.split(/(\{\d+\})/).map(part => {
      if (!/^\{\d+\}$/.test(part)) return escape(part);
      if ((key === '{0}s {1}' && part === '{0}') || (key === '{0} {1}s' && part === '{1}')) return '([0-9.]+)';
      return '(.+?)';
    }).join('') + '$', 'i'), value, compound: /·|\n/.test(key),
  })),
]));

export function message(key: string, values: Array<string | number>, selected: Language = language) {
  const translated = selected === 'en' ? key : catalogs[selected][key] ?? key;
  return translated.replace(/\{(\d+)\}/g, (_, index) => String(values[Number(index)]));
}

export function protocolTitle(protocol: Pick<Protocol, 'id' | 'name'>) {
  return protocols.some(item => item.id === protocol.id) ? t(protocol.name) : protocol.name;
}
export function recordTitle(record: SessionRecord) {
  if (record.source === "manual") return t("Manual breathing");
  return record.protocol ? protocolTitle(record.protocol)
    : protocolTitle({ id: record.protocolId, name: record.protocolName });
}

export function decimal(value: number, digits = 1) {
  return value.toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

const countUnits = {
  session: ['session', 'sessions'], day: ['day', 'days'],
  practiceDay: ['practice day', 'practice days'], consecutiveDay: ['consecutive day', 'consecutive days'],
  milestone: ['milestone', 'milestones'], cycle: ['cycle', 'cycles'], repeat: ['repeat', 'repeats'],
} as const;
export function countLabel(count: number, unit: keyof typeof countUnits, selected: Language = language) {
  const words = countUnits[unit];
  return message(`{0} ${words[count === 1 ? 0 : 1]}`, [count], selected);
}
