// ================= CONFIGURATION =================

const supabaseUrl = 'https://ljxvxbjhkgoeygpyejkc.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHZ4Ympoa2dvZXlncHllamtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE3MzMsImV4cCI6MjA4MzE1NzczM30.fBrwtnv89UHgjs523rKCODE5W4nfBmDsP0AUQ8NgBlU';
const client = window.supabase.createClient(supabaseUrl, supabaseKey);

// ================= STATE =================
let allProducts = [];
let allFetchedOrders = [];
let currentUploadFiles = [];
let currentVariations = [];
const PIN_CODE = "1234"; // Default PIN

// ================= PRODUCT CACHE LOGIC =================
// Realtime subscription: keep admin product lists in sync without reloads
function setupRealtimeProducts() {
    try {
        // Use Supabase Realtime channel (v2).
        const channel = client.channel('public:products');
        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
            const ev = payload.eventType || payload.event || payload.type;
            const recNew = payload.new || payload.record || payload.new_record;
            const recOld = payload.old || payload.old_record;
            console.log('Realtime products event', ev, recNew || recOld);

            try {
                if (ev === 'INSERT') {
                    const p = Object.assign({}, recNew, { displayImage: (recNew.images && recNew.images.length) ? recNew.images[0] : (recNew.image_url || 'images/sharkim_gold_logo.png') });
                    allProducts.unshift(p);
                } else if (ev === 'UPDATE') {
                    const idx = allProducts.findIndex(x => String(x.id) === String(recNew.id));
                    if (idx !== -1) {
                        allProducts[idx] = Object.assign({}, allProducts[idx], recNew, { displayImage: (recNew.images && recNew.images.length) ? recNew.images[0] : (recNew.image_url || allProducts[idx].displayImage) });
                    } else {
                        const p = Object.assign({}, recNew, { displayImage: (recNew.images && recNew.images.length) ? recNew.images[0] : (recNew.image_url || 'images/sharkim_gold_logo.png') });
                        allProducts.unshift(p);
                    }
                } else if (ev === 'DELETE') {
                    const idToRemove = (recOld && recOld.id) || (recNew && recNew.id);
                    allProducts = allProducts.filter(x => String(x.id) !== String(idToRemove));
                }

                // Normalize and re-render
                allProducts = allProducts.sort((a, b) => a.id - b.id);
                renderProducts(allProducts);
                renderInventory(allProducts);
                updateStats(allProducts);
                populateCategories(allProducts);

                // Update cache (store lightweight metadata)
                try {
                    const cacheProducts = allProducts.map(p => ({ id: p.id, title: p.title, price: p.price, image_url: p.image_url || p.displayImage, main_category: p.main_category }));
                    localStorage.setItem('productCache', JSON.stringify(cacheProducts));
                } catch (e) { /* ignore storage errors */ }
            } catch (e) { console.warn('Realtime handler error', e); }
        }).subscribe();
    } catch (err) {
        console.warn('Realtime setup failed', err);
    }
}
function showGlobalLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideGlobalLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

async function loadProductsFromCache() {
    const cached = localStorage.getItem('productCache');
    if (cached) {
        const cachedProducts = JSON.parse(cached);
        // Reconstruct allProducts with image_url for lazy loading
        allProducts = cachedProducts.map(p => ({
            ...p,
            displayImage: p.image_url || 'images/sharkim_gold_logo.png',
            images: [],
            image_url: p.image_url
        }));
        // Ensure sorted by id
        allProducts = allProducts.sort((a, b) => a.id - b.id);
        renderProducts(allProducts);
        renderInventory(allProducts);
        updateStats(allProducts);
        populateCategories(allProducts);
        // Refresh lazy loader for new images
        if (window.lazyLoader && window.lazyLoader.refresh) window.lazyLoader.refresh();
    } else {
        showGlobalLoading();
        await fetchAllProducts();
        hideGlobalLoading();
    }
}

// ======= PERFORMANCE HELPERS =======
function debounce(fn, wait = 250) {
    let t;
    return function(...args){
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}



// ================= AUTHENTICATION (SECURE PHONE + PASS) =================
const ADMIN_DOMAIN = "@sharkim.com"; // Keep this secret suffix

document.addEventListener('DOMContentLoaded', async () => {
    // Check if a real Supabase session exists
    const { data: { session } } = await client.auth.getSession();
    
    if (session) {
        hideLoginOverlay();
        initDashboard();
    } else {
        showLoginOverlay();
    }
    
    // Bind the Login Button
    const loginBtn = document.getElementById('loginBtn');
    if(loginBtn) loginBtn.addEventListener('click', handleLogin);

    // Enter key support
    const passInput = document.getElementById('passwordInput');
    if(passInput) {
        passInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') handleLogin();
        });
    }
});

async function handleLogin() {
    const phone = document.getElementById('phoneInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const errorMsg = document.getElementById('loginError');

    if (!phone || !password) {
        showLoginError("Enter both phone and password.");
        return;
    }

    const email = phone + ADMIN_DOMAIN;

    const { data, error } = await client.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        showLoginError("Invalid credentials.");
        console.error("Auth error:", error.message);
    } else {
        window.location.reload(); // Refresh to start the dashboard
    }
}

function showLoginError(msg) {
    const errorMsg = document.getElementById('loginError');
    if(errorMsg) {
        errorMsg.textContent = msg;
        errorMsg.classList.remove('hidden');
        setTimeout(() => errorMsg.classList.add('hidden'), 3000);
    }
}

function showLoginOverlay() {
    const overlay = document.getElementById('loginOverlay');
    if(overlay) {
        overlay.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
    }
}

function hideLoginOverlay() {
    const overlay = document.getElementById('loginOverlay');
    if(overlay) {
        overlay.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => overlay.classList.add('hidden'), 500);
    }
}

window.logout = async function() {
    await client.auth.signOut();
    window.location.reload();
}
// ================= DASHBOARD INIT =================
async function initDashboard() {
    try {
        await loadProductsFromCache();
        await fetchAnalytics(); // Integrated from adminnew.js
    } finally {
    }
    setupEventListeners();
    loadSiteSettings();
    // Start realtime subscriptions so admin UI updates automatically
    try { setupRealtimeProducts(); } catch (e) { console.warn('Realtime setup failed:', e); }
}

