// Auth overlay and header account button for customer pages
// Loads Firebase (app + auth), injects a login/signup UI, and exposes user state

// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// Firebase config (provided)
const firebaseConfig = {
  apiKey: "AIzaSyAqZlz19wRLxij1R8fyD9VJRnctKWI9ZHc",
  authDomain: "sharkimtraders-dcbd3.firebaseapp.com",
  projectId: "sharkimtraders-dcbd3",
  storageBucket: "sharkimtraders-dcbd3.firebasestorage.app",
  messagingSenderId: "274046503737",
  appId: "1:274046503737:web:e8190332b5fc2eebb1f6e8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Utility: create element with classes and html
function el(tag, className = '', html = ''){
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html) e.innerHTML = html;
  return e;
}

// Inject overlay modal into DOM (once)
function ensureAuthOverlay(){
  if (document.getElementById('authOverlay')) return;
  const overlay = el('div', 'hidden fixed inset-0 bg-black/60 flex items-center justify-center z-50');
  overlay.id = 'authOverlay';
  overlay.innerHTML = `
    <div class="bg-white w-full max-w-md mx-3 rounded-lg shadow-lg relative">
      <button id="authClose" class="absolute top-2 right-2 text-gray-500 hover:text-black" aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div class="px-6 pt-6 pb-4">
        <h2 id="authTitle" class="text-xl font-bold mb-4">Sign in</h2>

        <div id="authTabs" class="flex border-b mb-4">
          <button id="tabLogin" class="flex-1 py-2 text-center font-medium border-b-2 border-black">Login</button>
          <button id="tabSignup" class="flex-1 py-2 text-center font-medium text-gray-500 border-b-2 border-transparent">Sign up</button>
        </div>

        <!-- Login form -->
        <form id="loginForm" class="space-y-3">
          <div>
            <label class="text-sm block">Email</label>
            <input id="loginEmail" type="email" class="w-full px-3 py-2 border rounded" required />
          </div>
          <div>
            <label class="text-sm block">Password</label>
            <input id="loginPassword" type="password" class="w-full px-3 py-2 border rounded" required />
          </div>
          <div class="flex items-center justify-between">
            <button type="submit" class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">Login</button>
            <button type="button" id="forgotBtn" class="text-sm text-blue-600 hover:underline">Forgot password?</button>
          </div>
        </form>

        <!-- Signup form -->
        <form id="signupForm" class="hidden space-y-3">
          <div>
            <label class="text-sm block">Email</label>
            <input id="signupEmail" type="email" class="w-full px-3 py-2 border rounded" required />
          </div>
          <div>
            <label class="text-sm block">Password</label>
            <input id="signupPassword" type="password" class="w-full px-3 py-2 border rounded" minlength="6" required />
          </div>
          <div>
            <label class="text-sm block">Confirm Password</label>
            <input id="signupPassword2" type="password" class="w-full px-3 py-2 border rounded" minlength="6" required />
          </div>
          <button type="submit" class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">Create account</button>
        </form>

        <p id="authStatus" class="mt-3 text-sm"></p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = overlay.querySelector('#authClose');
  close.addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.add('hidden'); });

  // Tabs logic
  const tabLogin = overlay.querySelector('#tabLogin');
  const tabSignup = overlay.querySelector('#tabSignup');
  const loginForm = overlay.querySelector('#loginForm');
  const signupForm = overlay.querySelector('#signupForm');
  const title = overlay.querySelector('#authTitle');
  const status = overlay.querySelector('#authStatus');

  function showLogin(){
    tabLogin.className = 'flex-1 py-2 text-center font-medium border-b-2 border-black';
    tabSignup.className = 'flex-1 py-2 text-center font-medium text-gray-500 border-b-2 border-transparent';
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    title.textContent = 'Sign in';
    status.textContent = '';
    status.className = 'mt-3 text-sm';
  }
  function showSignup(){
    tabSignup.className = 'flex-1 py-2 text-center font-medium border-b-2 border-black';
    tabLogin.className = 'flex-1 py-2 text-center font-medium text-gray-500 border-b-2 border-transparent';
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    title.textContent = 'Create your account';
    status.textContent = '';
    status.className = 'mt-3 text-sm';
  }
  tabLogin.addEventListener('click', showLogin);
  tabSignup.addEventListener('click', showSignup);

  // Login submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = 'Signing in...';
    status.className = 'mt-3 text-sm text-gray-600';
    const email = overlay.querySelector('#loginEmail').value.trim();
    const password = overlay.querySelector('#loginPassword').value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      status.textContent = 'Welcome back!';
      status.className = 'mt-3 text-sm text-green-600';
      setTimeout(()=> overlay.classList.add('hidden'), 300);
    } catch (err){
      status.textContent = 'Error: ' + (err?.message || 'Failed to sign in');
      status.className = 'mt-3 text-sm text-red-600';
    }
  });

  // Forgot password
  overlay.querySelector('#forgotBtn').addEventListener('click', async () => {
    const email = overlay.querySelector('#loginEmail').value.trim();
    if (!email) { alert('Enter your email first.'); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Password reset email sent.');
    } catch (err){ alert('Reset failed: ' + (err?.message || 'Try again later')); }
  });

  // Signup submit
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = 'Creating account...';
    status.className = 'mt-3 text-sm text-gray-600';
    const email = overlay.querySelector('#signupEmail').value.trim();
    const p1 = overlay.querySelector('#signupPassword').value;
    const p2 = overlay.querySelector('#signupPassword2').value;
    if (p1 !== p2){
      status.textContent = 'Passwords do not match';
      status.className = 'mt-3 text-sm text-red-600';
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, p1);
      status.textContent = 'Account created!';
      status.className = 'mt-3 text-sm text-green-600';
      setTimeout(()=> overlay.classList.add('hidden'), 300);
    } catch (err){
      status.textContent = 'Error: ' + (err?.message || 'Failed to sign up');
      status.className = 'mt-3 text-sm text-red-600';
    }
  });
}

// Insert account button before the cart button
function ensureAccountButton(){
  if (document.getElementById('accountBtn')) return;
  const cartBtn = document.getElementById('cartBtn');
  const path = (window.location.pathname || '').toLowerCase();
  const isIndex = path === '/' || path === '' || path.endsWith('/index.html') || path.endsWith('index.html');
  const btnClassesSmall = 'ml-1 flex items-center gap-2 px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 !text-white';
  const btnClassesLarge = 'ml-2 flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 text-base !text-white';
  const iconSize = isIndex ? 'w-5 h-5' : 'w-6 h-6';
  const btn = el('button', isIndex ? btnClassesSmall : btnClassesLarge, `
    <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"${iconSize}\" viewBox=\"0 0 24 24\" fill=\"currentColor\">\n      <path d=\"M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z\"/>\n    </svg>\n    <span id=\"accountLabel\" style=\"color:#ffffff !important;\">Login</span>\n  `);
  btn.id = 'accountBtn';
  btn.style.color = '#ffffff';
  btn.style.setProperty('color', '#ffffff', 'important');
  btn.addEventListener('click', () => {
    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.classList.remove('hidden');
  });

  if (cartBtn && cartBtn.parentNode){
    const parent = cartBtn.parentNode;
    const parentClasses = (parent.className || '');
    // If this is a justify-between container, create a right-side wrapper so login+cart sit together on the right
    if (/\bjustify-between\b/.test(parentClasses)){
      const wrapper = document.createElement('div');
      wrapper.className = 'flex items-center';
      parent.insertBefore(wrapper, cartBtn);
      wrapper.appendChild(btn);
      wrapper.appendChild(cartBtn);
    } else {
      // Otherwise, just place the login button before the cart in the same row
      parent.insertBefore(btn, cartBtn);
    }
  } else {
    // Fallback: attach to header container
    const header = document.querySelector('header .max-w-7xl') || document.querySelector('header');
    if (header) header.appendChild(btn);
  }
}

