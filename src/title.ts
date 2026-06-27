// Derives a smart, human-readable title from entry text.

const STOP_WORDS = new Set([
  'a','an','the','and','but','or','so','yet','for','nor',
  'in','on','at','to','of','is','it','i','my','me','we',
  'was','be','are','as','by','do','if','up','no','not',
  'just','with','that','this','have','had','has','from',
  'about','some','been','were','will','can','its','our',
  'they','their','them','would','could','should','then',
  'when','where','while','which','what','how','why','who',
  'also','even','than','very','too','more','most','much',
  'into','onto','upon','over','under','after','before','between',
]);

// Words that should be stripped from the very start of a note before deriving title
const FILLER_OPENERS = [
  'okay','ok','so','well','basically','like','right','yeah','yep','yup',
  'alright','anyway','actually','honestly','literally','look','listen',
  'now','hey','hi','hello','hmm','um','uh','oh','ah','wow','lol',
];

// Verb → gerund mapping for nicer titles ("built" → "Building")
const VERB_TO_GERUND: Record<string, string> = {
  build:'Building', built:'Building', building:'Building',
  make:'Making', made:'Making', making:'Making',
  write:'Writing', wrote:'Writing', writing:'Writing',
  create:'Creating', created:'Creating', creating:'Creating',
  design:'Designing', designed:'Designing', designing:'Designing',
  start:'Starting', started:'Starting', starting:'Starting',
  launch:'Launching', launched:'Launching', launching:'Launching',
  develop:'Developing', developed:'Developing', developing:'Developing',
  ship:'Shipping', shipped:'Shipping', shipping:'Shipping',
  fix:'Fixing', fixed:'Fixing', fixing:'Fixing',
  add:'Adding', added:'Adding', adding:'Adding',
  update:'Updating', updated:'Updating', updating:'Updating',
  plan:'Planning', planned:'Planning', planning:'Planning',
  learn:'Learning', learned:'Learning', learning:'Learning',
  try:'Trying', tried:'Trying', trying:'Trying',
  work:'Working', worked:'Working', working:'Working',
  finish:'Finishing', finished:'Finishing', finishing:'Finishing',
  set:'Setting', setting:'Setting',
  move:'Moving', moved:'Moving', moving:'Moving',
  go:'Going', went:'Going', going:'Going',
  think:'Thinking', thought:'Thinking', thinking:'Thinking',
  figure:'Figuring', figured:'Figuring', figuring:'Figuring',
};

export function deriveTitle(text: string, hasVideo: boolean): string {
  if (!text.trim()) return hasVideo ? 'Video note' : 'Untitled';

  // --- Strip filler openers ---
  const rawWords = text.trim().split(/\s+/);
  let start = 0;
  // Strip leading filler words
  while (start < rawWords.length && FILLER_OPENERS.includes(rawWords[start].toLowerCase().replace(/[^a-z]/g, ''))) {
    start++;
  }
  // Skip leading "i" pronoun
  if (start < rawWords.length && rawWords[start].toLowerCase() === 'i') start++;
  // Skip another layer of filler after "i" ("i mean", "i think", "i was like")
  while (start < rawWords.length && FILLER_OPENERS.includes(rawWords[start].toLowerCase().replace(/[^a-z]/g, ''))) {
    start++;
  }

  const trimmedText = rawWords.slice(start).join(' ');
  if (!trimmedText) return hasVideo ? 'Video note' : 'Untitled';

  // --- Look for "called/named X" patterns anywhere in first 300 chars ---
  const chunk = text.slice(0, 300);
  const namedMatch =
    chunk.match(/\b(?:called|named)\s+([A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][A-Za-z0-9]*)?)/i);

  if (namedMatch) {
    const namedSubject = namedMatch[1].trim();
    // Find an action verb before the "called" keyword
    const beforeNamed = chunk.slice(0, namedMatch.index ?? 0);
    const beforeWords = beforeNamed.split(/\s+/).filter(Boolean);
    const actionVerb = beforeWords.find(w => VERB_TO_GERUND[w.toLowerCase()]);
    if (actionVerb) {
      const gerund = VERB_TO_GERUND[actionVerb.toLowerCase()];
      return `${gerund} ${titleCase(namedSubject)}`;
    }
    return titleCase(namedSubject);
  }

  // --- Use first real sentence of trimmed text ---
  const firstSent = trimmedText.split(/[.!?\n]/)[0].trim();
  const words = firstSent.split(/\s+/).filter(Boolean);

  if (words.length === 0) return hasVideo ? 'Video note' : 'Untitled';

  // Short enough → use directly
  if (words.length <= 5) return titleCase(firstSent);

  // Pick meaningful words (filter stop words)
  const meaningful = words.filter(w => !STOP_WORDS.has(w.toLowerCase().replace(/[^a-z']/g, '')));
  const chosen = meaningful.length >= 2 ? meaningful.slice(0, 4) : words.slice(0, 4);
  return titleCase(chosen.join(' '));
}

// Resolve a stored custom title or fall back to derived
export function resolveTitle(entry: { text: string; title?: string; videoIds?: string[]; videoId?: string }): string {
  if (entry.title && entry.title.trim()) return entry.title;
  const hasVideo = !!(entry.videoIds?.length || entry.videoId);
  return deriveTitle(entry.text, hasVideo);
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w, i) => {
      const clean = w.replace(/[^a-z]/gi, '').toLowerCase();
      if (i > 0 && STOP_WORDS.has(clean)) return w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}
