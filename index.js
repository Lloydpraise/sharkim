
// 1. CONFIGURATION
const SUPABASE_URL = 'https://ljxvxbjhkgoeygpyejkc.supabase.co/';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHZ4Ympoa2dvZXlncHllamtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE3MzMsImV4cCI6MjA4MzE1NzczM30.fBrwtnv89UHgjs523rKCODE5W4nfBmDsP0AUQ8NgBlU';
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State for AI Search
let searchHistory = [];

// MOBILE MENU
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenuDrawer = document.getElementById('mobileMenuDrawer');
const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');
const closeMobileMenu = document.getElementById('closeMobileMenu');
const mobileMenuListItems = document.getElementById('mobileMenuListItems');

function toggleMobileMenu() { mobileMenuDrawer.classList.toggle('hidden'); }
if(mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileMenu);
if(closeMobileMenu) closeMobileMenu.addEventListener('click', toggleMobileMenu);
if(mobileMenuBackdrop) mobileMenuBackdrop.addEventListener('click', toggleMobileMenu);

function buildMobileMenu(){
  mobileMenuListItems.innerHTML = '';
  (window.MAIN_CATEGORIES || []).forEach(cat => {
    const li = document.createElement('li');
    li.innerHTML = `<a class="block px-4 py-3 rounded-lg text-gray-700 font-medium hover:bg-gray-100 hover:text-[#ea580c] transition" href="shop.html?main=${encodeURIComponent(cat)}">${cat}</a>`;
    mobileMenuListItems.appendChild(li);
  });
}
setTimeout(buildMobileMenu, 500);

function buildDesktopCategories(){
  const wrap = document.getElementById('desktopCategoriesList');
  if(!wrap) return;
  wrap.innerHTML = '';
  (window.MAIN_CATEGORIES || []).forEach(cat => {
    const li = document.createElement('li');
    li.innerHTML = `<a class="block px-3 py-2 rounded hover:bg-gray-100 hover:text-[#ea580c] transition font-medium" href="shop.html?main=${encodeURIComponent(cat)}">${cat}</a>`;
    wrap.appendChild(li);
  });
}
setTimeout(buildDesktopCategories, 600);

// =====================
// HERO CAROUSEL
// =====================
let currentSlide = 0;
const slides = document.querySelectorAll('.carousel-slide');
function nextSlide() {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
}
if (slides.length > 1) { setInterval(nextSlide, 5000); }

// =====================
// CART LOGIC
// =====================
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
const cartCountBadge = document.getElementById('cartCount');

function saveCart(){ localStorage.setItem('cart', JSON.stringify(cart)); }
function updateCartCount(){ 
    if (cartCountBadge) cartCountBadge.innerText = cart.length; 
}
updateCartCount();

