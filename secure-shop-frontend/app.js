// Render üçün nisbi URL, local üçün 5000 portu
const API_URL = (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : '/api';

// OWASP A03: Cross-Site Scripting (XSS) Təmizləmə Funksiyası
function sanitizeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Etibarlı və bloklanmayan yerli/lokal SVG placeholder şəkilləri
const PRODUCT_IMAGES = {
    'Noutbuk Dell XPS 15': 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=400&q=80',
    'Simsiz Qulaqlıq Sony WH-1000XM5': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
    'Mexaniki Klaviatura Keychron K2': 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=400&q=80',
    'Barkod Skaner Honeywell 1D/2D': 'https://images.unsplash.com/photo-1556742049-0a67e0a29ef3?auto=format&fit=crop&w=400&q=80',
    'Termal Çek Çap Edici (80mm)': 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=400&q=80',
    'Təhlükəsizlik Kamerası Hikvision 4K': 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=400&q=80'
};
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=400&q=80';

const ROLES = {
    1: { name: 'Admin (Level 1)', color: 'bg-rose-500/20 text-rose-400 border border-rose-500/30', desc: 'Sistem Administrasiyası: Stok dəyişmə və AES-256 Kriptoqrafik Log' },
    2: { name: 'Manager (Level 2)', color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', desc: 'Menecer: Məhsul və hesabatlara baxış yetkisi' },
    3: { name: 'Operator (Level 3)', color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', desc: 'Operator / Kassir: Satış icra etmə yetkisi (Stok azaldılır)' },
    4: { name: 'Viewer (Level 4)', color: 'bg-sky-500/20 text-sky-400 border border-sky-500/30', desc: 'Müşahidəçi: Yalnız baxış hüququ' }
};

let publicProducts = [];
let cart = [];

// FUNKSİYALARI GLOBALA EXPORT EDİRİK (HTML ONCLICK İŞLƏSİN DEYƏ)
window.updateAuthHeader = updateAuthHeader;
window.loadPublicProducts = loadPublicProducts;
window.addToCart = addToCart;
window.toggleCartModal = toggleCartModal;
window.removeFromCart = removeFromCart;
window.checkoutCart = checkoutCart;
window.showStorefront = showStorefront;
window.showLoginSection = showLoginSection;
window.showDashboardSection = showDashboardSection;
window.logout = logout;
window.updateStockInDB = updateStockInDB;
window.makeSaleInDB = makeSaleInDB;
window.filterPublicProducts = filterPublicProducts;

document.addEventListener('DOMContentLoaded', () => {
    updateAuthHeader();
    loadPublicProducts();
    setupLoginForm();
});

function updateAuthHeader() {
    const token = localStorage.getItem('jwt_token');
    const authContainer = document.getElementById('auth-buttons');
    if (!authContainer) return;
    
    if (token) {
        authContainer.innerHTML = `
            <button onclick="window.showDashboardSection()" class="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all mr-2">
                <i class="fa-solid fa-gauge mr-1"></i> ERP Panel
            </button>
            <button onclick="window.logout()" class="bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs transition-all border border-slate-700">
                <i class="fa-solid fa-power-off"></i>
            </button>
        `;
    } else {
        authContainer.innerHTML = `
            <button onclick="window.showLoginSection()" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all">
                <i class="fa-solid fa-user-lock mr-1"></i> İşçi Girişi
            </button>
        `;
    }
}

async function loadPublicProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        if (response.ok) {
            publicProducts = await response.json();
            renderPublicProducts(publicProducts);
        }
    } catch (err) {
        console.error("Məhsul yüklənmə xətası:", err);
    }
}

function renderPublicProducts(products) {
    const grid = document.getElementById('public-products-grid');
    if (!grid) return;
    grid.innerHTML = '';

    products.forEach(p => {
        const id = p.product_id;
        const name = sanitizeHTML(p.product_name);
        const price = parseFloat(p.price).toFixed(2);
        const stock = parseInt(p.stock_quantity);
        const imgUrl = PRODUCT_IMAGES[p.product_name] || DEFAULT_IMAGE;

        const card = document.createElement('div');
        card.className = 'product-card-item';
        card.innerHTML = `
            <div>
                <div class="product-img-wrapper">
                    <img src="${imgUrl}" alt="${name}" onerror="this.src='https://via.placeholder.com/400x300/1e293b/818cf8?text=${encodeURIComponent(name)}'">
                    <span class="stock-badge">Stok: ${stock}</span>
                </div>
                <div class="product-info">
                    <h3>${name}</h3>
                    <p class="price-tag">${price} AZN</p>
                </div>
            </div>
            <div style="padding: 0 16px 16px 16px;">
                <button onclick="window.addToCart(${id}, '${name.replace(/'/g, "\\'")}', ${price})" class="btn-cart-add">
                    <i class="fa-solid fa-cart-plus mr-1"></i> Səbətə Əlavə Et
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function addToCart(id, name, price) {
    cart.push({ id, name, price: parseFloat(price) });
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) cartCountEl.textContent = cart.length;
    alert(`"${name}" səbətə əlavə olundu!`);
}

function toggleCartModal() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
        renderCartItems();
    }
}

function renderCartItems() {
    const container = document.getElementById('cart-items');
    if (!container) return;
    container.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        total += item.price;
        const div = document.createElement('div');
        div.className = 'cart-item-row';
        div.innerHTML = `
            <span>${sanitizeHTML(item.name)}</span>
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="color: #818cf8; font-family: monospace;">${item.price.toFixed(2)} AZN</span>
                <button onclick="window.removeFromCart(${index})" style="color: #f43f5e; background: none; border: none; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        container.appendChild(div);
    });

    const totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.textContent = total.toFixed(2) + ' AZN';
}

function removeFromCart(index) {
    cart.splice(index, 1);
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) cartCountEl.textContent = cart.length;
    renderCartItems();
}