async function fetchAllProducts() {
    allProducts = [];

    // SINGLE SOURCE: New 'products' table
    const { data, error } = await client
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("DB Error:", error);
        return;
    }

    // Normalize data (Prefer 'images' array over 'image_url')
    allProducts = (data || []).map(p => ({
        ...p,
        // Helper property for consistent rendering
        displayImage: (p.images && p.images.length > 0) ? p.images[0] : (p.image_url || 'images/sharkim_gold_logo.png')
    }));

    // Sort by id and cache metadata (include image_url for lazy loading)
    allProducts = allProducts.sort((a, b) => a.id - b.id);
    const cacheProducts = allProducts.map(p => ({
      id: p.id,
      title: p.title,
      price: p.price,
      image_url: p.image_url,
      main_category: p.main_category,
      original_price: p.original_price,
      stock_quantity: p.stock_quantity,
      track_inventory: p.track_inventory,
      auto_off: p.auto_off,
      brand: p.brand,
      subcategory: p.subcategory,
      description: p.description,
      features: p.features,
      variants: p.variants,
      created_at: p.created_at,
      updated_at: p.updated_at
    }));
    localStorage.setItem('productCache', JSON.stringify(cacheProducts));

    renderProducts(allProducts);
    renderInventory(allProducts);
    updateStats(allProducts);
    populateCategories(allProducts);
    showLoading(false);
}

// ================= RENDERING (Original Light Theme) =================

function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    if(!grid) return;
    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-gray-400 py-10">No products found.</div>';
        const slider = document.getElementById('alphaSlider'); if(slider) slider.classList.add('hidden');
        return;
    }

    // Sort alphabetically by title (case-insensitive)
    const sorted = products.slice().sort((a,b) => (''+ (a.title||'')).localeCompare(''+(b.title||''), undefined, {sensitivity:'base'}));

    // Group by first letter (A-Z) or '#'
    const groups = {};
    for(const p of sorted){
        const t = (p.title||'').trim();
        let ch = t.charAt(0).toUpperCase() || '#';
        if(!/^[A-Z]$/.test(ch)) ch = '#';
        if(!groups[ch]) groups[ch] = [];
        groups[ch].push(p);
    }

    const letters = Object.keys(groups).sort((a,b)=>{
        if(a === '#') return 1;
        if(b === '#') return -1;
        return a.localeCompare(b);
    });

    // Render batches
    let letterIdx = 0;
    function renderNextLetter(){
        if(letterIdx >= letters.length) {
            buildAlphabetSlider(letters);
            return;
        }
        const L = letters[letterIdx++];
        const section = document.createElement('div');
        const safeKey = L === '#' ? 'num' : L;
        section.id = `alpha-${safeKey}`;
        section.className = 'alpha-section col-span-full';
        section.innerHTML = `<h2 class="text-lg font-bold my-4 text-gray-700">${L}</h2><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-letter="${L}"></div>`;
        grid.appendChild(section);

        const container = section.querySelector('div');
        const items = groups[L];
        let i = 0;
        const page = 40;
        function batch(){
            const frag = document.createDocumentFragment();
            for(let k=0;k<page && i<items.length;k++,i++){
                const p = items[i];
                // Light Theme Card (From original admin.js)
                const card = document.createElement('div');
                card.className = "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition group relative flex flex-col";
                card.innerHTML = `
                    <div class="h-48 overflow-hidden bg-gray-50 relative">
                        <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" data-src="${p.displayImage}" class="w-full h-full object-contain p-4 group-hover:scale-105 transition duration-500">
                    </div>
                    <div class="p-4 flex-1 flex flex-col">
                        <h3 class="font-bold text-gray-800 line-clamp-1 mb-1" title="${(p.title||'').replace(/"/g,'&quot;')}">${p.title || ''}</h3>
                        <p class="text-xs text-gray-500 mb-3">${p.main_category || p.category || 'Uncategorized'}</p>
                        <div class="mt-auto flex justify-between items-center border-t border-gray-100 pt-3">
                            <span class="text-brand-orange font-bold text-orange-600">Ksh ${p.price || 0}</span>
                            <div class="flex gap-2">
                                <button onclick="editProduct('${p.id}')" class="text-gray-400 hover:text-orange-500 transition"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                                <button onclick="deleteProduct('${p.id}')" class="text-gray-400 hover:text-red-500 transition"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                            </div>
                        </div>
                    </div>
                `;
                frag.appendChild(card);
            }
            container.appendChild(frag);
            if(i < items.length) requestAnimationFrame(batch);
            else requestAnimationFrame(renderNextLetter);
        }
        requestAnimationFrame(batch);
    }
    requestAnimationFrame(renderNextLetter);
}

function buildAlphabetSlider(letters){
    const slider = document.getElementById('alphaSlider');
    if(!slider) return;
    // Always show A-Z and '#' (numbers) in the scroller.
    const present = new Set((letters || []).map(l => l === '#' ? '#' : l));
    const allLetters = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    allLetters.push('#');
    slider.innerHTML = '';

    allLetters.forEach(L => {
        const label = document.createElement('button');
        label.type = 'button';
        label.className = 'w-7 h-7 flex items-center justify-center rounded text-sm font-bold text-gray-700 hover:bg-gray-200 transition';
        label.textContent = L;
        const safeKey = L === '#' ? 'num' : L;

        // Dim letters that are not present
        if(!present.has(L)) {
            label.classList.add('opacity-40', 'cursor-default');
            // keep hover from changing background for disabled
            label.addEventListener('mouseenter', (e) => e.preventDefault());
        }

        label.addEventListener('click', () => {
            // If that letter has no section, try to find nearest available letter
            if(!present.has(L)){
                // find nearest forward, then backward
                let target = null;
                const order = allLetters;
                const idx = order.indexOf(L);
                for(let i=idx;i<order.length;i++){ if(present.has(order[i])) { target = order[i]; break; } }
                if(!target) for(let i=idx-1;i>=0;i--){ if(present.has(order[i])) { target = order[i]; break; } }
                if(!target) return;
                const el = document.getElementById(`alpha-${target === '#' ? 'num' : target}`);
                if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
            } else {
                const el = document.getElementById(`alpha-${safeKey}`);
                if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
            }
        });

        slider.appendChild(label);
    });
    slider.classList.remove('hidden');
}

function renderInventory(products) {
    const tbody = document.getElementById('inventoryTableBody');
    if(!tbody) return;
    const rows = [];
    for(const p of products){
        const isTracked = p.track_inventory === true;
        const stock = p.stock_quantity || 0;
        let status = '<span class="px-2 py-1 rounded text-xs bg-gray-100 text-gray-500">Untracked</span>';
        if (isTracked) {
            if (stock > 10) status = '<span class="px-2 py-1 rounded text-xs bg-green-100 text-green-700 font-bold">In Stock</span>';
            else if (stock > 0) status = '<span class="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700 font-bold">Low Stock</span>';
            else status = '<span class="px-2 py-1 rounded text-xs bg-red-100 text-red-700 font-bold">Out of Stock</span>';
        }
        rows.push(`
            <tr class="hover:bg-gray-50 transition border-b border-gray-100 last:border-0">
                <td class="px-6 py-4 font-medium text-gray-800">${p.title || ''}</td>
                <td class="px-6 py-4">${status}</td>
                <td class="px-6 py-4 font-mono">${isTracked ? stock : '-'}</td>
                <td class="px-6 py-4 text-center text-xs text-gray-500">${p.auto_off ? 'Yes' : 'No'}</td>
                <td class="px-6 py-4 text-right">
                    <button onclick="editProduct('${p.id}')" class="text-orange-600 hover:text-orange-800 text-sm font-bold">Manage</button>
                </td>
            </tr>
        `);
    }
    tbody.innerHTML = rows.join('');
}

