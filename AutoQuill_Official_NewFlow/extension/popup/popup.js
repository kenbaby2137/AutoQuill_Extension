/**
 * AutoQuill Popup UI Controller
 * Handles user interactions, storage, and message passing with background worker
 */

// Personas loaded from ../lib/personas.js (global scope)
// Functions available: getPackages(), getPersona()

// Server URL
const SERVER_URL = 'http://localhost:8899';

/**
 * Safely send message to background script with error handling
 * @param {Object} message - Message to send
 * @returns {Promise<Object>} Response from background script
 */
async function sendMessageToBackground(message) {
  try {
    // Check if runtime is available
    if (!chrome.runtime || !chrome.runtime.id) {
      throw new Error('Extension context invalidated. Please reload the extension.');
    }

    const response = await chrome.runtime.sendMessage(message);

    // Check for last error
    if (chrome.runtime.lastError) {
      throw new Error(chrome.runtime.lastError.message);
    }

    return response;
  } catch (error) {
    // Handle "Receiving end does not exist" error
    if (error.message.includes('Receiving end does not exist')) {
      throw new Error('Background script not responding. Please reload the extension.');
    }
    throw error;
  }
}

/**
 * Check if FastAPI server is reachable
 */
async function checkServerStatus() {
  const badge = document.getElementById('online-status');
  if (!badge) return;
  
  try {
    const res = await fetch(`${SERVER_URL}/status`, { 
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache'
    });
    if (res.ok) {
      badge.textContent = 'Online';
      badge.classList.add('online');
    } else {
      throw new Error();
    }
  } catch (err) {
    badge.textContent = 'Offline';
    badge.classList.remove('online');
  }
}

// State management
let state = {
  profileName: '',
  selectedPersona: '',
  content: '',
  blocks: [],
  currentBlockIndex: 0,
  isTyping: false
};

// DOM elements
const elements = {
  profileName: null,
  setProfile: null,
  editProfile: null,
  persona: null,
  getContent: null,
  savedSection: null,
  savedContents: null,
  savedCount: null,
  loadSaved: null,
  deleteSaved: null,
  previewSection: null,
  contentPreview: null,
  blockCurrent: null,
  blockTotal: null,
  archiveContent: null,
  actionButtons: null,
  startTyping: null,
  nextBlock: null,
  stopTyping: null,
  emergencyDetach: null,
  progressSection: null,
  progressFill: null,
  progressText: null,
  status: null
};

/**
 * Initialize the popup
 */
async function init() {
  // Cache DOM elements
  elements.profileName = document.getElementById('profileName');
  elements.setProfile = document.getElementById('setProfile');
  elements.editProfile = document.getElementById('editProfile');
  elements.persona = document.getElementById('persona');
  elements.getContent = document.getElementById('getContent');
  elements.savedSection = document.getElementById('savedSection');
  elements.savedContents = document.getElementById('savedContents');
  elements.savedCount = document.getElementById('savedCount');
  elements.loadSaved = document.getElementById('loadSaved');
  elements.deleteSaved = document.getElementById('deleteSaved');
  elements.previewSection = document.getElementById('previewSection');
  elements.contentPreview = document.getElementById('contentPreview');
  elements.blockCurrent = document.getElementById('blockCurrent');
  elements.blockTotal = document.getElementById('blockTotal');
  elements.archiveContent = document.getElementById('archiveContent');
  elements.actionButtons = document.getElementById('actionButtons');
  elements.startTyping = document.getElementById('startTyping');
  elements.nextBlock = document.getElementById('nextBlock');
  elements.stopTyping = document.getElementById('stopTyping');
  elements.emergencyDetach = document.getElementById('emergencyDetach');
  elements.progressSection = document.getElementById('progressSection');
  elements.progressFill = document.getElementById('progressFill');
  elements.progressText = document.getElementById('progressText');
  elements.status = document.getElementById('status');

  // Populate persona dropdown first
  populatePersonaDropdown();

  // Attach event listeners
  attachEventListeners();

  // Initial server check
  checkServerStatus();
  setInterval(checkServerStatus, 10000); // Check every 10s

  // Load saved data (after DOM elements are ready)
  await loadSavedData();

  // Load saved contents list
  await refreshSavedContentsList();

  // Listen for messages from background
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);

  updateStatus('Ready', 'normal');
}