// Optional: account dropdown when logged in
function ensureAccountMenu(){
  if (document.getElementById('accountMenu')) return;
  const menu = el('div', 'hidden absolute mt-1 right-0 bg-white border rounded shadow z-50');
  menu.id = 'accountMenu';
  menu.innerHTML = `
    <button id=\"signOutBtn\" class=\"block w-full text-left px-4 py-2 text-sm hover:bg-gray-100\">Sign out</button>
  `;
  document.body.appendChild(menu);
  const btn = document.getElementById('accountBtn');
  if (!btn) return;
  btn.style.position = 'relative';
  btn.addEventListener('contextmenu', (e) => { e.preventDefault(); });
  btn.addEventListener('click', () => {
    // If logged in and label shows email, toggle dropdown; otherwise overlay is opened by previous listener
    if (btn.dataset.logged === '1'){
      const rect = btn.getBoundingClientRect();
      menu.style.top = (rect.bottom + window.scrollY) + 'px';
      menu.style.left = (rect.right - menu.offsetWidth + window.scrollX) + 'px';
      menu.classList.toggle('hidden');
    }
  });
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && e.target !== btn) menu.classList.add('hidden');
  });
  document.getElementById('signOutBtn').addEventListener('click', async () => { await signOut(auth); menu.classList.add('hidden'); });
}

function updateAccountUI(user){
  const label = document.getElementById('accountLabel');
  const btn = document.getElementById('accountBtn');
  const menu = document.getElementById('accountMenu');
  if (!label || !btn) return;
  if (user){
    label.textContent = user.email || 'Account';
    btn.dataset.logged = '1';
    // personalize: expose on body dataset + event
    document.body.dataset.userEmail = user.email || '';
    document.dispatchEvent(new CustomEvent('user-auth-changed', { detail: { email: user.email } }));
    if (menu) menu.classList.add('hidden');
  } else {
    label.textContent = 'Login';
    btn.dataset.logged = '0';
    document.body.dataset.userEmail = '';
    document.dispatchEvent(new CustomEvent('user-auth-changed', { detail: { email: null } }));
    if (menu) menu.classList.add('hidden');
  }
}

// Initialize UI
ensureAuthOverlay();
ensureAccountButton();
ensureAccountMenu();

// Prefill email fields if user already present
onAuthStateChanged(auth, (user) => {
  updateAccountUI(user);
  const loginEmail = document.getElementById('loginEmail');
  const signupEmail = document.getElementById('signupEmail');
  if (user && loginEmail) loginEmail.value = user.email || '';
  if (user && signupEmail) signupEmail.value = user.email || '';

  // If a page has forms which can be personalized, do minimal adjustments
  try {
    // Example: contact page fields
    const emailInputs = Array.from(document.querySelectorAll('input[type=email][name=email], input[type=email]'));
    if (user && emailInputs.length){ emailInputs.forEach(i => { if (!i.value) i.value = user.email || ''; }); }
  } catch {}
});

// Expose signOut if needed elsewhere
window.customerAuth = { auth, signOut: () => signOut(auth) };
