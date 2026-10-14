require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { encrypt } = require('./crypto');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '10kb' }));
const path = require('path'); // Əgər yuxarıda require('path') yoxdursa bunu əlavə edin

const path = require('path');

// 1. Public qovluğundakı statik faylları (index.html, style.css, app.js) xaricə açır
app.use(express.static(path.join(__dirname, 'public')));

// 2. Ana ünvana (/) və ya digər səhifələrə girəndə public/index.html faylını göndərir
app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// Supabase PostgreSQL Bağlantısı
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Brute Force Qorunması
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: "Çox sayda uğursuz giriş cəhdi. Lütfən 15 dəqiqə sonra yenidən cəhd edin." }
});

// RBAC Middleware
const authorize = (allowedLevels) => {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) return res.status(401).json({ message: "Giriş qadağandır: Token təmin edilməyib" });

        jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_2026', (err, user) => {
            if (err) return res.status(403).json({ message: "Yanlış və ya vaxtı keçmiş sessiya" });

            if (!allowedLevels.includes(user.access_level)) {
                return res.status(403).json({ message: "Səlahiyyət xətası: Bu əməliyyat üçün icazəniz yoxdur" });
            }

            req.user = user;
            next();
        });
    };
};

// 1. QEYDİYYAT ENDPOINT-İ (REGISTER)
app.post('/api/register', async (req, res) => {
    const { username, password, role_id } = req.body;

    if (!username || !password || !role_id) {
        return res.status(400).json({ message: "İstifadəçi adı, şifrə və role_id daxil edilməlidir" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO public.users (username, password_hash, role_id) VALUES ($1, $2, $3) RETURNING user_id, username',
            [username.trim(), hashedPassword, role_id]
        );
        res.status(201).json({ message: "İstifadəçi uğurla yaradıldı", user: result.rows[0] });
    } catch (err) {
        console.error("Qeydiyyat xətası:", err);
        res.status(500).json({ error: "Qeydiyyat xətası: " + err.message });
    }
});

// 2. İSTİFADƏÇİ ADI / ŞİFRƏ YENİLƏMƏ ENDPOINT-İ (UPDATE)
app.put('/api/users/update', async (req, res) => {
    const { current_username, new_username, new_password } = req.body;

    if (!current_username) {
        return res.status(400).json({ message: "Dəyişdiriləcək istifadəçi adını daxil edin" });
    }

    try {
        const userCheck = await pool.query('SELECT user_id FROM public.users WHERE username = $1', [current_username]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: "İstifadəçi tapılmadı" });
        }

        const userId = userCheck.rows[0].user_id;

        if (new_username) {
            await pool.query('UPDATE public.users SET username = $1 WHERE user_id = $2', [new_username, userId]);
        }

        if (new_password) {
            const hashedPassword = await bcrypt.hash(new_password, 10);
            await pool.query('UPDATE public.users SET password_hash = $1 WHERE user_id = $2', [hashedPassword, userId]);
        }

        res.json({ message: "İstifadəçi məlumatları uğurla yeniləndi!" });
    } catch (err) {
        console.error('User Update Error:', err);
        res.status(500).json({ error: "Məlumatlar yenilənərkən xəta baş verdi" });
    }
});

// 3. MƏHSULLARI GƏTİRMƏK
app.get('/api/products', async (req, res) => {
    try {
        const products = await pool.query('SELECT product_id, product_name, price, stock_quantity FROM public.products ORDER BY product_id ASC');
        res.json(products.rows);
    } catch (err) {
        res.status(500).json({ error: "Məhsullar oxunarkən baza xətası baş verdi" });
    }
});

// 4. GİRİŞ (LOGIN)
app.post('/api/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ message: "Düzgün istifadəçi adı və şifrə daxil edin" });
    }

    try {
        const userRes = await pool.query(
            'SELECT u.user_id, u.username, u.password_hash, r.access_level FROM public.users u JOIN public.roles r ON u.role_id = r.role_id WHERE u.username = $1',
            [username.trim()]
        );

        if (userRes.rows.length === 0) {
            return res.status(401).json({ message: "İstifadəçi adı və ya şifrə yanlışdır" });
        }

        const user = userRes.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ message: "İstifadəçi adı və ya şifrə yanlışdır" });
        }

        const token = jwt.sign(
            { user_id: user.user_id, username: user.username, access_level: user.access_level },
            process.env.JWT_SECRET || 'super_secret_jwt_key_2026',
            { expiresIn: '2h' }
        );

        res.json({ token, access_level: user.access_level, username: user.username });
    } catch (err) {
        res.status(500).json({ error: "Giriş zamanı server xətası baş verdi" });
    }
});

// 5. STOK YENİLƏMƏ (ADMIN)
app.put('/api/products/:id/stock', authorize([1]), async (req, res) => {
    const { id } = req.params;
    const { stock_quantity } = req.body;

    if (stock_quantity === undefined || isNaN(stock_quantity) || stock_quantity < 0) {
        return res.status(400).json({ message: "Stok miqdarı 0 və ya müsbət ədəd olmalıdır" });
    }

    try {
        const updateRes = await pool.query(
            'UPDATE public.products SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2 RETURNING *',
            [stock_quantity, id]
        );

        if (updateRes.rowCount === 0) {
            return res.status(404).json({ message: "Məhsul tapılmadı" });
        }

        try {
            const logPayload = JSON.stringify({ product_id: id, new_stock: stock_quantity, updated_by: req.user.username, timestamp: new Date() });
            const encryptedLog = encrypt(logPayload);

            await pool.query(
                'INSERT INTO public.audit_logs (user_id, action_type, encrypted_payload, iv, auth_tag) VALUES ($1, $2, $3, $4, $5)',
                [req.user.user_id, 'UPDATE_STOCK', encryptedLog.encryptedData, encryptedLog.iv, encryptedLog.authTag]
            );
        } catch (logErr) {
            console.error('Audit Log Error:', logErr);
        }

        res.json({ message: "Stok yeniləndi və şifrələnmiş log bazaya yazıldı" });
    } catch (err) {
        res.status(500).json({ error: "Əməliyyat icra olunmadı" });
    }
});

// 6. SATIŞ İCRASI
app.post('/api/sales', async (req, res) => {
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity || isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ message: "Düzgün satış miqdarı daxil edin" });
    }

    try {
        const prodCheck = await pool.query('SELECT stock_quantity FROM public.products WHERE product_id = $1', [product_id]);
        if (prodCheck.rows.length === 0) return res.status(404).json({ message: "Məhsul tapılmadı" });

        if (prodCheck.rows[0].stock_quantity < quantity) {
            return res.status(400).json({ message: "Anbarda kifayət qədər stok yoxdur" });
        }

        const updatedRes = await pool.query(
            'UPDATE public.products SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2 RETURNING *',
            [quantity, product_id]
        );

        res.json({ message: "Satış uğurla tamamlandı", product: updatedRes.rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Satış zamanı server xətası baş verdi" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Təhlükəsiz Backend Server ${PORT} portunda çalışır...`);
});