// Full-pass text polisher: contractions, typos, capitalization, keyboard-adjacency

// ─── Comprehensive word corrections ────────────────────────────────────────
const CORRECTIONS: Record<string, string> = {
  // contractions – unambiguous only (skip "ill", "id", "its", "well", "shed", "hell", "lets")
  wont:"won't", dont:"don't", cant:"can't",
  shouldnt:"shouldn't", couldnt:"couldn't", wouldnt:"wouldn't",
  isnt:"isn't", wasnt:"wasn't", arent:"aren't", werent:"weren't",
  havent:"haven't", hasnt:"hasn't", hadnt:"hadn't",
  didnt:"didn't", doesnt:"doesn't", mightnt:"mightn't",
  mustnt:"mustn't", neednt:"needn't", shant:"shan't",
  aint:"ain't",
  im:"I'm", ive:"I've",
  youre:"you're", youve:"you've", youll:"you'll", youd:"you'd",
  hes:"he's", shes:"she's",
  theyre:"they're", theyve:"they've", theyd:"they'd", theyll:"they'll",
  weve:"we've", wed:"we'd",
  thats:"that's", whats:"what's", whos:"who's", hows:"how's",
  wheres:"where's", theres:"there's", heres:"here's", whens:"when's",
  wouldve:"would've", couldve:"could've", shouldve:"should've",
  mustve:"must've", mightve:"might've",
  itd:"it'd", itll:"it'll", theyvent:"they haven't",

  // common misspellings
  teh:"the", hte:"the", tje:"the", thje:"the",
  adn:"and", nad:"and", anf:"and",
  alot:"a lot",
  yuo:"you", ypu:"you", oyu:"you",
  taht:"that", tath:"that",
  waht:"what", whta:"what",
  thnik:"think", htink:"think",
  jsut:"just", jstu:"just",
  siad:"said",
  liek:"like",
  hav:"have", hvae:"have", haev:"have",
  acutally:"actually", actaully:"actually", actualy:"actually",
  realy:"really", realky:"really", relly:"really",
  truely:"truly",
  grammer:"grammar",
  wierd:"weird",
  recieve:"receive", recieved:"received", recieving:"receiving",
  beleive:"believe", beleived:"believed", beleiving:"believing",
  freind:"friend", freinds:"friends",
  tommorow:"tomorrow", tommorrow:"tomorrow", tomarrow:"tomorrow",
  untill:"until",
  becuase:"because", becasue:"because", becuse:"because",
  hapened:"happened", happend:"happened",
  occured:"occurred", occuring:"occurring",
  seperate:"separate", seperated:"separated",
  definately:"definitely", defiantly:"definitely", definitly:"definitely",
  independant:"independent",
  adress:"address",
  expereince:"experience",
  occurance:"occurrence",
  sence:"sense",
  unfortuately:"unfortunately", unfortunatley:"unfortunately",
  wich:"which", whcih:"which",
  prefered:"preferred",
  reccomend:"recommend", recomend:"recommend",
  relevent:"relevant",
  perseverence:"perseverance",
  enabke:"enable",
  woud:"would", coud:"could", shoud:"should",
  peopel:"people", peolpe:"people",
  begining:"beginning", biggining:"beginning",
  disapear:"disappear", dissapear:"disappear",
  embarass:"embarrass", embarassment:"embarrassment",
  foriegn:"foreign",
  immediatly:"immediately", imediately:"immediately",
  neccessary:"necessary", necesary:"necessary",
  paralell:"parallel",
  restaraunt:"restaurant",
  rythm:"rhythm",
  sieze:"seize",
  writting:"writing", writeing:"writing",
  excercise:"exercise",
  goverment:"government",
  knowlege:"knowledge",
  libary:"library",
  noticable:"noticeable",
  posession:"possession",
  priviledge:"privilege",
  sentance:"sentence",
  suprise:"surprise", supprised:"surprised",
  tendancy:"tendency",
  transfered:"transferred",
  twelth:"twelfth",
  accomodate:"accommodate",
  aquire:"acquire",
  bizzare:"bizarre",
  calender:"calendar",
  cemetary:"cemetery",
  concious:"conscious",
  definite:"definite",
  existance:"existence",
  facination:"fascination",
  gaurantee:"guarantee",
  harrassment:"harassment",
  inoculate:"inoculate",
  jewelery:"jewelry",
  liason:"liaison",
  maintenence:"maintenance",
  milennium:"millennium",
  mischievious:"mischievous",
  neice:"niece",
  ocassion:"occasion",
  oppertunity:"opportunity",
  perserverance:"perseverance",
  publically:"publicly",
  questionaire:"questionnaire",
  repetative:"repetitive",
  sacrilegious:"sacrilegious",
  seargent:"sergeant",
  speach:"speech",
  succesful:"successful",
  vaccum:"vacuum",
  weiird:"weird", weirf:"weird",
  withold:"withhold",
};

