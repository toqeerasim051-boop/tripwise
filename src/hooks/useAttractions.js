import { useAsyncResource } from './useAsyncResource.js';
import { getAllAttractions, getAttractions } from '../services/attractions.js';

const loadAttractions = (code) => getAttractions(code);
const loadAllAttractions = () => getAllAttractions();

/** Curated attractions for a country code ([] when none). Pass null to skip. */
export function useAttractions(countryCode) {
  return useAsyncResource(countryCode ? countryCode.toUpperCase() : null, loadAttractions);
}

/** Every curated country's attractions: { [code]: attraction[] }. */
export function useAllAttractions() {
  return useAsyncResource('all', loadAllAttractions);
}
