// Always fetch the latest image for a product from Supabase by ID
async function fetchLatestImageUrl(productId) {
    try {
        const { data, error } = await client.from('products').select('images, image_url').eq('id', productId).single();
        if (error || !data) return 'images/sharkim_gold_logo.png';
        if (data.images && Array.isArray(data.images) && data.images.length) return data.images[0];
        if (data.image_url) return data.image_url;
        return 'images/sharkim_gold_logo.png';
    } catch (e) { return 'images/sharkim_gold_logo.png'; }
}

// 1. CONFIGURATION
const SUPABASE_URL = 'https://ljxvxbjhkgoeygpyejkc.supabase.co/';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHZ4Ympoa2dvZXlncHllamtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE3MzMsImV4cCI6MjA4MzE1NzczM30.fBrwtnv89UHgjs523rKCODE5W4nfBmDsP0AUQ8NgBlU';
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State for AI Search
let searchHistory = [];
let currentSessionId = localStorage.getItem('site_session_id');

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
    li.innerHTML = `<a onclick="logEvent('view_category', { category: '${cat}' }); if(window.fbq){ fbq('track','ViewContent',{content_category: '${cat}'}); }" class="block px-4 py-3 rounded-lg text-gray-700 font-medium hover:bg-gray-100 hover:text-[#ea580c] transition" href="shop.html?main=${encodeURIComponent(cat)}">${cat}</a>`;
    mobileMenuListItems.appendChild(li);
  });
}
setTimeout(buildMobileMenu, 500);
// Call on load
loadSiteContent();
initSession();

