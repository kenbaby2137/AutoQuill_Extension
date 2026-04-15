/**
 * Keyboard Map Module
 * Maps characters to their keyboard codes and adjacent keys for realistic typing simulation
 */

// Key code mappings for Chrome DevTools Protocol
// Format: { code: 'KeyA', keyCode: 65, needsShift: false }
const KEY_CODES = {
  // Lowercase letters
  'a': { code: 'KeyA', keyCode: 65, needsShift: false },
  'b': { code: 'KeyB', keyCode: 66, needsShift: false },
  'c': { code: 'KeyC', keyCode: 67, needsShift: false },
  'd': { code: 'KeyD', keyCode: 68, needsShift: false },
  'e': { code: 'KeyE', keyCode: 69, needsShift: false },
  'f': { code: 'KeyF', keyCode: 70, needsShift: false },
  'g': { code: 'KeyG', keyCode: 71, needsShift: false },
  'h': { code: 'KeyH', keyCode: 72, needsShift: false },
  'i': { code: 'KeyI', keyCode: 73, needsShift: false },
  'j': { code: 'KeyJ', keyCode: 74, needsShift: false },
  'k': { code: 'KeyK', keyCode: 75, needsShift: false },
  'l': { code: 'KeyL', keyCode: 76, needsShift: false },
  'm': { code: 'KeyM', keyCode: 77, needsShift: false },
  'n': { code: 'KeyN', keyCode: 78, needsShift: false },
  'o': { code: 'KeyO', keyCode: 79, needsShift: false },
  'p': { code: 'KeyP', keyCode: 80, needsShift: false },
  'q': { code: 'KeyQ', keyCode: 81, needsShift: false },
  'r': { code: 'KeyR', keyCode: 82, needsShift: false },
  's': { code: 'KeyS', keyCode: 83, needsShift: false },
  't': { code: 'KeyT', keyCode: 84, needsShift: false },
  'u': { code: 'KeyU', keyCode: 85, needsShift: false },
  'v': { code: 'KeyV', keyCode: 86, needsShift: false },
  'w': { code: 'KeyW', keyCode: 87, needsShift: false },
  'x': { code: 'KeyX', keyCode: 88, needsShift: false },
  'y': { code: 'KeyY', keyCode: 89, needsShift: false },
  'z': { code: 'KeyZ', keyCode: 90, needsShift: false },

  // Uppercase letters (same code, but needsShift = true)
  'A': { code: 'KeyA', keyCode: 65, needsShift: true },
  'B': { code: 'KeyB', keyCode: 66, needsShift: true },
  'C': { code: 'KeyC', keyCode: 67, needsShift: true },
  'D': { code: 'KeyD', keyCode: 68, needsShift: true },
  'E': { code: 'KeyE', keyCode: 69, needsShift: true },
  'F': { code: 'KeyF', keyCode: 70, needsShift: true },
  'G': { code: 'KeyG', keyCode: 71, needsShift: true },
  'H': { code: 'KeyH', keyCode: 72, needsShift: true },
  'I': { code: 'KeyI', keyCode: 73, needsShift: true },
  'J': { code: 'KeyJ', keyCode: 74, needsShift: true },
  'K': { code: 'KeyK', keyCode: 75, needsShift: true },
  'L': { code: 'KeyL', keyCode: 76, needsShift: true },
  'M': { code: 'KeyM', keyCode: 77, needsShift: true },
  'N': { code: 'KeyN', keyCode: 78, needsShift: true },
  'O': { code: 'KeyO', keyCode: 79, needsShift: true },
  'P': { code: 'KeyP', keyCode: 80, needsShift: true },
  'Q': { code: 'KeyQ', keyCode: 81, needsShift: true },
  'R': { code: 'KeyR', keyCode: 82, needsShift: true },
  'S': { code: 'KeyS', keyCode: 83, needsShift: true },
  'T': { code: 'KeyT', keyCode: 84, needsShift: true },
  'U': { code: 'KeyU', keyCode: 85, needsShift: true },
  'V': { code: 'KeyV', keyCode: 86, needsShift: true },
  'W': { code: 'KeyW', keyCode: 87, needsShift: true },
  'X': { code: 'KeyX', keyCode: 88, needsShift: true },
  'Y': { code: 'KeyY', keyCode: 89, needsShift: true },
  'Z': { code: 'KeyZ', keyCode: 90, needsShift: true },

  // Numbers
  '0': { code: 'Digit0', keyCode: 48, needsShift: false },
  '1': { code: 'Digit1', keyCode: 49, needsShift: false },
  '2': { code: 'Digit2', keyCode: 50, needsShift: false },
  '3': { code: 'Digit3', keyCode: 51, needsShift: false },
  '4': { code: 'Digit4', keyCode: 52, needsShift: false },
  '5': { code: 'Digit5', keyCode: 53, needsShift: false },
  '6': { code: 'Digit6', keyCode: 54, needsShift: false },
  '7': { code: 'Digit7', keyCode: 55, needsShift: false },
  '8': { code: 'Digit8', keyCode: 56, needsShift: false },
  '9': { code: 'Digit9', keyCode: 57, needsShift: false },

  // Special characters (shifted numbers)
  ')': { code: 'Digit0', keyCode: 48, needsShift: true },
  '!': { code: 'Digit1', keyCode: 49, needsShift: true },
  '@': { code: 'Digit2', keyCode: 50, needsShift: true },
  '#': { code: 'Digit3', keyCode: 51, needsShift: true },
  '$': { code: 'Digit4', keyCode: 52, needsShift: true },
  '%': { code: 'Digit5', keyCode: 53, needsShift: true },
  '^': { code: 'Digit6', keyCode: 54, needsShift: true },
  '&': { code: 'Digit7', keyCode: 55, needsShift: true },
  '*': { code: 'Digit8', keyCode: 56, needsShift: true },
  '(': { code: 'Digit9', keyCode: 57, needsShift: true },

  // Punctuation and symbols
  ' ': { code: 'Space', keyCode: 32, needsShift: false },
  '-': { code: 'Minus', keyCode: 189, needsShift: false },
  '_': { code: 'Minus', keyCode: 189, needsShift: true },
  '=': { code: 'Equal', keyCode: 187, needsShift: false },
  '+': { code: 'Equal', keyCode: 187, needsShift: true },
  '[': { code: 'BracketLeft', keyCode: 219, needsShift: false },
  '{': { code: 'BracketLeft', keyCode: 219, needsShift: true },
  ']': { code: 'BracketRight', keyCode: 221, needsShift: false },
  '}': { code: 'BracketRight', keyCode: 221, needsShift: true },
  '\\': { code: 'Backslash', keyCode: 220, needsShift: false },
  '|': { code: 'Backslash', keyCode: 220, needsShift: true },
  ';': { code: 'Semicolon', keyCode: 186, needsShift: false },
  ':': { code: 'Semicolon', keyCode: 186, needsShift: true },
  "'": { code: 'Quote', keyCode: 222, needsShift: false },
  '"': { code: 'Quote', keyCode: 222, needsShift: true },
  ',': { code: 'Comma', keyCode: 188, needsShift: false },
  '<': { code: 'Comma', keyCode: 188, needsShift: true },
  '.': { code: 'Period', keyCode: 190, needsShift: false },
  '>': { code: 'Period', keyCode: 190, needsShift: true },
  '/': { code: 'Slash', keyCode: 191, needsShift: false },
  '?': { code: 'Slash', keyCode: 191, needsShift: true },
  '`': { code: 'Backquote', keyCode: 192, needsShift: false },
  '~': { code: 'Backquote', keyCode: 192, needsShift: true },

  // Control keys
  '\n': { code: 'Enter', keyCode: 13, needsShift: false },
  '\t': { code: 'Tab', keyCode: 9, needsShift: false },
};

