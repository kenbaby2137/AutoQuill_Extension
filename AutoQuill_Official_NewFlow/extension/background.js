/**
 * AutoQuill Background Service Worker - Sequential Queue Edition (V6.0)
 * Orchestration: acquire lock → focus protocol → type → release lock.
 * Server (app.py) does actual typing via win32api — no CDP debugger needed.
 */

importScripts('lib/personas.js');

// ── State ──────────────────────────────────────────────────────────────

let currentState = {
  isTyping: false,
  progress: 0,
  content: '',
  currentTypingTabId: null
};

const panelState = new Map();
const SERVER_URL = 'http://localhost:8899';
let progressInterval = null;

// ── Helpers ────────────────────────────────────────────────────────────

function broadcastToPopup(message) {
  try { chrome.runtime.sendMessage(message).catch(() => {}); } catch (e) {}
}

async function updateState(newState) {
  currentState = { ...currentState, ...newState };
  await chrome.storage.local.set({ typingState: currentState }).catch(() => {});
  broadcastToPopup({ action: 'stateUpdated', state: currentState });
}

// ── Content Fetching ───────────────────────────────────────────────────

async function handleGetContent(profileName) {
  try {
    if (!profileName || !profileName.trim()) {
      return { success: false, error: 'Invalid profile name' };
    }

    const response = await fetch(
      `${SERVER_URL}/content?profile=${encodeURIComponent(profileName)}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: `Profile "${profileName}" not found` };
      }
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content || '';
    const blocks = content.split(/\[N\]/i).map(b => b.trim()).filter(Boolean);

    return { success: true, content, blocks, blockCount: blocks.length };
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      return { success: false, error: 'Server not running. Start the FastAPI server on port 8899.' };
    }
    return { success: false, error: error.message };
  }
}

// ── Progress Simulation ────────────────────────────────────────────────
// Server POST blocks until done — simulate progress based on WPM + length.

function startProgressSimulation(content, personaConfig) {
  stopProgressSimulation();
  const wpm = personaConfig?.wpm || { min: 80, max: 100 };
  const avgWpm = (wpm.min + wpm.max) / 2;
  const totalSeconds = Math.max(5, (content.length / 5) / avgWpm * 60);
  const steps = 20;
  const intervalMs = (totalSeconds / steps) * 1000;
  const increment = 90 / steps; // cap at 90% until server confirms

  let progress = 0;
  progressInterval = setInterval(() => {
    progress = Math.min(progress + increment, 90);
    currentState.progress = progress;
    broadcastToPopup({ action: 'progress', percent: progress });
  }, intervalMs);
}

function stopProgressSimulation() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

// ── Core Typing Flow ───────────────────────────────────────────────────
// Flow: acquire lock → focus protocol → type → release lock (always)

async function handleStartTyping(content, personaId, sender, profileName) {
  let lockAcquired = false;

  try {
    if (currentState.isTyping) {
      return { success: false, error: 'Already typing another profile' };
    }
    if (!content || !content.trim()) {
      return { success: false, error: 'No content to type' };
    }

    await updateState({ isTyping: true, progress: 0 });

    // ── Step 1: Acquire global typing lock ──────────────────────────
    // Blocks (long-polls) if another profile is currently typing.
    broadcastToPopup({ action: 'progress', percent: 0 });

    const lockResponse = await fetch(`${SERVER_URL}/api/acquire-typing-lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileName: profileName || '' })
    });

    if (!lockResponse.ok) {
      const err = await lockResponse.json().catch(() => ({}));
      throw new Error(err.detail || `Lock acquisition failed: ${lockResponse.status}`);
    }

    lockAcquired = true;
    const lockData = await lockResponse.json();

    // Use extension content (user may have edited), fallback to server content
    const contentToType = content || lockData.content || '';

    // ── Step 2: Execute X.com Focus Protocol ────────────────────────
    const queryOptions = { active: true };
    if (sender?.tab?.windowId) {
      queryOptions.windowId = sender.tab.windowId;
    } else {
      queryOptions.currentWindow = true;
    }
    const [tab] = await chrome.tabs.query(queryOptions);

    if (tab) {
      currentState.currentTypingTabId = tab.id;

      try {
        const focusResult = await chrome.tabs.sendMessage(tab.id, { action: 'focusProtocol' });

        if (!focusResult || !focusResult.success) {
          // Focus failed — abort to prevent wasted typing
          throw new Error(focusResult?.error || 'X.com Focus Protocol failed');
        }

        console.log('[AutoQuill] Focus confirmed, starting typing');
      } catch (msgError) {
        // Content script not loaded (not on x.com?)
        if (msgError.message?.includes('Could not establish connection') ||
            msgError.message?.includes('Receiving end does not exist')) {
          throw new Error('Content script not available. Make sure you are on x.com.');
        }
        throw msgError;
      }
    }

    // ── Step 3: Start typing via server ─────────────────────────────
    const personaConfig = (typeof PERSONAS !== 'undefined' && PERSONAS[personaId])
      ? PERSONAS[personaId]
      : null;

    startProgressSimulation(contentToType, personaConfig);

    const response = await fetch(`${SERVER_URL}/api/os-type`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileName: profileName || '',
        content: contentToType,
        persona: personaConfig
      })
    });

    stopProgressSimulation();

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error('Typing lock not held. Use acquire-typing-lock first.');
      }
      if (response.status === 429) {
        throw new Error('Server is already typing another profile');
      }
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Server error: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Server typing failed');
    }

    // ── Step 4: Success ─────────────────────────────────────────────
    await updateState({ isTyping: false, progress: 100, currentTypingTabId: null });
    broadcastToPopup({ action: 'progress', percent: 100 });
    broadcastToPopup({ action: 'complete' });
    return { success: true };

  } catch (error) {
    stopProgressSimulation();
    await updateState({ isTyping: false, progress: 0, currentTypingTabId: null });
    broadcastToPopup({ action: 'error', message: error.message });
    return { success: false, error: error.message };

  } finally {
    // ── Step 5: ALWAYS release the typing lock ──────────────────────
    if (lockAcquired) {
      try {
        await fetch(`${SERVER_URL}/api/release-typing-lock`, { method: 'POST' });
        console.log('[AutoQuill] Typing lock released');
      } catch (e) {
        console.error('[AutoQuill] Failed to release typing lock:', e.message);
      }
    }
  }
}