// Create Cart Drawer
// =====================
// UPDATED CART DRAWER STRUCTURE
// =====================
(function ensureCartDrawer(){
  if (document.getElementById('cartDrawer')) return;
  
  const drawer = document.createElement('div');
  drawer.id = 'cartDrawer';
  drawer.className = 'fixed top-0 right-0 w-96 max-w-full h-full bg-white shadow-2xl z-[100] flex flex-col transition-transform transform translate-x-full duration-300'; 
  
  // Note: Added translate-x-full for sliding animation class control
  
  drawer.innerHTML = `
    <div class="flex justify-between items-center p-5 border-b bg-gray-50">
        <h2 class="text-xl font-bold text-gray-800">Your Cart</h2>
        <button id="cartClose" class="text-gray-500 hover:text-red-500 transition">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
    </div>

    <div id="cartItems" class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100">
        </div>

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
      // Placeholder for next step
      // window.location.href = 'checkout.html'; 
      alert("Proceeding to checkout design...");
  };
})();

function openCart(){ 
    renderCart(); 
    const d = document.getElementById('cartDrawer');
    d.classList.remove('hidden');
    // Small timeout to allow removing 'hidden' before animating transform
    d.classList.remove('translate-x-full'); 
    document.getElementById('cartBackdrop').classList.remove('hidden'); 
}

function closeCart(){ 
    const d = document.getElementById('cartDrawer');
    d.classList.add('translate-x-full'); // Slide out
    document.getElementById('cartBackdrop').classList.add('hidden');
    // Wait for animation to finish before hiding
    // setTimeout(() => d.classList.add('hidden'), 300); 
}

document.getElementById('cartBtn').onclick = openCart;

// =====================
// UPDATED RENDER CART (New Design)
// =====================
function renderCart(){
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
      if(savingsArea) savingsArea.classList.add('hidden');
      return; 
  }

  cart.forEach((item, idx) => {
    // Math
    const qty = item.qty || 1;
    const price = Number(item.price) || 0;
    const origPrice = Number(item.original_price) || 0;
    
    total += price * qty;
    if(origPrice > price) {
        totalSavings += (origPrice - price) * qty;
    }

    // HTML Component
    const row = document.createElement('div');
    row.className = 'relative flex gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm';
    
    row.innerHTML = `
      <button onclick="removeFromCart(${idx})" class="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
      </button>

      <div class="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
        <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" data-src="${item.image_url}" class="w-full h-full object-contain" loading="lazy" alt="${item.title}"
          srcset="${item.image_url.replace(/\.(jpg|jpeg|png)$/i, '-small.$1')} 300w, ${item.image_url} 600w" sizes="80px"
          onerror="this.onerror=null; this.src='images/sharkim_gold_logo.png'; this.srcset='';">
      </div>

      <div class="flex-1 flex flex-col justify-between py-1">
        <div>
            <h4 class="font-bold text-sm text-gray-800 line-clamp-2 pr-6 leading-tight">${item.title}</h4>
            <div class="mt-1 product-price-row">
              ${origPrice > price ? `<span class="text-xs text-gray-400 line-through mr-2">Ksh ${origPrice.toLocaleString()}</span>` : ''}
              <span class="price-actual">Ksh ${price.toLocaleString()}</span>
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

  // Update Footer Totals
  totalEl.innerText = total.toLocaleString();
  
  if(typeof totalSavings !== 'undefined' && totalSavings > 0) {
      if(savingsEl) savingsEl.innerText = totalSavings.toLocaleString();
      if(savingsArea) savingsArea.classList.remove('hidden');
  } else if(savingsArea) {
      savingsArea.classList.add('hidden');
  }
}

// Helper functions for Cart Actions
window.removeFromCart = (idx) => {
    cart.splice(idx, 1);
    saveCart();
    updateCartCount();
    renderCart();
};

window.updateQty = (idx, change) => {
    if(cart[idx]) {
        cart[idx].qty = (cart[idx].qty || 1) + change;
        if(cart[idx].qty < 1) cart[idx].qty = 1; // Prevent going below 1
        saveCart();
        renderCart(); // Re-render to update totals
    }
};

function checkoutWhatsApp(){
  if (cart.length === 0) return alert('Your cart is empty!');
  let msg = '🛒 *New Order from Sharkim Traders*\n\n';
  let total = 0; cart.forEach((item, i) => { const qty = item.qty||1; msg += `${i+1}. ${item.title} x${qty} - Ksh ${Number(item.price)*qty}\n`; total += Number(item.price||0)*qty; });
  msg += `\n----------------------\n💰 *Total:* Ksh ${total}\n\n`;
  msg += '📍 Please confirm delivery details.';
  window.open(`https://wa.me/+254704843554?text=${encodeURIComponent(msg)}`, '_blank');
}

let allProducts = [];
let isFetching = false;

async function fetchProducts() {
    if (isFetching) return;
    isFetching = true;

    console.time("⚡_Initial_Render");
    
    try {
        // 1. CATEGORY & TOP ITEMS FETCH
        // We fetch the latest products from our MAIN_CATEGORIES specifically 
        // to ensure the "Top Categories" section is populated instantly.
        const categoriesToFetch = window.MAIN_CATEGORIES || [];
        
        const { data: categoryData, error: catError } = await client
            .from('products')
            .select('id, title, price, image_url, main_category, original_price')
            .in('main_category', categoriesToFetch)
            .order('created_at', { ascending: false })
            .limit(40); // Grab enough to cover all categories + flash sales

        if (catError) throw catError;

        if (categoryData) {
            const mappedFast = categoryData.map(p => ({
                ...p,
                category: p.main_category || 'Uncategorized',
                image_url: p.image_url || 'images/sharkim_gold_logo.png'
            }));

            // Immediately Render the visual "Skeleton" of the page
            distributeTopSections(mappedFast); 
            
            // Fill the "You May Also Like" with the first 18 we just got
            const initial18 = mappedFast.slice(0, 18);
            renderInitialGrid(initial18);
            
            console.timeEnd("⚡_Initial_Render");
        }

        // 2. BACKGROUND FULL LOAD
        // Now fetch everything else for the search and scrolling
        const { data: fullData, error: fullError } = await client
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (fullError) throw fullError;

        allProducts = fullData.map(p => ({
            ...p,
            category: p.main_category || 'Uncategorized', 
            image_url: p.image_url || 'images/sharkim_gold_logo.png'
        }));

        console.log(`LOG: Full load complete (${allProducts.length} items).`);
        initBottomLazyLoader();

    } catch (err) {
        console.error("Fetch Error:", err.message);
    } finally {
        isFetching = false;
    }
}
/**
 * Renders Top Categories and Flash Sales immediately
 */
function distributeTopSections(products) {
    const topCatsContainer = document.getElementById('topCategoriesContainer');
    const flashSalesContainer = document.getElementById('flashSalesContainer');
    const roundCategoriesContainer = document.getElementById('roundCategoriesContainer');

    [topCatsContainer, flashSalesContainer, roundCategoriesContainer].forEach(c => { if(c) c.innerHTML = ''; });

    // 1. Top Categories
    const topCats = (window.MAIN_CATEGORIES || []).slice(0, 4);
    topCats.forEach(cat => {
        const catP = products.filter(p => p.category === cat);
        const img = catP.length > 0 ? catP[0].image_url : 'images/sharkim_gold_logo.png';
        const el = document.createElement('a');
        el.href = `shop.html?main=${encodeURIComponent(cat)}`;
        el.className = "flex flex-col group";
        el.innerHTML = `
            <div class="overflow-hidden rounded-xl h-40 md:h-56 mb-2 border border-gray-100 shadow-sm">
                <img src="${img}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="eager">
            </div>
            <span class="text-center font-bold text-gray-800 group-hover:text-[#ea580c]">${cat}</span>
        `;
        if(topCatsContainer) topCatsContainer.appendChild(el);
    });

    // 2. Flash Sales (First 4)
    products.slice(0, 4).forEach(p => {
        if(flashSalesContainer) flashSalesContainer.appendChild(renderCard(p, true));
    });

    // 3. Round Categories
    (window.MAIN_CATEGORIES || []).slice(0, 6).forEach(cat => {
        const catP = products.filter(p => p.category === cat);
        const img = catP.length > 0 ? catP[0].image_url : 'images/sharkim_gold_logo.png';
        const el = document.createElement('a');
        el.href = `shop.html?main=${encodeURIComponent(cat)}`;
        el.className = "flex flex-col items-center group";
        el.innerHTML = `
            <div class="w-20 h-20 md:w-28 md:h-28 rounded-full shadow-md overflow-hidden mb-2 border-2 border-transparent group-hover:border-[#ea580c] transition">
                <img src="${img}" class="w-full h-full object-cover" loading="lazy">
            </div>
            <span class="text-xs md:text-sm font-semibold text-center text-gray-800 group-hover:text-[#ea580c]">${cat}</span>
        `;
        if(roundCategoriesContainer) roundCategoriesContainer.appendChild(el);
    });
}

/**
 * Renders the 18 random products instantly
 */
function renderInitialGrid(products) {
    const row1 = document.getElementById('youMayLikeRow1');
    const row2 = document.getElementById('youMayLikeRow2');
    if (!row1 || !row2) return;

    row1.innerHTML = '';
    row2.innerHTML = '';

    products.forEach((p, i) => {
        const card = renderCard(p, true);
        if (i % 2 === 0) row1.appendChild(card);
        else row2.appendChild(card);
    });
}

/**
 * Lazy loads the REST of the products from the background fetch
 */
function initBottomLazyLoader() {
    const loaderTarget = document.getElementById('youMayLikeRow2'); // Target the bottom of current grid
    if (!loaderTarget) return;

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && allProducts.length > 0) {
            console.log("LOG: Loading remaining products from background cache...");
            appendRemainingProducts();
            observer.unobserve(loaderTarget);
        }
    }, { rootMargin: '400px' });

    observer.observe(loaderTarget);
}

