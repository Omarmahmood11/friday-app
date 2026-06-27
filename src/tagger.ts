export type Mood = 'idea' | 'memory' | 'task' | 'reflection' | 'note';

export interface TagResult {
  mood: Mood;
  tags: string[];
}

export const MOOD_META: Record<Mood, { label: string; plural: string; dotColor: string; badgeClass: string }> = {
  idea:       { label: 'Idea',       plural: 'Ideas',       dotColor: 'bg-violet-400', badgeClass: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300' },
  memory:     { label: 'Memory',     plural: 'Memories',    dotColor: 'bg-amber-400',  badgeClass: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300' },
  task:       { label: 'Task',       plural: 'Tasks',       dotColor: 'bg-green-400',  badgeClass: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300' },
  reflection: { label: 'Reflection', plural: 'Reflections', dotColor: 'bg-sky-400',    badgeClass: 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300' },
  note:       { label: 'Note',       plural: 'Notes',       dotColor: 'bg-stone-400',  badgeClass: 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400' },
};

const MOOD_ORDER: Mood[] = ['idea', 'task', 'memory', 'reflection', 'note'];
export { MOOD_ORDER };

export function analyzeEntry(text: string): TagResult {
  const wordCount = text.trim().split(/\s+/).length;
  if (!text.trim() || wordCount < 4) return { mood: 'note', tags: [] };

  const lower = text.toLowerCase();
  const scores: Record<string, number> = { idea: 0, memory: 0, task: 0, reflection: 0 };

  // Task signals — obligations, action items, reminders
  ([
    /\bneed to\b/, /\bwant to\b/, /\bshould\b/, /\bmust\b/, /\bhave to\b/,
    /\bto[\s-]do\b/, /\btodo\b/, /\breminder\b/, /\bdon'?t forget\b/,
    /\bremember to\b/, /\bfollow[ -]up\b/, /\bschedule\b/, /\bdeadline\b/,
    /\bbook\b/, /\bset up\b/, /\borganize\b/,
  ] as RegExp[]).forEach(p => { if (p.test(lower)) scores.task += 2; });

  // Idea signals — hypotheticals, concepts, possibilities, building things
  ([
    /\bwhat if\b/, /\bimagine\b/, /\bidea\b/, /\bcould be\b/, /\bmaybe\b/,
    /\bpossibly\b/, /\bwhat about\b/, /\bconcept\b/, /\bbuild\b/,
    /\bcreate\b/, /\blaunch\b/, /\bstart\b/, /\bproduct\b/,
    /\bfeature\b/, /\bstrategy\b/, /\bplan\b/, /\bdesign\b/,
  ] as RegExp[]).forEach(p => { if (p.test(lower)) scores.idea += 2; });

  // Memory signals — past events, specific moments, experiences
  ([
    /\btoday\b/, /\byesterday\b/, /\blast (week|month|year|night|time)\b/,
    /\bremember when\b/, /\bi (went|saw|met|had|visited|did)\b/,
    /\bwe (went|saw|met|had|visited|did)\b/,
    /\bwas (amazing|great|fun|terrible|awful|good|bad|perfect)\b/,
    /\bfelt (so|really|very)?\b/, /\bwish i\b/, /\bso (good|fun|great)\b/,
  ] as RegExp[]).forEach(p => { if (p.test(lower)) scores.memory += 2; });
  const pastTenseCount = (text.match(/\b\w+ed\b/g) || []).length;
  scores.memory += Math.min(pastTenseCount * 0.4, 3);

  // Reflection signals — introspection, questions, big-picture thinking
  ([
    /\bi think\b/, /\bi feel\b/, /\bi believe\b/, /\bi wonder\b/,
    /\breali[sz]e\b/, /\bunderstand\b/, /\blearn(ed|ing)?\b/, /\bwhy\b/,
    /\bmeaning\b/, /\btruth\b/, /\bperspective\b/, /\bgrowth\b/,
    /\bjourney\b/, /\bchanged\b/, /\bimportant\b/, /\blife\b/,
    /\bstrange\b/, /\bcurious\b/, /\bhard to\b/,
  ] as RegExp[]).forEach(p => { if (p.test(lower)) scores.reflection += 2; });
  const questionCount = (text.match(/\?/g) || []).length;
  scores.reflection += questionCount * 1.5;

  // Find dominant mood
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const mood: Mood = sorted[0][1] >= 2 ? (sorted[0][0] as Mood) : 'note';

  // Topic tags (content-based)
  const tags: string[] = [];
  const topicPatterns: [string, RegExp][] = [
    ['work',     /\bwork\b|\bproject\b|\bmeeting\b|\bclient\b|\bdeadline\b|\boffice\b|\bjob\b/],
    ['health',   /\bexercise\b|\bworkout\b|\bsleep\b|\beat\b|\bfitness\b|\bhealth\b|\brun\b|\bgym\b/],
    ['creative', /\bdesign\b|\bart\b|\bmusic\b|\bcreate\b|\bbuild\b|\bwrite\b|\bfilm\b|\bphoto\b/],
    ['learning', /\blearn\b|\bread\b|\bbook\b|\bcourse\b|\bstudy\b|\bwatch\b|\bpodcast\b/],
    ['people',   /\bfriend\b|\bfamily\b|\bhe said\b|\bshe said\b|\bthey\b|\bmet\b|\bpeople\b/],
  ];
  topicPatterns.forEach(([tag, pattern]) => {
    if (pattern.test(lower)) tags.push(tag);
  });

  return { mood, tags: tags.slice(0, 2) };
}