/**
 * Load saved profile name and persona from chrome.storage.local
 */
async function loadSavedData() {
  try {
    const result = await chrome.storage.local.get([
      'profileName',
      'selectedPersona',
      'isLocked',
      'currentContent',
      'currentBlocks',
      'currentBlockIndex'
    ]);

    if (result.profileName) {
      state.profileName = result.profileName;
      if (elements.profileName) elements.profileName.value = result.profileName;
    }

    if (result.selectedPersona) {
      state.selectedPersona = result.selectedPersona;
      if (elements.persona) elements.persona.value = result.selectedPersona;
    }

    // Restore content state if exists
    if (result.currentContent && result.currentBlocks && result.currentBlocks.length > 0) {
      state.content = result.currentContent;
      state.blocks = result.currentBlocks;
      state.currentBlockIndex = result.currentBlockIndex || 0;

      // Show preview section with restored content
      if (elements.previewSection) elements.previewSection.classList.remove('hidden');
      if (elements.actionButtons) elements.actionButtons.classList.remove('hidden');
      displayCurrentBlock();
    }

    // Restore locked state
    if (result.isLocked) {
      lockSettings();
    }

    // Fallback: restore from bookmark if chrome.storage.local was wiped (e.g. extension reinstall)
    if (!result.profileName || !result.selectedPersona) {
      const bookmarkConfig = await restoreConfigFromBookmark();
      if (bookmarkConfig) {
        state.profileName = bookmarkConfig.profileName || '';
        state.selectedPersona = bookmarkConfig.personaId || '';

        // Restore to UI
        if (elements.profileName) elements.profileName.value = state.profileName;
        if (elements.persona) elements.persona.value = state.selectedPersona;

        // Save back to chrome.storage.local
        await chrome.storage.local.set({
          profileName: state.profileName,
          selectedPersona: state.selectedPersona,
          isLocked: true
        });

        lockSettings();
      }
    }
  } catch (error) {
    console.error('Failed to load saved data:', error);
  }
}

/**
 * Populate persona dropdown with grouped options
 */
function populatePersonaDropdown() {
  const packages = getPackages();
  const select = elements.persona;
  if (!select) return;

  // Clear existing options except the first placeholder
  select.innerHTML = '<option value="">Select a persona...</option>';

  packages.forEach(pkg => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = pkg.name;

    pkg.personaIds.forEach(personaId => {
      const persona = getPersona(personaId);
      if (persona) {
        const option = document.createElement('option');
        option.value = persona.id;
        option.textContent = `${persona.name} (${persona.wpm.min}-${persona.wpm.max} WPM)`;
        optgroup.appendChild(option);
      }
    });

    select.appendChild(optgroup);
  });

  // Restore selected persona if exists
  if (state.selectedPersona) {
    select.value = state.selectedPersona;
  }
}

/**
 * Attach event listeners to UI elements
 */
function attachEventListeners() {
  // Profile name input - save on change
  if (elements.profileName) {
    elements.profileName.addEventListener('input', async (e) => {
      state.profileName = e.target.value.trim();
      await chrome.storage.local.set({ profileName: state.profileName });
    });
  }

  // Persona selection - save on change
  if (elements.persona) {
    elements.persona.addEventListener('change', async (e) => {
      state.selectedPersona = e.target.value;
      await chrome.storage.local.set({ selectedPersona: state.selectedPersona });
    });
  }

  // Get Content button
  if (elements.getContent) elements.getContent.addEventListener('click', handleGetContent);

  // Start Typing button
  if (elements.startTyping) elements.startTyping.addEventListener('click', handleStartTyping);

  // Next Block button
  if (elements.nextBlock) elements.nextBlock.addEventListener('click', handleNextBlock);

  // Stop button
  if (elements.stopTyping) elements.stopTyping.addEventListener('click', handleStopTyping);

  // Emergency Detach button
  if (elements.emergencyDetach) elements.emergencyDetach.addEventListener('click', handleEmergencyDetach);

  // Set/Edit profile buttons
  if (elements.setProfile) elements.setProfile.addEventListener('click', handleSetProfile);
  if (elements.editProfile) elements.editProfile.addEventListener('click', handleEditProfile);

  // Archive button
  if (elements.archiveContent) elements.archiveContent.addEventListener('click', handleArchiveContent);

  // Load saved content
  if (elements.loadSaved) elements.loadSaved.addEventListener('click', handleLoadSaved);

  // Delete saved content
  if (elements.deleteSaved) elements.deleteSaved.addEventListener('click', handleDeleteSaved);

  // Make content preview editable and save on change
  if (elements.contentPreview) {
    elements.contentPreview.addEventListener('input', async (e) => {
      if (state.blocks.length > 0) {
        state.blocks[state.currentBlockIndex] = e.target.value;
        // Save to storage for persistence
        await saveCurrentContentForShortcut();
      }
    });
  }
}

