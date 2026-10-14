const API_URL = (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : '/api';

function sanitizeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Düzgün SVG Data-URI (şəkillər bloka düşməsin deyə)
const DEFAULT_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%230f172a'/><text x='50%' y='50%' font-family='sans-serif' font-size='16' font-weight='bold' fill='%23818cf8' text-anchor='middle'>SecureShop Product</text></svg>";

const PRODUCT_IMAGES = {
    'Noutbuk Dell XPS 15': 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=400&q=80',
    'Simsiz Qulaqlıq Sony WH-1000XM5': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
    'Mexaniki Klaviatura Keychron K2': 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=400&q=80',
    'Barkod Skaner Honeywell 1D/2D': 'https://images.unsplash.com/photo-1556742049-0a67e0a29ef3?auto=format&fit=crop&w=400&q=80',
    'Termal Çek Çap Edici (80mm)': 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=400&q=80',
    'Təhlükəsizlik Kamerası Hikvision 4K': 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=400&q=80'
};

let publicProducts = [];
let cart = [];

// Müasir Toast Bildiriş Funksiyası (Alert Əvəzi)
function showToast(message, type = 'success') {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = 'toast-box';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.backgroundColor = type === 'error' ? '#f43f5e' : '#10b981';
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

window.showStorefront = function() {
    document.getElementById('storefront-section').style.display = 'block';
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'none';
};

window.showLoginSection = function() {
    document.getElementById('storefront-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('dashboard-section').style.display = 'none';
};

window.showDashboardSection = function() {
    document.getElementById('storefront-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    showDashboardERP();
};

window.toggleCartModal = function() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
    if (modal.style.display === 'flex') renderCartItems();
};

window.addToCartById = function(productId) {
    const product = publicProducts.find(p => p.product_id === productId);
    if (!product) return;
    cart.push({ id: product.product_id, name: product.product_name, price: parseFloat(product.price) });
    document.getElementById('cart-count').textContent = cart.length;
    showToast(`"${product.product_name}" səbətə əlavə olundu!`);
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    document.getElementById('cart-count').textContent = cart.length;
    renderCartItems();
};

window.checkoutCart = async function() {
    if (cart.length === 0) return showToast("Səbətiniz boşdur!", 'error');

    try {
        for (const item of cart) {
            await fetch(`${API_URL}/sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: item.id, quantity: 1 })
            });
        }
        showToast("Sifarişiniz uğurla tamamlandı!");
        cart = [];
        document.getElementById('cart-count').textContent = '0';
        window.toggleCartModal();
        await loadPublicProducts();
    } catch (err) {
        showToast("Sifariş zamanı xəta baş verdi.", 'error');
    }
};

window.logout = function() {
    localStorage.clear();
    updateAuthHeader();
    window.showStorefront();
};

document.addEventListener('DOMContentLoaded', () => {
    updateAuthHeader();
    loadPublicProducts();

    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
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
                    window.showDashboardSection();
                    showToast("Uğurla daxil oldunuz!");
                } else {
                    errorDiv.textContent = sanitizeHTML(data.message || 'Giriş xətası');
                    errorDiv.style.display = 'block';
                }
            } catch (err) {
                errorDiv.textContent = 'Serverlə əlaqə qurulmadı.';
                errorDiv.style.display = 'block';
            }
        });
    }
});

function updateAuthHeader() {
    const token = localStorage.getItem('jwt_token');
    const authContainer = document.getElementById('auth-buttons');
    if (!authContainer) return;

    if (token) {
        authContainer.innerHTML = `
            <button onclick="window.showDashboardSection()" class="btn-panel-nav"><i class="fa-solid fa-gauge"></i> ERP Panel</button>
            <button onclick="window.logout()" class="btn-logout-nav"><i class="fa-solid fa-power-off"></i></button>
        `;
    } else {
        authContainer.innerHTML = `
            <button onclick="window.showLoginSection()" class="btn-login-nav"><i class="fa-solid fa-user-lock"></i> İşçi Girişi</button>
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
            <div class="product-img-wrapper">
                <img src="${imgUrl}" alt="${name}" onerror="this.onerror=null; this.src='${DEFAULT_IMAGE}';">
                <span class="stock-badge">Stok: ${stock}</span>
            </div>
            <div class="product-info">
                <h3>${name}</h3>
                <p class="price-tag">${price} AZN</p>
            </div>
            <div style="padding: 0 16px 16px 16px;">
                <button onclick="window.addToCartById(${id})" class="btn-cart-add">
                    <i class="fa-solid fa-cart-plus"></i> Səbətə Əlavə Et
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
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

    document.getElementById('cart-total').textContent = total.toFixed(2) + ' AZN';
}

async function showDashboardERP() {
    const user = JSON.parse(localStorage.getItem('user')) || { username: 'İşçi', access_level: 4 };
    document.getElementById('user-display').textContent = sanitizeHTML(user.username);
    fetchERPProducts(user.access_level);
}

async function fetchERPProducts(accessLevel) {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;
    try {
        const response = await fetch(`${API_URL}/products`);
        if (response.ok) {
            const products = await response.json();
            tbody.innerHTML = '';
            products.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 12px; color: #64748b;">#${p.product_id}</td>
                    <td style="padding: 12px; font-weight: 600;">${sanitizeHTML(p.product_name)}</td>
                    <td style="padding: 12px; color: #818cf8;">${p.price} AZN</td>
                    <td style="padding: 12px;">${p.stock_quantity} ədəd</td>
                    <td style="padding: 12px; text-align: right;"><span style="color: #10b981;">Aktiv</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch(e) {}
}

window.filterPublicProducts = function() {
    const q = document.getElementById('public-search').value.toLowerCase();
    const filtered = publicProducts.filter(p => p.product_name.toLowerCase().includes(q));
    renderPublicProducts(filtered);
};