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

const DEFAULT_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%230f172a'/><text x='50%' y='50%' font-family='sans-serif' font-size='16' font-weight='bold' fill='%23818cf8' text-anchor='middle'>SecureShop Məhsul</text></svg>";

const ROLES = {
    1: { name: 'Admin (Level 1)', color: 'badge-admin', desc: 'Sistem Administrasiyası: Stok dəyişmə, məhsul idarəsi və AES-256 Log' },
    2: { name: 'Manager (Level 2)', color: 'badge-manager', desc: 'Menecer: Yeni məhsul əlavə etmə, dəyişdirmə və silmə yetkisi' },
    3: { name: 'Operator (Level 3)', color: 'badge-operator', desc: 'Operator / Kassir: Satış icra etmə yetkisi' },
    4: { name: 'Viewer (Level 4)', color: 'badge-viewer', desc: 'Müşahidəçi: Yalnız baxış hüququ' }
};

let publicProducts = [];
let cart = [];

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
    setTimeout(() => toast.classList.remove('show'), 3000);
}

window.showStorefront = function() {
    document.getElementById('storefront-section').style.display = 'block';
    document.getElementById('product-detail-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'none';
    window.scrollTo(0, 0);
};

window.showLoginSection = function() {
    document.getElementById('storefront-section').style.display = 'none';
    document.getElementById('product-detail-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('dashboard-section').style.display = 'none';
};

window.togglePasswordVisibility = function() {
    const passwordInput = document.getElementById('password');
    const icon = document.getElementById('toggle-password-icon');

    if (!passwordInput || !icon) return;

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};

window.showDashboardSection = function() {
    document.getElementById('storefront-section').style.display = 'none';
    document.getElementById('product-detail-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    showDashboardERP();
};

window.toggleCartModal = function() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
    if (modal.style.display === 'flex') renderCartItems();
};

window.toggleProductModal = function() {
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
};

window.toggleEditProductModal = function() {
    const modal = document.getElementById('edit-product-modal');
    if (!modal) return;
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
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

window.openProductDetail = function(productId) {
    const product = publicProducts.find(p => p.product_id === productId);
    if (!product) return;

    document.getElementById('storefront-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('product-detail-section').style.display = 'block';

    document.getElementById('detail-title').textContent = product.product_name;
    document.getElementById('detail-price').textContent = `${parseFloat(product.price).toFixed(2)} AZN`;
    document.getElementById('detail-stock-badge').textContent = `Stok: ${product.stock_quantity} ədəd`;
    document.getElementById('detail-description').textContent = product.description || "Bu məhsul üçün ətraflı təsvir daxil edilməyib.";

    const mainImg = document.getElementById('detail-main-img');
    const mainImgUrl = product.image_url || DEFAULT_IMAGE;
    mainImg.src = mainImgUrl;

    const thumbsGrid = document.getElementById('detail-thumbs-grid');
    thumbsGrid.innerHTML = '';

    let gallery = [mainImgUrl];
    if (product.gallery_images) {
        try {
            const parsed = typeof product.gallery_images === 'string' ? JSON.parse(product.gallery_images) : product.gallery_images;
            if (Array.isArray(parsed)) gallery = gallery.concat(parsed);
        } catch (e) {}
    }

    gallery.forEach((url, idx) => {
        const thumb = document.createElement('div');
        thumb.className = `thumb-item ${idx === 0 ? 'active' : ''}`;
        thumb.innerHTML = `<img src="${url}" alt="Thumb" onerror="this.src='${DEFAULT_IMAGE}'">`;
        thumb.onclick = () => {
            document.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('active'));
            thumb.classList.add('active');
            mainImg.src = url;
        };
        thumbsGrid.appendChild(thumb);
    });

    const addCartBtn = document.getElementById('detail-add-cart-btn');
    addCartBtn.onclick = () => window.addToCartById(product.product_id);

    renderSimilarProducts(product);
    window.scrollTo(0, 0);
};

function renderSimilarProducts(currentProduct) {
    const grid = document.getElementById('similar-products-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const firstWord = currentProduct.product_name.split(' ')[0].toLowerCase();
    
    let similar = publicProducts.filter(p => 
        p.product_id !== currentProduct.product_id && 
        p.product_name.toLowerCase().includes(firstWord)
    );

    if (similar.length === 0) {
        similar = publicProducts.filter(p => p.product_id !== currentProduct.product_id).slice(0, 4);
    } else {
        similar = similar.slice(0, 4);
    }

    similar.forEach(p => {
        const id = p.product_id;
        const name = sanitizeHTML(p.product_name);
        const price = parseFloat(p.price).toFixed(2);
        const stock = parseInt(p.stock_quantity);
        const imgUrl = p.image_url || DEFAULT_IMAGE;

        const card = document.createElement('div');
        card.className = 'product-card-item';
        card.innerHTML = `
            <div class="product-img-wrapper" onclick="window.openProductDetail(${id})">
                <img src="${imgUrl}" alt="${name}" onerror="this.onerror=null; this.src='${DEFAULT_IMAGE}';">
                <span class="stock-badge">Stok: ${stock}</span>
            </div>
            <div class="product-info" onclick="window.openProductDetail(${id})">
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

window.submitCheckout = async function(e) {
    e.preventDefault();
    if (cart.length === 0) return showToast("Səbətiniz boşdur!", 'error');

    const customer_name = document.getElementById('cust-name').value.trim();
    const phone_number = document.getElementById('cust-phone').value.trim();
    const card_number = document.getElementById('card-num').value.trim();
    const exp_date = document.getElementById('card-exp').value.trim();
    const cvv = document.getElementById('card-cvv').value.trim();

    let total = cart.reduce((sum, item) => sum + item.price, 0);

    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_name,
                phone_number,
                card_number,
                exp_date,
                cvv,
                items: cart,
                total_amount: total
            })
        });

        const data = await response.json();

        if (response.ok) {
            showToast("Sifarişiniz uğurla qəbul edildi!");
            cart = [];
            document.getElementById('cart-count').textContent = '0';
            document.getElementById('checkout-form').reset();
            window.toggleCartModal();
            await loadPublicProducts();
        } else {
            showToast(data.message || "Sifariş zamanı xəta baş verdi.", 'error');
        }
    } catch (err) {
        showToast("Serverlə əlaqə qurulmadı.", 'error');
    }
};

window.submitAddProduct = async function(e) {
    e.preventDefault();
    const product_name = document.getElementById('new-prod-name').value.trim();
    const price = document.getElementById('new-prod-price').value.trim();
    const stock_quantity = document.getElementById('new-prod-stock').value.trim();
    const image_url = document.getElementById('new-prod-image').value.trim();
    const description = document.getElementById('new-prod-desc').value.trim();
    const galleryInput = document.getElementById('new-prod-gallery').value.trim();

    let gallery_images = [];
    if (galleryInput) {
        gallery_images = galleryInput.split(',').map(url => url.trim()).filter(url => url !== '');
    }

    try {
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
            },
            body: JSON.stringify({ product_name, price, stock_quantity, image_url, description, gallery_images })
        });

        const data = await response.json();
        if (response.ok) {
            showToast("Məhsul uğurla əlavə olundu!");
            document.getElementById('add-product-form').reset();
            window.toggleProductModal();
            fetchERPProducts(JSON.parse(localStorage.getItem('user')).access_level);
            loadPublicProducts();
        } else {
            showToast(data.message || "Xəta baş verdi.", 'error');
        }
    } catch (err) {
        showToast("Serverlə əlaqə qurulmadı.", 'error');
    }
};

// MƏHSUL REDAKTƏ MODALINI DOLDURUB AÇMAQ
window.openEditProductModal = function(productId) {
    const product = publicProducts.find(p => p.product_id === productId);
    if (!product) return;

    document.getElementById('edit-prod-id').value = product.product_id;
    document.getElementById('edit-prod-name').value = product.product_name;
    document.getElementById('edit-prod-price').value = product.price;
    document.getElementById('edit-prod-stock').value = product.stock_quantity;
    document.getElementById('edit-prod-image').value = product.image_url || '';
    document.getElementById('edit-prod-desc').value = product.description || '';

    let galleryStr = '';
    if (product.gallery_images) {
        try {
            const parsed = typeof product.gallery_images === 'string' ? JSON.parse(product.gallery_images) : product.gallery_images;
            if (Array.isArray(parsed)) galleryStr = parsed.join(', ');
        } catch (e) {}
    }
    document.getElementById('edit-prod-gallery').value = galleryStr;

    window.toggleEditProductModal();
};

// REDAKTƏ OLUNMUŞ MƏHSULUN YADDA SAXLANMASI (SUBMIT)
window.submitEditProduct = async function(e) {
    e.preventDefault();
    const productId = document.getElementById('edit-prod-id').value;
    const product_name = document.getElementById('edit-prod-name').value.trim();
    const price = document.getElementById('edit-prod-price').value.trim();
    const stock_quantity = document.getElementById('edit-prod-stock').value.trim();
    const image_url = document.getElementById('edit-prod-image').value.trim();
    const description = document.getElementById('edit-prod-desc').value.trim();
    const galleryInput = document.getElementById('edit-prod-gallery').value.trim();

    let gallery_images = [];
    if (galleryInput) {
        gallery_images = galleryInput.split(',').map(url => url.trim()).filter(url => url !== '');
    }

    try {
        const response = await fetch(`${API_URL}/products/${productId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
            },
            body: JSON.stringify({ product_name, price, stock_quantity, image_url, description, gallery_images })
        });

        const data = await response.json();
        if (response.ok) {
            showToast("Məhsul məlumatları yeniləndi!");
            window.toggleEditProductModal();
            fetchERPProducts(JSON.parse(localStorage.getItem('user')).access_level);
            loadPublicProducts();
        } else {
            showToast(data.message || "Xəta baş verdi.", 'error');
        }
    } catch (err) {
        showToast("Serverlə əlaqə qurulmadı.", 'error');
    }
};

window.deleteProductFromDB = async function(productId) {
    if (!confirm("Bu məhsulu silməyə əminsiniz?")) return;

    try {
        const response = await fetch(`${API_URL}/products/${productId}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
            }
        });

        const data = await response.json();
        if (response.ok) {
            showToast("Məhsul silindi!");
            fetchERPProducts(JSON.parse(localStorage.getItem('user')).access_level);
            loadPublicProducts();
        } else {
            showToast(data.message || "Silinmə zamanı xəta baş verdi.", 'error');
        }
    } catch (err) {
        showToast("Serverlə əlaqə qurulmadı.", 'error');
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
        const imgUrl = p.image_url || DEFAULT_IMAGE;

        const card = document.createElement('div');
        card.className = 'product-card-item';
        card.innerHTML = `
            <div class="product-img-wrapper" onclick="window.openProductDetail(${id})">
                <img src="${imgUrl}" alt="${name}" onerror="this.onerror=null; this.src='${DEFAULT_IMAGE}';">
                <span class="stock-badge">Stok: ${stock}</span>
            </div>
            <div class="product-info" onclick="window.openProductDetail(${id})">
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
    const roleInfo = ROLES[user.access_level] || ROLES[4];

    document.getElementById('user-display').textContent = sanitizeHTML(user.username);
    document.getElementById('role-permissions-desc').textContent = sanitizeHTML(roleInfo.desc);

    const badge = document.getElementById('role-badge');
    badge.textContent = roleInfo.name;
    badge.className = `role-badge-box ${roleInfo.color}`;

    const addBtn = document.getElementById('btn-add-product');
    if (addBtn) {
        addBtn.style.display = (user.access_level === 1 || user.access_level === 2) ? 'inline-flex' : 'none';
    }

    fetchERPProducts(user.access_level);
}

async function fetchERPProducts(accessLevel) {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="padding: 16px; text-align: center; color: #94a3b8;">Yüklənir...</td></tr>';

    try {
        const response = await fetch(`${API_URL}/products`);
        if (response.ok) {
            const products = await response.json();
            renderERPTable(products, accessLevel);
        }
    } catch (e) {}
}

function renderERPTable(products, accessLevel) {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    products.forEach(p => {
        const tr = document.createElement('tr');

        let actionBtn = '';
        if (accessLevel === 1 || accessLevel === 2) {
            actionBtn = `
                <button onclick="window.openEditProductModal(${p.product_id})" class="btn-action btn-edit"><i class="fa-solid fa-pen-to-square"></i> Düzenlə</button>
                <button onclick="window.deleteProductFromDB(${p.product_id})" class="btn-action" style="background-color: rgba(244, 63, 94, 0.15); color: #f43f5e; border-color: rgba(244, 63, 94, 0.3);"><i class="fa-solid fa-trash"></i> Sil</button>
            `;
        } else if (accessLevel === 3) {
            actionBtn = `<button onclick="window.makeSaleInDB(${p.product_id})" class="btn-action btn-sale"><i class="fa-solid fa-cart-shopping"></i> Satış Et</button>`;
        } else {
            actionBtn = `<span style="color: #64748b; font-size: 0.75rem; font-style: italic;"><i class="fa-solid fa-lock"></i> Yalnız Baxış</span>`;
        }

        tr.innerHTML = `
            <td style="font-family: monospace; color: #64748b;">#${p.product_id}</td>
            <td style="font-weight: 600; color: #e2e8f0;">${sanitizeHTML(p.product_name)}</td>
            <td style="font-family: monospace; color: #818cf8;">${p.price} AZN</td>
            <td><span class="stock-pill">${p.stock_quantity} ədəd</span></td>
            <td style="text-align: right; display: flex; gap: 8px; justify-content: flex-end;">${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateStockInDB = async function(productId) {
    const newStock = prompt("Yeni stok miqdarını daxil edin:");
    if (!newStock || isNaN(newStock) || parseInt(newStock) < 0) return showToast("Düzgün stok daxil edin!", 'error');

    const res = await fetch(`${API_URL}/products/${productId}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` },
        body: JSON.stringify({ stock_quantity: parseInt(newStock) })
    });
    const d = await res.json();
    if (res.ok) { showToast(d.message); fetchERPProducts(1); loadPublicProducts(); } else { showToast(d.message || d.error, 'error'); }
};

window.makeSaleInDB = async function(productId) {
    const qty = prompt("Satılan miqdarı daxil edin:");
    if (!qty || isNaN(qty) || parseInt(qty) <= 0) return showToast("Düzgün satış miqdarı daxil edin!", 'error');

    const res = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` },
        body: JSON.stringify({ product_id: productId, quantity: parseInt(qty) })
    });
    const d = await res.json();
    if (res.ok) { showToast(d.message); fetchERPProducts(3); loadPublicProducts(); } else { showToast(d.message || d.error, 'error'); }
};

window.filterPublicProducts = function() {
    const q = document.getElementById('public-search').value.toLowerCase();
    const filtered = publicProducts.filter(p => p.product_name.toLowerCase().includes(q));
    renderPublicProducts(filtered);
};