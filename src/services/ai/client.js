/**
 * Thin wrapper around whichever AI provider you wire up.
 *
 * IMPORTANT: this file intentionally does NOT call a third-party AI API
 * directly with a secret key from the browser. If your provider needs a
 * secret key, create a Supabase Edge Function (or any small backend) that
 * holds the key server-side, and point AI_ENDPOINT at that function. This
 * file only ever calls YOUR endpoint with the public anon session attached.
 *
 * Every exported function in this module is designed to fail soft: on any
 * error (network, missing config, bad response) it resolves to `null`/a
 * safe fallback rather than throwing, so a flaky AI provider can never break
 * expense creation or balance calculation, which are pure src/utils logic
 * with zero AI involvement.
 */

import { supabase } from '../supabase/client.js';

const AI_ENABLED = String(import.meta.env.VITE_AI_FEATURES_ENABLED).toLowerCase() === 'true';
// Point this at a Supabase Edge Function (e.g. `${VITE_SUPABASE_URL}/functions/v1/ai-assist`)
// that holds your provider's secret key server-side.
const AI_ENDPOINT = import.meta.env.VITE_AI_ENDPOINT;

export function isAiAvailable() {
  return AI_ENABLED && !!AI_ENDPOINT;
}

/**
 * Calls the configured AI backend with a task name + payload. Returns
 * `null` on any failure instead of throwing, so callers never need a
 * try/catch to stay safe - just check for `null`.
 */
export async function callAi(task, payload, { timeoutMs = 8000 } = {}) {
  if (!isAiAvailable()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ task, payload }),
      signal: controller.signal,
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`AI request failed (${task}); continuing without AI assistance.`, err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
