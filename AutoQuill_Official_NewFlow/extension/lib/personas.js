/**
 * Personas Module
 * Defines all typing personas with WPM, typo, pause, and break configurations
 * Organized into 4 packages: Fast, Normal, Medium, Hype
 */

// Package definitions
self.PACKAGES = [
  {
    id: 'fast',
    name: 'Fast (Tweets)',
    description: '100-150 WPM for quick tweets',
    personaIds: ['speed-demon', 'deadline-rusher', 'hyper-caffeinated', 'voice-to-text', 'angry-ranter', 'aping-in', 'fomo-buyer', 'defi-degen', 'moon-boy', 'gamer-keyboard']
  },
  {
    id: 'normal',
    name: 'Normal (Login)',
    description: '75-95 WPM for usernames/passwords',
    personaIds: ['lurker-awakened', 'early-adopter', 'web3-builder', 'thread-master', 'community-member', 'professional-writer']
  },
  {
    id: 'medium',
    name: 'Medium (Comments)',
    description: '85-115 WPM balanced typing',
    personaIds: ['crypto-bro', 'twitter-native', 'alpha-hunter', 'ct-regular', 'wagmi-warrior', 'diamond-hands', 'nft-collector', 'airdrop-hunter', 'influencer-reply', 'space-host']
  },
  {
    id: 'hype',
    name: 'Hype (Shilling)',
    description: '95-130 WPM for hype posts',
    personaIds: ['hype-beast', 'shiller-pro', 'reply-guy', 'kol-wannabe', 'bullish-believer', 'testnet-grinder', 'telegram-farmer', 'quest-completer']
  }
];