function updateStats(products) {
    const elProd = document.getElementById('stat-products');
    if(elProd) elProd.innerText = products.length;
    
    const val = products.reduce((acc, curr) => {
        const qty = curr.stock_quantity || 0;
        const price = curr.price || 0;
        return acc + (curr.track_inventory ? (qty * price) : 0);
    }, 0);
    
    const elVal = document.getElementById('stat-value');
    if(elVal) elVal.innerText = val.toLocaleString();

    const low = products.filter(p => p.track_inventory && (p.stock_quantity || 0) < 5).length;
    const elLow = document.getElementById('stat-lowstock');
    if(elLow) elLow.innerText = low;
}

// ================= UI NAVIGATION =================
window.switchView = function(viewName) {
    // 1. Define the possible sections and their corresponding nav buttons
    // Mapping of view names to section IDs
    const viewMappings = {
        'analytics': 'analyticsSection',
        'products': 'inventorySection',
        'inventory': 'inventoryTableSection',
        'orders': 'ordersSection',
        'contacts': 'contactsSection',
        'settings': 'settingsSection'
    };

    const sectionIds = Object.values(viewMappings);
    const navIds = ['nav-analytics', 'nav-products', 'nav-orders', 'nav-inventory', 'nav-contacts', 'nav-settings'];

    // 2. Hide all sections and show the target one
    sectionIds.forEach(id => {
        const sectionEl = document.getElementById(id);
        if (sectionEl) {
            if (id === viewMappings[viewName]) {
                sectionEl.classList.remove('hidden');
                
                // Trigger data fetch for specific views
                if (viewName === 'orders') fetchAllOrders();
                if (viewName === 'products' || viewName === 'inventory') fetchAllProducts();
                if (viewName === 'analytics') fetchAnalytics();
                if (viewName === 'contacts') fetchContacts();
            } else {
                sectionEl.classList.add('hidden');
            }
        }
    });

    // 3. Update Sidebar Active States
    navIds.forEach(id => {
        const navEl = document.getElementById(id);
        if (navEl) {
            if (id === 'nav-' + viewName) {
                // Style for the Active Button
                navEl.classList.add('bg-gray-800', 'text-white', 'border-l-4', 'border-brand-orange');
                navEl.classList.remove('text-gray-400');
            } else {
                // Style for Inactive Buttons
                navEl.classList.remove('bg-gray-800', 'text-white', 'border-l-4', 'border-brand-orange');
                navEl.classList.add('text-gray-400');
            }
        }
    });

    // 4. Update Header Title
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
        // Formats view names to display titles
        const displayTitles = {
            'analytics': 'Business Analytics',
            'products': 'Products',
            'inventory': 'Inventory',
            'settings': 'Site Settings',
            'orders': 'Order Management',
            'contacts': 'Contacts Management'
        };
        titleEl.innerText = displayTitles[viewName] || (viewName.charAt(0).toUpperCase() + viewName.slice(1));
    }

    // Optional: Save view to local storage so it persists on refresh
    localStorage.setItem('admin_last_view', viewName);
}

function showLoading(bool) {
    const loader = document.getElementById('productsLoading');
    if(loader) bool ? loader.classList.remove('hidden') : loader.classList.add('hidden');
}
// ================= SEARCH & FILTER =================
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const catSelect = document.getElementById('filterCategory');
    const trackToggle = document.getElementById('inpTrackInventory');
    const inventorySearch = document.getElementById('inventorySearch');

    const runFilter = () => {
        const term = searchInput.value.toLowerCase();
        const cat = catSelect.value;
        
        let filtered = allProducts.filter(p => {
            const mTerm = (p.title||'').toLowerCase().includes(term);
            const mCat = cat ? (p.main_category === cat || p.category === cat) : true;
            return mTerm && mCat;
        });

        renderProducts(filtered);
    };

    const debouncedRun = debounce(runFilter, 200);
    if(searchInput) searchInput.addEventListener('input', debouncedRun);
    if(catSelect) catSelect.addEventListener('change', debouncedRun);
    if(trackToggle) trackToggle.addEventListener('change', toggleInventoryFields);
    // Inventory table keyword search: filters rows so Manage button is immediately visible
    if(inventorySearch) {
        const invRun = debounce(() => {
            const q = inventorySearch.value.trim().toLowerCase();
            if(!q) return renderInventory(allProducts);
            const results = allProducts.filter(p => {
                return (p.title || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q) || (p.main_category || '').toLowerCase().includes(q);
            });
            renderInventory(results);
        }, 150);
        inventorySearch.addEventListener('input', invRun);
    }
}

function populateCategories(products) {
    const sel = document.getElementById('filterCategory');
    if(!sel) return;

    const cats = new Set(products.map(p => p.main_category || p.category).filter(Boolean));
    try {
        if(window.MAIN_CATEGORIES && Array.isArray(window.MAIN_CATEGORIES)){
            window.MAIN_CATEGORIES.forEach(c => { if(c) cats.add(c); });
        }
    } catch(e) { /* ignore */ }

    const sorted = Array.from(cats).sort((a,b)=> String(a).localeCompare(b));
    const lowerSorted = sorted.map(s => s.trim()).filter(Boolean);
    const unique = Array.from(new Set(lowerSorted));
    const optionsHtml = [];
    optionsHtml.push('<option value="">All Categories</option>');
    unique.forEach(c => optionsHtml.push(`<option value="${c}">${c}</option>`));
    sel.innerHTML = optionsHtml.join('');
}

// ================= PRODUCT MODAL LOGIC =================

// Drag and Drop (requires SortableJS in HTML)
const sortList = document.getElementById('imageSortList');
if(sortList) {
    // Check if Sortable is loaded
    if(typeof Sortable !== 'undefined') new Sortable(sortList, { animation: 150 });
}

window.openProductModal = function() {
    const panel = document.getElementById('productModalPanel'); 
    const modal = document.getElementById('productModal');
    
    // Reset
    const form = document.getElementById('productForm');
    if(form) form.reset();
    document.getElementById('editProductId').value = '';
    const title = document.getElementById('modalTitle');
    if(title) title.textContent = 'Add New Product';
    
    document.getElementById('imageSortList').innerHTML = '';
    document.getElementById('featuresList').innerHTML = '';
    document.getElementById('variationsList').innerHTML = '';
    
    // Handle Variation Panel (ID diff check)
    const varPanel = document.getElementById('variationsPanel') || document.getElementById('variationsSection');
    if(varPanel) varPanel.classList.add('hidden');
    
    document.getElementById('inventoryDetails').classList.add('hidden');

    currentUploadFiles = [];
    currentVariations = [];
    addFeatureInput();
    populateModalCategoryOptions();

    // Show with Animation
    if(modal) modal.classList.remove('hidden');
    if(panel) setTimeout(() => panel.classList.remove('translate-x-full'), 10);
}

