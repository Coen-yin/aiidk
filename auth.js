import { signIn, signOut, signUp, updateUserDisplayName, watchAuthState } from './firebase.js';

function initAuth({
  authView,
  chatView,
  signInTab,
  signUpTab,
  authSubmit,
  authForm,
  displayNameInput,
  userBadge,
  showToast,
  onUserChanged,
}) {
  let mode = 'signin';

  function applyMode(nextMode) {
    mode = nextMode;
    const signingUp = mode === 'signup';
    signInTab.classList.toggle('active', !signingUp);
    signUpTab.classList.toggle('active', signingUp);
    displayNameInput.parentElement.classList.toggle('hidden', !signingUp);
    authSubmit.textContent = signingUp ? 'Create Account' : 'Sign In';
  }

  signInTab.addEventListener('click', () => applyMode('signin'));
  signUpTab.addEventListener('click', () => applyMode('signup'));
  applyMode('signin');

  authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(authForm);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const displayName = String(formData.get('displayName') || '').trim();

    try {
      authSubmit.disabled = true;
      if (mode === 'signup') {
        await signUp(email, password, displayName);
        showToast('Account created successfully', 'info');
      } else {
        await signIn(email, password);
        showToast('Signed in', 'info');
      }
      authForm.reset();
    } catch (error) {
      showToast(error.message || 'Authentication failed', 'error');
    } finally {
      authSubmit.disabled = false;
    }
  });

  const unsubscribe = watchAuthState((user) => {
    if (user) {
      authView.classList.add('hidden');
      chatView.classList.remove('hidden');
      chatView.setAttribute('aria-hidden', 'false');
      userBadge.textContent = user.displayName || user.email;
    } else {
      authView.classList.remove('hidden');
      chatView.classList.add('hidden');
      chatView.setAttribute('aria-hidden', 'true');
      userBadge.textContent = '';
    }
    onUserChanged(user);
  });

  return {
    unsubscribe,
    async logout() {
      await signOut();
    },
    async editProfileName(user) {
      const newDisplayName = window.prompt('Update display name', user.displayName || '');
      if (!newDisplayName || !newDisplayName.trim()) {
        return;
      }
      await updateUserDisplayName(user, newDisplayName.trim());
      userBadge.textContent = newDisplayName.trim();
      showToast('Display name updated');
    },
  };
}

export { initAuth };
