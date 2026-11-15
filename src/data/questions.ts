import { Difficulty, Question, Subject } from '../types/game';

type CoreSubject = Exclude<Subject, 'mixed'>;

interface RawQuestion {
  prompt: string;
  correctAnswer: string;
  distractors: [string, string, string];
  explanation: string;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeNumericDistractors(correct: number, spreads: number[], minAllowed = -9999): [string, string, string] {
  const chosen = new Set<number>();
  const candidates = shuffle(spreads);
  for (const delta of candidates) {
    if (chosen.size >= 3) break;
    const val = correct + delta;
    if (val !== correct && val >= minAllowed) {
      chosen.add(val);
    }
  }
  let offset = 1;
  while (chosen.size < 3) {
    const val = correct + offset;
    if (val !== correct && val >= minAllowed && !chosen.has(val)) {
      chosen.add(val);
    }
    offset = offset > 0 ? -offset : -offset + 1;
  }
  const arr = Array.from(chosen).map(String);
  return [arr[0], arr[1], arr[2]];
}

function generateMathQuestion(difficulty: Difficulty): Question {
  const id = `math-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (difficulty === 'easy') {
    const kind = randInt(0, 3);
    if (kind === 0) {
      const a = randInt(4, 24);
      const b = randInt(3, 19);
      const ans = a + b;
      return {
        id,
        subject: 'math',
        prompt: `${a} + ${b} = ?`,
        correctAnswer: String(ans),
        distractors: makeNumericDistractors(ans, [-2, -1, 1, 2, 10, -10], 1),
        explanation: `${a} + ${b} equals ${ans}.`,
      };
    }
    if (kind === 1) {
      const b = randInt(3, 16);
      const ans = randInt(4, 20);
      const a = b + ans;
      return {
        id,
        subject: 'math',
        prompt: `${a} − ${b} = ?`,
        correctAnswer: String(ans),
        distractors: makeNumericDistractors(ans, [-2, -1, 1, 2, 4, -3], 1),
        explanation: `${a} − ${b} equals ${ans}.`,
      };
    }
    if (kind === 2) {
      const a = randInt(2, 9);
      const b = randInt(2, 9);
      const ans = a * b;
      return {
        id,
        subject: 'math',
        prompt: `${a} × ${b} = ?`,
        correctAnswer: String(ans),
        distractors: makeNumericDistractors(ans, [-a, a, -b, b, 2, -2, 1], 2),
        explanation: `${a} × ${b} = ${ans}.`,
      };
    }
    const b = randInt(2, 9);
    const ans = randInt(2, 10);
    const a = b * ans;
    return {
      id,
      subject: 'math',
      prompt: `${a} ÷ ${b} = ?`,
      correctAnswer: String(ans),
      distractors: makeNumericDistractors(ans, [-2, -1, 1, 2, 3], 1),
      explanation: `${a} divided by ${b} is ${ans} because ${b} × ${ans} = ${a}.`,
    };
  }

  if (difficulty === 'medium') {
    const kind = randInt(0, 4);
    if (kind === 0) {
      const a = randInt(6, 15);
      const b = randInt(4, 14);
      const ans = a * b;
      return {
        id,
        subject: 'math',
        prompt: `${a} × ${b} = ?`,
        correctAnswer: String(ans),
        distractors: makeNumericDistractors(ans, [-a, a, -b, b, 10, -10], 10),
        explanation: `${a} × ${b} = ${ans}.`,
      };
    }
    if (kind === 1) {
      const n = randInt(4, 15);
      const sq = n * n;
      return {
        id,
        subject: 'math',
        prompt: `√${sq} = ?`,
        correctAnswer: String(n),
        distractors: makeNumericDistractors(n, [-2, -1, 1, 2, 3], 2),
        explanation: `${n} × ${n} = ${sq}, so √${sq} = ${n}.`,
      };
    }
    if (kind === 2) {
      const pctChoices = [10, 20, 25, 50, 75];
      const pct = pctChoices[randInt(0, pctChoices.length - 1)];
      const base = randInt(2, 12) * 20;
      const ans = (pct / 100) * base;
      return {
        id,
        subject: 'math',
        prompt: `${pct}% of ${base} = ?`,
        correctAnswer: String(ans),
        distractors: makeNumericDistractors(ans, [-10, 10, -5, 5, 20], 1),
        explanation: `${pct}% of ${base} = (${pct}/100) × ${base} = ${ans}.`,
      };
    }
    if (kind === 3) {
      const x = randInt(2, 12);
      const m = randInt(2, 6);
      const c = randInt(1, 12);
      const rhs = m * x + c;
      return {
        id,
        subject: 'math',
        prompt: `${m}x + ${c} = ${rhs}, x = ?`,
        correctAnswer: String(x),
        distractors: makeNumericDistractors(x, [-2, -1, 1, 2, 3], 1),
        explanation: `Subtract ${c} to get ${m}x = ${rhs - c}, then divide by ${m} to get x = ${x}.`,
      };
    }
    const a = randInt(3, 9);
    const b = randInt(2, 7);
    const c = randInt(2, 8);
    const ans = a + b * c;
    return {
      id,
      subject: 'math',
      prompt: `${a} + ${b} × ${c} = ?`,
      correctAnswer: String(ans),
      distractors: makeNumericDistractors(ans, [(a + b) * c - ans, -2, 2, 4, -4], 2),
      explanation: `Multiply first (${b} × ${c} = ${b * c}), then add ${a} to get ${ans}.`,
    };
  }

  // Hard math
  const kind = randInt(0, 4);
  if (kind === 0) {
    const a = randInt(12, 24);
    const b = randInt(11, 19);
    const ans = a * b;
    return {
      id,
      subject: 'math',
      prompt: `${a} × ${b} = ?`,
      correctAnswer: String(ans),
      distractors: makeNumericDistractors(ans, [-10, 10, -a, a, -20, 20], 20),
      explanation: `${a} × ${b} = ${ans}.`,
    };
  }
  if (kind === 1) {
    const base = randInt(2, 6);
    const exp = base <= 3 ? randInt(3, 5) : randInt(2, 3);
    const ans = Math.pow(base, exp);
    return {
      id,
      subject: 'math',
      prompt: `${base}^${exp} = ?`,
      correctAnswer: String(ans),
      distractors: makeNumericDistractors(ans, [base * exp - ans, -base, base, 4, -4], 2),
      explanation: `${base} raised to the power of ${exp} is ${ans}.`,
    };
  }
  if (kind === 2) {
    const x = randInt(3, 14);
    const m = randInt(3, 8);
    const c = randInt(4, 15);
    const rhs = m * x - c;
    return {
      id,
      subject: 'math',
      prompt: `${m}x − ${c} = ${rhs}, x = ?`,
      correctAnswer: String(x),
      distractors: makeNumericDistractors(x, [-2, -1, 1, 2, 4], 1),
      explanation: `Add ${c} to get ${m}x = ${rhs + c}, so x = ${x}.`,
    };
  }
  if (kind === 3) {
    const primes = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
    const p = primes[randInt(0, primes.length - 1)];
    const composites = [p - 2, p + 2, p + 4, p - 4].map((n) => (n % 2 === 0 ? n + 1 : n));
    const filtered = composites.filter((n) => n !== p && (n % 3 === 0 || n % 5 === 0 || n % 7 === 0));
    if (filtered.length >= 3) {
      return {
        id,
        subject: 'math',
        prompt: `Which number is prime?`,
        correctAnswer: String(p),
        distractors: [String(filtered[0]), String(filtered[1]), String(filtered[2])],
        explanation: `${p} is only divisible by 1 and itself.`,
      };
    }
  }
  const a1 = randInt(3, 11);
  const b1 = randInt(2, 8);
  const ans = a1 * a1 - b1 * b1;
  return {
    id,
    subject: 'math',
    prompt: `${a1}² − ${b1}² = ?`,
    correctAnswer: String(ans),
    distractors: makeNumericDistractors(ans, [(a1 - b1) * (a1 - b1) - ans, 4, -4, 6, -6], 1),
    explanation: `Using difference of squares: (${a1} + ${b1})(${a1} − ${b1}) = ${ans}.`,
  };
}

function generateCsQuestion(difficulty: Difficulty): Question {
  const id = `cs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // 40% chance of procedural binary/hex conversion
  if (Math.random() < 0.45) {
    if (difficulty === 'easy') {
      const n = randInt(3, 15);
      const bin = n.toString(2).padStart(4, '0');
      const d1 = ((n ^ 1)).toString(2).padStart(4, '0');
      const d2 = ((n ^ 2)).toString(2).padStart(4, '0');
      const d3 = ((n ^ 4)).toString(2).padStart(4, '0');
      return {
        id,
        subject: 'cs',
        prompt: `Binary for decimal ${n}?`,
        correctAnswer: bin,
        distractors: [d1, d2, d3],
        explanation: `In base-2, ${bin} equals ${n}.`,
      };
    }
    if (difficulty === 'medium') {
      const n = randInt(5, 31);
      const bin = n.toString(2);
      return {
        id,
        subject: 'cs',
        prompt: `Decimal value of ${bin}₂?`,
        correctAnswer: String(n),
        distractors: makeNumericDistractors(n, [-2, -1, 1, 2, 4], 1),
        explanation: `Binary ${bin} converts to ${n} in decimal.`,
      };
    }
    const n = randInt(16, 255);
    const hex = '0x' + n.toString(16).toUpperCase();
    const d1 = '0x' + ((n + 16) & 0xff).toString(16).toUpperCase();
    const d2 = '0x' + ((n ^ 0x0f) & 0xff).toString(16).toUpperCase();
    const d3 = '0x' + ((n - 1) & 0xff).toString(16).toUpperCase();
    return {
      id,
      subject: 'cs',
      prompt: `Hexadecimal for ${n}?`,
      correctAnswer: hex,
      distractors: [d1 === hex ? '0x1A' : d1, d2 === hex ? '0x2B' : d2, d3 === hex ? '0x3C' : d3],
      explanation: `${n} = ${Math.floor(n / 16)}×16 + ${n % 16}, which is ${hex} in hex.`,
    };
  }

  const bank = CS_BANK[difficulty];
  const item = bank[randInt(0, bank.length - 1)];
  return { id, subject: 'cs', ...item };
}

const SCIENCE_BANK: Record<Difficulty, RawQuestion[]> = {
  easy: [
    { prompt: 'Chemical symbol for Water?', correctAnswer: 'H₂O', distractors: ['CO₂', 'O₂', 'NaCl'], explanation: 'Water consists of two hydrogen atoms and one oxygen atom (H₂O).' },
    { prompt: 'Closest planet to the Sun?', correctAnswer: 'Mercury', distractors: ['Venus', 'Mars', 'Earth'], explanation: 'Mercury orbits closest to the Sun at ~58 million km.' },
    { prompt: 'Gas plants absorb to make food?', correctAnswer: 'CO₂', distractors: ['Nitrogen', 'Helium', 'Neon'], explanation: 'Plants take in carbon dioxide (CO₂) during photosynthesis.' },
    { prompt: 'Force that pulls objects to Earth?', correctAnswer: 'Gravity', distractors: ['Friction', 'Magnetism', 'Inertia'], explanation: 'Gravity attracts objects with mass toward one another.' },
    { prompt: 'Freezing point of water (°C)?', correctAnswer: '0°C', distractors: ['32°C', '100°C', '-10°C'], explanation: 'Water freezes at 0°C (32°F) at standard pressure.' },
    { prompt: 'Organ that pumps blood?', correctAnswer: 'Heart', distractors: ['Lung', 'Liver', 'Kidney'], explanation: 'The heart circulates oxygen-rich blood throughout the body.' },
    { prompt: 'Largest planet in our solar system?', correctAnswer: 'Jupiter', distractors: ['Saturn', 'Neptune', 'Uranus'], explanation: 'Jupiter is a gas giant more than twice as massive as all other planets combined.' },
    { prompt: 'Main source of Earth’s light?', correctAnswer: 'Sun', distractors: ['Moon', 'Venus', 'Polaris'], explanation: 'The Sun is the star at the center of our solar system.' },
    { prompt: 'State of matter of ice?', correctAnswer: 'Solid', distractors: ['Liquid', 'Gas', 'Plasma'], explanation: 'Ice is water in its frozen solid state.' },
    { prompt: 'Symbol for Oxygen?', correctAnswer: 'O', distractors: ['Ox', 'Og', 'Au'], explanation: 'Oxygen has atomic number 8 and symbol O.' },
  ],
  medium: [
    { prompt: 'Chemical symbol for Gold?', correctAnswer: 'Au', distractors: ['Ag', 'Gd', 'Go'], explanation: 'Au comes from the Latin word "aurum", meaning gold.' },
    { prompt: 'Powerhouse of the eukaryotic cell?', correctAnswer: 'Mitochondria', distractors: ['Ribosome', 'Golgi body', 'Lysosome'], explanation: 'Mitochondria generate most of a cell’s ATP energy.' },
    { prompt: 'Most abundant gas in Earth’s air?', correctAnswer: 'Nitrogen', distractors: ['Oxygen', 'Argon', 'CO₂'], explanation: 'Earth’s atmosphere is about 78% nitrogen and 21% oxygen.' },
    { prompt: 'SI unit of electrical resistance?', correctAnswer: 'Ohm', distractors: ['Volt', 'Ampere', 'Watt'], explanation: 'Electrical resistance is measured in Ohms (Ω).' },
    { prompt: 'Process turning liquid into vapor?', correctAnswer: 'Evaporation', distractors: ['Condensation', 'Sublimation', 'Deposition'], explanation: 'Evaporation occurs when surface liquid molecules escape into gas.' },
    { prompt: 'Part of plant conducting water up?', correctAnswer: 'Xylem', distractors: ['Phloem', 'Stomata', 'Cortex'], explanation: 'Xylem vessels transport water and minerals from roots to leaves.' },
    { prompt: 'Chemical symbol for Sodium?', correctAnswer: 'Na', distractors: ['So', 'Sn', 'Sd'], explanation: 'Na derives from "natrium", the Latin name for sodium carbonate.' },
    { prompt: 'Neutral pH value on the pH scale?', correctAnswer: '7', distractors: ['0', '5', '14'], explanation: 'Pure water at 25°C has a neutral pH of 7.' },
    { prompt: 'Subatomic particle with negative charge?', correctAnswer: 'Electron', distractors: ['Proton', 'Neutron', 'Photon'], explanation: 'Electrons carry a −1 elementary charge.' },
    { prompt: 'Hardest natural mineral on Mohs scale?', correctAnswer: 'Diamond', distractors: ['Quartz', 'Topaz', 'Corundum'], explanation: 'Diamond ranks 10/10 on the Mohs hardness scale.' },
  ],
  hard: [
    { prompt: 'Chemical symbol for Tungsten?', correctAnswer: 'W', distractors: ['Tu', 'Tg', 'Tn'], explanation: 'W stands for "wolfram", the historical name for tungsten.' },
    { prompt: 'Organelle responsible for protein synthesis?', correctAnswer: 'Ribosome', distractors: ['Vacuole', 'Peroxisome', 'Centriole'], explanation: 'Ribosomes translate mRNA sequences into polypeptide chains.' },
    { prompt: 'SI unit of magnetic flux density?', correctAnswer: 'Tesla', distractors: ['Weber', 'Henry', 'Gauss'], explanation: 'The Tesla (T) is the SI unit for magnetic field strength B.' },
    { prompt: 'Law linking voltage, current, resistance?', correctAnswer: 'Ohm’s Law', distractors: ['Boyle’s Law', 'Snell’s Law', 'Hooke’s Law'], explanation: 'Ohm’s Law states V = I × R.' },
    { prompt: 'Phase change from solid directly to gas?', correctAnswer: 'Sublimation', distractors: ['Deposition', 'Condensation', 'Melting'], explanation: 'Dry ice (solid CO₂) sublimates directly into gas.' },
    { prompt: 'Enzyme that unwinds DNA helix?', correctAnswer: 'Helicase', distractors: ['Ligase', 'Polymerase', 'Amylase'], explanation: 'DNA helicase breaks hydrogen bonds between base pairs.' },
    { prompt: 'Particle mediating the electromagnetic force?', correctAnswer: 'Photon', distractors: ['Gluon', 'Boson W', 'Neutrino'], explanation: 'Photons are the force-carrying quanta of electromagnetism.' },
    { prompt: 'Chemical symbol for Antimony?', correctAnswer: 'Sb', distractors: ['At', 'An', 'Am'], explanation: 'Sb derives from "stibium", the ancient mineral stibnite.' },
  ],
};

const GEOGRAPHY_BANK: Record<Difficulty, RawQuestion[]> = {
  easy: [
    { prompt: 'Capital of France?', correctAnswer: 'Paris', distractors: ['Lyon', 'Madrid', 'Rome'], explanation: 'Paris is the capital and largest city of France.' },
    { prompt: 'Largest ocean on Earth?', correctAnswer: 'Pacific', distractors: ['Atlantic', 'Indian', 'Arctic'], explanation: 'The Pacific Ocean covers over 30% of Earth’s surface.' },
    { prompt: 'Capital of Japan?', correctAnswer: 'Tokyo', distractors: ['Kyoto', 'Osaka', 'Seoul'], explanation: 'Tokyo has been Japan’s capital since 1868.' },
    { prompt: 'Continent where Brazil is located?', correctAnswer: 'S. America', distractors: ['Africa', 'N. America', 'Europe'], explanation: 'Brazil is the largest country in South America.' },
    { prompt: 'Country famous for the Pyramids of Giza?', correctAnswer: 'Egypt', distractors: ['Morocco', 'Jordan', 'Greece'], explanation: 'The Great Pyramids stand on the Giza Plateau in Egypt.' },
    { prompt: 'Capital of the United Kingdom?', correctAnswer: 'London', distractors: ['Manchester', 'Dublin', 'Edinburgh'], explanation: 'London is the capital of England and the UK.' },
    { prompt: 'Coldest continent on Earth?', correctAnswer: 'Antarctica', distractors: ['Europe', 'Asia', 'Australia'], explanation: 'Antarctica holds 90% of the world’s ice.' },
    { prompt: 'Capital of Italy?', correctAnswer: 'Rome', distractors: ['Milan', 'Venice', 'Naples'], explanation: 'Rome is Italy’s capital city.' },
    { prompt: 'Longest river in Egypt?', correctAnswer: 'Nile', distractors: ['Amazon', 'Danube', 'Thames'], explanation: 'The Nile flows northward through Egypt into the Mediterranean.' },
    { prompt: 'Country shaped like a boot?', correctAnswer: 'Italy', distractors: ['Spain', 'Greece', 'Portugal'], explanation: 'The Italian Peninsula famously resembles a tall boot.' },
  ],
  medium: [
    { prompt: 'Capital of Australia?', correctAnswer: 'Canberra', distractors: ['Sydney', 'Melbourne', 'Perth'], explanation: 'Canberra was chosen in 1908 as a compromise between Sydney and Melbourne.' },
    { prompt: 'Capital of Canada?', correctAnswer: 'Ottawa', distractors: ['Toronto', 'Vancouver', 'Montreal'], explanation: 'Ottawa, in Ontario, is Canada’s federal capital.' },
    { prompt: 'Mountain range separating Europe & Asia?', correctAnswer: 'Urals', distractors: ['Alps', 'Andes', 'Rockies'], explanation: 'The Ural Mountains run north–south through western Russia.' },
    { prompt: 'Largest desert in the world (non-polar)?', correctAnswer: 'Sahara', distractors: ['Gobi', 'Kalahari', 'Mojave'], explanation: 'The Sahara spans roughly 9.2 million sq km across North Africa.' },
    { prompt: 'Capital of South Korea?', correctAnswer: 'Seoul', distractors: ['Busan', 'Taipei', 'Hanoi'], explanation: 'Seoul is South Korea’s capital along the Han River.' },
    { prompt: 'River flowing through London?', correctAnswer: 'Thames', distractors: ['Seine', 'Rhine', 'Tiber'], explanation: 'The River Thames flows 346 km across southern England.' },
    { prompt: 'Country with the most natural lakes?', correctAnswer: 'Canada', distractors: ['Finland', 'Russia', 'Norway'], explanation: 'Canada contains over half of all natural lakes in the world.' },
    { prompt: 'Capital of Argentina?', correctAnswer: 'Buenos Aires', distractors: ['Santiago', 'Lima', 'Montevideo'], explanation: 'Buenos Aires sits on the Río de la Plata estuary.' },
    { prompt: 'Sea with the lowest elevation on land?', correctAnswer: 'Dead Sea', distractors: ['Red Sea', 'Black Sea', 'Caspian'], explanation: 'The Dead Sea shore lies more than 430 meters below sea level.' },
    { prompt: 'Capital of Turkey?', correctAnswer: 'Ankara', distractors: ['Istanbul', 'Izmir', 'Antalya'], explanation: 'Ankara replaced Istanbul as Turkey’s capital in 1923.' },
  ],
  hard: [
    { prompt: 'Capital of Kazakhstan?', correctAnswer: 'Astana', distractors: ['Almaty', 'Tashkent', 'Bishkek'], explanation: 'Astana became Kazakhstan’s capital in 1997.' },
    { prompt: 'Strait separating Spain & Morocco?', correctAnswer: 'Gibraltar', distractors: ['Bosphorus', 'Hormuz', 'Malacca'], explanation: 'The Strait of Gibraltar connects the Atlantic and Mediterranean.' },
    { prompt: 'Deepest oceanic trench on Earth?', correctAnswer: 'Mariana', distractors: ['Tonga', 'Java', 'Puerto Rico'], explanation: 'Challenger Deep in the Mariana Trench reaches nearly 11,000 m.' },
    { prompt: 'Capital of Switzerland (de facto)?', correctAnswer: 'Bern', distractors: ['Zurich', 'Geneva', 'Basel'], explanation: 'Bern serves as Switzerland’s federal city and de facto capital.' },
    { prompt: 'Landlocked country inside South Africa?', correctAnswer: 'Lesotho', distractors: ['Eswatini', 'Botswana', 'Malawi'], explanation: 'Lesotho is completely enclaved by South Africa.' },
    { prompt: 'Highest waterfall in the world?', correctAnswer: 'Angel Falls', distractors: ['Victoria', 'Niagara', 'Iguazu'], explanation: 'Angel Falls in Venezuela drops 979 meters.' },
    { prompt: 'Capital of New Zealand?', correctAnswer: 'Wellington', distractors: ['Auckland', 'Christchurch', 'Dunedin'], explanation: 'Wellington is the southernmost sovereign capital in the world.' },
    { prompt: 'River forming much of US-Mexico border?', correctAnswer: 'Rio Grande', distractors: ['Colorado', 'Mississippi', 'Columbia'], explanation: 'The Rio Grande borders Texas and four Mexican states.' },
  ],
};

const VOCAB_BANK: Record<Difficulty, RawQuestion[]> = {
  easy: [
    { prompt: 'Synonym of "Swift"?', correctAnswer: 'Fast', distractors: ['Heavy', 'Quiet', 'Dull'], explanation: '"Swift" means moving quickly or promptly.' },
    { prompt: 'Antonym of "Ancient"?', correctAnswer: 'Modern', distractors: ['Broken', 'Hidden', 'Dusty'], explanation: '"Modern" is the opposite of ancient or very old.' },
    { prompt: 'Synonym of "Joyful"?', correctAnswer: 'Cheerful', distractors: ['Anxious', 'Tired', 'Bored'], explanation: '"Joyful" and "cheerful" both mean full of happiness.' },
    { prompt: 'Antonym of "Generous"?', correctAnswer: 'Stingy', distractors: ['Polite', 'Honest', 'Brave'], explanation: '"Stingy" describes someone unwilling to share or give.' },
    { prompt: 'Word meaning "very large"?', correctAnswer: 'Enormous', distractors: ['Fragile', 'Narrow', 'Shallow'], explanation: '"Enormous" means extraordinarily large in size.' },
    { prompt: 'Synonym of "Courageous"?', correctAnswer: 'Brave', distractors: ['Timid', 'Clumsy', 'Harsh'], explanation: '"Courageous" means showing bravery in the face of fear.' },
    { prompt: 'Antonym of "Scarce"?', correctAnswer: 'Abundant', distractors: ['Empty', 'Rare', 'Faint'], explanation: 'If something is abundant, there is plenty of it.' },
    { prompt: 'Prefix "bi-" means?', correctAnswer: 'Two', distractors: ['Three', 'Half', 'Zero'], explanation: 'The Latin prefix "bi-" means two (as in bicycle).' },
    { prompt: 'Synonym of "Tranquil"?', correctAnswer: 'Calm', distractors: ['Loud', 'Sharp', 'Wild'], explanation: '"Tranquil" means free from disturbance; peaceful.' },
    { prompt: 'Antonym of "Expand"?', correctAnswer: 'Shrink', distractors: ['Stretch', 'Climb', 'Glow'], explanation: '"Expand" means grow larger; "shrink" means grow smaller.' },
  ],
  medium: [
    { prompt: 'Meaning of "Benevolent"?', correctAnswer: 'Kind', distractors: ['Hostile', 'Reckless', 'Stubborn'], explanation: 'From Latin "bene" (well), benevolent means well-meaning and kindly.' },
    { prompt: 'Synonym of "Pragmatic"?', correctAnswer: 'Practical', distractors: ['Dreamy', 'Rigid', 'Secretive'], explanation: '"Pragmatic" means dealing with things sensibly and realistically.' },
    { prompt: 'Antonym of "Ambiguous"?', correctAnswer: 'Clear', distractors: ['Vague', 'Complex', 'Sudden'], explanation: '"Ambiguous" means open to multiple meanings; "clear" is unmistakable.' },
    { prompt: 'Meaning of "Chronological"?', correctAnswer: 'By time', distractors: ['By size', 'By color', 'By weight'], explanation: 'Root "chron-" means time; arranged in order of occurrence.' },
    { prompt: 'Synonym of "Diligent"?', correctAnswer: 'Hardworking', distractors: ['Careless', 'Playful', 'Brief'], explanation: '"Diligent" describes steady, careful effort.' },
    { prompt: 'Antonym of "Verbose"?', correctAnswer: 'Concise', distractors: ['Wordy', 'Loud', 'Dramatic'], explanation: '"Verbose" uses too many words; "concise" is brief and clear.' },
    { prompt: 'Meaning of "Resilient"?', correctAnswer: 'Adaptable', distractors: ['Brittle', 'Static', 'Timid'], explanation: 'Resilient systems or people recover quickly from difficulties.' },
    { prompt: 'Root "aqua" refers to?', correctAnswer: 'Water', distractors: ['Fire', 'Earth', 'Wind'], explanation: '"Aqua" is Latin for water (aquarium, aquatic).' },
    { prompt: 'Synonym of "Candid"?', correctAnswer: 'Honest', distractors: ['Deceitful', 'Shy', 'Ornate'], explanation: '"Candid" means truthful and straightforward.' },
    { prompt: 'Antonym of "Frugal"?', correctAnswer: 'Lavish', distractors: ['Thrifty', 'Modest', 'Careful'], explanation: '"Frugal" means economical; "lavish" means extravagant.' },
  ],
  hard: [
    { prompt: 'Meaning of "Ephemeral"?', correctAnswer: 'Short-lived', distractors: ['Eternal', 'Heavy', 'Harmful'], explanation: 'Something ephemeral lasts for only a very brief time.' },
    { prompt: 'Synonym of "Ubiquitous"?', correctAnswer: 'Everywhere', distractors: ['Hidden', 'Unique', 'Outdated'], explanation: '"Ubiquitous" means seeming to be present everywhere at once.' },
    { prompt: 'Antonym of "Taciturn"?', correctAnswer: 'Talkative', distractors: ['Reserved', 'Gloomy', 'Stern'], explanation: '"Taciturn" means habitually silent; "talkative" is its opposite.' },
    { prompt: 'Meaning of "Sycophant"?', correctAnswer: 'Flatterer', distractors: ['Rebel', 'Hermit', 'Scholar'], explanation: 'A sycophant flatters powerful people to gain favor.' },
    { prompt: 'Synonym of "Obfuscate"?', correctAnswer: 'Confuse', distractors: ['Clarify', 'Speed up', 'Repair'], explanation: 'To obfuscate is to make something unclear or hard to understand.' },
    { prompt: 'Meaning of "Magnanimous"?', correctAnswer: 'Forgiving', distractors: ['Petty', 'Fearful', 'Greedy'], explanation: 'Magnanimous people are generous and noble in forgiving rivals.' },
    { prompt: 'Antonym of "Fastidious"?', correctAnswer: 'Careless', distractors: ['Fussy', 'Exact', 'Neat'], explanation: '"Fastidious" means very attentive to detail; "careless" is opposite.' },
    { prompt: 'Meaning of "Equivocal"?', correctAnswer: 'Uncertain', distractors: ['Equal', 'Loud', 'Decisive'], explanation: '"Equivocal" means ambiguous or deliberately open to interpretation.' },
  ],
};

const CS_BANK: Record<Difficulty, RawQuestion[]> = {
  easy: [
    { prompt: 'How many bits are in 1 byte?', correctAnswer: '8', distractors: ['4', '16', '32'], explanation: 'One byte consists of 8 binary bits.' },
    { prompt: 'HTML stands for HyperText ___ Language?', correctAnswer: 'Markup', distractors: ['Machine', 'Memory', 'Module'], explanation: 'HTML is HyperText Markup Language.' },
    { prompt: 'Base of the binary number system?', correctAnswer: '2', distractors: ['8', '10', '16'], explanation: 'Binary uses two digits: 0 and 1.' },
    { prompt: 'File extension for Cascading Style Sheets?', correctAnswer: '.css', distractors: ['.html', '.json', '.exe'], explanation: 'Web stylesheets use the .css extension.' },
    { prompt: 'In RGB, what does "G" stand for?', correctAnswer: 'Green', distractors: ['Gray', 'Gold', 'Grid'], explanation: 'RGB stands for Red, Green, and Blue.' },
    { prompt: 'Data type for true or false?', correctAnswer: 'Boolean', distractors: ['String', 'Float', 'Array'], explanation: 'A Boolean holds one of two truth values: true or false.' },
  ],
  medium: [
    { prompt: 'Order rule of a Stack?', correctAnswer: 'LIFO', distractors: ['FIFO', 'Random', 'Sorted'], explanation: 'Stacks are Last-In, First-Out (LIFO).' },
    { prompt: 'Order rule of a Queue?', correctAnswer: 'FIFO', distractors: ['LIFO', 'Priority', 'Hash'], explanation: 'Queues are First-In, First-Out (FIFO).' },
    { prompt: 'HTTP status code for "Not Found"?', correctAnswer: '404', distractors: ['200', '301', '500'], explanation: '404 indicates the requested resource was not found.' },
    { prompt: 'Time complexity of Binary Search?', correctAnswer: 'O(log n)', distractors: ['O(n)', 'O(n²)', 'O(1)'], explanation: 'Binary search halves the search space each step: O(log n).' },
    { prompt: 'Port default for HTTPS traffic?', correctAnswer: '443', distractors: ['80', '22', '8080'], explanation: 'HTTPS uses TCP port 443 by default (HTTP uses 80).' },
    { prompt: 'Gate outputting 1 only if both inputs 1?', correctAnswer: 'AND', distractors: ['OR', 'XOR', 'NAND'], explanation: 'An AND gate requires all inputs to be true (1).' },
  ],
  hard: [
    { prompt: 'Average lookup complexity in a Hash Table?', correctAnswer: 'O(1)', distractors: ['O(n)', 'O(log n)', 'O(n log n)'], explanation: 'Hashing maps keys directly to buckets in constant average time.' },
    { prompt: 'Worst-case Merge Sort complexity?', correctAnswer: 'O(n log n)', distractors: ['O(n²)', 'O(n)', 'O(log n)'], explanation: 'Merge Sort guarantees O(n log n) across all cases.' },
    { prompt: 'Layer of OSI model for IP routing?', correctAnswer: 'Network', distractors: ['Transport', 'Data Link', 'Session'], explanation: 'Layer 3 (Network layer) handles IP addressing and routing.' },
    { prompt: 'Gate outputting 1 when inputs differ?', correctAnswer: 'XOR', distractors: ['AND', 'XNOR', 'NOR'], explanation: 'Exclusive OR (XOR) returns true only if inputs are different.' },
    { prompt: 'SQL command to fetch rows?', correctAnswer: 'SELECT', distractors: ['FETCH', 'GET', 'PULL'], explanation: 'SELECT queries data from relational database tables.' },
    { prompt: 'Protocol translating domain names to IPs?', correctAnswer: 'DNS', distractors: ['DHCP', 'ARP', 'SMTP'], explanation: 'DNS (Domain Name System) resolves human-readable hostnames.' },
  ],
};

const ALL_SUBJECTS: CoreSubject[] = ['math', 'science', 'geography', 'vocabulary', 'cs'];

export class QuestionGenerator {
  private recentPrompts: Set<string> = new Set();

