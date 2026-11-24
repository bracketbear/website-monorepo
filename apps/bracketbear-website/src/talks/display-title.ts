const MINOR = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'of',
  'in',
  'on',
  'to',
  'for',
  'at',
  'by',
]);

/** Title case for a stored (uppercase) talk title; minor words stay lowercase unless first. */
export function displayTitle(title: string): string {
  return title
    .toLowerCase()
    .split(' ')
    .map((word, i) =>
      i > 0 && MINOR.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ');
}
