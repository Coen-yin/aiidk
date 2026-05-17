import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'YOUR_KEY',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await setPersistence(auth, browserLocalPersistence);

const usersCollection = collection(db, 'users');
const chatsCollection = collection(db, 'chats');
const messagesCollection = collection(db, 'messages');

async function ensureUserDoc(user) {
  const ref = doc(usersCollection, user.uid);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    await setDoc(ref, {
      email: user.email,
      createdAt: serverTimestamp(),
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
    });
  }
}

async function updateUserDisplayName(user, displayName) {
  await updateProfile(user, { displayName });
  await updateDoc(doc(usersCollection, user.uid), { displayName });
}

async function signUp(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName?.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }
  await ensureUserDoc({ ...cred.user, displayName: displayName?.trim() });
  return cred.user;
}

async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDoc(cred.user);
  return cred.user;
}

function watchAuthState(handler) {
  return onAuthStateChanged(auth, handler);
}

async function createChat(uid, title) {
  return addDoc(chatsCollection, {
    uid,
    title,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function watchChats(uid, handler) {
  const q = query(chatsCollection, where('uid', '==', uid), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, handler);
}

function watchMessages(chatId, handler) {
  const q = query(messagesCollection, where('chatId', '==', chatId), orderBy('timestamp', 'asc'));
  return onSnapshot(q, handler);
}

async function addMessage({ chatId, uid, role, content }) {
  await addDoc(messagesCollection, {
    chatId,
    uid,
    role,
    content,
    timestamp: serverTimestamp(),
  });
  await updateDoc(doc(chatsCollection, chatId), {
    updatedAt: serverTimestamp(),
  });
}

async function updateChatTitle(chatId, title) {
  await updateDoc(doc(chatsCollection, chatId), {
    title,
    updatedAt: serverTimestamp(),
  });
}

async function deleteMessage(messageId) {
  await deleteDoc(doc(messagesCollection, messageId));
}

async function deleteChat(chatId) {
  const snapshot = await getDocs(query(messagesCollection, where('chatId', '==', chatId)));
  await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
  await deleteDoc(doc(chatsCollection, chatId));
}

export {
  auth,
  signOut,
  signIn,
  signUp,
  watchAuthState,
  updateUserDisplayName,
  createChat,
  watchChats,
  watchMessages,
  addMessage,
  updateChatTitle,
  deleteChat,
  deleteMessage,
};
