/**
 * Content Script Typing Engine
 * GPM-Compatible: Uses DOM events instead of chrome.debugger API
 * Works in both Chrome and GPM browsers
 */

// Dependencies loaded from keyboard-map.js and personas.js
// getPersona, getKeyInfo, getAdjacentKey, getKeyDistance are available globally

// Timing constants (same as debugger version)
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

// Shift key state tracking for proper uppercase/special char typing
let shiftPressed = false;

// ContentScriptTypingEngine class - globally available
class ContentScriptTypingEngine {
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
    this.textareaElement = null;
    this.cursorOffset = 0; // Tracks exact insert position in text node
  }

  /**
   * Start typing text into X.com compose box
   * @param {string} content - Text to type
   * @param {string} personaId - Persona ID for typing characteristics
   * @param {Function} onProgress - Progress callback (percent)
   * @returns {Promise<void>}
   */
  async start(content, personaId, onProgress) {
    // Reset shift state at start of new typing session
    shiftPressed = false;

    this.persona = getPersona(personaId);
    this.shouldStop = false;
    this.charsTyped = 0;
    this.charsSinceTypo = 0;
    this.charsSincePause = 0;
    this.lastChar = null;
    this.lastProgressReport = 0;
    this.cursorOffset = 0;

    if (!this.persona) {
      throw new Error(`Persona not found: ${personaId}`);
    }

    // Find textarea
    this.textareaElement = this.findTextarea();
    if (!this.textareaElement) {
      throw new Error('X.com compose textarea not found');
    }

    // Focus ONCE at start only — do not repeat per character
    this.textareaElement.focus();
    await this.delay(100); // Allow focus to settle

    // Initialize cursorOffset to end of existing text
    const existingText = this.textareaElement.textContent || '';
    this.cursorOffset = existingText.length;

    try {
      this.isTyping = true;
      await this.typeText(content, onProgress);
    } catch (error) {
      console.error('ContentScriptTypingEngine error:', error);
      throw error;
    } finally {
      this.isTyping = false;
    }
  }

  /**
   * Find X.com compose textarea
   * @returns {HTMLElement|null}
   */
  findTextarea() {
    const selectors = [
      '[data-testid="tweetTextarea_0"]',
      '[data-testid="tweetTextarea_1"]',
      '[role="textbox"][data-testid]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }

    return null;
  }

  /**
   * Type a single character using silent DOM manipulation
   * Focus-independent: uses Range operations so it works even without OS-level window focus
   * @param {string} char - Character to type
   * @returns {Promise<void>}
   */
  async typeChar(char) {
    if (!this.textareaElement) return;

    const info = getKeyInfo(char);
    if (!info) {
      console.warn(`Unsupported character: "${char}"`);
      return;
    }

    // DO NOT call .focus() here — it cannot reclaim OS focus from another window
    // and calling it repeatedly causes jitter across multi-profile setups.

    // 1. Press Shift if needed (for uppercase letters and special characters)
    if (info.needsShift && !shiftPressed) {
      await this.pressShift();
    }

    // 2. Dispatch keydown event
    const keydownEvent = new KeyboardEvent('keydown', {
      key: char,
      code: info.code,
      keyCode: info.keyCode,
      which: info.keyCode,
      shiftKey: info.needsShift,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    this.textareaElement.dispatchEvent(keydownEvent);

    // 3. Insert text with proper cursor position management
    // insertCharAtCursor handles beforeinput + input events internally
    this.insertCharAtCursor(char);

    // 5. Dispatch keyup event
    const keyupEvent = new KeyboardEvent('keyup', {
      key: char,
      code: info.code,
      keyCode: info.keyCode,
      which: info.keyCode,
      shiftKey: info.needsShift,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    this.textareaElement.dispatchEvent(keyupEvent);

    // 6. Release Shift if it was pressed for this character
    if (info.needsShift && shiftPressed) {
      await this.releaseShift();
    }

    // Dwell time
    await this.delay(this.gaussianRandom(TIMING.DWELL_TIME_MIN, TIMING.DWELL_TIME_MAX));
  }

  /**
   * Press Shift key (helper for uppercase/special chars)
   * @returns {Promise<void>}
   */
  async pressShift() {
    const shiftDownEvent = new KeyboardEvent('keydown', {
      key: 'Shift',
      code: 'ShiftLeft',
      keyCode: 16,
      which: 16,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    this.textareaElement.dispatchEvent(shiftDownEvent);

    shiftPressed = true;
    await this.delay(this.gaussianRandom(TIMING.SHIFT_DELAY_MIN, TIMING.SHIFT_DELAY_MAX));
  }

  /**
   * Release Shift key (helper for uppercase/special chars)
   * @returns {Promise<void>}
   */
  async releaseShift() {
    const shiftEvent = new KeyboardEvent('keyup', {
      key: 'Shift',
      code: 'ShiftLeft',
      keyCode: 16,
      which: 16,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    this.textareaElement.dispatchEvent(shiftEvent);
    shiftPressed = false;
    await this.delay(this.gaussianRandom(TIMING.SHIFT_DELAY_MIN, TIMING.SHIFT_DELAY_MAX));
  }

  /**
   * Get the single text node used for all insertions.
   * X.com's Draft.js wraps text in nested spans — we write to the
   * deepest editable text node. Creates one if none exists.
   * @returns {Text} The text node to write into
   */
  getOrCreateTextNode() {
    const el = this.textareaElement;
    const doc = el.ownerDocument;

    // Walk all text nodes and find the last one (where cursor should be)
    const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    let last = null;
    let node;
    while ((node = walker.nextNode())) {
      last = node;
    }

    if (last) return last;

    // No text node exists yet — create one directly in the element
    const textNode = doc.createTextNode('');
    el.appendChild(textNode);
    return textNode;
  }

  /**
   * Insert a single character at this.cursorOffset in the target text node.
   * Completely focus-independent: does not use Selection API for positioning.
   * Fires beforeinput → DOM insert → input so Draft.js state stays in sync.
   * @param {string} char - Single character to insert
   */
  insertCharAtCursor(char) {
    const element = this.textareaElement;
    const doc = element.ownerDocument;

    // Step 1: Fire beforeinput so Draft.js accepts the change
    const beforeInput = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      composed: true,
      inputType: 'insertText',
      data: char
    });
    const accepted = element.dispatchEvent(beforeInput);
    if (!accepted) return; // Draft.js rejected this input

    // Step 2: Find target text node
    const textNode = this.getOrCreateTextNode();
    const currentText = textNode.textContent || '';

    // Step 3: Insert char at tracked offset (clamp to valid range)
    const safeOffset = Math.min(this.cursorOffset, currentText.length);
    textNode.textContent =
      currentText.slice(0, safeOffset) + char + currentText.slice(safeOffset);

    // Step 4: Advance our internal cursor counter (char.length handles surrogate pairs)
    this.cursorOffset = safeOffset + char.length;

    // Step 5: Best-effort visual cursor update (typing correctness does NOT depend on it)
    try {
      const sel = doc.defaultView && doc.defaultView.getSelection
        ? doc.defaultView.getSelection()
        : null;
      if (sel) {
        const range = doc.createRange();
        range.setStart(textNode, this.cursorOffset);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch (e) {
      // Selection update failed (window not focused) — safe to ignore
    }

    // Step 6: Fire input event so Draft.js syncs its virtual state
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      composed: true,
      inputType: 'insertText',
      data: char
    }));

    // Step 7: Re-sync cursorOffset from current DOM state.
    // Draft.js may have restructured the DOM (split text nodes, added spans)
    // after processing the input event, so our offset may be stale.
    const totalText = element.textContent || '';
    this.cursorOffset = totalText.length;
  }

  /**
   * Simulate typing a typo with correction
   * @param {string} correctChar - The correct character
   * @returns {Promise<void>}
   */
  async simulateTypo(correctChar) {
    const wrongChar = getAdjacentKey(correctChar);

    if (!wrongChar) {
      await this.typeChar(correctChar);
      return;
    }

    // Type wrong character
    await this.typeChar(wrongChar);
    await this.delay(this.gaussianRandom(TIMING.TYPO_PAUSE_MIN, TIMING.TYPO_PAUSE_MAX));

    // Backspace
    await this.typeBackspace();
    await this.delay(this.gaussianRandom(50, 100));

    // Type correct character
    await this.typeChar(correctChar);
  }

  /**
   * Type backspace using textContent manipulation with cursorOffset tracking.
   * Focus-independent: does not use Selection API for positioning.
   * Fires keydown → beforeinput → DOM delete → input → keyup.
   * @returns {Promise<void>}
   */
  async typeBackspace() {
    if (!this.textareaElement) return;

    const element = this.textareaElement;
    const doc = element.ownerDocument;

    // DO NOT call element.focus() here.

    // keydown
    element.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Backspace', code: 'Backspace', keyCode: 8, which: 8,
      bubbles: true, cancelable: true, composed: true
    }));

    // beforeinput — required for Draft.js to register the deletion
    const beforeInputEvent = new InputEvent('beforeinput', {
      bubbles: true, cancelable: true, composed: true,
      inputType: 'deleteContentBackward'
    });
    const notCancelled = element.dispatchEvent(beforeInputEvent);

    if (notCancelled) {
      const textNode = this.getOrCreateTextNode();
      const currentText = textNode.textContent || '';
      const safeOffset = Math.min(this.cursorOffset, currentText.length);

      if (safeOffset > 0) {
        // Remove the character immediately before cursor
        textNode.textContent =
          currentText.slice(0, safeOffset - 1) + currentText.slice(safeOffset);
        this.cursorOffset = safeOffset - 1;

        // Best-effort visual cursor update
        try {
          const sel = doc.defaultView && doc.defaultView.getSelection
            ? doc.defaultView.getSelection()
            : null;
          if (sel) {
            const range = doc.createRange();
            range.setStart(textNode, this.cursorOffset);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        } catch (e) { /* window not focused — safe to ignore */ }
      }

      // Fire input event so Draft.js syncs
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true, cancelable: true, composed: true,
        inputType: 'deleteContentBackward'
      }));

      // Re-sync cursorOffset from current DOM after Draft.js reconciliation
      const totalText = element.textContent || '';
      this.cursorOffset = totalText.length;
    }

    // keyup
    element.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'Backspace', code: 'Backspace', keyCode: 8, which: 8,
      bubbles: true, cancelable: true, composed: true
    }));
  }

  /**
   * Main typing loop
   * @param {string} text - Text to type
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<void>}
   */
  async typeText(text, onProgress) {
    const chars = [...text];
    this.progress.total = chars.length;

    try {
      // React sync hack: Space + Backspace at the start forces Draft.js to
      // initialize its internal state and activate the Post button before
      // we begin typing the actual content.
      if (this.textareaElement) {
        await this.delay(100);
        await this.typeChar(' ');
        await this.delay(100);
        await this.typeBackspace();
      }

      for (let i = 0; i < chars.length; i++) {
        if (this.shouldStop) break;

        const char = chars[i];
        this.progress.current = i + 1;
        this.charsTyped++;
        this.charsSinceTypo++;
        this.charsSincePause++;

        // Handle carriage return
        if (char === '\r') continue;

        // Inject typo?
        if (this.shouldInjectTypo()) {
          await this.simulateTypo(char);
          this.charsSinceTypo = 0;
        } else {
          await this.typeChar(char);
        }

        // Calculate inter-character delay
        let delay = this.calculateBaseDelay();

        // Apply fatigue
        const progressPercent = i / chars.length;
        if (progressPercent >= TIMING.FATIGUE_START_PERCENT) {
          const fatigueProgress = (progressPercent - TIMING.FATIGUE_START_PERCENT) /
                                  (1 - TIMING.FATIGUE_START_PERCENT);
          delay *= 1 + (TIMING.FATIGUE_DECAY_PERCENT * fatigueProgress);
        }

        // Physical key distance delay
        if (this.lastChar && char !== ' ' && this.lastChar !== ' ') {
          const distance = getKeyDistance(this.lastChar, char);
          if (distance >= TIMING.DISTANCE_THRESHOLD) {
            delay += this.gaussianRandom(TIMING.DISTANCE_DELAY_MIN, TIMING.DISTANCE_DELAY_MAX);
          }
        }

        // Extra delay for punctuation
        if ('.,!?;:'.includes(char)) {
          delay += this.gaussianRandom(TIMING.PUNCTUATION_DELAY_MIN, TIMING.PUNCTUATION_DELAY_MAX);
        }

        // Cognitive pause
        if ((char === ' ' || '.,!?'.includes(char)) && Math.random() < TIMING.COGNITIVE_PAUSE_CHANCE) {
          delay += this.gaussianRandom(TIMING.COGNITIVE_PAUSE_MIN, TIMING.COGNITIVE_PAUSE_MAX);
        }

        // Thinking pause
        if (this.shouldTakePause()) {
          const pauseDuration = this.gaussianRandom(
            this.persona.pauses.duration.min * 1000,
            this.persona.pauses.duration.max * 1000
          );
          delay += pauseDuration;
          this.charsSincePause = 0;
        }

        this.lastChar = char;
        await this.delay(delay);

        // Report progress
        if (onProgress) {
          const percentage = Math.round((this.progress.current / this.progress.total) * 100);
          if (percentage >= this.lastProgressReport + 5 || this.progress.current === this.progress.total) {
            this.lastProgressReport = percentage;
            onProgress(percentage);
          }
        }
      }
    } catch (error) {
      console.error('typeText error:', error);
      this.shouldStop = true;
    }
  }

  /**
   * Calculate base inter-character delay based on persona WPM
   * @returns {number} Delay in milliseconds
   */
  calculateBaseDelay() {
    const wpm = this.gaussianRandom(this.persona.wpm.min, this.persona.wpm.max);
    const targetDelay = (60000 / wpm) / 5;
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
   * Check if we should inject a typo
   * @returns {boolean}
   */
  shouldInjectTypo() {
    if (!this.persona.typos.enabled) return false;
    // Never inject typos after @ — usernames in @mentions must be exact
    if (this.lastChar === '@') return false;
    const interval = this.gaussianRandom(
      this.persona.typos.interval.min,
      this.persona.typos.interval.max
    );
    return this.charsSinceTypo >= interval;
  }

  /**
   * Check if we should take a thinking pause
   * @returns {boolean}
   */
  shouldTakePause() {
    if (!this.persona.pauses.enabled) return false;
    const interval = this.gaussianRandom(
      this.persona.pauses.every_chars.min, // Đã sửa
      this.persona.pauses.every_chars.max  // Đã sửa
    );
    return this.charsSincePause >= interval;
  }

  /**
   * Gaussian random number generator
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number}
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
   * Delay helper
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop typing mid-stream
   */
  stop() {
    this.shouldStop = true;
    this.isTyping = false;
    // Reset shift state if stopped mid-typing
    if (shiftPressed) {
      shiftPressed = false;
    }
  }

  /**
   * Get current typing state
   * @returns {Object}
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
