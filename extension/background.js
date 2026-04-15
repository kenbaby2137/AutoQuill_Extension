/**
 * AutoQuill Background Script - Stable Edition (V5.0)
 * Quản lý trạng thái gõ đơn luồng, đảm bảo ổn định 100%.
 */

importScripts('lib/personas.js');

let currentState = {
  isTyping: false,
  progress: 0,
  content: '',
  currentTypingTabId: null
};

// --- Helper Functions ---
async function updateState(newState) {
  currentState = { ...currentState, ...newState };
  await chrome.storage.local.set({ state: currentState });
  chrome.runtime.sendMessage({ action: 'stateUpdated', state: currentState }).catch(() => {});
}

async function handleGetContent(profileName) {
  try {
    const response = await fetch(`http://localhost:8899/content?profile=${encodeURIComponent(profileName)}`);
    if (!response.ok) throw new Error('Profile not found on server');
    const data = await response.json();
    return { success: true, content: data.content };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleStartTyping(content, personaId, sender, profileName) {
  try {
    // 🛡 KHÓA BẢO VỆ: Chỉ cho gõ một cái một lúc
    if (currentState.isTyping) return { success: false, error: 'Already typing another profile' };

    const queryOptions = { active: true };
    if (sender && sender.tab && sender.tab.windowId) {
      queryOptions.windowId = sender.tab.windowId;
    } else {
      queryOptions.currentWindow = true;
    }

    const [tab] = await chrome.tabs.query(queryOptions);
    if (!tab) return { success: false, error: 'No active tab' };

    // Focus vào ô input trước khi gọi server
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'focusInput' });
    } catch (e) {}

    const personaConfig = typeof PERSONAS !== 'undefined' ? PERSONAS[personaId] : null;

    // Cập nhật trạng thái đang gõ
    await updateState({ isTyping: true, currentTypingTabId: tab.id });

    // Gọi Server và ĐỢI cho đến khi Server gõ xong (Synchronous)
    const response = await fetch('http://localhost:8899/api/os-type', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileName, content, persona: personaConfig })
    });

    const result = await response.json();
    
    // Kết thúc
    await updateState({ isTyping: false, currentTypingTabId: null });
    chrome.runtime.sendMessage({ action: 'complete' }).catch(() => {});
    
    if (!result.success) throw new Error(result.error || 'Server error');
    return { success: true };
  } catch (error) {
    await updateState({ isTyping: false, currentTypingTabId: null });
    return { success: false, error: error.message };
  }
}

// --- Message Listener ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getContent') {
    handleGetContent(message.profileName).then(sendResponse);
    return true;
  }
  if (message.action === 'startTyping') {
    handleStartTyping(message.content, message.personaId, sender, message.profileName).then(sendResponse);
    return true;
  }
  if (message.action === 'getState') {
    sendResponse(currentState);
  }
});

// Khởi tạo trạng thái
chrome.storage.local.get(['state'], (result) => {
  if (result.state) currentState = result.state;
});
