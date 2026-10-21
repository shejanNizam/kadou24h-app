/**
 * Makes the CV PDF on the phone from the profile (expo-print renders an HTML
 * page to a PDF file), then it is uploaded and saved as `generatedCv`. The
 * contact lines (phone, e-mail) are in the file: recruiters only get the file
 * after paying the CV unlock.
 */
import * as Print from 'expo-print';
import type { TFunction } from 'i18next';
import { Platform } from 'react-native';

import { uploadFile } from '@/lib/upload';
import type { FileRef } from '@/types/api';

import type { MyCv } from './types';

const esc = (s?: string) =>
  (s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const monthYear = (iso: string | undefined, lang: string) =>
  iso ? new Date(iso).toLocaleDateString(lang, { month: 'short', year: 'numeric' }) : '';

export function cvHtml(cv: MyCv, person: { name: string; phone?: string; email?: string }, t: TFunction, lang: string): string {
  const section = (title: string, body: string) => (body ? `<h2>${esc(title)}</h2>${body}` : '');
  const experience = cv.profileExperience
    .map(
      (e) => `<div class="item">
        <div class="row"><b>${esc(e.title)}</b><span>${esc([monthYear(e.startDate, lang), e.isCurrent ? t('cv.present') : monthYear(e.endDate, lang)].filter(Boolean).join(' – '))}</span></div>
        <div class="muted">${esc([e.company, e.location].filter(Boolean).join(' · '))}</div>
        ${e.description ? `<p>${esc(e.description)}</p>` : ''}
      </div>`,
    )
    .join('');
  const education = cv.profileEducation
    .map((e) => `<div class="item"><div class="row"><b>${esc(e.degree)}</b><span>${esc(e.year)}</span></div><div class="muted">${esc(e.institution)}</div></div>`)
    .join('');
  const chips = (items: string[]) => (items.length ? `<div class="chips">${items.map((s) => `<span>${esc(s)}</span>`).join('')}</div>` : '');
  const list = (items: string[]) => (items.length ? `<ul>${items.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : '');

  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #1F1A2E; margin: 36px; font-size: 12.5px; line-height: 1.45; }
  header { display: flex; gap: 18px; align-items: center; border-bottom: 3px solid #8B5CF6; padding-bottom: 14px; }
  header img { width: 84px; height: 84px; border-radius: 42px; object-fit: cover; }
  h1 { margin: 0; font-size: 24px; }
  .role { color: #8B5CF6; font-size: 15px; font-weight: 600; margin-top: 2px; }
  .contact { color: #6B6680; margin-top: 4px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #8B5CF6; margin: 20px 0 8px; }
  .item { margin-bottom: 10px; }
  .row { display: flex; justify-content: space-between; gap: 12px; }
  .row span, .muted { color: #6B6680; }
  p { margin: 4px 0 0; }
  .chips span { display: inline-block; background: #F3EEFF; color: #5B3BB5; border-radius: 12px; padding: 3px 10px; margin: 0 6px 6px 0; }
  ul { margin: 0; padding-left: 18px; }
  footer { margin-top: 28px; color: #9A95AA; font-size: 10px; text-align: center; }
</style></head><body>
<header>
  ${cv.photo?.url ? `<img src="${esc(cv.photo.url)}"/>` : ''}
  <div>
    <h1>${esc(person.name)}</h1>
    ${cv.profession ? `<div class="role">${esc(cv.profession)}</div>` : ''}
    <div class="contact">${esc([cv.city, person.phone, person.email].filter(Boolean).join('  ·  '))}</div>
  </div>
</header>
${section(t('cv.summary'), cv.summary ? `<p>${esc(cv.summary)}</p>` : '')}
${section(t('cv.experience'), experience)}
${section(t('cv.education'), education)}
${section(t('cv.skills'), chips(cv.skills))}
${section(t('cv.languages'), chips(cv.languages))}
${section(t('cv.achievements'), list(cv.achievements))}
<footer>${esc(t('cv.madeWith'))}</footer>
</body></html>`;
}

/** null on web (the browser can only print); the app makes the file */
export async function makeCvPdf(cv: MyCv, person: { name: string; phone?: string; email?: string }, t: TFunction, lang: string): Promise<FileRef | null> {
  if (Platform.OS === 'web') return null;
  const { uri } = await Print.printToFileAsync({ html: cvHtml(cv, person, t, lang), base64: false });
  const safeName = person.name.normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'cv';
  return uploadFile(uri, { name: `cv-${safeName}.pdf`, type: 'application/pdf' });
}