function appendRemainingProducts() {
    const row1 = document.getElementById('youMayLikeRow1');
    const row2 = document.getElementById('youMayLikeRow2');
    
    // Slice products we haven't shown yet (skipping roughly the first 20 used for top/initial)
    const remaining = allProducts.slice(20, 100); 

    remaining.forEach((p, i) => {
        const card = renderCard(p, true);
        card.style.opacity = '0';
        if (i % 2 === 0) row1.appendChild(card);
        else row2.appendChild(card);
        
        setTimeout(() => { card.style.transition = 'opacity 0.5s'; card.style.opacity = '1'; }, i * 5);
    });
}
// UPDATED ADD TO CART (Handles Quantity)
// =====================
window.addToCart = (id) => {
  // 1. Find product in allProducts
  const p = allProducts.find(x => x.id == id);
  if(p) {
    // 2. Check if already in cart
    const existingItem = cart.find(x => x.id == id);
    if(existingItem) {
      existingItem.qty = (existingItem.qty || 1) + 1;
    } else {
      // 3. Add new with qty 1
      cart.push({ ...p, qty: 1 });
    }
        
    saveCart(); 
    updateCartCount(); 
    renderCart(); // Update drawer immediately if open
        
    // Visual Feedback on Button
    const btn = document.querySelector(`button[onclick="addToCart('${id}')"]`) || document.activeElement;
    if(btn && (btn.innerText.includes('CART') || btn.innerText.includes('Add') || btn.innerText.includes('ADD'))) {
      const old = btn.innerHTML || btn.innerText; 
      btn.innerHTML = '✔ Added';
      btn.classList.add('bg-green-100');
      setTimeout(() => {
        if(old) btn.innerHTML = old;
        btn.classList.remove('bg-green-100');
      }, 1000);
    }
  }
};

