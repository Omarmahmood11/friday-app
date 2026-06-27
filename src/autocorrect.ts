const CORRECTIONS: Record<string, string> = {
  // contractions
  "dont": "don't",
  "wont": "won't",
  "cant": "can't",
  "shouldnt": "shouldn't",
  "couldnt": "couldn't",
  "wouldnt": "wouldn't",
  "isnt": "isn't",
  "wasnt": "wasn't",
  "arent": "aren't",
  "havent": "haven't",
  "hasnt": "hasn't",
  "hadnt": "hadn't",
  "didnt": "didn't",
  "doesnt": "doesn't",
  "im": "I'm",
  "ive": "I've",
  "theyre": "they're",
  "theyll": "they'll",
  "theyve": "they've",
  "weve": "we've",
  "youre": "you're",
  "youve": "you've",
  "youll": "you'll",
  "hes": "he's",
  "shes": "she's",
  "thats": "that's",
  "whats": "what's",
  "whos": "who's",
  "hows": "how's",
  "wheres": "where's",
  "theres": "there's",
  "lets": "let's",
  "aint": "ain't",
  "itsnt": "it isn't",
  // common typos
  "teh": "the",
  "hte": "the",
  "adn": "and",
  "nad": "and",
  "alot": "a lot",
  "becuase": "because",
  "becasue": "because",
  "recieve": "receive",
  "wierd": "weird",
  "occured": "occurred",
  "seperate": "separate",
  "definately": "definitely",
  "defiantly": "definitely",
  "enabke": "enable",
  "tje": "the",
  "yuo": "you",
  "taht": "that",
  "waht": "what",
  "thnik": "think",
  "hapened": "happened",
  "realy": "really",
  "truely": "truly",
  "untill": "until",
  "adress": "address",
  "beleive": "believe",
  "compfortable": "comfortable",
  "expereince": "experience",
  "freind": "friend",
  "grammer": "grammar",
  "independant": "independent",
  "occurance": "occurrence",
  "perseverence": "perseverance",
  "prefered": "preferred",
  "reccomend": "recommend",
  "relevent": "relevant",
  "sence": "sense",
  "tommorow": "tomorrow",
  "tommorrow": "tomorrow",
  "tomarrow": "tomorrow",
  "unfortuately": "unfortunately",
  "wich": "which",
  "woud": "would",
  "coud": "could",
  "shoud": "should",
};

export function tryAutocorrect(
  text: string,
  spaceIdx: number // index of the space/newline that was just typed
): { text: string; cursorPos: number } | null {
  // Find the start of the word before the separator
  let wordStart = spaceIdx;
  while (wordStart > 0 && text[wordStart - 1] !== ' ' && text[wordStart - 1] !== '\n') {
    wordStart--;
  }
  const word = text.slice(wordStart, spaceIdx);
  if (!word || word.length < 2) return null;

  const lower = word.toLowerCase();
  const correction = CORRECTIONS[lower];
  if (!correction) return null;

  // Preserve leading capitalization
  const isCapitalized = word[0] >= 'A' && word[0] <= 'Z';
  const final = isCapitalized
    ? correction[0].toUpperCase() + correction.slice(1)
    : correction;

  // Replace [wordStart, spaceIdx) with `final`, keep separator
  const newText = text.slice(0, wordStart) + final + text.slice(spaceIdx);
  const newCursor = wordStart + final.length + 1; // +1 for separator
  return { text: newText, cursorPos: newCursor };
}
