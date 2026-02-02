// Centralized Cart Logic for Sharkim Traders
// Includes drawer injection, cart functions, and logging

// Cart state
let cart = JSON.parse(localStorage.getItem('cart') || '[]').map(item => ({ ...item, price: Number(item.price) || 0 }));

// Ensure currentSessionId is defined (set to null if not from index.js)
if (typeof currentSessionId === 'undefined') currentSessionId = null;

// Logging setup (assuming client is available from Supabase)

async function logEvent(type, metadata = {}, productId = null) {
    if (!currentSessionId) return; // Skip if no session
    try {
        const client = window.supabase ? window.supabase.createClient('https://ljxvxbjhkgoeygpyejkc.supabase.co/', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHZ4Ympoa2dvZXlncHllamtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE3MzMsImV4cCI6MjA4MzE1NzczM30.fBrwtnv89UHgjs523rKCODE5W4nfBmDsP0AUQ8NgBlU') : null;
        if (client) {
            await client.from('analytics').insert([{
                session_id: currentSessionId,
                event_type: type,
                product_id: productId,
                metadata: metadata
            }]);
        }
    } catch (e) {
        console.error('Logging error:', e);
    }
}

// Save cart
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Update cart count
function updateCartCount() {
    // We use (item.qty || 1) to ensure items always count as at least 1
    const totalCount = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    const cartCountBadge = document.getElementById('cartCount');
    if (cartCountBadge) {
        cartCountBadge.innerText = totalCount;
    }
}

// Inject Cart Drawer if not present
function ensureCartDrawer() {
    if (document.getElementById('cartDrawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'cartDrawer';
    drawer.className = 'fixed top-0 right-0 w-96 max-w-full h-full bg-white shadow-2xl z-[100] flex flex-col transition-transform transform translate-x-full duration-300';

    drawer.innerHTML = `
        <div class="flex justify-between items-center p-5 border-b bg-gray-50">
            <h2 class="text-xl font-bold text-gray-800">Your Cart</h2>
            <button id="cartClose" class="text-gray-500 hover:text-red-500 transition">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <div id="cartItems" class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100"></div>

        <div class="p-5 bg-white border-t shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
            <div class="flex justify-between items-end mb-1">
                <span class="text-gray-600 font-medium">Total</span>
                <span class="text-3xl font-extrabold text-[#ea580c]">Ksh <span id="cartTotal">0</span></span>
            </div>

            <div id="cartSavingsArea" class="text-right mb-6 hidden">
                <span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">You have saved: Ksh <span id="cartSavings">0</span></span>
            </div>

            <button id="proceedCheckoutBtn" class="w-full py-4 bg-[#ea580c] text-white text-lg font-bold rounded-xl hover:bg-orange-700 transition shadow-lg flex items-center justify-center gap-2">
                Proceed to Checkout
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
        </div>
    `;

    document.body.appendChild(drawer);

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'cartBackdrop';
    backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 hidden z-[90] transition-opacity duration-300';
    document.body.appendChild(backdrop);

    // Events
    backdrop.onclick = closeCart;
    document.getElementById('cartClose').onclick = closeCart;
    document.getElementById('proceedCheckoutBtn').onclick = () => {
        // Track InitiateCheckout with Meta Pixel before navigating
        try {
            const content_ids = cart.map(i => i.id);
            const value = cart.reduce((s, it) => s + ((Number(it.price) || 0) * (it.qty || 1)), 0);
            if (window.fbq) {
                fbq('track', 'InitiateCheckout', { content_ids: content_ids, value: value, currency: 'KES' });
            }
        } catch (e) {
            console.warn('InitiateCheckout tracking failed', e);
        }
        // Delay navigation slightly to give the pixel time to send
        setTimeout(() => { window.location.href = 'checkout.html'; }, 350);
    };
}

// Inject Cart Button if not present
function ensureCartButton() {
    if (document.getElementById('cartBtn')) return;

    const headerFlex = document.querySelector('header .flex.items-center.justify-between');
    if (!headerFlex) return;

    const button = document.createElement('div');
    button.className = 'flex items-center gap-3';
    button.innerHTML = `
        <button id="cartBtn" class="relative text-gray-800 hover:text-[#ea580c] transition">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4h-2l-1 2H1v2h2l3.6 7.6-1.4 2.4c-.2.3-.2.8 0 1.2.2.4.6.6 1 .6h12v-2H7.4c-.1 0-.2 0-.2-.1l.9-1.5h7.9c.4 0 .7-.2.9-.5l3.6-6.5c.2-.4.1-.8 0-1.1-.2-.3-.5-.5-.9-.5H6.2L5.3 4H7zm0 16c-1.1 0-2 .9-2 2s.9 2 2 2c1.2 0 2-.9 2-2s-.8-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2c1.2 0 2-.9 2-2s-.9-2-2-2z"/></svg>
            <span id="cartCount" class="absolute -top-1 -right-2 bg-[#ea580c] text-white text-xs font-bold px-1.5 py-0.5 rounded-full">0</span>
        </button>
    `;

    headerFlex.appendChild(button);
}

// Open Cart
function openCart() {
    renderCart();
    const d = document.getElementById('cartDrawer');
    d.classList.remove('hidden');
    d.classList.remove('translate-x-full');
    document.getElementById('cartBackdrop').classList.remove('hidden');
}

// Close Cart
function closeCart() {
    const d = document.getElementById('cartDrawer');
    d.classList.add('translate-x-full');
    document.getElementById('cartBackdrop').classList.add('hidden');
}

// Render Cart
function renderCart() {
    const wrap = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    const savingsEl = document.getElementById('cartSavings');
    const savingsArea = document.getElementById('cartSavingsArea');

    wrap.innerHTML = '';

    let total = 0;
    let totalSavings = 0;

    if (cart.length === 0) {
        wrap.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <p>Your cart is empty</p>
            </div>`;
        totalEl.innerText = '0';
        if (savingsArea) savingsArea.classList.add('hidden');
        return;
    }

    cart.forEach((item, idx) => {
        const qty = item.qty || 1;
        const price = Number(item.price) || 0;
        const origPrice = Number(item.original_price) || 0;

        total += price * qty;
        if (origPrice > price) {
            totalSavings += (origPrice - price) * qty;
        }

        const row = document.createElement('div');
        row.className = 'relative flex gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm';

        row.innerHTML = `
            <button onclick="removeFromCart(${idx})" class="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
            </button>

            <div class="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                <img src="${item.image_url || 'images/sharkim_gold_logo.png'}" class="w-full h-full object-contain" loading="lazy" alt="${item.title}"
                    onerror="this.onerror=null; this.src='images/sharkim_gold_logo.png'; this.srcset='';">
            </div>

            <div class="flex-1 flex flex-col justify-between py-1">
                <div>
                    <h4 class="font-bold text-sm text-gray-800 line-clamp-2 pr-6 leading-tight">${item.title}</h4>
                    <div class="mt-1">
                        ${origPrice > price ? `<span class="text-xs text-gray-400 line-through mr-2">Ksh ${origPrice.toLocaleString()}</span>` : ''}
                        <span class="text-[#ea580c] font-bold text-base">Ksh ${price.toLocaleString()}</span>
                    </div>
                </div>

                <div class="flex items-center gap-3 mt-2">
                    <button onclick="updateQty(${idx}, -1)" class="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-[#ea580c] hover:text-white transition font-bold text-lg leading-none pb-1">-</button>
                    <span class="font-bold text-gray-800 w-4 text-center text-sm">${qty}</span>
                    <button onclick="updateQty(${idx}, 1)" class="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-[#ea580c] hover:text-white transition font-bold text-lg leading-none pb-1">+</button>
                </div>
            </div>
        `;
        wrap.appendChild(row);
    });

    totalEl.innerText = total.toLocaleString();

    if (totalSavings > 0) {
        if (savingsEl) savingsEl.innerText = totalSavings.toLocaleString();
        if (savingsArea) savingsArea.classList.remove('hidden');
    } else if (savingsArea) {
        savingsArea.classList.add('hidden');
    }
}

// Cart Actions
window.removeFromCart = (idx) => {
    cart.splice(idx, 1);
    saveCart();
    updateCartCount();
    renderCart();
};

window.updateQty = (idx, change) => {
    if (cart[idx]) {
        cart[idx].qty = (cart[idx].qty || 1) + change;
        if (cart[idx].qty < 1) cart[idx].qty = 1;
        saveCart();
        updateCartCount();
        renderCart();
    }
};

// Silent Add to Cart (without visual feedback)
async function silentAddToCart(id) {
    let p = window.allProducts ? window.allProducts.find(x => x.id == id) : null;
    if (!p) {
        // Fetch from DB if not in allProducts
        const client = window.supabase ? window.supabase.createClient('https://ljxvxbjhkgoeygpyejkc.supabase.co/', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHZ4Ympoa2dvZXlncHllamtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE3MzMsImV4cCI6MjA4MzE1NzczM30.fBrwtnv89UHgjs523rKCODE5W4nfBmDsP0AUQ8NgBlU') : null;
        if (client) {
            const { data, error } = await client.from('products').select('*').eq('id', id).single();
            if (data && !error) p = data;
        }
    }
    if (p) {
        const existingItem = cart.find(x => x.id == id);
        if (existingItem) {
            existingItem.qty = (existingItem.qty || 1) + 1;
        } else {
            cart.push({ ...p, qty: 1 });
        }
        logEvent('add_to_cart', {}, id);
        // Track AddToCart Event for Meta Pixel
        fbq('track', 'AddToCart', {content_ids: [id], content_name: p.title, value: p.price, currency: 'KES'});
        saveCart();
        updateCartCount();
        renderCart();
    }
}

// Add to Cart
window.addToCart = async (id) => {
    await silentAddToCart(id);

    // Visual Feedback
    const btn = document.querySelector(`button[onclick*="addToCart('${id}')"]`) || document.activeElement;
    if (btn && (btn.innerText.includes('CART') || btn.innerText.includes('Add') || btn.innerText.includes('ADD'))) {
        const old = btn.innerHTML || btn.innerText;
        btn.innerHTML = '✔ Added';
        btn.classList.add('bg-green-100');
        setTimeout(() => {
            if (old) btn.innerHTML = old;
            btn.classList.remove('bg-green-100');
        }, 1000);
    }
};

// Buy Now
window.buyNow = async (id) => {
    await window.addToCart(id);
    // Delay navigation to allow AddToCart pixel to send
    setTimeout(() => { window.location.href = 'checkout.html'; }, 350);
};

// Buy Now Silent
window.buyNowSilent = async (id) => {
    await silentAddToCart(id);
    // Delay navigation to allow AddToCart pixel to send
    setTimeout(() => { window.location.href = 'checkout.html'; }, 350);
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    ensureCartDrawer();
    ensureCartButton();
    updateCartCount();
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        cartBtn.onclick = openCart;
    }
});

