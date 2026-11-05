/** Currency options for the budget form. */

// Used when the browser can't list currencies (Intl.supportedValuesOf is missing in older engines).
const FALLBACK_CODES = [
  'AUD',
  'BRL',
  'CAD',
  'CHF',
  'CNY',
  'CZK',
  'DKK',
  'EUR',
  'GBP',
  'HKD',
  'IDR',
  'INR',
  'JPY',
  'KRW',
  'MXN',
  'NOK',
  'NZD',
  'PKR',
  'PLN',
  'SEK',
  'SGD',
  'THB',
  'TRY',
  'USD',
  'ZAR',
];

let cached = null;

/**
 * [{ code, label }] sorted by code, e.g. { code: 'EUR', label: 'EUR · Euro' }.
 * `include` guarantees a code is present (e.g. the trip's current currency).
 */
export function getCurrencyOptions(include = null, locale = undefined) {
  if (!cached) {
    let codes;
    try {
      codes = Intl.supportedValuesOf('currency');
    } catch {
      codes = FALLBACK_CODES;
    }
    let names = null;
    try {
      names = new Intl.DisplayNames(locale, { type: 'currency' });
    } catch {
      // Labels fall back to the bare code.
    }
    cached = codes.map((code) => {
      const name = names?.of(code);
      return { code, label: name && name !== code ? `${code} · ${name}` : code };
    });
  }
  if (include && !cached.some((option) => option.code === include)) {
    return [...cached, { code: include, label: include }].sort((a, b) =>
      a.code.localeCompare(b.code),
    );
  }
  return cached;
}