window.closeProductModal = function() {
    const panel = document.getElementById('productModalPanel');
    const modal = document.getElementById('productModal');
    if(panel) panel.classList.add('translate-x-full');
    setTimeout(() => {
        if(modal) modal.classList.add('hidden');
    }, 300);
}

window.editProduct = async function(id) {
    // Ensure products are loaded from local first
    if (!allProducts || allProducts.length === 0) {
        await loadProductsFromCache();
    }
    openProductModal();
    const p = allProducts.find(x => String(x.id) === String(id));
    if(!p) return;

    document.getElementById('modalTitle').textContent = 'Edit Product';
    document.getElementById('editProductId').value = p.id;

    // Fill Fields
    populateModalCategoryOptions();
    document.getElementById('inpTitle').value = p.title || '';
    document.getElementById('inpDesc').value = p.description || '';
    document.getElementById('inpPrice').value = p.price || '';
    document.getElementById('inpOriginalPrice').value = p.original_price || '';
    
    try {
        const cat = p.main_category || p.category || '';
        document.getElementById('inpCategory').value = cat;
        updateModalSubcategories(cat);
        document.getElementById('inpSubcategory').value = p.subcategory || '';
    } catch(e) {}
    document.getElementById('inpBrand').value = p.brand || '';
    
    // Inventory
    const trackBox = document.getElementById('inpTrackInventory');
    trackBox.checked = p.track_inventory || false;
    document.getElementById('inpStockQty').value = p.stock_quantity || 0;
    document.getElementById('inpAutoOff').checked = p.auto_off ?? true;
    
    if(p.track_inventory) {
        document.getElementById('inventoryDetails').classList.remove('hidden');
    }

    // Images
    const imgs = [];
    if(p.images && Array.isArray(p.images)) p.images.forEach(i => imgs.push(i));
    else if(p.image_url) imgs.push(p.image_url);
    
    imgs.forEach(url => addImageThumbnail(url));

    // Features
    try {
        const feats = typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || []);
        document.getElementById('featuresList').innerHTML = '';
        if(feats.length) feats.forEach(f => addFeatureInput(f));
        else addFeatureInput();
    } catch { addFeatureInput(); }

    // Variations
    try {
        currentVariations = typeof p.variants === 'string' ? JSON.parse(p.variants) : (p.variants || []);
        renderVariations();
        const varPanel = document.getElementById('variationsPanel') || document.getElementById('variationsSection');
        if(currentVariations.length && varPanel) varPanel.classList.remove('hidden');
    } catch {}
}

// Helpers
window.addFeatureInput = function(val = '') {
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center mb-2';
    // Matches Light Theme Input Style
    div.innerHTML = `
        <span class="text-orange-500 font-bold text-xl">•</span>
        <input type="text" value="${val}" class="inp-feature w-full bg-white border-b border-gray-300 focus:border-orange-500 focus:outline-none py-1 text-sm text-gray-700" placeholder="Feature detail...">
        <button type="button" onclick="this.parentElement.remove()" class="text-gray-400 hover:text-red-500">×</button>
    `;
    document.getElementById('featuresList').appendChild(div);
}

// Image Handling
const inpImagesEl = document.getElementById('inpImages');
if(inpImagesEl) {
    inpImagesEl.addEventListener('change', function(e) {
        Array.from(e.target.files).forEach(file => {
            currentUploadFiles.push(file);
            // Temporarily show local blob
            addImageThumbnail(URL.createObjectURL(file));
        });
    });
}

function addImageThumbnail(src) {
    const div = document.createElement('div');
    div.className = 'relative group cursor-move h-20 w-20 bg-gray-100 rounded border border-gray-300 overflow-hidden';
    div.innerHTML = `
        <img loading="lazy" src="${src}" class="w-full h-full object-cover">
        <button type="button" onclick="this.parentElement.remove()" class="absolute top-0 right-0 bg-red-600 text-white p-1 opacity-0 group-hover:opacity-100 transition text-xs">×</button>
    `;
    const dest = document.getElementById('imageSortList');
    if(dest) dest.appendChild(div);
}

// Variation Logic
window.addVariation = function() {
    // Supports both Select ID types from your different files (safe check)
    const typeSelect = document.getElementById('varType');
    const customType = document.getElementById('varCustomType');
    const type = (typeSelect && typeSelect.value === 'Custom' && customType) ? customType.value : (typeSelect ? typeSelect.value : 'Option');
    
    const valInput = document.getElementById('varValue');
    const val = valInput ? valInput.value : '';
    
    if(!val) return alert("Please enter a value");
    
    currentVariations.push({ type, value: val });
    renderVariations();
    if(valInput) valInput.value = '';
    
    const varPanel = document.getElementById('variationsPanel') || document.getElementById('variationsSection');
    if(varPanel) varPanel.classList.remove('hidden');
}

function renderVariations() {
    const list = document.getElementById('variationsList');
    if(!list) return;
    list.innerHTML = '';
    currentVariations.forEach((v, idx) => {
        const tag = document.createElement('span');
        tag.className = "bg-gray-100 border border-gray-300 text-gray-700 px-2 py-1 rounded text-xs flex items-center gap-2";
        tag.innerHTML = `${v.type}: ${v.value} <button onclick="removeVariation(${idx})" class="text-red-500 font-bold hover:text-red-700">×</button>`;
        list.appendChild(tag);
    });
}
window.removeVariation = (i) => { currentVariations.splice(i,1); renderVariations(); }

function toggleInventoryFields() {
    const chk = document.getElementById('inpTrackInventory');
    const details = document.getElementById('inventoryDetails');
    if(chk.checked) details.classList.remove('hidden');
    else details.classList.add('hidden');
}

// ================= SAVE & DELETE =================

