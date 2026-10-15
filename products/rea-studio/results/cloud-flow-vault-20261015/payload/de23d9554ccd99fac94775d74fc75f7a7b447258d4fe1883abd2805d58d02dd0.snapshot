/** Shared read/save/search contract, measured in JavaScript UTF-16 code units. */
export const MAX_EDITOR_PATH_CHARACTERS = 1024;
export function editorRelativePath(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > MAX_EDITOR_PATH_CHARACTERS || value.includes('\0')) throw new Error('Choose a relative file path.');
  return value.replaceAll('\\', '/');
}