function renderCard(product, isPopOut){
  const disc = (product.original_price && product.original_price > product.price)
    ? Math.round(((product.original_price - product.price)/product.original_price)*100) : 0;
  
  const el = document.createElement('div');
  // If in horizontal scroll, set fixed width, else auto
  // Narrower width for cards so they are closer to square when height increased
  const widthClass = isPopOut ? '' : 'w-36 md:w-auto flex-shrink-0'; 
  
  el.className = `bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative flex flex-col ${isPopOut ? 'pop-out-card' : ''} ${widthClass}`;

      el.innerHTML = `
    <a href="product.html?id=${encodeURIComponent(product.id)}" class="block mb-3 relative h-48 md:h-64 overflow-hidden rounded-lg flex items-center justify-center p-2 bg-white">
      <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" data-src="${product.image_url}" class="w-full h-full object-contain hover:scale-105 transition duration-300" decoding="async" alt="${product.title}" width="600" height="400"
        srcset="${product.image_url} 600w, ${product.image_url.replace(/\.(jpg|jpeg|png)$/i, '-small.$1')} 300w"
        sizes="(max-width:640px) 90vw, 25vw"
        onerror="this.onerror=null; this.src='images/sharkim_gold_logo.png'; this.srcset='';">
      ${disc ? `<span class="discount-badge absolute top-0 left-0 text-[10px] font-bold">-${disc}%</span>` : ''}
    </a>
    
    <div class="flex-1 flex flex-col">
        <h3 class="text-sm font-bold text-gray-800 line-clamp-2 leading-tight mb-1 h-12">${product.title}</h3>
        <div class="mb-2 product-price-row">
          ${product.original_price ? `<span class="text-xs text-gray-400 line-through mr-1">Ksh ${product.original_price}</span>` : ''}
          <span class="text-base price-actual">Ksh ${product.price}</span>
        </div>
        
        <div class="mt-auto flex flex-col gap-2">
            <button onclick="addToCart('${product.id}')" class="w-full py-1.5 border border-gray-200 bg-white text-gray-800 text-xs font-bold rounded hover:bg-gray-50 hover:text-[#ea580c] transition">
                ADD TO CART
            </button>
            
            <a href="checkout.html?id=${encodeURIComponent(product.id)}" class="w-full py-1.5 bg-[#ea580c] text-white text-xs font-bold rounded text-center hover:bg-orange-700 transition">
              BUY NOW
            </a>
        </div>
    </div>
  `;
  return el;
}