  public reset(): void {
    this.recentPrompts.clear();
  }

  public next(subject: Subject, difficulty: Difficulty): Question {
    const targetSubject: CoreSubject =
      subject === 'mixed'
        ? ALL_SUBJECTS[randInt(0, ALL_SUBJECTS.length - 1)]
        : subject;

    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = this.drawOne(targetSubject, difficulty);
      if (!this.recentPrompts.has(candidate.prompt)) {
        this.recentPrompts.add(candidate.prompt);
        if (this.recentPrompts.size > 24) {
          const oldest = this.recentPrompts.values().next().value;
          if (oldest !== undefined) {
            this.recentPrompts.delete(oldest);
          }
        }
        return candidate;
      }
    }

    return this.drawOne(targetSubject, difficulty);
  }

  private drawOne(subject: CoreSubject, difficulty: Difficulty): Question {
    if (subject === 'math') return generateMathQuestion(difficulty);
    if (subject === 'cs') return generateCsQuestion(difficulty);

    const bank =
      subject === 'science'
        ? SCIENCE_BANK[difficulty]
        : subject === 'geography'
        ? GEOGRAPHY_BANK[difficulty]
        : VOCAB_BANK[difficulty];

    const raw = bank[randInt(0, bank.length - 1)];
    return {
      id: `${subject}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      subject,
      ...raw,
    };
  }
}