async function checkoutCart() {
    if (cart.length === 0) return alert("Səbətiniz boşdur!");

    try {
        for (const item of cart) {
            await fetch(`${API_URL}/sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: item.id, quantity: 1 })
            });
        }

        alert("Sifarişiniz uğurla tamamlandı və Supabase bazasındakı stok yeniləndi!");
        cart = [];
        const cartCountEl = document.getElementById('cart-count');
        if (cartCountEl) cartCountEl.textContent = '0';
        toggleCartModal();
        await loadPublicProducts();
    } catch (err) {
        console.error("Checkout Error:", err);
        alert("Sifariş zamanı xəta baş verdi.");
    }
}

function showStorefront() {
    document.getElementById('storefront-section')?.classList.remove('hidden');
    document.getElementById('login-section')?.classList.add('hidden');
    document.getElementById('dashboard-section')?.classList.add('hidden');
}

function showLoginSection() {
    document.getElementById('storefront-section')?.classList.add('hidden');
    document.getElementById('login-section')?.classList.remove('hidden');
    document.getElementById('dashboard-section')?.classList.add('hidden');
}

function showDashboardSection() {
    document.getElementById('storefront-section')?.classList.add('hidden');
    document.getElementById('login-section')?.classList.add('hidden');
    document.getElementById('dashboard-section')?.classList.remove('hidden');
    showDashboardERP();
}

function logout() {
    localStorage.clear();
    updateAuthHeader();
    showStorefront();
}

function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const errorDiv = document.getElementById('login-error');

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('jwt_token', data.token);
                localStorage.setItem('user', JSON.stringify({ username: data.username, access_level: data.access_level }));
                updateAuthHeader();
                showDashboardSection();
            } else {
                errorDiv.textContent = sanitizeHTML(data.message || 'Giriş xətası');
                errorDiv.classList.remove('hidden');
            }
        } catch (err) {
            errorDiv.textContent = 'Serverlə əlaqə qurulmadı.';
            errorDiv.classList.remove('hidden');
        }
    });
}

async function showDashboardERP() {
    const user = JSON.parse(localStorage.getItem('user')) || { username: 'İşçi', access_level: 4 };
    const roleInfo = ROLES[user.access_level] || ROLES[4];

    document.getElementById('user-display').textContent = sanitizeHTML(user.username);
    document.getElementById('role-permissions-desc').textContent = sanitizeHTML(roleInfo.desc);
    
    const badge = document.getElementById('role-badge');
    badge.textContent = roleInfo.name;
    badge.className = `px-3 py-1 rounded-full text-xs font-bold uppercase ${roleInfo.color}`;

    fetchERPProducts(user.access_level);
}

async function fetchERPProducts(accessLevel) {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Yüklənir...</td></tr>';

    try {
        const response = await fetch(`${API_URL}/products`);
        if (response.ok) {
            const products = await response.json();
            renderERPTable(products, accessLevel);
        }
    } catch(e) {}
}

function renderERPTable(products, accessLevel) {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/40 transition-colors';

        let actionBtn = '';
        if (accessLevel === 1) {
            actionBtn = `<button onclick="window.updateStockInDB(${p.product_id})" class="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-lg text-xs"><i class="fa-solid fa-pen-to-square"></i> Stoku Dəyiş</button>`;
        } else if (accessLevel === 3) {
            actionBtn = `<button onclick="window.makeSaleInDB(${p.product_id})" class="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-lg text-xs"><i class="fa-solid fa-cart-shopping"></i> Satış Et</button>`;
        } else {
            actionBtn = `<span class="text-slate-500 text-[11px] italic"><i class="fa-solid fa-lock text-xs mr-1"></i> Yalnız Baxış</span>`;
        }

        tr.innerHTML = `
            <td class="p-3.5 font-mono text-slate-500">#${p.product_id}</td>
            <td class="p-3.5 font-semibold text-slate-200">${sanitizeHTML(p.product_name)}</td>
            <td class="p-3.5 font-mono text-slate-300">${p.price} AZN</td>
            <td class="p-3.5"><span class="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">${p.stock_quantity} ədəd</span></td>
            <td class="p-3.5 text-right">${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateStockInDB(productId) {
    const newStock = prompt("Yeni stok miqdarını daxil edin:");
    if (!newStock || isNaN(newStock) || parseInt(newStock) < 0) return alert("Düzgün stok daxil edin!");

    const res = await fetch(`${API_URL}/products/${productId}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` },
        body: JSON.stringify({ stock_quantity: parseInt(newStock) })
    });
    const d = await res.json();
    if (res.ok) { alert(d.message); fetchERPProducts(1); loadPublicProducts(); } else { alert(d.message || d.error); }
}

async function makeSaleInDB(productId) {
    const qty = prompt("Satılan miqdarı daxil edin:");
    if (!qty || isNaN(qty) || parseInt(qty) <= 0) return alert("Düzgün satış miqdarı daxil edin!");

    const res = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` },
        body: JSON.stringify({ product_id: productId, quantity: parseInt(qty) })
    });
    const d = await res.json();
    if (res.ok) { alert(d.message); fetchERPProducts(3); loadPublicProducts(); } else { alert(d.message || d.error); }
}

function filterPublicProducts() {
    const q = document.getElementById('public-search').value.toLowerCase();
    const filtered = publicProducts.filter(p => p.product_name.toLowerCase().includes(q));
    renderPublicProducts(filtered);
}