// Ensure images created dynamically have recommended performance attributes
function enhanceImages(){
  document.querySelectorAll('img').forEach(img => {
    try {
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
      if (!img.hasAttribute('loading')) {
        // Keep hero / high-priority images eager
        if (img.getAttribute('fetchpriority') === 'high' || img.closest('.carousel-container')) img.setAttribute('loading', 'eager');
        else img.setAttribute('loading', 'lazy');
      }
      if (!img.hasAttribute('alt')) img.setAttribute('alt', '');
      // If image has a data-src (used by our lazyloader), add a small hint and srcset
      const dataSrc = img.dataset && (img.dataset.src || img.getAttribute('src'));
      if (dataSrc) {
        try {
          const m = dataSrc.match(/\.(jpg|jpeg|png)$/i);
          if (m) {
            const small = dataSrc.replace(/\.(jpg|jpeg|png)$/i, '-small.$1');
            // only add data-src-small if not already present
            if (!img.dataset.srcsmall) img.dataset.srcsmall = small;
            if (!img.getAttribute('srcset')) img.setAttribute('srcset', `${small} 300w, ${dataSrc} 600w`);
          }
        } catch(e){}
      }
    } catch(e) { /* ignore for odd SVGs */ }
  });
}

// =====================
// NEW: AI Search Logic
// =====================

// 1. Safe Helper to ensure UI exists before use
// 1. Safe Helper - Made more aggressive
function ensureAiUiExists() {
    let modal = document.getElementById('ai-search-modal');
    if (!modal) {
        console.time("UI_Injection_Speed"); // Start timer
        injectAiUi();
        modal = document.getElementById('ai-search-modal');
        console.timeEnd("UI_Injection_Speed"); // See how long injection took
    }
    return modal;
}

// 2. Move the call OUTSIDE of any event listeners

injectAiUi(); 

// Update your DOMContentLoaded to just fetch products
document.addEventListener('DOMContentLoaded', () => {
    console.log("LOG: DOM fully loaded and parsed");
    fetchProducts();
});

// 2. The Trigger Function
async function handleAiSearch(query) {
    if (!query) return;

    // Ensure UI is ready
    const modal = ensureAiUiExists();
    const chatContainer = document.getElementById('ai-chat-container');

    // Double check container exists to prevent "appendChild of null"
    if (!modal || !chatContainer) {
        console.error("AI Search UI could not be initialized.");
        return;
    }

    // Show the modal
    modal.classList.remove('hidden');
    
    // Add user text
    addChatMessage('user', query);
    const loadingId = addLoadingIndicator();

    try {
        // Call the Edge Function
        const { data, error } = await client.functions.invoke('ai-search', {
            body: { 
                query: query, 
                history: searchHistory,
            }
        });

        if (error) throw error;

        removeLoadingIndicator(loadingId);

        if (data && data.refined_products) {
            // Show AI response + Horizontal Scroll
            addAiResponse(data.pre_text, data.refined_products);
            
            // Save context for "Refine Search"
            searchHistory.push({ role: 'user', content: query });
            searchHistory.push({ 
                role: 'assistant', 
                content: data.pre_text, 
                product_ids: data.refined_products.map(p => p.id) 
            });
        }
    } catch (err) {
        removeLoadingIndicator(loadingId);
        // Fallback if chatContainer disappeared
        const container = document.getElementById('ai-chat-container');
        if (container) {
            addChatMessage('ai', "I'm having trouble connecting to the network. Please try again.");
        }
        console.error("Edge Function Error:", err);
    }
}

