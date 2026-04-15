/**
 * AutoQuill Content Script
 * Injected into X.com/Twitter pages
 * Handles UI interactions and focuses input for the CDP typing engine
 */

// Check if runtime is still connected
function isRuntimeConnected() {
  try {
    return chrome.runtime && chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

// Content script focuses on UI interaction only
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isRuntimeConnected()) return;

  if (message.action === 'togglePanel') {
    focusTwitterInput();
    sendResponse({ success: true });
  } else if (message.action === 'nextBlock') {
    handleNextBlock(message.blockIndex, message.content);
    sendResponse({ success: true });
  } else if (message.action === 'focusInput') {
    focusTwitterInput();
    sendResponse({ success: true });
  }
  return true;
});

// Signal tab closure to background (Non-blocking)
window.addEventListener('beforeunload', () => {
  if (isRuntimeConnected()) {
    try {
      chrome.runtime.sendMessage({ action: 'forceDetach' });
    } catch (e) {}
  }
});

/**
 * Focus the Twitter/X.com input field
 * Handles both tweet composer and reply inputs
 */
function focusTwitterInput() {
  // Find the contenteditable div (Twitter's input)
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
    // Scroll into view first
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Focus after scroll with delay
    setTimeout(() => {
      input.focus();

      // For contenteditable, move cursor to end
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(input);
      range.collapse(false); // false = collapse to end
      selection.removeAllRanges();
      selection.addRange(range);

      console.log('[AutoQuill] Input focused');
    }, 100);
  } else {
    console.warn('[AutoQuill] No input field found');
  }
}

/**
 * Handle next block switch
 * Updates storage and focuses input for immediate typing
 */
async function handleNextBlock(blockIndex, content) {
  console.log(`[AutoQuill] Switched to block ${blockIndex + 1}`);

  // Focus input after a short delay for stability
  setTimeout(() => {
    focusTwitterInput();
  }, 50);
}

console.log('[AutoQuill] Content script loaded on', window.location.hostname);