window.handleSaveProduct = async function(event){
  try{
    const saveStatus = document.getElementById('saveStatus');
    if(saveStatus) saveStatus.textContent = 'Saving...';

    const titleEl = document.getElementById('inpTitle');
    const priceEl = document.getElementById('inpPrice');
    const originalEl = document.getElementById('inpOriginalPrice');
    const descEl = document.getElementById('inpDesc');
    const catEl = document.getElementById('inpCategory');
    const brandEl = document.getElementById('inpBrand');
    const featuresContainer = document.getElementById('featuresList');
    const variationsContainer = document.getElementById('variationsList');
    const trackEl = document.getElementById('inpTrackInventory');
    const stockEl = document.getElementById('inpStockQty');
    const autoOffEl = document.getElementById('inpAutoOff');

    // Basic validation
    const title = titleEl?.value?.trim() ?? '';
    if(!title){
      if(saveStatus) saveStatus.textContent = 'Product title required';
      return;
    }

    const price = parseFloat(priceEl?.value) || 0;
    const originalPrice = originalEl ? (parseFloat(originalEl.value) || null) : null;
    const desc = descEl?.value ?? '';
    const category = catEl?.value ?? '';
    const brand = brandEl?.value ?? '';
    const trackInventory = !!(trackEl && trackEl.checked);
    const stockQty = trackInventory ? (parseInt(stockEl?.value) || 0) : null;
    const autoOff = !!(autoOffEl && autoOffEl.checked);

    // Features
    const features = [];
    if(featuresContainer){
      featuresContainer.querySelectorAll('input, textarea').forEach(inp=>{
        const v = inp.value?.trim();
        if(v) features.push(v);
      });
    }

    // Variations (try to collect from DOM text or data attributes)
    const variations = [];
    if(variationsContainer){
      variationsContainer.querySelectorAll('[data-var-type]').forEach(node=>{
        variations.push({
          type: node.dataset.varType,
          value: node.dataset.varValue,
          priceDiff: parseFloat(node.dataset.varPrice) || 0
        });
      });
      // fallback: try reading simple text nodes
      if(variations.length === 0){
        variationsContainer.querySelectorAll('.variation, .chip').forEach(node=>{
          const txt = node.textContent?.trim();
          if(txt) variations.push({label: txt});
        });
      }
    }

    // Images: be defensive (file input may be null)
    const imagesInput = document.getElementById('inpImages');
    let images = [];
    if(imagesInput && imagesInput.files && imagesInput.files.length){
      images = Array.from(imagesInput.files);
    } else {
      // fallback: check any imgs in imageSortList (could be URLs)
      const imageSortList = document.getElementById('imageSortList');
      if(imageSortList){
        imageSortList.querySelectorAll('img').forEach(img=>{
          const src = img.getAttribute('src') || img.dataset.src || img.src;
          if(src) images.push(src);
        });
      }
    }

    const product = {
      title,
      price,
      originalPrice,
      description: desc,
      category,
      brand,
      features,
      variations,
      trackInventory,
      stockQty,
      autoOff,
      images
    };

    // If the project already has helper functions (uploadImages / saveProductToDB), use them.
    let uploadedImages = images;
    if(typeof uploadImages === 'function' && images.length){
      // uploadImages should accept File[] and return URLs or identifiers
      uploadedImages = await uploadImages(images);
    }

    if(typeof saveProductToDB === 'function'){
      await saveProductToDB({...product, images: uploadedImages});
    } else {
      // fallback: log to console so nothing throws
      console.log('Saving product (noop):', {...product, images: uploadedImages});
    }

    if(saveStatus) saveStatus.textContent = 'Saved';
    if(typeof closeProductModal === 'function') closeProductModal();
  }catch(err){
    console.error(err);
    const saveStatus = document.getElementById('saveStatus');
    if(saveStatus) saveStatus.textContent = 'Error saving product';
  }
}

window.deleteProduct = async function(id) {
    if(!confirm("Are you sure? This cannot be undone.")) return;
    
    const { error } = await client.from('products').delete().eq('id', id);
    if(error) alert("Error deleting: " + error.message);
    else fetchAllProducts();
}

// ================= CATEGORIES HELPERS
function updateModalSubcategories(main) {
    const sub = document.getElementById('inpSubcategory');
    if(!sub) return;
    let subs = [];
    try {
        if(window.getSubcategories) subs = window.getSubcategories(main) || [];
        else if(window.CATEGORIES && window.CATEGORIES[main]) subs = window.CATEGORIES[main].slice();
    } catch(e) { subs = []; }
    
    if(sub.tagName === 'SELECT') {
        sub.innerHTML = '<option value="">Select Subcategory</option>' + subs.map(s => `<option value="${s}">${s}</option>`).join('');
    }
}

function populateModalCategoryOptions() {
    const main = document.getElementById('inpCategory');
    if(!main) return;
    
    let mains = [];
    if(window.MAIN_CATEGORIES && Array.isArray(window.MAIN_CATEGORIES)) mains = window.MAIN_CATEGORIES.slice();
    else if(window.CATEGORIES) mains = Object.keys(window.CATEGORIES || {});

    mains = Array.from(new Set(mains)).sort((a,b)=> String(a).localeCompare(b));
    // If it's a select input, populate it
    if(main.tagName === 'SELECT') {
        main.innerHTML = '<option value="">Select Category</option>' + mains.map(c => `<option value="${c}">${c}</option>`).join('');
        main.onchange = function(){ updateModalSubcategories(this.value); };
        updateModalSubcategories(main.value);
    }
}
// ================= SITE SETTINGS LOGIC =================

let currentSettings = { banners: [], policies: {}, flash_sale: {} };
let flashSelectedIds = [];
let trendingSelectedIds = [];

async function loadSiteSettings() {
    const { data, error } = await client.from('site_settings').select('*').single();
    if (error) { console.error('Settings load error', error); return; }
    
    currentSettings = data;
    
    // 1. Populate Banners
    renderBannerInputs();

    // 2. Populate Policies
    document.getElementById('policyReturn').value = data.policies?.return || '';
    document.getElementById('policyShipping').value = data.policies?.shipping || '';
    document.getElementById('policyTerms').value = data.policies?.terms || '';

    // 3. Populate Flash Sale
    const flash = data.flash_sale || {};
    document.getElementById('flashEndTime').value = flash.end_time || '';
    document.getElementById('flashActive').checked = !!flash.active;
    flashSelectedIds = flash.product_ids || [];
    
    // 4. Populate Trending Products
    const trending = data.policies?.trending_products || {};
    document.getElementById('trendingActive').checked = !!trending.active;
    trendingSelectedIds = trending.product_ids || [];
    
    renderFlashProductLists();
    renderTrendingProductLists();
}

function renderBannerInputs() {
    const container = document.getElementById('bannersContainer');
    container.innerHTML = '';
    
    // Ensure 4 slots
    const banners = currentSettings.banners || [];
    for(let i=0; i<4; i++) {
        const b = banners[i] || { url: '', link: '' };
        container.innerHTML += `
            <div class="border p-4 rounded-lg bg-gray-50 relative">
                <span class="absolute top-2 left-2 bg-gray-800 text-white text-xs px-2 py-1 rounded">Banner ${i+1}</span>
                <div class="mt-6 space-y-3">
                    <div class="h-32 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center border border-dashed border-gray-400 relative">
                        ${b.url ? `<img src="${b.url}" class="w-full h-full object-cover">` : '<span class="text-gray-400 text-sm">No Image</span>'}
                        <input type="file" onchange="uploadBanner(this, ${i})" class="absolute inset-0 opacity-0 cursor-pointer" accept="image/*">
                    </div>
                    <input type="text" placeholder="Link URL (Optional)" value="${b.link || ''}" id="bannerLink_${i}" class="w-full text-sm p-2 border rounded">
                </div>
            </div>
        `;
    }
}