function buildDesktopCategories(){
  const wrap = document.getElementById('desktopCategoriesList');
  if(!wrap) return;
  wrap.innerHTML = '';
  (window.MAIN_CATEGORIES || []).forEach(cat => {
    const li = document.createElement('li');
    li.innerHTML = `<a onclick="logEvent('view_category', { category: '${cat}' }); if(window.fbq){ fbq('track','ViewContent',{content_category: '${cat}'}); }" class="block px-3 py-2 rounded hover:bg-gray-100 hover:text-[#ea580c] transition font-medium" href="shop.html?main=${encodeURIComponent(cat)}">${cat}</a>`;
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

// Cart logic moved to js/cart.js

let allProducts = [];
let isFetching = false;

// --- STRICT URL SANITIZER (Fixes the blob/netlify errors) ---
function getSafeImageUrl(p) {
    let url = 'images/sharkim_gold_logo.png';

    // 1. Try 'images' Array (Prioritize this!)
    let imagesArray = p.images;
    // Handle Supabase returning stringified JSON "['url']" instead of array
    if (typeof imagesArray === 'string' && imagesArray.startsWith('[')) {
        try { imagesArray = JSON.parse(imagesArray); } catch(e){}
    }
    
    if (Array.isArray(imagesArray) && imagesArray.length > 0) {
        url = imagesArray[0];
    } else if (p.image_url) {
        url = p.image_url;
    }

    // 2. Sanitize
    if (!url || typeof url !== 'string') return 'images/sharkim_gold_logo.png';
    const lower = url.toLowerCase();
    
    // 3. BLOCK BAD URLS 
    if (lower.includes('blob:') || lower.includes('netlify') || !lower.startsWith('http')) {
        // If it's a relative local path, allow it (e.g. 'images/logo.png'), otherwise block
        if (!lower.startsWith('images/')) return 'images/sharkim_gold_logo.png';
    }

    return url;
}

// --- MAIN FETCH FUNCTION ---
async function fetchProducts() {
    if (isFetching) return;
    isFetching = true;

    // 1. Wipe old cache (Critical)
    try { localStorage.removeItem('productMetadata'); } catch(e) {}

    console.time("⚡_Fast_Load");

    try {
        const UI_COLUMNS = 'id, title, price, original_price, image_url, images, main_category, subcategory';

        // --- STEP 1: INSTANT GRID (Top 30) ---
        // We fetch these to fill "You May Like" immediately.
        const { data: recentData, error: recentError } = await client
            .from('products')
            .select(UI_COLUMNS)
            .order('created_at', { ascending: false })
            .limit(30);

        if (recentData) {
            // Process & Clean Data
            let currentItems = recentData.map(p => ({
                ...p,
                image_url: getSafeImageUrl(p), // <--- Uses strict cleaner
                category: p.main_category || 'Uncategorized',
                subcategory: p.subcategory || ''
            }));

            // UPDATE GLOBAL & RENDER GRID IMMEDIATELY
            allProducts = currentItems;
            renderInitialGrid(currentItems); // "You May Like" appears now!
            console.timeEnd("⚡_Fast_Load");

            // --- STEP 2: FILL MISSING CATEGORIES (Top Sections) ---
            // Now that the user has something to look at, we fix the category sections.
            const neededCats = window.MAIN_CATEGORIES || ['Electronics', 'Fashion', 'Home', 'Beauty'];
            const foundCats = new Set(currentItems.map(i => i.category));
            const missingCats = neededCats.filter(c => !foundCats.has(c));

            if (missingCats.length > 0) {
                // Fetch 1 leader for each missing category
                const promises = missingCats.map(cat => 
                    client.from('products')
                        .select(UI_COLUMNS)
                        .eq('main_category', cat)
                        .limit(1)
                        .then(res => res.data ? res.data[0] : null)
                );
                
                const leaders = await Promise.all(promises);
                leaders.forEach(l => {
                    if (l) {
                        currentItems.push({
                            ...l,
                            image_url: getSafeImageUrl(l),
                            category: l.main_category,
                            subcategory: l.subcategory || ''
                        });
                    }
                });
                
                // Update global again with category leaders
                allProducts = currentItems;
            }

            // Render the Top Sections (Hero/Categories) now that we have data
            distributeTopSections(allProducts);
            
            // Initialize lazy loading for remaining products
            initBottomLazyLoader();
        }

    } catch (err) {
        console.error("Load Error:", err);
    }
}

// Helper function to render top sections (categories)
function distributeTopSections(products) {
    const topCatsContainer = document.getElementById('topCategoriesContainer');
    const roundCategoriesContainer = document.getElementById('roundCategoriesContainer');
    
    // Clear existing content
    if (topCatsContainer) topCatsContainer.innerHTML = '';
    if (roundCategoriesContainer) roundCategoriesContainer.innerHTML = '';

    // Helper: Find a product in a category that ACTUALLY HAS AN IMAGE
    const getVisualLeader = (catName) => {
        const goodProduct = products.find(p => 
            (p.category === catName || p.main_category === catName) && 
            p.image_url && 
            !p.image_url.includes('sharkim_gold_logo')
        );
        if (goodProduct) return goodProduct;
        return products.find(p => p.category === catName || p.main_category === catName);
    };

    // TOP CATEGORIES (Square Cards)
    const topCats = (window.MAIN_CATEGORIES || []);
    topCats.forEach(cat => {
        const prod = getVisualLeader(cat);
        const img = prod ? getSafeImageUrl(prod) : 'images/sharkim_gold_logo.png';

        const el = document.createElement('a');
        el.href = `shop.html?main=${encodeURIComponent(cat)}`;
        el.className = "flex flex-col group";
        el.innerHTML = `
            <div class="overflow-hidden rounded-xl h-40 md:h-56 mb-2 border border-gray-100 shadow-sm bg-gray-50">
                <img src="${img}" 
                     class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                     loading="eager" 
                     alt="${cat}"
                     onerror="this.onerror=null;this.src='images/sharkim_gold_logo.png'">
            </div>
            <span class="text-center font-bold text-gray-800 group-hover:text-[#ea580c]">${cat}</span>
        `;
        if (topCatsContainer) topCatsContainer.appendChild(el);
    });

    // ROUND CATEGORIES
    const roundCats = (window.MAIN_CATEGORIES || []);
    roundCats.forEach(cat => {
        const prod = getVisualLeader(cat);
        const img = prod ? getSafeImageUrl(prod) : 'images/sharkim_gold_logo.png';

        const el = document.createElement('a');
        el.href = `shop.html?main=${encodeURIComponent(cat)}`;
        el.className = "flex flex-col items-center group";
        el.innerHTML = `
            <div class="w-20 h-20 md:w-28 md:h-28 rounded-full shadow-md overflow-hidden mb-2 border-2 border-transparent group-hover:border-[#ea580c] transition bg-gray-50">
                <img src="${img}" class="w-full h-full object-cover" loading="lazy" alt="${cat}">
            </div>
            <span class="text-xs md:text-sm font-semibold text-center text-gray-800 group-hover:text-[#ea580c]">${cat}</span>
        `;
        if (roundCategoriesContainer) roundCategoriesContainer.appendChild(el);
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


function renderCard(product, isPopOut){
  const disc = (product.original_price && product.original_price > product.price)
    ? Math.round(((product.original_price - product.price)/product.original_price)*100) : 0;

  const el = document.createElement('div');
  // If in horizontal scroll, set fixed width, else auto
  // Narrower width for cards so they are closer to square when height increased
  const widthClass = isPopOut ? '' : 'w-36 md:w-auto flex-shrink-0';

  el.className = `bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative flex flex-col md:h-96 ${isPopOut ? 'pop-out-card' : ''} ${widthClass}`;

      el.innerHTML = `
    <a href="product.html?id=${encodeURIComponent(product.id)}" class="block mb-3 relative h-48 md:h-64 w-48 md:w-64 overflow-hidden rounded-lg flex items-center justify-center p-2 bg-white">
      <img src="${product.image_url}" class="w-full h-full object-contain hover:scale-105 transition duration-300" decoding="async" alt="${product.title}" width="600" height="400"
        srcset="${product.image_url} 600w, ${product.image_url.replace(/\.(jpg|jpeg|png)$/i, '-small.$1')} 300w"
        sizes="(max-width:640px) 90vw, 25vw"
        loading="lazy"
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
            
            <button onclick="buyNowSilent('${product.id}')" class="w-full py-1.5 bg-[#ea580c] text-white text-xs font-bold rounded text-center hover:bg-orange-700 transition">
              BUY NOW
            </button>
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

    // Attach cart button event listener after DOM is loaded
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        cartBtn.onclick = openCart;
    }
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
// ================= DYNAMIC SITE CONTENT =================

async function loadSiteContent() {
    const { data: settings } = await client.from('site_settings').select('*').single();
    if(!settings) return;

    // 1. RENDER BANNERS
    const carousel = document.getElementById('heroCarousel');
    if(carousel && settings.banners && settings.banners.length > 0) {
        // Filter out empty banners
        const validBanners = settings.banners.filter(b => b.url);
        if(validBanners.length > 0) {
            carousel.innerHTML = validBanners.map((b, i) => `
                <div class="carousel-slide ${i===0 ? 'active' : ''} absolute inset-0 transition-opacity duration-1000 ease-in-out">
                    <a href="${b.link || '#'}" class="${b.link ? 'cursor-pointer' : 'cursor-default'}">
                        <img src="${b.url}" class="w-full h-full object-cover object-center" alt="Offer ${i+1}">
                    </a>
                </div>
            `).join('');
            
            // Re-initialize slider logic since elements changed
            window.resetSlider && window.resetSlider(); 
        }
    }

    // 2. RENDER TRENDING PRODUCTS
    const trendingSection = document.getElementById('trendingSection');
    if (trendingSection) {
        try {
            // Support both JSON-string and object storage for `trending_products`
            let trendingCfg = settings.policies?.trending_products;
            if (typeof trendingCfg === 'string') {
                try { trendingCfg = JSON.parse(trendingCfg); } catch (e) { trendingCfg = {}; }
            }

            if (trendingCfg && trendingCfg.active) {
                const { product_ids } = trendingCfg;

                if (Array.isArray(product_ids) && product_ids.length > 0) {
                    trendingSection.classList.remove('hidden');

                    // Fetch Trending Products
                    const { data: products } = await client.from('products').select('*').in('id', product_ids || []);
                    if (products) renderTrendingItems(products);
                } else {
                    trendingSection.classList.add('hidden');
                }
            } else {
                trendingSection.classList.add('hidden');
            }
        } catch (e) {
            trendingSection.classList.add('hidden');
        }
    }

    // 3. RENDER FLASH SALE
    const flashSection = document.getElementById('flashSaleSection');
    if (flashSection) {
        try {
            // Support both JSON-string and object storage for `flash_sale`
            let flashCfg = settings.flash_sale;
            if (typeof flashCfg === 'string') {
                try { flashCfg = JSON.parse(flashCfg); } catch (e) { flashCfg = {}; }
            }

            if (flashCfg && flashCfg.active) {
                const { end_time, product_ids } = flashCfg;
                const now = new Date();
                const end = end_time ? new Date(end_time) : null;

                // If there are product IDs, always show the section when admin enabled it.
                if (Array.isArray(product_ids) && product_ids.length > 0) {
                    flashSection.classList.remove('hidden');

                    // If end time is in the future, start the timer. If in the past, show without timer.
                    if (end && end > now) {
                        startFlashTimer(end);
                    }

                    // Fetch Flash Products
                    const { data: products } = await client.from('products').select('*').in('id', product_ids || []);
                    if (products) renderFlashItems(products);
                } else {
                    flashSection.classList.add('hidden');
                }
            } else {
                flashSection.classList.add('hidden');
            }
        } catch (e) {
            flashSection.classList.add('hidden');
        }
    }
}

function startFlashTimer(endTime) {
    const hEl = document.getElementById('flashH');
    const mEl = document.getElementById('flashM');
    const sEl = document.getElementById('flashS');
    // Normalize endTime to a Date instance
    const endDate = endTime instanceof Date ? endTime : new Date(endTime);
    if (isNaN(endDate)) {
        if (hEl) hEl.innerText = '00';
        if (mEl) mEl.innerText = '00';
        if (sEl) sEl.innerText = '00';
        return;
    }

    function updateClock() {
        const now = Date.now();
        const dist = endDate.getTime() - now;

        if (dist <= 0) {
            // Timer expired — show zeros and stop
            if (hEl) hEl.innerText = '00';
            if (mEl) mEl.innerText = '00';
            if (sEl) sEl.innerText = '00';
            if (window.flashTimerInterval) clearInterval(window.flashTimerInterval);
            return;
        }

        const h = Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((dist % (1000 * 60)) / 1000);

        if (hEl) hEl.innerText = String(h).padStart(2, '0');
        if (mEl) mEl.innerText = String(m).padStart(2, '0');
        if (sEl) sEl.innerText = String(s).padStart(2, '0');
    }

    // Update immediately, then every second
    updateClock();
    if (window.flashTimerInterval) clearInterval(window.flashTimerInterval);
    window.flashTimerInterval = setInterval(updateClock, 1000);
}
// Helper: Render Flash Items
function renderFlashItems(products) {
    // Randomize the products array
    const shuffledProducts = [...products].sort(() => Math.random() - 0.5);

    const container = document.getElementById('flashItemsContainer');
    const row = document.getElementById('flashRow');

    if(!container || !row) return;

    // Clear existing content
    row.innerHTML = '';

    // Create item HTML function
    const createItemHTML = (p) => {
        const disc = (p.original_price && p.original_price > p.price)
            ? Math.round(((p.original_price - p.price)/p.original_price)*100) : 0;
        return `
        <div class="pop-out-card bg-white p-3 rounded-lg shadow border border-orange-100 relative flex flex-col h-80 flex-shrink-0 w-48 md:w-56">
            <a href="product.html?id=${encodeURIComponent(p.id)}" class="block mb-3 relative aspect-[4/5] overflow-hidden rounded-lg flex items-center justify-center p-2 bg-white">
                <img src="${p.images?.[0] || p.image_url}" class="w-full h-full object-contain hover:scale-105 transition duration-300" loading="lazy" alt="${p.title}">
                ${disc ? `<span class="absolute top-0 right-0 bg-orange-500 text-white text-[20px] font-bold px-2 py-1 rounded">-${disc}%</span>` : ''}
            </a>
            <div class="flex-1 flex flex-col">
                <h3 class="text-sm font-bold text-gray-800 line-clamp-1 leading-tight mb-1 overflow-hidden text-ellipsis whitespace-nowrap">${p.title}</h3>
                <div class="mb-2">
                    ${p.original_price ? `<span class="text-xs text-gray-400 line-through mr-1">Ksh ${p.original_price}</span>` : ''}
                    <span class="text-base font-bold text-brand-orange">Ksh ${p.price}</span>
                </div>
                <div class="mt-auto flex flex-col gap-2">
                    <button onclick="addToCart('${p.id}')" class="w-full py-1.5 border border-gray-200 bg-white text-gray-800 text-xs font-bold rounded hover:bg-gray-50 hover:text-[#ea580c] transition">
                        ADD TO CART
                    </button>
                    <button onclick="buyNowSilent('${p.id}')" class="w-full py-1.5 bg-[#ea580c] text-white text-xs font-bold rounded text-center hover:bg-orange-700 transition">
                        BUY NOW
                    </button>
                </div>
            </div>
        </div>
        `;
    };

    // Add all shuffled products to the single row
    shuffledProducts.forEach(product => {
        row.innerHTML += createItemHTML(product);
    });
}

// Helper: Render Trending Items
function renderTrendingItems(products) {
    const container = document.getElementById('trendingItemsContainer');
    const row = document.getElementById('trendingRow');

    if(!container || !row) return;

    // Clear existing content
    row.innerHTML = '';

    // Create item HTML function
    const createItemHTML = (p) => {
        const disc = (p.original_price && p.original_price > p.price)
            ? Math.round(((p.original_price - p.price)/p.original_price)*100) : 0;
        return `
        <div class="pop-out-card bg-white p-3 rounded-lg shadow border border-red-100 relative flex flex-col h-80 flex-shrink-0 w-48 md:w-56">
            <a href="product.html?id=${encodeURIComponent(p.id)}" class="block mb-3 relative aspect-[4/5] overflow-hidden rounded-lg flex items-center justify-center p-2 bg-white">
                <img src="${p.images?.[0] || p.image_url}" class="w-full h-full object-contain hover:scale-105 transition duration-300" loading="lazy" alt="${p.title}">
                ${disc ? `<span class="absolute top-0 right-0 bg-red-500 text-white text-[20px] font-bold px-2 py-1 rounded">-${disc}%</span>` : ''}
            </a>
            <div class="flex-1 flex flex-col">
                <h3 class="text-sm font-bold text-gray-800 line-clamp-1 leading-tight mb-1 overflow-hidden text-ellipsis whitespace-nowrap">${p.title}</h3>
                <div class="mb-2">
                    ${p.original_price ? `<span class="text-xs text-gray-400 line-through mr-1">Ksh ${p.original_price}</span>` : ''}
                    <span class="text-base font-bold text-red-500">Ksh ${p.price}</span>
                </div>
                <div class="mt-auto flex flex-col gap-2">
                    <button onclick="addToCart('${p.id}')" class="w-full py-1.5 border border-gray-200 bg-white text-gray-800 text-xs font-bold rounded hover:bg-gray-50 hover:text-red-500 transition">
                        ADD TO CART
                    </button>
                    <button onclick="buyNowSilent('${p.id}')" class="w-full py-1.5 bg-red-500 text-white text-xs font-bold rounded text-center hover:bg-red-700 transition">
                        BUY NOW
                    </button>
                </div>
            </div>
        </div>
        `;
    };

    // Add products to the row (no shuffling for trending)
    products.forEach(product => {
        row.innerHTML += createItemHTML(product);
    });
}

// Helper: Simple Slider Reset
window.resetSlider = function() {
    const slides = document.querySelectorAll('.carousel-slide');
    let current = 0;
    if(window.sliderInterval) clearInterval(window.sliderInterval);
    window.sliderInterval = setInterval(() => {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
    }, 5000);
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

// ================= ANALYTICS TRACKING SYSTEM =================

// 1. Initialize or Update Session
async function initSession() {
    const now = new Date();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
    try {
        // If we don't have a session, or it's a local placeholder, create on server
        if (!currentSessionId || String(currentSessionId).startsWith('local-')) {
            const { data, error } = await client.from('site_sessions')
                .insert([{ device_type: isMobile }])
                .select()
                .single();

            if (error) {
                console.warn('initSession insert error', error);
                return;
            }
            if (data) {
                currentSessionId = data.session_id;
                localStorage.setItem('site_session_id', currentSessionId);
            }
            return;
        }

        // Otherwise, try to update the existing session's last active time.
        const { error } = await client.from('site_sessions')
            .update({ last_active_at: now })
            .eq('session_id', currentSessionId);

        // If update failed (bad session id), create a new server session and overwrite local
        if (error) {
            console.warn('initSession update failed, inserting new session:', error.message || error);
            const { data: newData, error: insertErr } = await client.from('site_sessions')
                .insert([{ device_type: isMobile }])
                .select()
                .single();
            if (!insertErr && newData) {
                currentSessionId = newData.session_id;
                localStorage.setItem('site_session_id', currentSessionId);
            }
        }
    } catch (e) {
        console.warn('initSession exception', e);
    }
}

// 2. Generic Event Logger
async function logEvent(type, metadata = {}, productId = null) {
    if (!currentSessionId) await initSession(); // Ensure session exists

    await client.from('analytics').insert([{
        session_id: currentSessionId,
        event_type: type,
        product_id: productId,
        metadata: metadata
    }]);
}

// ================= EXIT INTENT MODAL LOGIC =================

// State for exit intent
let exitModalShown = localStorage.getItem('exitModalShown') === 'true';
let exitIntentButtonClosed = localStorage.getItem('exitIntentButtonClosed') === 'true';
let scrollTimer = null;
let aiModalOpened = false;
let productClickedInAi = false;

// Function to show modal
function showExitModal() {
    const modal = document.getElementById('exitIntentModal');
    if (modal) modal.classList.remove('hidden');
}

// Function to show modal from triggers (only once)
function showExitModalFromTrigger() {
    if (exitModalShown) return;
    exitModalShown = true;
    localStorage.setItem('exitModalShown', 'true');
    showExitModal();
}

// Skip modal
function skipExitModal() {
    const modal = document.getElementById('exitIntentModal');
    if (modal) modal.classList.add('hidden');
    showExitIntentButton();
}

// Submit modal
async function submitExitModal() {
    const name = document.getElementById('exitFirstName').value.trim();
    const phone = document.getElementById('exitPhone').value.trim();

    if (!name || !phone) {
        alert("Please enter both First Name and Phone Number.");
        return;
    }

    try {
        await client.from('community').insert([{ name, phone }]);
        const modal = document.getElementById('exitIntentModal');
        if (modal) modal.classList.add('hidden');
        alert("Thank you! We'll contact you soon on WhatsApp.");
        // Reset modal shown flag so button shows again
        exitModalShown = false;
        localStorage.removeItem('exitModalShown');
        showExitIntentButton();
    } catch (err) {
        console.error("Error saving to community:", err);
        alert("Error saving. Please try again.");
    }
}

// Show exit intent button
function showExitIntentButton() {
    if (!exitIntentButtonClosed) {
        const btn = document.getElementById('exitIntentButton');
        if (btn) btn.classList.remove('hidden');
    }
}

// Close exit intent button
function closeExitIntentButton() {
    const btn = document.getElementById('exitIntentButton');
    if (btn) btn.classList.add('hidden');
    exitIntentButtonClosed = true;
    localStorage.setItem('exitIntentButtonClosed', 'true');
}

// Permanently dismiss the exit modal and the floating button
function dismissExitModalForever() {
    const modal = document.getElementById('exitIntentModal');
    if (modal) modal.classList.add('hidden');
    // Hide the floating button and persist the choice
    closeExitIntentButton();
    exitModalShown = true;
    localStorage.setItem('exitModalShown', 'true');
}
// On load, hide button if closed
if (exitIntentButtonClosed) {
    const btn = document.getElementById('exitIntentButton');
    if (btn) btn.classList.add('hidden');
}

// Scroll trigger: if scroll for 6 seconds
window.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
        showExitModalFromTrigger();
    }, 6000);
});

// Exit intent: mouse leave near top
document.addEventListener('mouseleave', (e) => {
    if (e.clientY < 50) {
        showExitModalFromTrigger();
    }
});

// AI search trigger: if open AI, get results, close without clicking product
// Modify injectAiUi to track
const originalInjectAiUi = injectAiUi;
injectAiUi = function() {
    originalInjectAiUi();
    // After inject, modify close button
    setTimeout(() => {
        const closeBtn = document.querySelector('#ai-search-modal button[onclick*="classList.add(\'hidden\')"]');
        if (closeBtn) {
            closeBtn.onclick = () => {
                const aiModal = document.getElementById('ai-search-modal');
                if (aiModal) aiModal.classList.add('hidden');
                if (aiModalOpened && !productClickedInAi) {
                    showExitModalFromTrigger();
                }
                aiModalOpened = false;
                productClickedInAi = false;
            };
        }
    }, 100);
};

// Track AI modal open
const originalHandleAiSearch = handleAiSearch;
handleAiSearch = async function(query) {
    aiModalOpened = true;
    productClickedInAi = false;
    await originalHandleAiSearch(query);
};

// Track product clicks in AI results
const originalCreateProductCard = createProductCard;
createProductCard = function(p, isHorizontal = false) {
    const card = originalCreateProductCard(p, isHorizontal);
    const link = card.querySelector('a');
    if (link) {
        link.addEventListener('click', () => {
            productClickedInAi = true;
        });
    }
    return card;
};
