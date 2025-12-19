import { I18nContext } from 'nestjs-i18n';

/**
 * Translate a message key to the current language
 * @param key - Translation key (e.g., 'auth.emailNotExists')
 * @param fallback - Fallback message in English
 * @param options - Optional options: { args?: Record<string, any>, lang?: string }
 * @returns Translated message or fallback
 */
export function t(
  key: string,
  fallback?: string,
  options?: { args?: Record<string, any>; lang?: string },
): string {
  const i18n = I18nContext.current();

  // If no i18n context (e.g., called outside a request), return the fallback
  if (!i18n) return fallback ?? '';

  try {
    // Fetch the raw localized string for the current language without passing args
    // (Passing options to the library may cause it to resolve to fallback language in some cases.)
    const raw = i18n.t(`messages.${key}`);

    // If no translation found, return fallback
    if (!raw || raw === `messages.${key}`) return fallback ?? '';

    // If args provided, do simple placeholder interpolation: replace {name} with args.name
    if (options?.args && typeof raw === 'string') {
      let interpolated = raw;
      for (const [k, v] of Object.entries(options.args)) {
        const safe = v == null ? '' : String(v);
        interpolated = interpolated.split(`{${k}}`).join(safe);
      }
      return interpolated;
    }

    return raw;
  } catch (err) {
    return fallback ?? '';
  }
}