// ─── Keyboard adjacency map ─────────────────────────────────────────────────
const ADJ: Record<string, string> = {
  q:'wa', w:'qeas', e:'wrd', r:'etf', t:'ryg', y:'tuh', u:'yij', i:'uok',
  o:'ipl', p:'o',  a:'qwsz', s:'awedz', d:'serc', f:'drtg', g:'ftyhb',
  h:'gyujb', j:'huikm', k:'jiom', l:'ko',
  z:'as', x:'zsd', c:'xdf', v:'cfg', b:'vgh', n:'bhm', m:'nj',
};

// ~600 common English words used to validate adjacency candidates
const DICT = new Set([
  'the','be','to','of','and','a','in','that','have','it','for','not','on','with',
  'he','as','you','do','at','this','but','his','by','from','they','we','say','her',
  'she','or','an','will','my','one','all','would','there','their','what','so','up',
  'out','if','about','who','get','which','go','me','when','make','can','like','time',
  'no','just','him','know','take','people','into','year','your','good','some','could',
  'them','see','other','than','then','now','look','only','come','its','over','think',
  'also','back','after','use','two','how','our','work','first','well','way','even',
  'new','want','because','any','these','give','day','most','us','great','between',
  'need','large','often','hand','high','place','hold','turn','help','still','around',
  'ask','small','call','same','three','through','much','before','right','too','mean',
  'old','try','tell','follow','move','again','should','every','found','long','live',
  'start','city','keep','tree','never','real','life','few','open','seem','together',
  'next','white','begin','walk','easy','paper','group','always','those','both','mark',
  'book','science','room','friend','idea','fish','stop','once','hear','sure','watch',
  'color','face','wood','main','enough','plain','girl','young','ready','above','ever',
  'red','list','feel','talk','bird','soon','body','dog','family','leave','song','door',
  'black','short','class','wind','question','complete','ship','area','half','rock',
  'order','fire','south','problem','piece','knew','pass','since','whole','king','space',
  'heard','best','hour','better','true','during','hundred','five','remember','step',
  'early','west','ground','reach','fast','sing','listen','six','table','travel','less',
  'morning','ten','simple','toward','war','against','slow','center','love','rain','rule',
  'cold','voice','unit','power','town','fine','drive','lead','dark','machine','wait',
  'plan','star','box','field','rest','done','beauty','stood','front','teach','week',
  'final','green','quick','ocean','warm','free','minute','strong','mind','clear','tail',
  'fact','street','inch','nothing','course','stay','full','force','blue','object',
  'decide','deep','moon','foot','system','busy','test','boat','common','gold','plane',
  'dry','laugh','ran','check','game','shape','heat','snow','bring','yes','fill','east',
  'paint','language','ball','wave','drop','heart','present','heavy','dance','position',
  'wide','size','vary','speak','weight','ice','matter','circle','pair','include','felt',
  'perhaps','pick','sudden','count','square','reason','length','energy','bed','brother',
  'ride','believe','forest','sit','race','window','store','summer','train','sleep',
  'prove','run','exercise','wall','catch','wish','sky','board','joy','winter','glass',
  'grass','job','edge','sign','visit','past','soft','bright','weather','month','million',
  'bear','finish','happy','hope','flower','strange','gone','jump','baby','eight',
  'village','meet','root','buy','raise','solve','watch','whether','push','seven','third',
  'shall','hair','describe','cook','floor','either','result','burn','hill','safe','cat',
  'century','type','law','bit','coast','copy','phrase','tall','sand','soil','roll',
  'door','product','fight','lie','beat','view','ear','quite','broke','case','middle',
  'kill','son','lake','moment','loud','spring','observe','child','straight','nation',
  'milk','speed','method','pay','age','section','dress','cloud','stone','tiny','climb',
  'cool','design','poor','lot','bottom','key','iron','single','stick','flat','twenty',
  'skin','smile','trade','melody','trip','office','receive','row','mouth','exact',
  'symbol','die','least','trouble','shout','except','wrote','seed','tone','join',
  'suggest','clean','break','lady','yard','rise','bad','blow','oil','blood','touch',
  'grew','mix','team','wire','cost','lost','brown','wear','garden','equal','sent',
  'choose','fell','fit','flow','fair','bank','collect','save','control','gentle',
  'woman','captain','practice','difficult','doctor','please','protect','noon','whose',
  'locate','ring','character','caught','period','indicate','radio','spoke','human',
  'history','effect','electric','expect','crop','modern','element','hit','student',
  'corner','party','supply','bone','imagine','provide','agree','capital','continue',
  'share','build','went','cross','planet','behind','left','name','over','come',
  'here','home','kind','come','such','both','each','many','more','than','them',
  'part','put','where','much','case','hand','come','even','back','look',
  // common longer words
  'about','above','actually','after','again','against','already','also','always',
  'another','anyone','anything','anywhere','area','around','away','because',
  'before','behind','below','beside','between','beyond','bring','brought','built',
  'cannot','close','comes','coming','could','either','else','even','every',
  'everyone','everything','everywhere','except','feeling','finally','follow',
  'forget','going','gotten','great','happen','happy','having','heard','heart',
  'heavy','hello','here','herself','himself','inside','instead','itself',
  'knowing','large','later','learn','leave','leaving','less','light','likely',
  'little','living','looking','maybe','might','morning','myself','never','night',
  'nothing','often','only','other','ourselves','outside','perhaps','place',
  'point','pretty','rather','really','right','running','saying','school','seeing',
  'seems','shall','short','should','since','small','someone','something',
  'somewhere','soon','speak','starting','stay','still','stop','taking','talking',
  'telling','their','themselves','there','these','thing','think','those','though',
  'thought','three','through','today','together','tomorrow','toward','tried',
  'trying','under','until','very','voice','walking','want','watch','water',
  'watching','went','were','where','whether','which','while','within','without',
  'world','would','yourself','already','usually','together','problem','country',
  'morning','tonight','maybe','nothing','someone','anyone','anything','anything',
  'beautiful','wonderful','something','everything','interesting','different',
  'important','remember','understand','especially','definitely','probably',
  'actually','currently','recently','quickly','easily','suddenly','usually',
  'generally','basically','seriously','obviously','clearly','simply','exactly',
  'literally','honestly','totally','absolutely','completely','definitely',
  // words commonly needed as adjacency correction targets
  'weird','write','wrote','wrong','where','while','whose','whole','white',
  'worth','works','words','would','worry','worse','worst','world','worth',
  'break','brave','brain','brand','brass','brave','brick','brief','bring',
  'broad','broke','brook','brown','brush','build','built','burnt','burst',
  'chase','cheap','check','cheer','chest','chief','child','china','chips',
  'chose','chunk','claim','class','clean','clear','click','cliff','climb',
  'cling','clock','close','cloth','cloud','coach','coast','count','cover',
  'crack','craft','crash','crazy','cream','creek','crime','crisp','cross',
  'crowd','crown','cruel','crush','curve','cycle','daily','dance','dying',
  'doing','draft','drain','drama','drank','drawn','dream','dress','drink',
  'drive','drove','drunk','dying','early','earth','eight','enter','equal',
  'error','event','exact','exist','extra','faint','faith','falls','false',
  'fancy','fault','feast','fence','field','fifth','fifty','fight','final',
  'fixed','flame','flash','flesh','float','flood','floor','flour','flows',
  'focus','force','forth','found','frame','frank','freed','fresh','front',
  'fruit','funds','funny','given','girls','given','glaze','globe','gloom',
  'gloss','going','grace','grade','grain','grand','grant','grave','greet',
  'grief','grind','groan','grove','grown','guess','guest','guide','guilt',
  'known','knife','knock','label','lanes','large','laser','lasts','later',
  'laugh','layer','learn','lease','legal','level','light','limit','lined',
  'lived','local','logic','loose','lower','loyal','lucky','magic','major',
  'maker','manor','march','marry','match','maybe','mayor','media','mercy',
  'merge','merit','miles','mills','minor','minus','mixed','modal','money',
  'month','moral','moved','movie','music','names','needs','never','night',
  'noise','north','noted','novel','nurse','occur','offer','often','older',
  'orbit','other','ought','outer','owner','paint','paper','parks','party',
  'phase','phone','photo','piano','piece','pilot','pitch','place','plant',
  'plate','plead','plaza','plays','plaza','poems','point','polar','pools',
  'posts','power','press','price','pride','prime','prior','prize','probe',
  'proof','prose','proud','prove','psalm','pulse','punch','pupil','queen',
  'query','queue','quick','quiet','quota','quote','radar','radio','raise',
  'range','rapid','ratio','reach','realm','rebel','refer','reign','relax',
  'reply','rider','rigid','risen','river','roads','rocky','roles','rough',
  'round','royal','ruins','ruled','ruler','rules','rural','scale','scene',
  'score','scout','seize','serve','shade','shake','shame','shape','share',
  'sharp','sheer','shelf','shell','shift','shirt','shoes','shore','short',
  'shout','shown','sight','since','skill','slate','slave','slide','slope',
  'small','smart','smile','smoke','solar','solid','sound','south','space',
  'spark','spare','speak','speed','spend','spice','spine','spite','split',
  'spoke','spoon','sport','spray','squad','stage','stain','stake','stale',
  'stand','stare','state','steam','steel','steep','steer','stern','stick',
  'stone','stony','stood','stops','storm','story','stove','strip','stuck',
  'study','style','sugar','suite','super','surge','swift','swing','sword',
  'taken','taste','teach','teeth','terms','thank','theme','thick','think',
  'thorn','those','threw','throw','tight','tired','title','today','token',
  'topic','total','touch','tough','tower','track','trade','trail','train',
  'trait','treat','trial','tried','trust','truth','twice','twist','typed',
  'uncle','under','unity','upper','upset','urban','usual','utter','valid',
  'value','valve','video','vigor','viral','visit','vital','vivid','voter',
  'wagon','waste','water','weeks','weigh','weird','wells','whose','width',
  'witty','women','words','works','worse','worst','worth','would','wound',
  'woven','yacht','yield','young','yours','youth','zonal',
]);

