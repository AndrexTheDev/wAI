/**
 * Share links: turning a share code into a URL that works everywhere.
 *
 * A raw `WAIX1.…` code is awkward to paste into a chat and completely opaque to
 * anyone without the app. A link is different: it renders a readable preview in
 * every messenger, opens the receiver's browser, and can hand off to the app.
 *
 *   https://<site>/a/#WAIX1.…            human-facing link (fragment, never sent
 *                                        to a server — the position stays local)
 *   https://<site>/a/?code=WAIX1.…       accepted on import (copy/paste friendliness)
 *   wai://anchor/WAIX1.…                 app deep link
 *
 * Decision: the code travels in the **fragment**. Fragments are not part of an
 * HTTP request, so neither GitHub Pages nor any other host ever sees the
 * coordinates. That is the difference between "we don't analyse anything" and
 * "we couldn't, even if we wanted to".
 */

export const SHARE_LINK_PATH = '/a/';
export const APP_SCHEME = 'wai';

/** Builds the https link a user actually sends to someone. */
export function buildShareLink(code: string, siteOrigin: string): string {
  const base = siteOrigin.replace(/\/+$/, '');
  return `${base}${SHARE_LINK_PATH}#${code}`;
}

/** Builds the `wai://` deep link used to push the anchor into the installed app. */
export function buildAppLink(code: string): string {
  return `${APP_SCHEME}://anchor/${code}`;
}

/**
 * Extracts a share code from anything a user might paste: a full link, a deep
 * link, or the bare code. Returns `null` when no code is present.
 */
export function extractShareCode(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  if (text.startsWith('WAIX1.')) return text.split(/\s/)[0];

  // wai://anchor/WAIX1.…  (checked first: it also contains a "#" for intent URIs)
  const deep = /wai:\/\/anchor\/(WAIX1\.[A-Za-z0-9_-]+)/.exec(text);
  if (deep) return deep[1];

  // intent://…/WAIX1.…#Intent;scheme=wai;…  (Android, with browser fallback)
  const intent = /intent:\/\/anchor\/(WAIX1\.[A-Za-z0-9_-]+)/.exec(text);
  if (intent) return intent[1];

  // Fragment (our canonical form), then query parameter.
  const hashIndex = text.indexOf('#');
  if (hashIndex >= 0) {
    const fragment = text.slice(hashIndex + 1).trim();
    if (fragment.startsWith('WAIX1.')) return fragment;
  }
  const match = /[?&]code=([^&#\s]+)/.exec(text);
  if (match) {
    const decoded = decodeURIComponent(match[1]);
    if (decoded.startsWith('WAIX1.')) return decoded;
  }
  return null;
}

/**
 * Human-readable intent link for Android app indexing: opens the installed app
 * when present, otherwise falls back to the web preview.
 */
export function buildIntentLink(code: string, siteOrigin: string): string {
  const web = buildShareLink(code, siteOrigin);
  return `intent://anchor/${code}#Intent;scheme=${APP_SCHEME};package=dev.andrexthedev.wai;S.browser_fallback_url=${encodeURIComponent(web)};end`;
}
