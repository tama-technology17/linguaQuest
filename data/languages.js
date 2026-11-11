import { en } from './en.js';
import { ja } from './ja.js';
import { ko } from './ko.js';
import { zh } from './zh.js';
import { ar } from './ar.js';
import { es } from './es.js';
import { fr } from './fr.js';
import { de } from './de.js';

export const LANGUAGES = [en, ja, ko, zh, ar, es, fr, de];
export const LANG_MAP = Object.fromEntries(LANGUAGES.map(l => [l.id, l]));

export function getLanguage(id) { return LANG_MAP[id]; }