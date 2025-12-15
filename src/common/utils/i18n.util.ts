import { I18nContext } from 'nestjs-i18n';

/**
 * Translate a message key to the current language
 * @param key - Translation key (e.g., 'auth.emailNotExists')
 * @param fallback - Fallback message in English
 * @returns Translated message or fallback
 */
export function t(key: string, fallback: string): string {
  return I18nContext.current()?.t(`messages.${key}`) ?? fallback;
}
