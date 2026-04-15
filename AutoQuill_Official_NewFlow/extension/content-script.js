/**
 * AutoQuill Content Script - X.com Focus Protocol Edition
 * Injected into X.com/Twitter pages.
 * Handles X.com Draft.js focus protocol and UI interactions.
 */

// ── Runtime Check ──────────────────────────────────────────────────────

function isRuntimeConnected() {
  try {
    return chrome.runtime && chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

// ── Message Listener ───────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isRuntimeConnected()) return;

  switch (message.action) {
    case 'focusProtocol':
      executeFocusProtocol().then(sendResponse);
      return true; // async response

    case 'togglePanel':
      focusTwitterInput();
      sendResponse({ success: true });
      break;

    case 'nextBlock':
      handleNextBlock(message.blockIndex, message.content);
      sendResponse({ success: true });
      break;

    case 'focusInput':
      focusTwitterInput();
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  return true;
});

// ── Tab Close Signal ───────────────────────────────────────────────────

function notifyTabClosing() {
  try {
    if (isRuntimeConnected()) {
      chrome.runtime.sendMessage({ action: 'forceDetach' });
    }
  } catch (e) {}
}

window.addEventListener('beforeunload', notifyTabClosing);
window.addEventListener('pagehide', notifyTabClosing);
window.addEventListener('unload', notifyTabClosing);

// ── X.com Focus Protocol ───────────────────────────────────────────────
// Strict Draft.js focus sequence: find → scroll → click → poll for hasFocus.
// Returns { success: true } only when Draft.js confirms focus state.

async function executeFocusProtocol() {
  try {
    // Step 1: Find the target input element
    const selectors = [
      '[data-testid="tweetTextarea_0"]',
      '[data-testid="tweetTextarea_1"]',
      '[role="textbox"][data-testid]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]'
    ];

    let element = null;
    for (const selector of selectors) {
      element = document.querySelector(selector);
      if (element) break;
    }

    if (!element) {
      return { success: false, error: 'No X.com input element found. Open a tweet composer first.' };
    }

    // Step 2: Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300); // Wait for scroll to settle

    // Step 3: Simulate genuine mouse click (mousedown → mouseup → click)
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const mouseOpts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };

    element.dispatchEvent(new MouseEvent('mousedown', { ...mouseOpts, button: 0 }));
    element.dispatchEvent(new MouseEvent('mouseup', { ...mouseOpts, button: 0 }));
    element.dispatchEvent(new MouseEvent('click', { ...mouseOpts, button: 0 }));

    // Also call focus() as backup for Draft.js
    element.focus();

    // Step 4: Poll for Draft.js focus confirmation (100ms interval, 5000ms timeout)
    const focused = await pollForFocus(element, 5000, 100);

    if (focused) {
      // Move cursor to end
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);

      console.log('[AutoQuill] Focus Protocol: SUCCESS');
      return { success: true };
    } else {
      console.warn('[AutoQuill] Focus Protocol: TIMEOUT — Draft.js did not confirm focus');
      return { success: false, error: 'Focus timeout: Draft.js did not enter hasFocus state within 5s' };
    }
  } catch (error) {
    console.error('[AutoQuill] Focus Protocol error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Poll until Draft.js confirms focus via CSS class or activeElement check.
 * @param {Element} element - The contenteditable element
 * @param {number} timeoutMs - Max wait time in ms
 * @param {number} intervalMs - Poll interval in ms
 * @returns {Promise<boolean>} True if focus confirmed
 */
function pollForFocus(element, timeoutMs, intervalMs) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;

    const check = () => {
      // Method 1: Draft.js adds .public-DraftEditorPlaceholder-hasFocus when focused
      const hasFocusClass = !!document.querySelector('.public-DraftEditorPlaceholder-hasFocus');

      // Method 2: Check for any hasFocus class in the DraftEditor root
      const draftRoot = document.querySelector('.DraftEditor-root');
      const hasHolderFocus = draftRoot
        ? Array.from(draftRoot.querySelectorAll('*')).some(el =>
            el.className && typeof el.className === 'string' && el.className.includes('hasFocus')
          )
        : false;

      // Method 3: Direct activeElement check
      const isActive = document.activeElement === element;

      if (hasFocusClass || hasHolderFocus || isActive) {
        resolve(true);
        return;
      }

      if (Date.now() >= deadline) {
        resolve(false);
        return;
      }

      setTimeout(check, intervalMs);
    };

    setTimeout(check, intervalMs);
  });
}

// ── Simple Focus (for togglePanel / nextBlock) ─────────────────────────

function focusTwitterInput() {
  const selectors = [
    '[data-testid="tweetTextarea_0"]',
    '[data-testid="tweetTextarea_1"]',
    '[role="textbox"][data-testid]',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"]'
  ];

  let input = null;
  for (const selector of selectors) {
    input = document.querySelector(selector);
    if (input) break;
  }

  if (input) {
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      input.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(input);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }, 100);
  }
}

// ── Next Block Handler ─────────────────────────────────────────────────

function handleNextBlock(blockIndex, content) {
  setTimeout(() => {
    focusTwitterInput();
  }, 50);
}

// ── Utility ────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('[AutoQuill] Content script loaded on', window.location.hostname);
