/**
 * CDP Typing Engine - Chrome DevTools Protocol based typing
 * Sends hardware-level isTrusted:true keystrokes via chrome.debugger API
 * Completely stealthy - indistinguishable from real keyboard input
 *
 * Loaded by background.js service worker via importScripts.
 * Depends on: keyboard-map.js (getKeyInfo, getAdjacentKey, getKeyDistance),
 *             personas.js (getPersona)
 */

const TIMING = {
  WPM_VARIATION_FACTOR: 0.15,
  MIN_CHAR_DELAY: 20,
  DWELL_TIME_MIN: 25,
  DWELL_TIME_MAX: 45,
  SHIFT_DELAY_MIN: 15,
  SHIFT_DELAY_MAX: 30,
  TYPO_PAUSE_MIN: 200,
  TYPO_PAUSE_MAX: 500,
  PUNCTUATION_DELAY_MIN: 100,
  PUNCTUATION_DELAY_MAX: 200,
  COGNITIVE_PAUSE_CHANCE: 0.15,
  COGNITIVE_PAUSE_MIN: 300,
  COGNITIVE_PAUSE_MAX: 800,
  DISTANCE_THRESHOLD: 4,
  DISTANCE_DELAY_MIN: 50,
  DISTANCE_DELAY_MAX: 150,
  FATIGUE_START_PERCENT: 0.7,
  FATIGUE_DECAY_PERCENT: 0.1
};

// Track Shift key state across typeChar calls
let cdpShiftPressed = false;

class CDPTypingEngine {
  constructor() {
    this.isTyping = false;
    this.shouldStop = false;
    this.persona = null;
    this.progress = { current: 0, total: 0 };
    this.charsTyped = 0;
    this.charsSinceTypo = 0;
    this.charsSincePause = 0;
    this.lastChar = null;
    this.lastProgressReport = 0;
    this.tabId = null;
    this.onProgress = null;
    this.abortController = null;
  }

  /**
   * Start typing using CDP Input.dispatchKeyEvent
   * @param {number} tabId - Tab ID to type into
   * @param {string} content - Text to type
   * @param {string} personaId - Persona ID for timing config
   * @param {Function} onProgress - Progress callback (percent 0-100)
   */
  async start(tabId, content, personaId, onProgress) {
    this.tabId = tabId;
    this.onProgress = onProgress;
    this.shouldStop = false;
    this.abortController = new AbortController();
    this.charsTyped = 0;
    this.charsSinceTypo = 0;
    this.charsSincePause = 0;
    this.lastChar = null;
    this.lastProgressReport = 0;
    cdpShiftPressed = false;

    this.persona = getPersona(personaId);
    if (!this.persona) throw new Error(`Persona not found: ${personaId}`);

    // Focus the textarea via CDP before typing starts
    await this.focusTextarea();

    this.isTyping = true;
    try {
      await this.typeText(content);
    } finally {
      this.isTyping = false;
    }
  }

  /**
   * Focus the X.com compose textarea using CDP
   */
  async focusTextarea() {
    try {
      // SAFE ISOLATION: We do NOT touch Network/Log/Console domains 
      // to ensure 100% compatibility with GPM's proxy management.
      // We only focus the element to prepare for the Input domain commands.
      await this.sendCommand('Runtime.evaluate', {
        expression: `
          (() => {
            const selectors = ['[data-testid="tweetTextarea_0"]', '[data-testid="tweetTextarea_1"]', '[role="textbox"]'];
            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (el) { el.focus(); return true; }
            }
            return false;
          })()
        `,
        returnByValue: true
      });
      await this.delay(100);
    } catch (e) {
      console.warn('[CDP] Focus failed:', e.message);
    }
  }

