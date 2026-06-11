/**
 * Photo store — persistence layer for captured garment photos.
 *
 * Photos live under `Paths.document/wardrobe/items/<itemId>.jpg` (the
 * expo-file-system v56 `Paths`/`File`/`Directory` API), so they survive app
 * restarts and are removed when their wardrobe item is removed. Screens
 * render the saved URIs via `expo-image` (14px radius, per the ItemPhoto
 * spec).
 */

import { Directory, File, Paths } from 'expo-file-system';

/** Directory (relative to `Paths.document`) holding all item photos. */
const PHOTOS_DIRECTORY = 'wardrobe/items';

/** Directory instance for `Paths.document/wardrobe/items`. */
function photosDirectory(): Directory {
  return new Directory(Paths.document, PHOTOS_DIRECTORY);
}

/** File instance for an item's photo. The file may not exist yet. */
function photoFile(itemId: string): File {
  return new File(Paths.document, PHOTOS_DIRECTORY, `${itemId}.jpg`);
}

/**
 * Persisted photo URI for an item, or `null` if no photo has been saved.
 * Screens pass this straight to `expo-image`.
 */
export function photoUri(itemId: string): string | null {
  const file = photoFile(itemId);
  return file.exists ? file.uri : null;
}

/**
 * Copies a freshly captured photo (camera cache `tempUri`) into persistent
 * storage as `wardrobe/items/<itemId>.jpg`, replacing any previous photo
 * for the item. Returns the persisted URI.
 */
export async function savePhoto(tempUri: string, itemId: string): Promise<string> {
  const directory = photosDirectory();
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  const destination = photoFile(itemId);
  await new File(tempUri).copy(destination, { overwrite: true });
  return destination.uri;
}

/** Deletes the persisted photo for an item. No-op if none exists. */
export function deletePhoto(itemId: string): void {
  const file = photoFile(itemId);
  if (file.exists) {
    file.delete();
  }
}

/**
 * Orphan sweep: removes any stored photo whose item id is no longer in
 * `keepItemIds`. Safety net alongside the per-removal `deletePhoto` call
 * wired into the wardrobe store.
 */
export function removeOrphanedPhotos(keepItemIds: readonly string[]): void {
  const directory = photosDirectory();
  if (!directory.exists) return;

  const keep = new Set(keepItemIds);
  for (const entry of directory.list()) {
    if (!(entry instanceof File)) continue;
    const itemId = entry.name.replace(/\.jpg$/, '');
    if (!keep.has(itemId)) {
      entry.delete();
    }
  }
}
