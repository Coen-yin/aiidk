import {
  addMessage,
  createChat,
  deleteChat,
  deleteMessage,
  updateChatTitle,
  watchChats,
  watchMessages,
} from './firebase.js';
import {
  appendStreamingMessage,
  appendTypingMessage,
  hideSkeleton,
  removeTempMessage,
  renderChatList,
  renderMessages,
  scrollToBottom,
  showSkeleton,
  updateStreamingMessage,
} from './ui.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getDraftKey(uid, chatId) {
  return `draft:${uid}:${chatId || 'new'}`;
}

async function callAI(userMessage, chatId, userId) {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage, chatId, userId }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.reply) {
        return data.reply;
      }
    }
  } catch (error) {
    console.warn('AI placeholder endpoint failed, using local fallback.', error);
  }

  const normalized = userMessage.toLowerCase();
  if (normalized.includes('hello') || normalized.includes('hi')) {
    return 'Hello! Great to see you. How can I help you today?';
  }

  if (normalized.includes('code')) {
    return 'Sure - here is a quick JavaScript example:\n```js\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\nconsole.log(greet("AIIDK"));\n```';
  }

  return 'That is an interesting request. I can help you break it down, identify options, and draft a clear next step.';
}

function makeTitleFromMessage(message) {
  return message.trim().slice(0, 40) || 'Untitled Chat';
}

function initChat({
  ui,
  showToast,
  chatTitle,
  messageInput,
  messagesContainer,
  messagesList,
  chatList,
  chatListSkeleton,
  messagesSkeleton,
}) {
  let currentUser = null;
  let chats = [];
  let activeChatId = '';
  let stopChatsWatch = null;
  let stopMessagesWatch = null;

  function bindDraftAutosave() {
    messageInput.addEventListener('input', () => {
      if (!currentUser) {
        return;
      }
      const key = getDraftKey(currentUser.uid, activeChatId);
      localStorage.setItem(key, messageInput.value);
      messageInput.style.height = 'auto';
      messageInput.style.height = `${Math.min(messageInput.scrollHeight, 180)}px`;
    });
  }

  function loadDraft() {
    if (!currentUser) {
      return;
    }
    const key = getDraftKey(currentUser.uid, activeChatId);
    messageInput.value = localStorage.getItem(key) || '';
    messageInput.dispatchEvent(new Event('input'));
  }

  function setActiveChat(chatId) {
    activeChatId = chatId;
    const active = chats.find((item) => item.id === chatId);
    chatTitle.textContent = active?.title || 'New Chat';
    renderChatList({ chatListEl: chatList, chats, activeChatId });
    stopMessagesWatch?.();

    if (!chatId) {
      messagesList.innerHTML = '';
      loadDraft();
      return;
    }

    showSkeleton(messagesSkeleton, 6);
    stopMessagesWatch = watchMessages(chatId, (snapshot) => {
      const mapped = snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
      renderMessages({ messagesEl: messagesList, messages: mapped });
      hideSkeleton(messagesSkeleton);
      scrollToBottom(messagesContainer);
      loadDraft();
    });
  }

  async function sendMessage(message) {
    if (!currentUser || !message.trim()) {
      return;
    }

    let chatId = activeChatId;
    if (!chatId) {
      const ref = await createChat(currentUser.uid, makeTitleFromMessage(message));
      chatId = ref.id;
      setActiveChat(chatId);
    }

    const trimmed = message.trim();
    await addMessage({
      chatId,
      uid: currentUser.uid,
      role: 'user',
      content: trimmed,
    });

    if (chats.find((chat) => chat.id === chatId)?.title === 'New Chat') {
      await updateChatTitle(chatId, makeTitleFromMessage(trimmed));
    }

    const key = getDraftKey(currentUser.uid, chatId);
    localStorage.removeItem(key);
    messageInput.value = '';
    messageInput.dispatchEvent(new Event('input'));

    const typingEl = appendTypingMessage(messagesList);
    scrollToBottom(messagesContainer);

    const reply = await callAI(trimmed, chatId, currentUser.uid);
    removeTempMessage(typingEl);

    const streamEl = appendStreamingMessage(messagesList, '');
    let visible = '';

    for (const char of reply) {
      visible += char;
      updateStreamingMessage(streamEl, visible);
      scrollToBottom(messagesContainer);
      await wait(10);
    }

    removeTempMessage(streamEl);
    await addMessage({
      chatId,
      uid: currentUser.uid,
      role: 'ai',
      content: reply,
    });
  }

  function bindChatListActions() {
    chatList.addEventListener('click', async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const selectBtn = target.closest('.chat-select');
      if (selectBtn) {
        setActiveChat(selectBtn.dataset.chatId || '');
        return;
      }

      const action = target.dataset.action;
      const chatId = target.dataset.chatId;
      if (!action || !chatId) {
        return;
      }

      try {
        if (action === 'rename-chat') {
          const newTitle = window.prompt('Rename chat', chats.find((item) => item.id === chatId)?.title || '');
          if (newTitle && newTitle.trim()) {
            await updateChatTitle(chatId, newTitle.trim());
            showToast('Chat renamed');
          }
        }

        if (action === 'delete-chat') {
          if (window.confirm('Delete this chat and all its messages?')) {
            await deleteChat(chatId);
            if (activeChatId === chatId) {
              setActiveChat('');
            }
            showToast('Chat deleted');
          }
        }
      } catch (error) {
        showToast(error.message || 'Unable to update chat', 'error');
      }
    });
  }

  function bindMessageActions() {
    messagesList.addEventListener('click', async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const action = target.dataset.action;
      const messageId = target.dataset.messageId;
      if (!action || !messageId) {
        return;
      }

      const article = target.closest('.message');
      const content = article?.querySelector('.message-content')?.textContent?.trim() || '';

      try {
        if (action === 'copy-message') {
          await navigator.clipboard.writeText(content);
          showToast('Message copied');
        }

        if (action === 'delete-message') {
          await deleteMessage(messageId);
          showToast('Message deleted');
        }
      } catch (error) {
        showToast(error.message || 'Unable to update message', 'error');
      }
    });
  }

  function startForUser(user) {
    currentUser = user;
    chats = [];
    activeChatId = '';
    showSkeleton(chatListSkeleton, 8);
    stopChatsWatch?.();
    stopMessagesWatch?.();

    stopChatsWatch = watchChats(user.uid, (snapshot) => {
      chats = snapshot.docs.map((chatDoc) => ({ id: chatDoc.id, ...chatDoc.data() }));
      hideSkeleton(chatListSkeleton);
      renderChatList({ chatListEl: chatList, chats, activeChatId });

      if (!activeChatId && chats[0]?.id) {
        setActiveChat(chats[0].id);
      }

      if (activeChatId && !chats.some((item) => item.id === activeChatId)) {
        setActiveChat(chats[0]?.id || '');
      }
    });

    loadDraft();
  }

  function stop() {
    currentUser = null;
    chats = [];
    activeChatId = '';
    stopChatsWatch?.();
    stopMessagesWatch?.();
    stopChatsWatch = null;
    stopMessagesWatch = null;
    chatList.innerHTML = '';
    messagesList.innerHTML = '';
    messageInput.value = '';
  }

  bindDraftAutosave();
  bindChatListActions();
  bindMessageActions();

  return {
    startForUser,
    stop,
    sendMessage,
    setActiveChat,
    get activeChatId() {
      return activeChatId;
    },
  };
}

export { initChat };