// Adjacent keys mapping for QWERTY layout (for typo simulation)
// Each key maps to an array of adjacent keys
const ADJACENT_KEYS = {
  // Top row
  'q': ['w', 'a', 's'],
  'w': ['q', 'e', 'a', 's', 'd'],
  'e': ['w', 'r', 's', 'd', 'f'],
  'r': ['e', 't', 'd', 'f', 'g'],
  't': ['r', 'y', 'f', 'g', 'h'],
  'y': ['t', 'u', 'g', 'h', 'j'],
  'u': ['y', 'i', 'h', 'j', 'k'],
  'i': ['u', 'o', 'j', 'k', 'l'],
  'o': ['i', 'p', 'k', 'l'],
  'p': ['o', 'l'],

  // Middle row
  'a': ['q', 'w', 's', 'z'],
  's': ['q', 'w', 'e', 'a', 'd', 'z', 'x'],
  'd': ['w', 'e', 'r', 's', 'f', 'x', 'c'],
  'f': ['e', 'r', 't', 'd', 'g', 'c', 'v'],
  'g': ['r', 't', 'y', 'f', 'h', 'v', 'b'],
  'h': ['t', 'y', 'u', 'g', 'j', 'b', 'n'],
  'j': ['y', 'u', 'i', 'h', 'k', 'n', 'm'],
  'k': ['u', 'i', 'o', 'j', 'l', 'm'],
  'l': ['i', 'o', 'p', 'k'],

  // Bottom row
  'z': ['a', 's', 'x'],
  'x': ['s', 'd', 'z', 'c'],
  'c': ['d', 'f', 'x', 'v'],
  'v': ['f', 'g', 'c', 'b'],
  'b': ['g', 'h', 'v', 'n'],
  'n': ['h', 'j', 'b', 'm'],
  'm': ['j', 'k', 'n'],

  // Number row
  '1': ['2', 'q'],
  '2': ['1', '3', 'q', 'w'],
  '3': ['2', '4', 'w', 'e'],
  '4': ['3', '5', 'e', 'r'],
  '5': ['4', '6', 'r', 't'],
  '6': ['5', '7', 't', 'y'],
  '7': ['6', '8', 'y', 'u'],
  '8': ['7', '9', 'u', 'i'],
  '9': ['8', '0', 'i', 'o'],
  '0': ['9', 'o', 'p'],

  // Special characters (use their shifted equivalents' adjacent keys)
  '!': ['@', 'Q'],
  '@': ['!', '#', 'Q', 'W'],
  '#': ['@', '$', 'W', 'E'],
  '$': ['#', '%', 'E', 'R'],
  '%': ['^', '$', 'R', 'T'],
  '^': ['%', '&', 'T', 'Y'],
  '&': ['^', '*', 'Y', 'U'],
  '*': ['&', '(', 'U', 'I'],
  '(': ['*', ')', 'I', 'O'],
  ')': ['(', 'O', 'P'],
};