async function uploadBanner(input, index) {
    const file = input.files[0];
    if(!file) return;

    const fileName = `banner_${index}_${Date.now()}.${file.name.split('.').pop()}`;
    const { data, error } = await client.storage.from('site-images').upload(fileName, file);

    if(error) {
        alert("Upload failed: " + error.message);
    } else {
        const { data: { publicUrl } } = client.storage.from('site-images').getPublicUrl(fileName);
        // Update local state
        if(!currentSettings.banners) currentSettings.banners = [];
        if(!currentSettings.banners[index]) currentSettings.banners[index] = {};
        currentSettings.banners[index].url = publicUrl;

        renderBannerInputs(); // Re-render to show image
    }
}

// Flash Sale Selection Logic
function renderFlashProductLists() {
    const sourceList = document.getElementById('flashSourceList');
    const selectedList = document.getElementById('flashSelectedList');
    const search = document.getElementById('flashSearch').value.toLowerCase();

    sourceList.innerHTML = '';
    selectedList.innerHTML = '';

    // Filter products excluding already selected ones
    const available = allProducts.filter(p => !flashSelectedIds.includes(p.id) && (p.title.toLowerCase().includes(search))).sort((a,b) => a.title.localeCompare(b.title));

    available.forEach(p => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between p-2 hover:bg-white border-b border-gray-100 text-sm cursor-pointer";
        div.innerHTML = `<span class="truncate w-4/5">${p.title}</span> <span class="text-green-600 font-bold">+</span>`;
        div.onclick = () => { flashSelectedIds.push(p.id); renderFlashProductLists(); };
        sourceList.appendChild(div);
    });

    flashSelectedIds.forEach(id => {
        const p = allProducts.find(x => x.id === id);
        if(!p) return;
        const div = document.createElement('div');
        div.className = "flex items-center justify-between p-2 bg-white border-b border-orange-100 text-sm";
        div.innerHTML = `<span class="truncate w-4/5 font-medium">${p.title}</span> <span class="text-red-500 cursor-pointer font-bold" onclick="removeFlashItem('${id}')">×</span>`;
        selectedList.appendChild(div);
    });
}

window.removeFlashItem = function(id) {
    flashSelectedIds = flashSelectedIds.filter(x => x != id); // loose comparison for string/int safety
    renderFlashProductLists();
}

window.filterFlashProducts = function() { renderFlashProductLists(); }

// Trending Products Selection Logic
function renderTrendingProductLists() {
    const sourceList = document.getElementById('trendingSourceList');
    const selectedList = document.getElementById('trendingSelectedList');
    const search = document.getElementById('trendingSearch').value.toLowerCase();

    sourceList.innerHTML = '';
    selectedList.innerHTML = '';

    // Filter products excluding already selected ones
    const available = allProducts.filter(p => !trendingSelectedIds.includes(p.id) && (p.title.toLowerCase().includes(search))).sort((a,b) => a.title.localeCompare(b.title));

    available.forEach(p => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between p-2 hover:bg-white border-b border-gray-100 text-sm cursor-pointer";
        div.innerHTML = `<span class="truncate w-4/5">${p.title}</span> <span class="text-green-600 font-bold">+</span>`;
        div.onclick = () => { trendingSelectedIds.push(p.id); renderTrendingProductLists(); };
        sourceList.appendChild(div);
    });

    trendingSelectedIds.forEach(id => {
        const p = allProducts.find(x => x.id === id);
        if(!p) return;
        const div = document.createElement('div');
        div.className = "flex items-center justify-between p-2 bg-white border-b border-red-100 text-sm";
        div.innerHTML = `<span class="truncate w-4/5 font-medium">${p.title}</span> <span class="text-red-500 cursor-pointer font-bold" onclick="removeTrendingItem('${id}')">×</span>`;
        selectedList.appendChild(div);
    });
}

window.removeTrendingItem = function(id) {
    trendingSelectedIds = trendingSelectedIds.filter(x => x != id); // loose comparison for string/int safety
    renderTrendingProductLists();
}

window.filterTrendingProducts = function() { renderTrendingProductLists(); }

// Helper to convert plain text from admin into the styled HTML your site uses
function formatPolicyToHTML(text) {
    if (!text) return "";
    
    // Split text into sections based on double newlines
    const sections = text.split(/\n\n/);
    
    return sections.map((section, index) => {
        const lines = section.trim().split('\n');
        
        // If the first line is short (like a heading), style it as an H3
        if (lines.length > 1 && lines[0].length < 60) {
            const title = lines.shift(); // Remove the first line to use as title
            const body = lines.join(' '); // Join the rest as the paragraph
            return `
                <h3 class="text-xl font-bold text-gray-800 mt-6 mb-2">${index + 1}. ${title}</h3>
                <p class="mb-4">${body}</p>
            `.trim();
        }
        
        // Otherwise, just wrap the whole thing in a paragraph tag
        return `<p class="mb-4">${section.trim()}</p>`;
    }).join('\n');
}

// Save All Settings
window.saveSiteSettings = async function() {
    const btn = document.querySelector('#settingsSection button');
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    
    // 1. Collect Banners
    const finalBanners = [];
    for(let i=0; i<4; i++) {
        const link = document.getElementById(`bannerLink_${i}`).value;
        const existing = (currentSettings.banners && currentSettings.banners[i]) ? currentSettings.banners[i] : {};
        finalBanners.push({ url: existing.url || '', link });
    }

    // 2. Collect & Format Policies (Plain text converted to HTML)
    const formattedPolicies = {
        return: formatPolicyToHTML(document.getElementById('policyReturn').value),
        shipping: formatPolicyToHTML(document.getElementById('policyShipping').value),
        terms: formatPolicyToHTML(document.getElementById('policyTerms').value)
    };

    // 3. Prepare Update Data
    const updateData = {
        banners: finalBanners,
        policies: {
            ...formattedPolicies,
            trending_products: {
                active: document.getElementById('trendingActive').checked,
                product_ids: trendingSelectedIds
            }
        },
        flash_sale: {
            active: document.getElementById('flashActive').checked,
            end_time: document.getElementById('flashEndTime').value,
            product_ids: flashSelectedIds
        }
    };

    // 4. Update Supabase
    const { error } = await client.from('site_settings').update(updateData).eq('id', 1);

    if(error) {
        alert("Error saving settings: " + error.message);
    } else {
        alert("Settings updated successfully!");
        currentSettings = { ...currentSettings, ...updateData };
    }
    
    btn.innerText = originalText;
}
// ================= ORDERS LOGIC =================

async function fetchAllOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if(!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center">Loading...</td></tr>';

    // Fetch orders, newest first
    const { data, error } = await client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if(error) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-red-500">Error: ${error.message}</td></tr>`;
        return;
    }

    if(!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">No orders found yet.</td></tr>';
        return;
    }

    allFetchedOrders = data;

    renderOrders(data);
}

