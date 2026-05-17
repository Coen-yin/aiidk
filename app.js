import { initAuth } from './auth.js';
import { initChat } from './chat.js';
import { showToast, scrollToBottom } from './ui.js';

const ui = {
  authView: document.getElementById('authView'),
  chatView: document.getElementById('chatView'),
  signInTab: document.getElementById('signInTab'),
  signUpTab: document.getElementById('signUpTab'),
  authSubmit: document.getElementById('authSubmit'),
  authForm: document.getElementById('authForm'),
  displayNameInput: document.getElementById('displayNameInput'),
  userBadge: document.getElementById('userBadge'),
  toastContainer: document.getElementById('toastContainer'),
  chatTitle: document.getElementById('chatTitle'),
  messageInput: document.getElementById('messageInput'),
  messagesContainer: document.getElementById('messagesContainer'),
  messagesList: document.getElementById('messagesList'),
  chatList: document.getElementById('chatList'),
  chatListSkeleton: document.getElementById('chatListSkeleton'),
  messagesSkeleton: document.getElementById('messagesSkeleton'),
  newChatBtn: document.getElementById('newChatBtn'),
  composerForm: document.getElementById('composerForm'),
  logoutBtn: document.getElementById('logoutBtn'),
  editProfileBtn: document.getElementById('editProfileBtn'),
  menuBtn: document.getElementById('menuBtn'),
  closeSidebarBtn: document.getElementById('closeSidebarBtn'),
  sidebar: document.getElementById('sidebar'),
  sidebarOverlay: document.getElementById('sidebarOverlay'),
};

const notify = (message, type) => showToast(ui.toastContainer, message, type);

let currentUser = null;

const chat = initChat({ ...ui, showToast: notify, ui });

const auth = initAuth({
  ...ui,
  showToast: notify,
  onUserChanged(user) {
    currentUser = user;
    if (user) {
      chat.startForUser(user);
    } else {
      chat.stop();
    }
  },
});

ui.newChatBtn.addEventListener('click', () => {
  chat.setActiveChat('');
  ui.chatTitle.textContent = 'New Chat';
  ui.messageInput.focus();
  closeMobileSidebar();
});

ui.composerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) {
    notify('Please sign in first', 'error');
    return;
  }

  try {
    ui.messageInput.disabled = true;
    await chat.sendMessage(ui.messageInput.value);
    scrollToBottom(ui.messagesContainer);
  } catch (error) {
    notify(error.message || 'Unable to send message', 'error');
  } finally {
    ui.messageInput.disabled = false;
    ui.messageInput.focus();
  }
});

ui.logoutBtn.addEventListener('click', async () => {
  try {
    await auth.logout();
  } catch (error) {
    notify(error.message || 'Sign out failed', 'error');
  }
});

ui.editProfileBtn.addEventListener('click', async () => {
  if (!currentUser) {
    return;
  }
  try {
    await auth.editProfileName(currentUser);
  } catch (error) {
    notify(error.message || 'Unable to update profile', 'error');
  }
});

function openMobileSidebar() {
  ui.sidebar.classList.add('open');
  ui.sidebarOverlay.classList.add('open');
}

function closeMobileSidebar() {
  ui.sidebar.classList.remove('open');
  ui.sidebarOverlay.classList.remove('open');
}

ui.menuBtn.addEventListener('click', openMobileSidebar);
ui.closeSidebarBtn.addEventListener('click', closeMobileSidebar);
ui.sidebarOverlay.addEventListener('click', closeMobileSidebar);
ui.chatList.addEventListener('click', (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && target.closest('.chat-select')) {
    closeMobileSidebar();
  }
});