// All 36 personas with complete configurations
self.PERSONAS = {
  'speed-demon': {
    id: 'speed-demon',
    name: 'Speed Demon',
    wpm: { min: 120, max: 150 },
    typos: { enabled: true, interval: { min: 60, max: 100 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 200, max: 300 }, duration: { min: 0.3, max: 0.6 } },
    breaks: { enabled: false, every_words: { min: 50, max: 80 }, duration: { min: 1.0, max: 2.0 } }
  },
  'professional-writer': {
    id: 'professional-writer',
    name: 'Professional Writer',
    wpm: { min: 75, max: 90 },
    typos: { enabled: true, interval: { min: 80, max: 150 }, count: { min: 1, max: 2 } },
    pauses: { enabled: true, every_chars: { min: 150, max: 250 }, duration: { min: 0.5, max: 1.0 } },
    breaks: { enabled: false, every_words: { min: 40, max: 60 }, duration: { min: 2.0, max: 4.0 } }
  },
  'gamer-keyboard': {
    id: 'gamer-keyboard',
    name: 'Gamer Keyboard',
    wpm: { min: 100, max: 135 },
    typos: { enabled: true, interval: { min: 40, max: 80 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 150, max: 250 }, duration: { min: 0.2, max: 0.5 } },
    breaks: { enabled: false, every_words: { min: 50, max: 80 }, duration: { min: 1.0, max: 2.0 } }
  },
  'deadline-rusher': {
    id: 'deadline-rusher',
    name: 'Deadline Rusher',
    wpm: { min: 105, max: 140 },
    typos: { enabled: true, interval: { min: 25, max: 45 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 150, max: 250 }, duration: { min: 0.2, max: 0.5 } },
    breaks: { enabled: false, every_words: { min: 40, max: 70 }, duration: { min: 0.5, max: 1.5 } }
  },
  'voice-to-text': {
    id: 'voice-to-text',
    name: 'Voice to Text Feel',
    wpm: { min: 115, max: 145 },
    typos: { enabled: true, interval: { min: 50, max: 90 }, count: { min: 1, max: 2 } },
    pauses: { enabled: true, every_chars: { min: 100, max: 200 }, duration: { min: 0.3, max: 0.6 } },
    breaks: { enabled: false, every_words: { min: 30, max: 50 }, duration: { min: 1.0, max: 2.0 } }
  },
  'angry-ranter': {
    id: 'angry-ranter',
    name: 'Angry Ranter',
    wpm: { min: 100, max: 130 },
    typos: { enabled: true, interval: { min: 20, max: 35 }, count: { min: 1, max: 3 } },
    pauses: { enabled: false, every_chars: { min: 120, max: 200 }, duration: { min: 0.2, max: 0.5 } },
    breaks: { enabled: false, every_words: { min: 35, max: 60 }, duration: { min: 0.5, max: 1.5 } }
  },
  'hyper-caffeinated': {
    id: 'hyper-caffeinated',
    name: 'Hyper Caffeinated',
    wpm: { min: 110, max: 145 },
    typos: { enabled: true, interval: { min: 25, max: 45 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 150, max: 250 }, duration: { min: 0.2, max: 0.4 } },
    breaks: { enabled: false, every_words: { min: 45, max: 70 }, duration: { min: 0.5, max: 1.0 } }
  },
  'crypto-bro': {
    id: 'crypto-bro',
    name: 'Crypto Bro',
    wpm: { min: 85, max: 110 },
    typos: { enabled: true, interval: { min: 30, max: 55 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 100, max: 180 }, duration: { min: 0.3, max: 0.7 } },
    breaks: { enabled: false, every_words: { min: 30, max: 50 }, duration: { min: 1.0, max: 2.0 } }
  },
  'hype-beast': {
    id: 'hype-beast',
    name: 'Hype Beast',
    wpm: { min: 95, max: 125 },
    typos: { enabled: true, interval: { min: 25, max: 45 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 120, max: 200 }, duration: { min: 0.3, max: 0.6 } },
    breaks: { enabled: false, every_words: { min: 35, max: 55 }, duration: { min: 0.5, max: 1.5 } }
  },
  'meme-lord': {
    id: 'meme-lord',
    name: 'Meme Lord',
    wpm: { min: 90, max: 115 },
    typos: { enabled: true, interval: { min: 35, max: 60 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 100, max: 180 }, duration: { min: 0.3, max: 0.6 } },
    breaks: { enabled: false, every_words: { min: 25, max: 45 }, duration: { min: 1.0, max: 2.0 } }
  },
  'early-adopter': {
    id: 'early-adopter',
    name: 'Early Adopter',
    wpm: { min: 80, max: 95 },
    typos: { enabled: true, interval: { min: 45, max: 80 }, count: { min: 1, max: 2 } },
    pauses: { enabled: true, every_chars: { min: 90, max: 160 }, duration: { min: 0.4, max: 0.8 } },
    breaks: { enabled: false, every_words: { min: 28, max: 48 }, duration: { min: 1.5, max: 3.0 } }
  },
  'twitter-native': {
    id: 'twitter-native',
    name: 'Twitter Native',
    wpm: { min: 95, max: 115 },
    typos: { enabled: true, interval: { min: 40, max: 70 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 100, max: 180 }, duration: { min: 0.3, max: 0.6 } },
    breaks: { enabled: false, every_words: { min: 30, max: 50 }, duration: { min: 1.0, max: 2.0 } }
  },
  'shiller-pro': {
    id: 'shiller-pro',
    name: 'Shiller Pro',
    wpm: { min: 100, max: 130 },
    typos: { enabled: true, interval: { min: 35, max: 60 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 120, max: 200 }, duration: { min: 0.2, max: 0.5 } },
    breaks: { enabled: false, every_words: { min: 35, max: 55 }, duration: { min: 0.5, max: 1.5 } }
  },
  'alpha-hunter': {
    id: 'alpha-hunter',
    name: 'Alpha Hunter',
    wpm: { min: 90, max: 110 },
    typos: { enabled: true, interval: { min: 30, max: 55 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 100, max: 180 }, duration: { min: 0.3, max: 0.6 } },
    breaks: { enabled: false, every_words: { min: 30, max: 50 }, duration: { min: 1.0, max: 2.0 } }
  },
  'fomo-buyer': {
    id: 'fomo-buyer',
    name: 'FOMO Buyer',
    wpm: { min: 105, max: 135 },
    typos: { enabled: true, interval: { min: 25, max: 45 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 130, max: 220 }, duration: { min: 0.2, max: 0.5 } },
    breaks: { enabled: false, every_words: { min: 40, max: 65 }, duration: { min: 0.5, max: 1.0 } }
  },
  'degen-trader': {
    id: 'degen-trader',
    name: 'Degen Trader',
    wpm: { min: 100, max: 125 },
    typos: { enabled: true, interval: { min: 20, max: 40 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 110, max: 190 }, duration: { min: 0.2, max: 0.5 } },
    breaks: { enabled: false, every_words: { min: 35, max: 55 }, duration: { min: 0.5, max: 1.5 } }
  },
  'diamond-hands': {
    id: 'diamond-hands',
    name: 'Diamond Hands',
    wpm: { min: 85, max: 105 },
    typos: { enabled: true, interval: { min: 50, max: 90 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 120, max: 200 }, duration: { min: 0.3, max: 0.7 } },
    breaks: { enabled: false, every_words: { min: 35, max: 55 }, duration: { min: 1.0, max: 2.0 } }
  },
  'nft-collector': {
    id: 'nft-collector',
    name: 'NFT Collector',
    wpm: { min: 90, max: 110 },
    typos: { enabled: true, interval: { min: 35, max: 60 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 100, max: 180 }, duration: { min: 0.3, max: 0.6 } },
    breaks: { enabled: false, every_words: { min: 30, max: 50 }, duration: { min: 1.0, max: 2.0 } }
  },
  'airdrop-hunter': {
    id: 'airdrop-hunter',
    name: 'Airdrop Hunter',
    wpm: { min: 95, max: 115 },
    typos: { enabled: true, interval: { min: 30, max: 50 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 100, max: 180 }, duration: { min: 0.3, max: 0.6 } },
    breaks: { enabled: false, every_words: { min: 30, max: 50 }, duration: { min: 1.0, max: 2.0 } }
  },
  'web3-builder': {
    id: 'web3-builder',
    name: 'Web3 Builder',
    wpm: { min: 75, max: 90 },
    typos: { enabled: true, interval: { min: 60, max: 100 }, count: { min: 1, max: 2 } },
    pauses: { enabled: true, every_chars: { min: 120, max: 200 }, duration: { min: 0.5, max: 1.0 } },
    breaks: { enabled: false, every_words: { min: 35, max: 55 }, duration: { min: 1.5, max: 3.0 } }
  },
  'defi-degen': {
    id: 'defi-degen',
    name: 'DeFi Degen',
    wpm: { min: 100, max: 130 },
    typos: { enabled: true, interval: { min: 25, max: 45 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 120, max: 200 }, duration: { min: 0.2, max: 0.5 } },
    breaks: { enabled: false, every_words: { min: 40, max: 60 }, duration: { min: 0.5, max: 1.5 } }
  },
  'ct-regular': {
    id: 'ct-regular',
    name: 'CT Regular',
    wpm: { min: 90, max: 110 },
    typos: { enabled: true, interval: { min: 35, max: 60 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 100, max: 180 }, duration: { min: 0.3, max: 0.6 } },
    breaks: { enabled: false, every_words: { min: 30, max: 50 }, duration: { min: 1.0, max: 2.0 } }
  },
  'influencer-reply': {
    id: 'influencer-reply',
    name: 'Influencer Reply',
    wpm: { min: 85, max: 110 },
    typos: { enabled: true, interval: { min: 45, max: 80 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 110, max: 190 }, duration: { min: 0.3, max: 0.7 } },
    breaks: { enabled: false, every_words: { min: 30, max: 50 }, duration: { min: 1.0, max: 2.0 } }
  },
  'reply-guy': {
    id: 'reply-guy',
    name: 'Reply Guy',
    wpm: { min: 100, max: 125 },
    typos: { enabled: true, interval: { min: 30, max: 55 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 100, max: 180 }, duration: { min: 0.2, max: 0.5 } },
    breaks: { enabled: false, every_words: { min: 35, max: 55 }, duration: { min: 0.5, max: 1.5 } }
  },
  'thread-master': {
    id: 'thread-master',
    name: 'Thread Master',
    wpm: { min: 80, max: 95 },
    typos: { enabled: true, interval: { min: 50, max: 90 }, count: { min: 1, max: 2 } },
    pauses: { enabled: true, every_chars: { min: 100, max: 180 }, duration: { min: 0.5, max: 1.0 } },
    breaks: { enabled: false, every_words: { min: 30, max: 50 }, duration: { min: 1.5, max: 3.0 } }
  },
  'space-host': {
    id: 'space-host',
    name: 'Space Host',
    wpm: { min: 85, max: 105 },
    typos: { enabled: true, interval: { min: 40, max: 70 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 100, max: 180 }, duration: { min: 0.3, max: 0.7 } },
    breaks: { enabled: false, every_words: { min: 30, max: 50 }, duration: { min: 1.0, max: 2.0 } }
  },
  'kol-wannabe': {
    id: 'kol-wannabe',
    name: 'KOL Wannabe',
    wpm: { min: 95, max: 120 },
    typos: { enabled: true, interval: { min: 35, max: 60 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 110, max: 190 }, duration: { min: 0.3, max: 0.6 } },
    breaks: { enabled: false, every_words: { min: 35, max: 55 }, duration: { min: 0.5, max: 1.5 } }
  },
  'lurker-awakened': {
    id: 'lurker-awakened',
    name: 'Lurker Awakened',
    wpm: { min: 75, max: 90 },
    typos: { enabled: true, interval: { min: 50, max: 90 }, count: { min: 1, max: 2 } },
    pauses: { enabled: true, every_chars: { min: 100, max: 180 }, duration: { min: 0.5, max: 1.0 } },
    breaks: { enabled: false, every_words: { min: 30, max: 50 }, duration: { min: 1.5, max: 3.0 } }
  },
  'aping-in': {
    id: 'aping-in',
    name: 'Aping In',
    wpm: { min: 110, max: 140 },
    typos: { enabled: true, interval: { min: 20, max: 40 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 130, max: 220 }, duration: { min: 0.2, max: 0.4 } },
    breaks: { enabled: false, every_words: { min: 45, max: 70 }, duration: { min: 0.5, max: 1.0 } }
  },
  'bullish-believer': {
    id: 'bullish-believer',
    name: 'Bullish Believer',
    wpm: { min: 95, max: 120 },
    typos: { enabled: true, interval: { min: 30, max: 55 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 110, max: 190 }, duration: { min: 0.3, max: 0.6 } },
    breaks: { enabled: false, every_words: { min: 35, max: 55 }, duration: { min: 0.5, max: 1.5 } }
  },
  'moon-boy': {
    id: 'moon-boy',
    name: 'Moon Boy',
    wpm: { min: 100, max: 130 },
    typos: { enabled: true, interval: { min: 25, max: 45 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 120, max: 200 }, duration: { min: 0.2, max: 0.5 } },
    breaks: { enabled: false, every_words: { min: 40, max: 60 }, duration: { min: 0.5, max: 1.5 } }
  },
  'wagmi-warrior': {
    id: 'wagmi-warrior',
    name: 'WAGMI Warrior',
    wpm: { min: 90, max: 110 },
    typos: { enabled: true, interval: { min: 35, max: 60 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 100, max: 180 }, duration: { min: 0.3, max: 0.6 } },
    breaks: { enabled: false, every_words: { min: 30, max: 50 }, duration: { min: 1.0, max: 2.0 } }
  },
  'community-member': {
    id: 'community-member',
    name: 'Community Member',
    wpm: { min: 80, max: 95 },
    typos: { enabled: true, interval: { min: 45, max: 80 }, count: { min: 1, max: 2 } },
    pauses: { enabled: true, every_chars: { min: 100, max: 180 }, duration: { min: 0.4, max: 0.8 } },
    breaks: { enabled: false, every_words: { min: 30, max: 50 }, duration: { min: 1.0, max: 2.0 } }
  },
  'testnet-grinder': {
    id: 'testnet-grinder',
    name: 'Testnet Grinder',
    wpm: { min: 95, max: 120 },
    typos: { enabled: true, interval: { min: 35, max: 60 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 110, max: 190 }, duration: { min: 0.3, max: 0.6 } },
    breaks: { enabled: false, every_words: { min: 35, max: 55 }, duration: { min: 0.5, max: 1.5 } }
  },
  'telegram-farmer': {
    id: 'telegram-farmer',
    name: 'Telegram Farmer',
    wpm: { min: 100, max: 125 },
    typos: { enabled: true, interval: { min: 30, max: 55 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 100, max: 180 }, duration: { min: 0.2, max: 0.5 } },
    breaks: { enabled: false, every_words: { min: 35, max: 55 }, duration: { min: 0.5, max: 1.5 } }
  },
  'quest-completer': {
    id: 'quest-completer',
    name: 'Quest Completer',
    wpm: { min: 95, max: 120 },
    typos: { enabled: true, interval: { min: 40, max: 70 }, count: { min: 1, max: 2 } },
    pauses: { enabled: false, every_chars: { min: 110, max: 190 }, duration: { min: 0.3, max: 0.6 } },
    breaks: { enabled: false, every_words: { min: 35, max: 55 }, duration: { min: 0.5, max: 1.5 } }
  }
};

