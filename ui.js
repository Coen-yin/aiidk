function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderMarkdown(text) {
  const safe = escapeHtml(text);
  return safe
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[(.*?)\]\((https?:\/\/[^\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g, '<br>');
}

function showSkeleton(container, count = 6) {
  container.innerHTML = Array.from({ length: count })
    .map(() => '<div class="skeleton-item"></div>')
    .join('');
}

function hideSkeleton(container) {
  container.innerHTML = '';
}

function renderChatList({ chatListEl, chats, activeChatId }) {
  chatListEl.innerHTML = '';
  chats.forEach((chat) => {
    const li = document.createElement('li');
    li.className = `chat-list-item ${chat.id === activeChatId ? 'active' : ''}`;
    li.innerHTML = `
      <button class="ghost-btn chat-select" data-chat-id="${chat.id}" type="button">${escapeHtml(chat.title || 'Untitled Chat')}</button>
      <div class="chat-actions">
        <button class="icon-btn" type="button" data-action="rename-chat" data-chat-id="${chat.id}" aria-label="Rename">✎</button>
        <button class="icon-btn" type="button" data-action="delete-chat" data-chat-id="${chat.id}" aria-label="Delete">🗑</button>
      </div>
    `;
    chatListEl.appendChild(li);
  });
}

function renderMessages({ messagesEl, messages }) {
  messagesEl.innerHTML = '';
  messages.forEach((message) => {
    const item = document.createElement('article');
    item.className = `message ${message.role}`;
    item.dataset.messageId = message.id;
    item.innerHTML = `
      <div class="message-header">
        <strong>${message.role === 'user' ? 'You' : 'AI'}</strong>
        <div class="message-actions">
          <button class="icon-btn" type="button" data-action="copy-message" data-message-id="${message.id}">Copy</button>
          <button class="icon-btn" type="button" data-action="delete-message" data-message-id="${message.id}">Delete</button>
        </div>
      </div>
      <div class="message-content">${renderMarkdown(message.content || '')}</div>
    `;
    messagesEl.appendChild(item);
  });
}

function appendStreamingMessage(messagesEl, text) {
  const wrapper = document.createElement('article');
  wrapper.className = 'message ai';
  wrapper.dataset.streaming = 'true';
  wrapper.innerHTML = `
    <div class="message-header"><strong>AI</strong></div>
    <div class="message-content"></div>
  `;
  messagesEl.appendChild(wrapper);
  updateStreamingMessage(wrapper, text);
  return wrapper;
}

function appendTypingMessage(messagesEl) {
  const wrapper = document.createElement('article');
  wrapper.className = 'message ai';
  wrapper.dataset.typing = 'true';
  wrapper.innerHTML = `
    <div class="message-header"><strong>AI is typing</strong></div>
    <div class="typing" aria-label="typing indicator"><span></span><span></span><span></span></div>
  `;
  messagesEl.appendChild(wrapper);
  return wrapper;
}

function updateStreamingMessage(streamingEl, text) {
  const content = streamingEl.querySelector('.message-content');
  content.innerHTML = renderMarkdown(text);
}

function removeTempMessage(tempEl) {
  tempEl?.remove();
}

function scrollToBottom(container) {
  container.scrollTop = container.scrollHeight;
}

function showToast(toastContainer, message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

export {
  renderChatList,
  renderMessages,
  appendTypingMessage,
  appendStreamingMessage,
  updateStreamingMessage,
  removeTempMessage,
  showToast,
  scrollToBottom,
  showSkeleton,
  hideSkeleton,
};