// 3. Updated Event Listeners
// These match the IDs in your index.html exactly
const searchConfig = [
    { btn: 'searchBtnDesktop', input: 'searchInputDesktop' },
    { btn: 'searchBtnMobile', input: 'searchInputMobile' },
    { btn: 'aiSearchDesktop', input: 'searchInputDesktop' },
    { btn: 'aiSearchMobile', input: 'searchInputMobile' }
];

searchConfig.forEach(({ btn, input }) => {
    const btnEl = document.getElementById(btn);
    const inputEl = document.getElementById(input);
    
    if (btnEl) {
        // Clone to clear old keyword-search listeners
        const newBtn = btnEl.cloneNode(true);
        btnEl.parentNode.replaceChild(newBtn, btnEl);

        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const val = inputEl ? inputEl.value.trim() : '';
            
            // Ensure UI is ready immediately on click
            const modal = ensureAiUiExists();

            if (val) {
                handleAiSearch(val);
                if(inputEl) inputEl.value = ''; 
            } else if (modal) {
                // If empty, just open the AI chat modal
                modal.classList.remove('hidden');
            }
        });
    }
});
// =====================
// UI HELPER FUNCTIONS
// =====================

// Generates HTML for a Single Product Card
function createProductCard(p, isHorizontal = false) {
    const card = document.createElement('div');
    
    // Different styles for Homepage Grid vs AI Horizontal Scroll
    const wrapperClass = isHorizontal 
        ? "min-w-[260px] w-[260px] snap-center bg-white border rounded-lg shadow-sm flex-shrink-0 mr-4"
        : "bg-white border rounded-lg shadow-sm hover:shadow-md transition relative";
    
    card.className = wrapperClass;
    
    // Logic for Image: specific to your new DB schema (image_url)
    // Also handles the "In Stock" badge
    const stockBadge = (p.stock_quantity && p.stock_quantity > 0) 
        ? '<span class="absolute top-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded z-10">In Stock</span>' 
        : '';

    card.innerHTML = `
      <a href="product.html?id=${p.id}" class="block h-full flex flex-col">
        <div class="h-48 p-4 flex items-center justify-center relative">
           ${stockBadge}
           <img src="${p.image_url || 'placeholder.jpg'}" class="h-full object-contain mx-auto" loading="lazy" alt="${p.title}">
        </div>
        <div class="p-4 border-t flex-1 flex flex-col justify-between">
          <div>
            <h3 class="text-sm font-bold text-gray-800 line-clamp-2 mb-2">${p.title}</h3>
            <div class="text-xs text-gray-500 line-through">${p.original_price ? 'Ksh ' + p.original_price : ''}</div>
            <div class="text-[#ea580c] font-bold text-lg">Ksh ${p.price}</div>
          </div>
        </div>
      </a>
    `;
    return card;
}