/** Stop typing (reset local state — server cannot be stopped mid-stream) */
function handleStopTyping() {
  stopProgressSimulation();
  currentState.isTyping = false;
  currentState.currentTypingTabId = null;
  currentState.progress = 0;
  broadcastToPopup({ action: 'complete' });
}

// ── Content Storage ────────────────────────────────────────────────────

async function getSavedContents() {
  try {
    const result = await chrome.storage.local.get('savedContents');
    return { success: true, contents: result.savedContents || {} };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function saveContent(profileName, content, blocks) {
  try {
    const result = await chrome.storage.local.get('savedContents');
    const savedContents = result.savedContents || {};
    savedContents[profileName] = { content, blocks, savedAt: Date.now() };
    await chrome.storage.local.set({ savedContents });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function deleteContent(profileName) {
  try {
    const result = await chrome.storage.local.get('savedContents');
    const savedContents = result.savedContents || {};
    delete savedContents[profileName];
    await chrome.storage.local.set({ savedContents });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function loadSavedContent(profileName) {
  try {
    const result = await chrome.storage.local.get('savedContents');
    const savedContents = result.savedContents || {};
    const saved = savedContents[profileName];
    if (!saved) {
      return { success: false, error: 'No saved content found' };
    }
    return { success: true, content: saved.content, blocks: saved.blocks, savedAt: saved.savedAt };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ── Keyboard Shortcuts ─────────────────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
  // toggle-panel MUST be synchronous — chrome.sidePanel.open needs user gesture
  if (command === 'toggle-panel') {
    chrome.windows.getCurrent((window) => {
      if (!window) return;
      const windowId = window.id;
      const isPanelOpened = panelState.get(windowId) || false;

      if (isPanelOpened) {
        chrome.sidePanel.setOptions({ path: 'popup/popup.html', enabled: false });
        setTimeout(() => {
          chrome.sidePanel.setOptions({ path: 'popup/popup.html', enabled: true });
        }, 100);
        panelState.set(windowId, false);
      } else {
        chrome.sidePanel.open({ windowId });
        chrome.sidePanel.setOptions({ path: 'popup/popup.html', enabled: true });
        panelState.set(windowId, true);
        chrome.tabs.query({ active: true, windowId }, (tabs) => {
          if (tabs[0]) {
            setTimeout(() => {
              chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePanel' }).catch(() => {});
            }, 300);
          }
        });
      }
    });
    return;
  }

  // Async command handlers
  (async () => {
    if (command === 'start-typing') {
      const result = await chrome.storage.local.get(['currentContent', 'selectedPersona', 'profileName']);
      if (!result.currentContent || !result.selectedPersona) {
        broadcastToPopup({ action: 'error', message: 'No content loaded. Open panel and fetch content first.' });
        return;
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const syntheticSender = tab ? { tab: { windowId: tab.windowId } } : {};

      const response = await handleStartTyping(
        result.currentContent,
        result.selectedPersona,
        syntheticSender,
        result.profileName || ''
      );

      if (!response.success) {
        broadcastToPopup({ action: 'error', message: response.error });
      }

    } else if (command === 'next-block') {
      await handleNextBlockShortcut();
    }
  })();
});

/** Handle next-block keyboard shortcut */
async function handleNextBlockShortcut() {
  try {
    const result = await chrome.storage.local.get(['currentBlocks', 'currentBlockIndex']);
    const blocks = result.currentBlocks || [];
    let blockIndex = result.currentBlockIndex || 0;

    if (blocks.length === 0) {
      broadcastToPopup({ action: 'error', message: 'No content loaded' });
      return;
    }
    if (blockIndex >= blocks.length - 1) {
      broadcastToPopup({ action: 'error', message: 'No more blocks' });
      return;
    }

    blockIndex++;
    const newContent = blocks[blockIndex];

    await chrome.storage.local.set({ currentBlockIndex: blockIndex, currentContent: newContent });

    broadcastToPopup({ action: 'blockSwitched', blockIndex, content: newContent });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'nextBlock',
        blockIndex,
        content: newContent
      }).catch(() => {});
    }
  } catch (error) {
    console.error('Next block shortcut error:', error);
  }
}

// ── Message Listener ───────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const safeResponse = (data) => {
    try { sendResponse(data); } catch (e) {}
  };

  switch (message.action) {
    case 'getContent':
      handleGetContent(message.profile).then(safeResponse);
      return true;

    case 'startTyping':
      handleStartTyping(message.content, message.persona, sender, message.profileName).then(safeResponse);
      return true;

    case 'stopTyping':
      handleStopTyping();
      safeResponse({ success: true });
      break;

    case 'emergencyDetach':
      handleStopTyping();
      safeResponse({ success: true });
      break;

    case 'getSavedContents':
      getSavedContents().then(safeResponse);
      return true;

    case 'saveContent':
      saveContent(message.profileName, message.content, message.blocks).then(safeResponse);
      return true;

    case 'deleteContent':
      deleteContent(message.profileName).then(safeResponse);
      return true;

    case 'loadSavedContent':
      loadSavedContent(message.profileName).then(safeResponse);
      return true;

    case 'getState':
      safeResponse(currentState);
      break;

    case 'forceDetach':
      // Server-based typing — no debugger to detach. Just reset state.
      handleStopTyping();
      safeResponse({ success: true });
      break;

    default:
      safeResponse({ success: false, error: 'Unknown action' });
  }
});

// ── Initialization ─────────────────────────────────────────────────────

chrome.storage.local.get(['typingState'], (result) => {
  if (result.typingState) {
    result.typingState.isTyping = false;
    result.typingState.progress = 0;
    currentState = { ...currentState, ...result.typingState };
  }
});

console.log('[AutoQuill] Background SW loaded (Sequential Queue Edition)');