/**
 * Get keyboard information for a character
 * @param {string} char - Single character to get info for
 * @returns {Object|null} Object with code, key, text, needsShift properties
 */
function getKeyInfo(char) {
  const keyInfo = KEY_CODES[char];
  if (!keyInfo) {
    return null;
  }

  return {
    code: keyInfo.code,
    key: char,
    text: char,
    needsShift: keyInfo.needsShift,
    keyCode: keyInfo.keyCode
  };
}

/**
 * Get a random adjacent key for typo simulation
 * @param {string} char - Character to find adjacent key for
 * @returns {string|null} Random adjacent character, or null if no adjacent keys
 */
function getAdjacentKey(char) {
  const lowerChar = char.toLowerCase();
  const adjacentKeys = ADJACENT_KEYS[lowerChar];

  if (!adjacentKeys || adjacentKeys.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * adjacentKeys.length);
  const adjacentChar = adjacentKeys[randomIndex];

  // Preserve case if original char was uppercase
  if (char !== lowerChar) {
    return adjacentChar.toUpperCase();
  }

  return adjacentChar;
}

/**
 * Check if a character requires shift key
 * @param {string} char - Character to check
 * @returns {boolean} True if shift key is needed
 */
function needsShift(char) {
  const keyInfo = KEY_CODES[char];
  return keyInfo ? keyInfo.needsShift : false;
}

/**
 * Get all supported characters
 * @returns {string[]} Array of all supported characters
 */
function getSupportedCharacters() {
  return Object.keys(KEY_CODES);
}

/**
 * Check if a character is supported
 * @param {string} char - Character to check
 * @returns {boolean} True if character has a mapping
 */
function isSupported(char) {
  return char in KEY_CODES;
}

// QWERTY keyboard physical coordinates (row, col) for distance calculation
const KEY_POSITIONS = {
  '`': [0, 0], '1': [0, 1], '2': [0, 2], '3': [0, 3], '4': [0, 4], '5': [0, 5],
  '6': [0, 6], '7': [0, 7], '8': [0, 8], '9': [0, 9], '0': [0, 10],
  'q': [1, 0], 'w': [1, 1], 'e': [1, 2], 'r': [1, 3], 't': [1, 4], 'y': [1, 5],
  'u': [1, 6], 'i': [1, 7], 'o': [1, 8], 'p': [1, 9],
  'a': [2, 0], 's': [2, 1], 'd': [2, 2], 'f': [2, 3], 'g': [2, 4], 'h': [2, 5],
  'j': [2, 6], 'k': [2, 7], 'l': [2, 8],
  'z': [3, 0], 'x': [3, 1], 'c': [3, 2], 'v': [3, 3], 'b': [3, 4], 'n': [3, 5],
  'm': [3, 6], ' ': [4, 4]
};

/**
 * Calculate Manhattan distance between two keys
 * @param {string} char1 - First character
 * @param {string} char2 - Second character
 * @returns {number} Manhattan distance (0 if unknown)
 */
function getKeyDistance(char1, char2) {
  const pos1 = KEY_POSITIONS[char1.toLowerCase()];
  const pos2 = KEY_POSITIONS[char2.toLowerCase()];
  if (!pos1 || !pos2) return 0;
  return Math.abs(pos1[0] - pos2[0]) + Math.abs(pos1[1] - pos2[1]);
}