// Injects the Hidden AI Modal into HTML
function injectAiUi() {
    if (document.getElementById('ai-search-modal')) return; // Don't create twice

    const div = document.createElement('div');
    div.id = 'ai-search-modal';
    div.className = 'fixed inset-0 bg-black/60 z-[9999] hidden flex flex-col justify-end sm:justify-center items-center backdrop-blur-sm transition-all';
    div.innerHTML = `
      <div class="bg-gray-50 w-full max-w-2xl h-[85vh] sm:h-[80vh] sm:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        <div class="p-4 bg-white border-b flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-2">
                <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <h2 class="font-bold text-gray-800">AI Assistant</h2>
            </div>
            <button onclick="document.getElementById('ai-search-modal').classList.add('hidden')" class="p-2 hover:bg-gray-100 rounded-full transition">
                <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>

        <div id="ai-chat-container" class="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
            <div class="text-center text-gray-400 text-sm mt-10">
                <p class="mb-2">Try searching for:</p>
                <span class="inline-block bg-white px-3 py-1 rounded-full border text-xs m-1">"Cheap phones 128gb"</span>
                <span class="inline-block bg-white px-3 py-1 rounded-full border text-xs m-1">"Laptops for gaming"</span>
            </div>
        </div>

        <div class="p-3 bg-white border-t">
            <div class="flex gap-2 relative">
                <input id="ai-refine-input" type="text" placeholder="Refine results... (e.g. 'Under 40k')" 
                    class="w-full pl-4 pr-12 py-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-black text-sm shadow-sm"
                    onkeypress="if(event.key === 'Enter') document.getElementById('ai-send-btn').click()">
                <button id="ai-send-btn" class="absolute right-2 top-1.5 bg-black text-white p-2 rounded-full hover:bg-gray-800 transition">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7"></path></svg>
                </button>
            </div>
        </div>
      </div>
    `;
    document.body.appendChild(div);

    // Refine Button Logic
    document.getElementById('ai-send-btn').addEventListener('click', () => {
        const input = document.getElementById('ai-refine-input');
        const val = input.value.trim();
        if(val) {
            handleAiSearch(val); // Re-runs search with history
            input.value = '';
        }
    });
}

// Chat UI Helpers
function addChatMessage(role, text) {
    const container = document.getElementById('ai-chat-container');
    const div = document.createElement('div');
    div.className = role === 'user' ? 'flex justify-end' : 'flex justify-start';
    div.innerHTML = `
        <div class="${role === 'user' ? 'bg-black text-white' : 'bg-white border text-gray-800'} px-5 py-2.5 rounded-2xl max-w-[85%] text-sm shadow-sm">
            ${text}
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function addAiResponse(preText, products) {
    const container = document.getElementById('ai-chat-container');
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'flex flex-col items-start gap-3 max-w-full w-full';
    msgDiv.innerHTML = `
        <div class="bg-white border px-5 py-3 rounded-2xl rounded-tl-none text-gray-800 text-sm shadow-sm">
            ${preText}
        </div>
    `;
    
    if (products.length > 0) {
        const carousel = document.createElement('div');
        carousel.className = 'flex overflow-x-auto space-x-4 w-full py-2 pb-4 snap-x hide-scrollbar px-1';
        products.forEach(p => {
            carousel.appendChild(createProductCard(p, true)); // True = Horizontal Style
        });
        msgDiv.appendChild(carousel);
    }

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

function addLoadingIndicator() {
    const id = 'loading-' + Date.now();
    const container = document.getElementById('ai-chat-container');
    const div = document.createElement('div');
    div.id = id;
    div.className = 'flex justify-start';
    div.innerHTML = `
        <div class="bg-gray-100 px-4 py-2 rounded-2xl rounded-tl-none text-xs text-gray-500 flex items-center gap-2">
            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></span>
            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeLoadingIndicator(id) {
    const el = document.getElementById(id);
    if(el) el.remove();
}
function initLazyLoader() {
    const target = document.getElementById('youMayLikeRow1');
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                console.log("LOG: User reached bottom section, rendering remaining products...");
                renderBottomRows();
                observer.unobserve(target); // Stop observing once rendered
            }
        });
    }, { rootMargin: '200px' }); // Start loading 200px before the user sees it

    observer.observe(target);
}

function renderBottomRows() {
    const row1 = document.getElementById('youMayLikeRow1');
    const row2 = document.getElementById('youMayLikeRow2');
    if (!row1 || !row2) return;

    const shuffled = [...allProducts].sort(() => 0.5 - Math.random()).slice(4, 24);
    
    shuffled.forEach((p, i) => {
        const card = renderCard(p, true);
        card.classList.add('animate-fade-in'); // Add a nice fade effect
        if (i % 2 === 0) row1.appendChild(card);
        else row2.appendChild(card);
    });
}
fetchProducts();