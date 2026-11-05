/** Saved links ({ id, type, label, url }) the user attaches to a trip, e.g. booking confirmations. */
import { LINK_TYPES } from './constants.js';
import { normalizeUrl } from './bookingLinks.js';

export const EMPTY_LINK_VALUES = { type: 'hotel', label: '', url: '' };

function linkFields({ type, label, url }) {
  return { type, label: label.trim(), url: normalizeUrl(url) };
}

/** `values` must already be validated (validateSavedLink). */
export function createSavedLink(values, createId) {
  return { id: createId(), ...linkFields(values) };
}

export function applySavedLinkValues(link, values) {
  return { ...link, ...linkFields(values) };
}

export function savedLinkToValues(link) {
  return { type: link.type, label: link.label, url: link.url };
}

export function linkTypeLabel(value) {
  return LINK_TYPES.find((option) => option.value === value)?.label ?? 'Other';
}