/**
 * Get a persona by ID
 * @param {string} id - Persona ID
 * @returns {Object|null} Persona configuration or null if not found
 */
function getPersona(id) {
  return PERSONAS[id] || null;
}

/**
 * Get all personas as an array
 * @returns {Object[]} Array of all persona configurations
 */
function getAllPersonas() {
  return Object.values(PERSONAS);
}

/**
 * Get personas grouped by package
 * @returns {Object} Object with package names as keys and arrays of personas as values
 */
function getPersonasGrouped() {
  const grouped = {};

  PACKAGES.forEach(pkg => {
    grouped[pkg.name] = pkg.personaIds.map(id => PERSONAS[id]).filter(p => p);
  });

  return grouped;
}

/**
 * Get all packages
 * @returns {Object[]} Array of package definitions
 */
function getPackages() {
  return PACKAGES;
}

/**
 * Get a random persona from a specific package
 * @param {string} packageId - Package ID (fast, normal, medium, hype)
 * @returns {Object|null} Random persona from the package or null if package not found
 */
function getRandomPersonaFromPackage(packageId) {
  const pkg = PACKAGES.find(p => p.id === packageId);
  if (!pkg || pkg.personaIds.length === 0) {
    return null;
  }

  const randomId = pkg.personaIds[Math.floor(Math.random() * pkg.personaIds.length)];
  return PERSONAS[randomId];
}

/**
 * Get all personas in a specific package
 * @param {string} packageId - Package ID (fast, normal, medium, hype)
 * @returns {Object[]} Array of personas in the package
 */
function getPersonasByPackage(packageId) {
  const pkg = PACKAGES.find(p => p.id === packageId);
  if (!pkg) {
    return [];
  }

  return pkg.personaIds.map(id => PERSONAS[id]).filter(p => p);
}