/**
 * Handle Get Content button click
 */
async function handleGetContent() {
  if (!state.profileName) {
    updateStatus('Please enter a profile name', 'error');
    elements.profileName.focus();
    return;
  }

  updateStatus('Fetching content...', 'normal');
  elements.getContent.disabled = true;

  try {
    // Send message to background to fetch content
    const response = await sendMessageToBackground({
      action: 'getContent',
      profile: state.profileName
    });

    if (response && response.success) {
      state.content = response.content || '';

      // Split content by [N] markers for block mode
      state.blocks = splitContentIntoBlocks(state.content);
      state.currentBlockIndex = 0;

      // Display first block
      displayCurrentBlock();

      // Show preview section and action buttons
      elements.previewSection.classList.remove('hidden');
      elements.actionButtons.classList.remove('hidden');

      // Save content for keyboard shortcut
      await saveCurrentContentForShortcut();

      // Auto-archive fetched content
      await sendMessageToBackground({
        action: 'saveContent',
        profileName: state.profileName,
        content: state.content,
        blocks: state.blocks
      });
      await refreshSavedContentsList();

      updateStatus('Content loaded & archived', 'success');
    } else {
      throw new Error(response?.error || response?.message || 'Failed to fetch content');
    }
  } catch (error) {
    console.error('Get content error:', error);
    updateStatus(`Error: ${error.message}`, 'error');
  } finally {
    elements.getContent.disabled = false;
  }
}

/**
 * Split content into blocks using [N] markers
 */
function splitContentIntoBlocks(content) {
  if (!content) return [''];

  // Split by [N] marker (case insensitive)
  const blocks = content.split(/\[N\]/i).map(block => block.trim()).filter(block => block);

  return blocks.length > 0 ? blocks : [content];
}

/**
 * Display the current block in preview
 */
function displayCurrentBlock() {
  if (state.blocks.length === 0) return;
  if (!elements.contentPreview) return;

  const currentBlock = state.blocks[state.currentBlockIndex];
  elements.contentPreview.value = currentBlock || '';
  if (elements.blockCurrent) elements.blockCurrent.textContent = state.currentBlockIndex + 1;
  if (elements.blockTotal) elements.blockTotal.textContent = state.blocks.length;

  // Enable/disable Next Block button
  if (elements.nextBlock) elements.nextBlock.disabled = state.currentBlockIndex >= state.blocks.length - 1;
}

/**
 * Handle Start Typing button click
 */