// ─── Adjacency typo check ───────────────────────────────────────────────────
function tryAdjacency(word: string): string | null {
  const lower = word.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const neighbors = ADJ[lower[i]] ?? '';
    for (const n of neighbors) {
      const candidate = lower.slice(0, i) + n + lower.slice(i + 1);
      if (DICT.has(candidate)) return candidate;
    }
  }
  return null;
}

// ─── Main polisher ──────────────────────────────────────────────────────────
export function polishText(text: string): string {
  if (!text.trim()) return text;

  // 1. Apply word corrections + capitalize standalone "i"
  let result = text.replace(/\b([a-zA-Z']{2,})\b/g, (match) => {
    const lower = match.toLowerCase();

    // Known correction
    if (CORRECTIONS[lower]) {
      const fix = CORRECTIONS[lower];
      // Preserve original capitalisation
      if (match[0] >= 'A' && match[0] <= 'Z') {
        return fix[0].toUpperCase() + fix.slice(1);
      }
      return fix;
    }

    // Standalone "i"
    if (lower === 'i') return 'I';

    // Keyboard adjacency for unknown words ≥ 4 letters
    if (match.length >= 4 && !DICT.has(lower)) {
      const adj = tryAdjacency(lower);
      if (adj) {
        return match[0] >= 'A' && match[0] <= 'Z'
          ? adj[0].toUpperCase() + adj.slice(1)
          : adj;
      }
    }

    return match;
  });

  // 2. Grammar: "going to / want to / need to / have to / try to + wrong tense verb"
  //    e.g. "going to wrote" → "going to write"
  const PAST_TO_BASE: Record<string, string> = {
    wrote:'write', went:'go', ran:'run', ate:'eat', drank:'drink',
    drove:'drive', flew:'fly', grew:'grow', knew:'know', made:'make',
    said:'say', saw:'see', spoke:'speak', swam:'swim', took:'take',
    told:'tell', thought:'think', woke:'wake', wore:'wear', won:'win',
    got:'get', gave:'give', came:'come', brought:'bring', bought:'buy',
    built:'build', caught:'catch', chose:'choose', fell:'fall', felt:'feel',
    found:'find', forgot:'forget', fought:'fight', heard:'hear', held:'hold',
    kept:'keep', left:'leave', lost:'lose', met:'meet', paid:'pay',
    sent:'send', sang:'sing', sat:'sit', slept:'sleep', stood:'stand',
    stole:'steal', threw:'throw', understood:'understand', began:'begin',
    broke:'break', drew:'draw', dug:'dig', hung:'hang', led:'lead',
    laid:'lay', meant:'mean', read:'read', rode:'ride', rose:'rise',
    sold:'sell', shot:'shoot', shone:'shine', showed:'show', spent:'spend',
    spread:'spread', struck:'strike', swept:'sweep', swore:'swear', tore:'tear',
    wound:'wind',
  };
  const TO_TRIGGERS = 'going to|want to|wanted to|need to|needs to|needed to|have to|has to|had to|try to|tried to|plan to|planned to|able to|going\\s+to';
  result = result.replace(
    new RegExp(`\\b(${TO_TRIGGERS})\\s+(\\w+)`, 'gi'),
    (match, prefix, verb) => {
      const base = PAST_TO_BASE[verb.toLowerCase()];
      return base
        ? prefix + ' ' + (verb[0] >= 'A' && verb[0] <= 'Z' ? base[0].toUpperCase() + base.slice(1) : base)
        : match;
    }
  );

  // 3. Capitalize first character of the whole text
  result = result.replace(/^(\s*)([a-z])/, (_, ws, c) => ws + c.toUpperCase());

  // 3. Capitalize the first letter after . ! ? or newline
  result = result.replace(/([.!?]\s+|[\n])([a-z])/g, (_, sep, c) => sep + c.toUpperCase());

  // 4. Fix multiple spaces (preserve newlines)
  result = result.replace(/[^\S\n]{2,}/g, ' ');

  return result;
}
