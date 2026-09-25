import { callAi, isAiAvailable } from './client.js';
import { CATEGORIES } from '../expenses/index.js';

/**
 * Suggest a category for a free-text expense title/description. Purely
 * advisory: the user picks from the dropdown either way, this only
 * pre-selects a likely option. Falls back to simple keyword matching if the
 * AI backend is unavailable, so the feature degrades gracefully rather than
 * disappearing.
 */
export async function suggestCategory(text) {
  if (!text || !text.trim()) return null;

  if (isAiAvailable()) {
    const result = await callAi('categorize_expense', { text, categories: CATEGORIES });
    if (result?.category && CATEGORIES.includes(result.category)) {
      return { category: result.category, source: 'ai' };
    }
  }

  return { category: keywordFallback(text), source: 'keyword' };
}

function keywordFallback(text) {
  const t = text.toLowerCase();
  const rules = [
    [/grocer|vegetable|rice|supermarket|reliance|dmart/, 'Groceries'],
    [/electric|power bill/, 'Electricity'],
    [/internet|wifi|broadband/, 'Internet'],
    [/rent|landlord/, 'Rent'],
    [/restaurant|dinner|lunch|cafe|coffee|food|swiggy|zomato/, 'Food'],
    [/uber|ola|taxi|flight|train|bus|fuel|petrol/, 'Travel'],
    [/medicine|pharmacy|doctor|hospital|clinic/, 'Medical'],
    [/movie|netflix|game|concert/, 'Entertainment'],
    [/school|tuition|course|book/, 'Education'],
    [/amazon|flipkart|mall|clothes|shopping/, 'Shopping'],
    [/water|gas|utility|utilities/, 'Utilities'],
  ];
  for (const [re, category] of rules) {
    if (re.test(t)) return category;
  }
  return 'Other';
}