async function handleStartTyping() {
  if (!state.selectedPersona) {
    updateStatus('Please select a persona', 'error');
    elements.persona.focus();
    return;
  }

  const currentContent = elements.contentPreview.value.trim();
  if (!currentContent) {
    updateStatus('No content to type', 'error');
    return;
  }

  try {
    state.isTyping = true;
    updateUIForTyping(true);
    updateStatus('Typing...', 'typing');

    // Save content for keyboard shortcut
    await saveCurrentContentForShortcut();

    // Send message to background worker
    const response = await sendMessageToBackground({
      action: 'startTyping',
      profileName: state.profileName,
      content: currentContent,
      persona: state.selectedPersona
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to start typing');
    }
  } catch (error) {
    console.error('Start typing error:', error);
    updateStatus(`Error: ${error.message}`, 'error');
    state.isTyping = false;
    updateUIForTyping(false);
  }
}

/**
 * Handle Stop button click
 */
async function handleStopTyping() {
  try {
    await sendMessageToBackground({ action: 'stopTyping' });
    state.isTyping = false;
    updateUIForTyping(false);
    updateStatus('Typing stopped', 'normal');
  } catch (error) {
    console.error('Stop typing error:', error);
    updateStatus(`Error: ${error.message}`, 'error');
  }
}

/**
 * Handle Emergency Detach button click
 * Immediately stops engine and disconnects debugger
 */
async function handleEmergencyDetach() {
  try {
    await sendMessageToBackground({ action: 'emergencyDetach' });
    state.isTyping = false;
    updateUIForTyping(false);
    updateStatus('Debugger detached', 'normal');
  } catch (error) {
    console.error('Emergency detach error:', error);
    updateStatus(`Error: ${error.message}`, 'error');
  }
}

/**
 * Handle Next Block button click
 */
async function handleNextBlock() {
  if (state.currentBlockIndex < state.blocks.length - 1) {
    state.currentBlockIndex++;
    displayCurrentBlock();
    resetProgress();
    updateStatus('Ready for next block', 'normal');
    // Save updated block index
    await saveCurrentContentForShortcut();
  }
}

/**
 * Handle Next Block with auto-focus (for Alt+A shortcut)
 * Focuses cursor at end of text immediately after switching
 */
async function handleNextBlockWithFocus() {
  if (state.currentBlockIndex < state.blocks.length - 1) {
    state.currentBlockIndex++;
    displayCurrentBlock();
    resetProgress();
    updateStatus('Ready for next block', 'normal');
    // Save updated block index
    await saveCurrentContentForShortcut();

    // Auto-focus with 50ms delay for browser focus stability
    if (elements.contentPreview) {
      setTimeout(() => {
        elements.contentPreview.focus();
        const len = elements.contentPreview.value.length;
        elements.contentPreview.setSelectionRange(len, len);
      }, 50);
    }
  } else {
    updateStatus('No more blocks', 'normal');
  }
}

/**
 * Handle messages from background worker
 */
function handleBackgroundMessage(message, sender, sendResponse) {
  if (message.action === 'progress') {
    updateProgress(message.percent);
  } else if (message.action === 'complete') {
    handleTypingComplete();
  } else if (message.action === 'error') {
    handleTypingError(message.message);
  } else if (message.action === 'nextBlockShortcut') {
    // Alt+A shortcut triggered - advance to next block with auto-focus
    handleNextBlockWithFocus();
  } else if (message.action === 'blockSwitched') {
    // Block was switched via shortcut (Alt+A) - sync UI
    state.currentBlockIndex = message.blockIndex;
    displayCurrentBlock();
    resetProgress();
    updateStatus('Ready for next block', 'normal');
    // Auto-focus content preview with delay for browser focus
    if (elements.contentPreview) {
      setTimeout(() => {
        elements.contentPreview.focus();
        const len = elements.contentPreview.value.length;
        elements.contentPreview.setSelectionRange(len, len);
      }, 50);
    }
  }
}

/**
 * Update progress bar
 */
function updateProgress(percent) {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  elements.progressFill.style.width = `${clampedPercent}%`;
  elements.progressText.textContent = `${Math.round(clampedPercent)}%`;
}

/**
 * Reset progress bar
 */
function resetProgress() {
  updateProgress(0);
  elements.progressSection.classList.add('hidden');
}

/**
 * Handle typing completion
 */
function handleTypingComplete() {
  state.isTyping = false;
  updateUIForTyping(false);
  updateProgress(100);
  updateStatus('Typing completed!', 'success');

  // Auto-advance to next block if available
  if (state.currentBlockIndex < state.blocks.length - 1) {
    setTimeout(() => {
      elements.nextBlock.focus();
    }, 500);
  }
}

/**
 * Handle typing error
 */
function handleTypingError(message) {
  state.isTyping = false;
  updateUIForTyping(false);
  updateStatus(`Error: ${message}`, 'error');
}

/**
 * Update UI elements based on typing state
 */
function updateUIForTyping(isTyping) {
  if (isTyping) {
    elements.startTyping.classList.add('hidden');
    elements.stopTyping.classList.remove('hidden');
    elements.emergencyDetach.classList.remove('hidden');
    elements.nextBlock.disabled = true;
    elements.getContent.disabled = true;
    elements.profileName.disabled = true;
    elements.persona.disabled = true;
    elements.contentPreview.disabled = true;
    elements.progressSection.classList.remove('hidden');
  } else {
    elements.startTyping.classList.remove('hidden');
    elements.stopTyping.classList.add('hidden');
    elements.emergencyDetach.classList.add('hidden');
    elements.nextBlock.disabled = state.currentBlockIndex >= state.blocks.length - 1;
    elements.getContent.disabled = false;
    elements.profileName.disabled = false;
    elements.persona.disabled = false;
    elements.contentPreview.disabled = false;
  }
}

/**
 * Update status display
 */
function updateStatus(message, type = 'normal') {
  elements.status.textContent = message;
  elements.status.className = 'status';

  if (type === 'typing') {
    elements.status.classList.add('typing');
  } else if (type === 'error') {
    elements.status.classList.add('error');
  } else if (type === 'success') {
    elements.status.classList.add('success');
  }
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/**
 * Refresh saved contents dropdown
 */
async function refreshSavedContentsList() {
  try {
    const response = await sendMessageToBackground({ action: 'getSavedContents' });

    if (response && response.success) {
      const contents = response.contents;
      const keys = Object.keys(contents);

      elements.savedCount.textContent = `(${keys.length})`;

      // Clear and repopulate dropdown
      elements.savedContents.innerHTML = '<option value="">Select saved content...</option>';

      keys.sort().forEach(profileName => {
        const option = document.createElement('option');
        option.value = profileName;
        const savedAt = new Date(contents[profileName].savedAt).toLocaleString();
        option.textContent = `${profileName} (${savedAt})`;
        elements.savedContents.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Failed to load saved contents:', error);
  }
}

/**
 * Handle Archive button click
 */
async function handleArchiveContent() {
  if (!state.profileName) {
    updateStatus('Enter a profile name first', 'error');
    return;
  }

  if (state.blocks.length === 0) {
    updateStatus('No content to archive', 'error');
    return;
  }

  try {
    const response = await sendMessageToBackground({
      action: 'saveContent',
      profileName: state.profileName,
      content: state.content,
      blocks: state.blocks
    });

    if (response && response.success) {
      updateStatus('Content archived', 'success');
      await refreshSavedContentsList();
    } else {
      throw new Error(response?.error || 'Failed to archive');
    }
  } catch (error) {
    updateStatus(`Archive error: ${error.message}`, 'error');
  }
}

/**
 * Handle Load Saved button click
 */
async function handleLoadSaved() {
  const selectedProfile = elements.savedContents.value;

  if (!selectedProfile) {
    updateStatus('Select a saved content first', 'error');
    return;
  }

  try {
    const response = await sendMessageToBackground({
      action: 'loadSavedContent',
      profileName: selectedProfile
    });

    if (response && response.success) {
      // Update state
      state.profileName = selectedProfile;
      state.content = response.content;
      state.blocks = response.blocks;
      state.currentBlockIndex = 0;

      // Update UI
      elements.profileName.value = selectedProfile;
      displayCurrentBlock();
      elements.previewSection.classList.remove('hidden');
      elements.actionButtons.classList.remove('hidden');

      // Save to storage for keyboard shortcut
      await saveCurrentContentForShortcut();

      updateStatus('Content loaded from archive', 'success');
    } else {
      throw new Error(response?.error || 'Failed to load');
    }
  } catch (error) {
    updateStatus(`Load error: ${error.message}`, 'error');
  }
}

/**
 * Handle Delete Saved button click
 */
async function handleDeleteSaved() {
  const selectedProfile = elements.savedContents.value;

  if (!selectedProfile) {
    updateStatus('Select a saved content first', 'error');
    return;
  }

  if (!confirm(`Delete saved content for "${selectedProfile}"?`)) {
    return;
  }

  try {
    const response = await sendMessageToBackground({
      action: 'deleteContent',
      profileName: selectedProfile
    });

    if (response && response.success) {
      updateStatus('Content deleted', 'success');
      await refreshSavedContentsList();
    } else {
      throw new Error(response?.error || 'Failed to delete');
    }
  } catch (error) {
    updateStatus(`Delete error: ${error.message}`, 'error');
  }
}

/**
 * Save current content to storage for keyboard shortcut access and persistence
 */
async function saveCurrentContentForShortcut() {
  const currentContent = elements.contentPreview.value.trim();
  await chrome.storage.local.set({
    currentContent: currentContent,
    currentBlocks: state.blocks,
    currentBlockIndex: state.currentBlockIndex,
    selectedPersona: state.selectedPersona
  });
}

/**
 * Handle Set button - lock profile and persona
 */
async function handleSetProfile() {
  if (!elements.profileName.value.trim()) {
    updateStatus('Enter profile name first', 'error');
    return;
  }
  if (!elements.persona.value) {
    updateStatus('Select persona first', 'error');
    return;
  }

  state.profileName = elements.profileName.value.trim();
  state.selectedPersona = elements.persona.value;

  await chrome.storage.local.set({
    profileName: state.profileName,
    selectedPersona: state.selectedPersona,
    isLocked: true
  });

  // Backup config to bookmark (survives extension reinstall)
  await backupConfigToBookmark(state.profileName, state.selectedPersona);

  lockSettings();
  updateStatus('Settings locked', 'success');
}

/**
 * Handle Edit button - unlock settings
 */
async function handleEditProfile() {
  await chrome.storage.local.set({ isLocked: false });
  unlockSettings();
  updateStatus('Settings unlocked', 'normal');
}

/**
 * Lock profile and persona inputs
 */
function lockSettings() {
  if (elements.profileName) elements.profileName.disabled = true;
  if (elements.persona) elements.persona.disabled = true;
  if (elements.setProfile) elements.setProfile.classList.add('hidden');
  if (elements.editProfile) elements.editProfile.classList.remove('hidden');
}

/**
 * Unlock profile and persona inputs
 */
function unlockSettings() {
  if (elements.profileName) elements.profileName.disabled = false;
  if (elements.persona) elements.persona.disabled = false;
  if (elements.setProfile) elements.setProfile.classList.remove('hidden');
  if (elements.editProfile) elements.editProfile.classList.add('hidden');
}

// ── Bookmark Backup Mechanism ──────────────────────────────────────────
// Stores profile config in a Chrome bookmark (invisible to X.com anti-bot scripts).
// Survives extension reinstall since bookmarks persist with the Chrome profile.

const BOOKMARK_FOLDER_TITLE = '[AutoQuill_Profile_Config]';
const BOOKMARK_CONFIG_PREFIX = 'http://autoquill.local/?config=';

/**
 * Save profile config to a bookmark as Base64-encoded JSON in the URL field.
 * Creates or updates the bookmark under "Other bookmarks".
 */
async function backupConfigToBookmark(profileName, personaId) {
  try {
    const config = JSON.stringify({ profileName, personaId });
    const encoded = btoa(unescape(encodeURIComponent(config)));
    const configUrl = BOOKMARK_CONFIG_PREFIX + encoded;

    // Search for existing bookmark
    const existing = await chrome.bookmarks.search({ title: BOOKMARK_FOLDER_TITLE });

    if (existing.length > 0) {
      // Update existing bookmark URL
      await chrome.bookmarks.update(existing[0].id, { url: configUrl });
    } else {
      // Create new bookmark in "Other bookmarks" (id '2' keeps it off the visible bookmark bar)
      await chrome.bookmarks.create({
        parentId: '2',
        title: BOOKMARK_FOLDER_TITLE,
        url: configUrl
      });
    }
  } catch (e) {
    console.warn('Bookmark backup failed:', e);
  }
}

/**
 * Restore profile config from bookmark backup.
 * Returns { profileName, personaId } or null if no backup exists.
 */
async function restoreConfigFromBookmark() {
  try {
    const results = await chrome.bookmarks.search({ title: BOOKMARK_FOLDER_TITLE });
    if (results.length === 0) return null;

    const bookmark = results[0];
    if (!bookmark.url || !bookmark.url.startsWith(BOOKMARK_CONFIG_PREFIX)) return null;

    const encoded = bookmark.url.slice(BOOKMARK_CONFIG_PREFIX.length);
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch (e) {
    console.warn('Bookmark restore failed:', e);
    return null;
  }
}