// Helper to render orders (Required by fetchAllOrders)
function renderOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">No orders found yet.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(o => `
        <tr class="hover:bg-gray-50 transition">
            <td class="p-4 font-bold text-brand-orange">${o.order_number || '#' + o.id.slice(0,8)}</td>
            <td class="p-4">
                <div onclick="viewCustomer('${o.id}')" class="cursor-pointer">
                    <div class="font-bold text-gray-800">${o.customer_name || 'Guest'}</div>
                    <div class="text-xs text-gray-500">${o.customer_phone}</div>
                </div>
            </td>
            <td class="p-4 font-bold text-brand-orange">
                Ksh ${o.total_amount}
            </td>
            <td class="p-4 hidden md:table-cell">
                <span class="px-2 py-1 rounded text-xs font-bold ${o.payment_method === 'WhatsApp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}">
                    ${o.payment_method}
                </span>
            </td>
            <td class="p-4 text-xs text-gray-500 hidden lg:table-cell">
                ${new Date(o.created_at).toLocaleDateString()} <br>
                ${new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </td>
            <td class="p-4">
                <select onchange="updateOrderStatus('${o.id}', this.value)" class="text-xs border rounded p-1 ${getStatusColor(o.status)}">
                    <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Completed" ${o.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td class="p-4">
                <button onclick="viewOrderDetails('${o.id}')" class="bg-gray-800 text-white px-3 py-1 rounded-lg text-xs">Order Details</button>
            </td>
        </tr>
    `).join('');
}

window.updateOrderStatus = async function(id, newStatus) {
    const { error } = await client.from('orders').update({ status: newStatus }).eq('id', id);
    if(error) alert("Failed to update status: " + error.message);
    else fetchAllOrders(); // Refresh to see color change
}

// Helpers
function getStatusColor(status) {
    if(status === 'Completed') return 'text-green-600 bg-green-50 border-green-200';
    if(status === 'Cancelled') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
}

function formatOrderItems(items) {
    if(!items) return "No items";
    // Returns a string formatted for the alert box
    return items.map(i => `${i.qty}x ${i.title} (@ ${i.price})`).join('\n');
}

// ================= ANALYTICS LOGIC =================

async function fetchAnalytics() {
    // 1. Basic Counts (Existing Tables)
    // Use already fetched allProducts for product count to reduce load time
    const productCount = allProducts.length;
    const { count: orderCount } = await client.from('orders').select('*', { count: 'exact', head: true });
    const { count: customerCount } = await client.from('customers').select('*', { count: 'exact', head: true });

    if (document.getElementById('ana-products')) document.getElementById('ana-products').innerText = productCount || 0;
    if (document.getElementById('ana-orders')) document.getElementById('ana-orders').innerText = orderCount || 0;
    if (document.getElementById('ana-customers')) document.getElementById('ana-customers').innerText = customerCount || 0;

    // 2. Fetch Events Data for Funnel
    const { data: events } = await client
        .from('analytics')
        .select('event_type, metadata');

    if (events) {
        const cartAdds = events.filter(e => e.event_type === 'add_to_cart').length;
        const waClicks = events.filter(e => e.event_type === 'whatsapp_click').length;
        const payClicks = events.filter(e => e.event_type === 'payment_click').length;
        
        let abandoned = cartAdds - (orderCount || 0);
        if (abandoned < 0) abandoned = 0;

        if (document.getElementById('ana-cart-adds')) document.getElementById('ana-cart-adds').innerText = cartAdds;
        if (document.getElementById('ana-abandoned')) document.getElementById('ana-abandoned').innerText = abandoned;
        if (document.getElementById('ana-wa-clicks')) document.getElementById('ana-wa-clicks').innerText = waClicks;
        if (document.getElementById('ana-pay-clicks')) document.getElementById('ana-pay-clicks').innerText = payClicks;

        // Most Browsed Categories
        const catViews = events.filter(e => e.event_type === 'view_category');
        const catCounts = {}; // Defined clearly within the scope
        catViews.forEach(e => {
            const cat = e.metadata?.category || 'Unknown';
            catCounts[cat] = (catCounts[cat] || 0) + 1;
        });

        // Sort and Render Top 5 Categories
        const sortedCats = Object.entries(catCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);
        const catContainer = document.getElementById('ana-categories-list');
        
        if (catContainer) {
            if (sortedCats.length === 0) {
                catContainer.innerHTML = '<div class="text-sm text-gray-400 text-center py-4">No category data yet.</div>';
            } else {
                catContainer.innerHTML = sortedCats.map(([name, count], index) => `
                    <div class="flex items-center justify-between border-b border-gray-50 pb-2">
                        <div class="flex items-center gap-3">
                            <span class="text-xs font-bold text-gray-400">0${index+1}</span>
                            <span class="text-sm font-medium text-gray-700">${name}</span>
                        </div>
                        <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">${count} views</span>
                    </div>
                `).join('');
            }
        }
    }

    // 3. Fetch Session Data for Time
    const { data: sessions } = await client.from('site_sessions').select('created_at, last_active_at');
    const sessionEl = document.getElementById('ana-session');
    
    if (sessions && sessions.length > 0 && sessionEl) {
        let totalDurationMs = 0;
        sessions.forEach(s => {
            const start = new Date(s.created_at);
            const end = new Date(s.last_active_at);
            // Ensure end time is greater than start time to avoid negative numbers
            if (end > start) {
                totalDurationMs += (end - start);
            }
        });
        
        const avgMs = totalDurationMs / sessions.length;
        const avgMin = Math.round(avgMs / 60000); // Convert to minutes
        sessionEl.innerText = (avgMin || 0) + "m";
    } else if (sessionEl) {
        sessionEl.innerText = "0m";
    }
}

async function viewCustomer(id) {
    const order = allFetchedOrders.find(o => o.id == id);
    if (!order) return;

    const content = document.getElementById('customerModalContent');
    content.innerHTML = `
        <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-xs uppercase text-gray-400 font-bold">Name</p>
            <p class="font-bold text-lg">${order.customer_name}</p>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-xs uppercase text-gray-400 font-bold">Phone</p>
            <p class="font-mono">${order.customer_phone}</p>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-xs uppercase text-gray-400 font-bold">Email</p>
            <p>${order.customer_email || 'N/A'}</p>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-xs uppercase text-gray-400 font-bold">Country</p>
            <p>${order.customer_country || 'N/A'}</p>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-xs uppercase text-gray-400 font-bold">City</p>
            <p>${order.customer_city || 'N/A'}</p>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-xs uppercase text-gray-400 font-bold">Estate/Area</p>
            <p>${order.customer_estate || 'N/A'}</p>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-xs uppercase text-gray-400 font-bold">Location</p>
            <p>${order.delivery_location}</p>
        </div>
    `;
    document.getElementById('customerModal').classList.remove('hidden');
}

async function viewOrderDetails(id) {
    const order = allFetchedOrders.find(o => o.id == id);
    if (!order) return;

    const content = document.getElementById('itemsModalContent');
    
    // Parse items if it's a JSON string, otherwise use directly
    let items = order.items;
    if (typeof items === 'string') {
        try {
            items = JSON.parse(items);
        } catch (e) {
            console.error('Failed to parse items:', e);
            items = [];
        }
    }
    
    // Calculate subtotal
    const subtotal = Array.isArray(items) ? items.reduce((sum, item) => sum + ((item.qty || 1) * (item.price || 0)), 0) : 0;
    const shippingCost = order.shipping_cost || 0;
    const totalAmount = order.total_amount || 0;
    
    if (!Array.isArray(items) || items.length === 0) {
        content.innerHTML = '<p class="text-gray-500">No items in this order.</p>';
    } else {
        content.innerHTML = `
            <div class="space-y-4">
                <!-- Customer Information -->
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-bold text-gray-800 mb-3">Customer Information</h4>
                    <div class="grid grid-cols-1 gap-2 text-sm">
                        <div><span class="font-medium">Name:</span> ${order.customer_name || 'N/A'}</div>
                        <div><span class="font-medium">Phone:</span> ${order.customer_phone || 'N/A'}</div>
                        <div><span class="font-medium">Email:</span> ${order.customer_email || 'N/A'}</div>
                        <div><span class="font-medium">Address:</span> ${order.delivery_location || 'N/A'}</div>
                    </div>
                </div>
                
                <!-- Order Items -->
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-bold text-gray-800 mb-3">Order Items</h4>
                    <div class="space-y-3">
                        ${items.map(item => `
                            <div class="flex items-center gap-4 border-b pb-3 last:border-b-0">
                                <div class="h-12 w-12 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center">📦</div>
                                <div class="flex-1">
                                    <p class="font-bold text-sm text-gray-800">${item.title || item.name || 'Unknown Product'}</p>
                                    <p class="text-xs text-gray-500">Qty: ${item.qty || 1} × Ksh ${item.price || 0}</p>
                                </div>
                                <div class="text-sm font-bold">Ksh ${((item.qty || 1) * (item.price || 0)).toLocaleString()}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Order Summary -->
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-bold text-gray-800 mb-3">Order Summary</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span>Subtotal:</span>
                            <span>Ksh ${subtotal.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Shipping (${order.shipping_method || 'Standard'}):</span>
                            <span>Ksh ${shippingCost.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between font-bold text-lg border-t pt-2">
                            <span>Total:</span>
                            <span class="text-brand-orange">Ksh ${totalAmount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    document.getElementById('itemsModal').classList.remove('hidden');
}

window.closeOrderModals = function() {
    document.getElementById('customerModal').classList.add('hidden');
    document.getElementById('itemsModal').classList.add('hidden');
}

// ================= CONTACTS MANAGEMENT =================
async function fetchContacts() {
    try {
        // Fetch customers
        const { data: customers, error: custError } = await client
            .from('customers')
            .select('id, name, location')
            .order('last_order_at', { ascending: false });

        if (custError) throw custError;

        // Fetch community
        const { data: community, error: commError } = await client
            .from('community')
            .select('name')
            .order('id', { ascending: false });

        if (commError) throw commError;

        // Get emails from orders table for customers
        const customerEmails = {};
        if (customers && customers.length > 0) {
            const customerIds = customers.map(c => c.id);
            const { data: orders, error: ordersError } = await client
                .from('orders')
                .select('customer_id, customer_email')
                .in('customer_id', customerIds)
                .order('created_at', { ascending: false });

            if (!ordersError && orders) {
                // Get the most recent email for each customer
                orders.forEach(order => {
                    if (order.customer_id && order.customer_email && !customerEmails[order.customer_id]) {
                        customerEmails[order.customer_id] = order.customer_email;
                    }
                });
            }
        }

        // Process customers
        const customerContacts = (customers || []).map(cust => {
            const nameParts = (cust.name || '').trim().split(' ');
            return {
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                email: customerEmails[cust.id] || '',
                location: cust.location || '',
                type: 'customer'
            };
        });

        // Process community
        const communityContacts = (community || []).map(comm => {
            const nameParts = (comm.name || '').trim().split(' ');
            return {
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                email: '',
                location: '',
                type: 'community'
            };
        });

        // Combine and sort (customers first, then community)
        const allContacts = [...customerContacts, ...communityContacts];
        
        // Store globally for modal access
        allContactsData = allContacts;

        // Render the table
        renderContactsTable(allContacts);

    } catch (error) {
        console.error('Error fetching contacts:', error);
        document.getElementById('contactsTableBody').innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-red-500">
                    Error loading contacts: ${error.message}
                </td>
            </tr>
        `;
    }
}

function renderContactsTable(contacts) {
    const tbody = document.getElementById('contactsTableBody');
    
    if (!contacts || contacts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    No contacts found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = contacts.map((contact, index) => `
        <tr class="bg-white border-b hover:bg-gray-50 cursor-pointer transition-colors" onclick="openContactModal(${index})">
            <td class="px-6 py-4 font-medium text-gray-900">${contact.firstName}</td>
            <td class="px-6 py-4 text-gray-700">${contact.lastName}</td>
            <td class="px-6 py-4 text-gray-700">${contact.email || '-'}</td>
            <td class="px-6 py-4 text-gray-700">${contact.location || '-'}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${
                    contact.type === 'customer' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                }">
                    ${contact.type}
                </span>
            </td>
        </tr>
    `).join('');
}

// Store contacts globally for modal access
let allContactsData = [];

function openContactModal(index) {
    const contact = allContactsData[index];
    if (!contact) return;

    const modalContent = document.getElementById('contactModalContent');
    modalContent.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <span class="text-lg font-bold text-gray-600">${contact.firstName.charAt(0)}${contact.lastName.charAt(0) || ''}</span>
                </div>
                <div>
                    <h4 class="text-lg font-bold text-gray-800">${contact.firstName} ${contact.lastName}</h4>
                    <span class="inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        contact.type === 'customer' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                    }">
                        ${contact.type === 'customer' ? 'Customer' : 'Community Member'}
                    </span>
                </div>
            </div>
            
            ${contact.email ? `
                <div class="border-t pt-3">
                    <label class="block text-sm font-medium text-gray-600 mb-1">Email</label>
                    <p class="text-gray-800 break-words">${contact.email}</p>
                </div>
            ` : ''}
            
            ${contact.location ? `
                <div class="border-t pt-3">
                    <label class="block text-sm font-medium text-gray-600 mb-1">Location</label>
                    <p class="text-gray-800">${contact.location}</p>
                </div>
            ` : ''}
            
            ${contact.type === 'customer' ? `
                <div class="border-t pt-3">
                    <p class="text-sm text-gray-600">This contact has made purchases and is a registered customer.</p>
                </div>
            ` : `
                <div class="border-t pt-3">
                    <p class="text-sm text-gray-600">This contact wants to join the WhatsApp community for exclusive discounts.</p>
                </div>
            `}
        </div>
    `;

    document.getElementById('contactModal').classList.remove('hidden');
}

function closeContactModal() {
    document.getElementById('contactModal').classList.add('hidden');
}
