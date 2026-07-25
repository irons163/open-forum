/**
 * GitHub redirects renamed repositories, so the name in project-seeds.json can
 * differ from the canonical `full_name` the API returns. History is keyed by
 * canonical name, so entries filed under a stale seed name have to be carried
 * over, otherwise a rename silently resets the tracked series.
 *
 * Returns the entries to build on, and drops the stale key from `history`.
 */
export function takePreviousEntries(history, seedName, canonicalName) {
  const canonicalEntries = Array.isArray(history[canonicalName]) ? history[canonicalName] : [];
  const legacyEntries = Array.isArray(history[seedName]) ? history[seedName] : [];

  if (seedName !== canonicalName) {
    delete history[seedName];
  }

  return canonicalEntries.length ? canonicalEntries : legacyEntries;
}