  /**
   * Send a CDP command to the attached tab
   * @param {string} method - CDP method name
   * @param {object} params - Method parameters
   * @returns {Promise<object>}
   */
  async sendCommand(method, params) {
    return new Promise((resolve, reject) => {
      // Reject immediately if already aborted
      if (this.abortController?.signal.aborted) {
        return reject(new Error('ABORTED'));
      }

      // Safety timeout for GPM stability
      const timeout = setTimeout(() => {
        reject(new Error('CDP_TIMEOUT'));
      }, 3000);

      // Handler to cancel if abort occurs during the wait
      const abortHandler = () => {
        clearTimeout(timeout);
        reject(new Error('ABORTED'));
      };
      this.abortController?.signal.addEventListener('abort', abortHandler, { once: true });

      chrome.debugger.sendCommand({ tabId: this.tabId }, method, params || {}, (result) => {
        clearTimeout(timeout);
        this.abortController?.signal.removeEventListener('abort', abortHandler);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Stop the typing engine immediately
   */
  stop() {
    this.shouldStop = true;
    this.isTyping = false;
    cdpShiftPressed = false;
    // CRITICAL: Abort all pending promises to prevent GPM crash
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Dispatch a single key event via CDP Input.dispatchKeyEvent
   * @param {string} type - 'keyDown', 'keyUp', 'rawKeyDown', 'char'
   * @param {object} params - Key event parameters
   */
  async dispatchKey(type, params) {
    await this.sendCommand('Input.dispatchKeyEvent', { type, ...params });
  }

  /**
   * Type a single character using CDP
   * USES Input.insertText for maximum stability in GPM
   * @param {string} char - Character to type
   */
  async typeChar(char) {
    try {
      // Use insertText instead of triple key sequence
      // This is much faster, more stable, and still isTrusted:true
      await this.sendCommand('Input.insertText', { text: char });
      
      // Fixed delay to simulate hardware processing
      await this.delay(this.gaussianRandom(TIMING.DWELL_TIME_MIN, TIMING.DWELL_TIME_MAX));
    } catch (e) {
      if (e.message.includes('Detached') || e.message === 'CDP_TIMEOUT') {
        this.stop();
      } else {
        throw e;
      }
    }
  }

  /**
   * Type backspace using CDP
   */
  async typeBackspace() {
    await this.dispatchKey('rawKeyDown', {
      key: 'Backspace', code: 'Backspace', keyCode: 8,
      windowsVirtualKeyCode: 8
    });
    await this.dispatchKey('keyUp', {
      key: 'Backspace', code: 'Backspace', keyCode: 8,
      windowsVirtualKeyCode: 8
    });
    await this.delay(this.gaussianRandom(TIMING.DWELL_TIME_MIN, TIMING.DWELL_TIME_MAX));
  }

  /**
   * Type Enter using CDP
   */
  async typeEnter() {
    await this.dispatchKey('rawKeyDown', {
      key: 'Enter', code: 'Enter', keyCode: 13,
      windowsVirtualKeyCode: 13
    });
    await this.dispatchKey('keyUp', {
      key: 'Enter', code: 'Enter', keyCode: 13,
      windowsVirtualKeyCode: 13
    });
  }

  /**
   * Main typing loop with human-like delays, typos, and pauses
   */
  async typeText(text) {
    const chars = [...text];
    this.progress.total = chars.length;

    for (let i = 0; i < chars.length; i++) {
      if (this.shouldStop) break;

      const char = chars[i];
      this.progress.current = i + 1;
      this.charsTyped++;
      this.charsSinceTypo++;
      this.charsSincePause++;

      // Skip carriage returns
      if (char === '\r') continue;

      // Inject typo or type normally
      if (this.shouldInjectTypo()) {
        await this.simulateTypo(char);
        this.charsSinceTypo = 0;
      } else {
        await this.typeChar(char);
      }

      // Calculate inter-character delay
      let charDelay = this.calculateBaseDelay();

      // Apply fatigue in later portion of text
      const progressPercent = i / chars.length;
      if (progressPercent >= TIMING.FATIGUE_START_PERCENT) {
        const fatigueProgress = (progressPercent - TIMING.FATIGUE_START_PERCENT) /
                                (1 - TIMING.FATIGUE_START_PERCENT);
        charDelay *= 1 + (TIMING.FATIGUE_DECAY_PERCENT * fatigueProgress);
      }

      // Physical key distance delay
      if (this.lastChar && char !== ' ' && this.lastChar !== ' ') {
        const distance = getKeyDistance(this.lastChar, char);
        if (distance >= TIMING.DISTANCE_THRESHOLD) {
          charDelay += this.gaussianRandom(TIMING.DISTANCE_DELAY_MIN, TIMING.DISTANCE_DELAY_MAX);
        }
      }

      // Extra delay for punctuation
      if ('.,!?;:'.includes(char)) {
        charDelay += this.gaussianRandom(TIMING.PUNCTUATION_DELAY_MIN, TIMING.PUNCTUATION_DELAY_MAX);
      }

      // Cognitive pause after spaces or sentence-ending punctuation
      if ((char === ' ' || '.,!?'.includes(char)) && Math.random() < TIMING.COGNITIVE_PAUSE_CHANCE) {
        charDelay += this.gaussianRandom(TIMING.COGNITIVE_PAUSE_MIN, TIMING.COGNITIVE_PAUSE_MAX);
      }

      // Thinking pause based on persona config
      if (this.shouldTakePause()) {
        const pauseDuration = this.gaussianRandom(
          this.persona.pauses.duration.min * 1000,
          this.persona.pauses.duration.max * 1000
        );
        charDelay += pauseDuration;
        this.charsSincePause = 0;
      }

      this.lastChar = char;
      await this.delay(charDelay);

      // Report progress (every 5% or at completion)
      if (this.onProgress) {
        const percentage = Math.round((this.progress.current / this.progress.total) * 100);
        if (percentage >= this.lastProgressReport + 5 || this.progress.current === this.progress.total) {
          this.lastProgressReport = percentage;
          this.onProgress(percentage);
        }
      }
    }
  }

  /**
   * Simulate typing a wrong character then correcting it
   */
  async simulateTypo(correctChar) {
    const wrongChar = getAdjacentKey(correctChar);
    if (!wrongChar) {
      await this.typeChar(correctChar);
      return;
    }

    await this.typeChar(wrongChar);
    await this.delay(this.gaussianRandom(TIMING.TYPO_PAUSE_MIN, TIMING.TYPO_PAUSE_MAX));
    await this.typeBackspace();
    await this.delay(this.gaussianRandom(50, 100));
    await this.typeChar(correctChar);
  }

  /**
   * Check if a typo should be injected based on persona config
   */
  shouldInjectTypo() {
    if (!this.persona.typos.enabled) return false;
    // Never typo right after @ (preserve mentions/handles)
    if (this.lastChar === '@') return false;
    const interval = this.gaussianRandom(
      this.persona.typos.interval.min,
      this.persona.typos.interval.max
    );
    return this.charsSinceTypo >= interval;
  }

  /**
   * Check if a thinking pause should be taken based on persona config
   */
  shouldTakePause() {
    if (!this.persona.pauses.enabled) return false;
    const interval = this.gaussianRandom(
      this.persona.pauses.every_chars.min,
      this.persona.pauses.every_chars.max
    );
    return this.charsSincePause >= interval;
  }

  /**
   * Calculate base inter-character delay from persona WPM
   */
  calculateBaseDelay() {
    const wpm = this.gaussianRandom(this.persona.wpm.min, this.persona.wpm.max);
    const targetDelay = (60000 / wpm) / 5; // 5 chars per word average
    const avgDwell = (TIMING.DWELL_TIME_MIN + TIMING.DWELL_TIME_MAX) / 2;
    const baseDelay = Math.max(0, targetDelay - avgDwell);
    const variation = baseDelay * TIMING.WPM_VARIATION_FACTOR;
    const finalDelay = this.gaussianRandom(
      Math.max(0, baseDelay - variation),
      baseDelay + variation
    );
    return Math.max(TIMING.MIN_CHAR_DELAY, finalDelay);
  }

  /**
   * Gaussian (normal) distribution random number within [min, max]
   */
  gaussianRandom(min, max) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    num = num / 10.0 + 0.5;
    num = Math.max(0, Math.min(1, num));
    return Math.floor(min + num * (max - min));
  }

  /**
   * Promise-based delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop typing immediately
   */
  stop() {
    this.shouldStop = true;
    this.isTyping = false;
    cdpShiftPressed = false;
  }

  /**
   * Get current engine state for external queries
   */
  getState() {
    return {
      isTyping: this.isTyping,
      shouldStop: this.shouldStop,
      progress: { ...this.progress },
      charsTyped: this.charsTyped,
      persona: this.persona ? this.persona.name : null
    };
  }
}
