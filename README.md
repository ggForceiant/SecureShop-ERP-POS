# 🛡️ SecureShop - Full-Stack E-Commerce ERP & POS System
> **OWASP Top 10 Təhlükəsizlik Standartlarına Uyğunlaşdırılmış, Kriptoqrafik Loglama və Rol Əsaslı İdarəetmə (RBAC) İnfrastrukturu**

---

## 📌 1. Layihə Haqqında İcmal (Project Overview)

**SecureShop**, həm açıq müştəri vitrinini (**Public Storefront**), həm də təhlükəsiz daxili idarəetmə panelini (**ERP / POS**) özündə birləşdirən full-stack veb tətbiqdir. Layihənin əsas məqsədi e-ticarət və anbar idarəetmə sistemlərində tez-tez rast gəlinən kiber təhlükəsizlik zəifliklərini (**OWASP Top 10**) aradan qaldırmaq, məlumat bütünlüyünü təmin etmək və həssas inzibati əməliyyatları **AES-256-GCM** şifrələməsi ilə audit log bazasında qorumaqdır.

### 🌟 Əsas Özəlliklər:
* **Çoxsəviyyəli Giriş Nəzarəti (RBAC):** Admin, Manager, Operator/Kassir və Viewer rolları üzrə ciddi səlahiyyət bölgüsü.
* **Müştəri Vitrini (Public Storefront):** İcazə tələb olunmadan məhsul kataloquna baxış, səbətə əlavə etmə və real-vaxt stok azaldılması ilə satış icrası.
* **Kriptoqrafik Audit Loglama:** Admin tərəfindən stok dəyişikliyi edildikdə dəyişikliyin detalları **AES-256-GCM**, IV və Auth Tag istifadə edilərək şifrlənir.
* **OWASP Top 10 Müdafiəsi:** SQL Injection, Cross-Site Scripting (XSS), Brute-Force, Broken Access Control və Sensitive Data Exposure hücumlarına qarşı sistemli müdafiə.
* **Verilənlər Bazası:** Supabase (Cloud PostgreSQL) bağlantısı və dinamik sorğular.

---

## 🚀 2. Texnologiya Stoki (Tech Stack)

| Hissə | Texnologiya / Kitabxana | Təsvir / İstifadə Məqsədi |
| :--- | :--- | :--- |
| **Backend Environment** | Node.js (v24+) & Express.js | RESTful API arxitekturası və HTTP sorğu idarəetməsi |
| **Database** | PostgreSQL (Supabase Cloud) | İlişkisel verilənlər bazası və connection pooling (`pg`) |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`) | 2 saatlıq vaxt məhdudiyyətli, HS256 imzalı sessiya tokenləri |
| **Password Hashing** | `bcryptjs` | Şifrələrin 10 salt dövrü ilə tək tərəfli həşlənməsi |
| **Encryption** | Node.js Native `crypto` | AES-256-GCM simmetrik şifrələmə və autentifikasiya teqi |
| **Security Headers** | `helmet` | HTTP qoruma başlıqları (CSP, HSTS, X-Frame-Options) |
| **Rate Limiting** | `express-rate-limit` | Brute-force və DoS cəhdlərinin qarşısını almaq üçün |
| **CORS Control** | `cors` | Şəbəkə sorğularının nizamlanması |
| **Frontend UI** | HTML5, Tailwind CSS, JS (ES6) | Dinamik DOM renderinq, XSS sanitizasiya və modal idarəetməsi |

---

## 🏗️ 3. Sistem Arxitekturası və Rol Əsaslı İdarəetmə (RBAC)

Sistemdə təhlükəsizlik prinsiplərinə uyğun olaraq Minimum Səlahiyyət Prinsipi (**Principle of Least Privilege**) tətbiq edilmişdir.

```
                  ┌─────────────────────────────────────────┐
                  │          Müştəri Vitrini (Public)        │
                  │  - GET /api/products                   │
                  │  - POST /api/sales (Səbətdən Avto Satış)│
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │          İşçi Girişi (Login API)        │
                  │  - POST /api/login (JWT Generation)     │
                  └────────────────────┬────────────────────┘
                                       │
      ┌────────────────────────────────┼────────────────────────────────┐
      │ (Level 1)                      │ (Level 2)                      │ (Level 3)
      ▼                                ▼                                ▼
┌──────────────┐                ┌──────────────┐                ┌──────────────┐
│ Admin Panel  │                │ Manager      │                │ POS Kassir   │
│ - Stock Update│               │ - Read Only  │                │ - Direct Sale│
│ - AES-256 Log│                │ - Reports    │                │ - Stock Sync │
└──────────────┘                └──────────────┘                └──────────────┘
```

### 👤 Rol Təsnifatı Və Yetkilər:

| Rol ID | Rol Adı | Səlahiyyət Səviyyəsi | İcazə Verilən Əməliyyatlar |
| :---: | :--- | :---: | :--- |
| **1** | **Admin** | Level 1 | Bütün resurslara tam çıxış, stok redaktəsi, istifadəçi yaradılması/dəyişdirilməsi və **AES-256 Audit Log** yazılışı. |
| **2** | **Manager** | Level 2 | Məhsul kataloqu, anbar göstəriciləri və hesabatlara baxış (Read-Only). |
| **3** | **Operator / Kassir** | Level 3 | POS terminalı üzərindən satışı icra etmək (`POST /api/sales`), avtomatik stok azaltmaq. |
| **4** | **Viewer** | Level 4 | Yalnız məhdud müşahidə icazəsi. |

---

## 🔐 4. OWASP Top 10 Təhlükəsizlik Tətbiqləri Və Qorunma Mexanizmləri

### 1. A01:2021 - Broken Access Control
* **Həlli:** Bütün həssas endpoint-lər `authorize([level])` middleware-i ilə qorunur. İstifadəçinin JWT tokenindəki `access_level` dəyəri yoxlanılmadan heç bir inzibati əməliyyat icra olunmur.

### 2. A02:2021 - Cryptographic Failures
* **Həlli (Şifrələr):** Şifrələr bazaya heç bir halda açıq mətndə (plain text) yazılmır. `bcrypt.hash(password, 10)` istifadə olunur.
* **Həlli (Audit Loglar):** Admin tərəfindən stok dəyişdirildikdə dəyişikliyi edən istifadəçi, vaxt və yeni stok miqdarı `crypto` modulu ilə **AES-256-GCM** vasitəsilə şifrlənir, `iv` və `auth_tag` ilə birlikdə `audit_logs` cədvəlinə yazılır.

### 3. A03:2021 - Injection (SQL Injection & XSS)
* **Həlli (SQLi):** Bütün bazaya müraciətlər parametrli sorğular (`$1, $2, $3`) ilə aparılır. SQL injection şansları sıfırlanmışdır.
* **Həlli (XSS):** Frontend daxilində bütün istifadəçi tərəfindən gələn məlumatlar və baza mətni `sanitizeHTML()` funksiyası vasitəsilə HTML obyektlərinə çevrilir (`<` -> `&lt;`, `>` -> `&gt;`).

### 4. A04:2021 - Insecure Design
* **Həlli:** Mənfi stok mənimsənilməsi (`stock_quantity < 0`) və mənfi satış miqdarı (`quantity <= 0`) həm backend daxilində validation ilə, həm də bazadakı mövcud stok sayı ilə müqayisə edilərək bloklanır.

### 5. A05:2021 - Security Misconfiguration
* **Həlli:** `helmet()` kitabxanası ilə lazımi HTTP təhlükəsizlik başlıqları əlavə olunub. CORS tənzimləmələri vasitəsilə xarici domenlərdən icazəsiz sorğuların qarşısını alınır.

### 6. A07:2021 - Identification and Authentication Failures
* **Həlli:** `express-rate-limit` vasitəsilə `/api/login` endpoint-inə 15 dəqiqə ərzində maksimum 10 uğursuz cəhd limiti qoyulmuşdur. Brute-force hücumları dərhal bloklanır.

---

## 🗄️ 5. Verilənlər Bazası Stukturu (Database Schema)

Supabase PostgreSQL bazasında istifadə olunan əsas cədvəl strukturları:

```sql
-- 1. Rollar Cədvəli
CREATE TABLE public.roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    access_level INT NOT NULL UNIQUE
);

-- 2. İstifadəçilər Cədvəli
CREATE TABLE public.users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role_id INT REFERENCES public.roles(role_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Məhsullar Cədvəli
CREATE TABLE public.products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Kriptoqrafik Audit Logları Cədvəli (AES-256)
CREATE TABLE public.audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES public.users(user_id),
    action_type VARCHAR(50) NOT NULL,
    encrypted_payload TEXT NOT NULL,
    iv VARCHAR(64) NOT NULL,
    auth_tag VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🛠️ 6. Quraşdırma və İşə Salma Təlimatı (Setup Guide)

### 1. Repozitoriyanı klonlayın:
```bash
git clone https://github.com/ggForceiant/SecureShop-ERP-POS.git
cd SecureShop-ERP-POS
```

### 2. Asılılıqları yükləyin:
```bash
npm install
```

### 3. `.env` Faylını Yaradın:
Kök qovluqda `.env` faylı yaradıb öz Supabase məlumatlarınızı daxil edin:
```env
PORT=5000
DATABASE_URL=postgres://postgres:[YOUR-PASSWORD]@db.[YOUR-SUPABASE-ID].supabase.co:5432/postgres
JWT_SECRET=super_secret_jwt_key_secure_shop_2026
ENCRYPTION_KEY=a6f8b1c2d3e4f5a6b7c8d9e0f1a2b3c4
```

### 4. Backend Serveri Başladın:
```bash
node server.js
```

---

## 📡 7. API Endpoint-ləri Və CMD (cURL) Test Əmrləri

### 1. Yeni İstifadəçi Yaratmaq (Register API)
CMD vasitəsilə yeni istifadəçi əlavə etmək (Şifrə avtomatik həşlənir):
```cmd
curl -X POST http://localhost:5000/api/register ^
-H "Content-Type: application/json" ^
-d "{\"username\": \"kassir_ali\", \"password\": \"kassir1234\", \"role_id\": 3}"
```

### 2. İstifadəçi Adı və ya Şifrəni Güncəlləmək (Update User API)
CMD üzərindən mövcud istifadəçinin məlumatlarını dəyişmək:
```cmd
curl -X PUT http://localhost:5000/api/users/update ^
-H "Content-Type: application/json" ^
-d "{\"current_username\": \"kassir_ali\", \"new_password\": \"yeni_sifre_2026\"}"
```

### 3. Sistemə Giriş Etmək (Login API)
```cmd
curl -X POST http://localhost:5000/api/login ^
-H "Content-Type: application/json" ^
-d "{\"username\": \"admin\", \"password\": \"admin123\"}"
```

### 4. Səbətdən / POS-dan Satış Etmək (Stock Reduction API)
```cmd
curl -X POST http://localhost:5000/api/sales ^
-H "Content-Type: application/json" ^
-d "{\"product_id\": 1, \"quantity\": 1}"
```

### 5. Admin Stok Redaktəsi Və AES-256 Loglama (Admin Stock Update)
```cmd
curl -X PUT http://localhost:5000/api/products/1/stock ^
-H "Content-Type: application/json" ^
-H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" ^
-d "{\"stock_quantity\": 50}"
```

---

## 🧪 8. Test Senariləri Və Nəticələr (Verification)

1. **Vitrin Satış Testi:** Müştəri vitrinindən səbətə məhsul əlavə edilib "Sifarişi Tamamla" basıldıqda, backend-ə `POST /api/sales` sorğusu gedir və Supabase bazasındakı `stock_quantity` anında azalır.
2. **XSS Hücum Testi:** Axtarış xanasına və ya məhsul adına `<script>alert(1)</script>` yerləşdirildikdə `sanitizeHTML` funksiyası tərəfindən zərərsizləşdirilir.
3. **Brute-Force Testi:** Düzgün olmayan şifrə ilə 10 dəfədən çox giriş cəhdi edildikdə `429 Too Many Requests` xətası qaytarılır.
4. **Audit Log Testi:** Admin stoku yenilədikdə `audit_logs` cədvəlinə şifrlənmiş (AES-256-GCM) data, `iv` və `auth_tag` dəyərləri daxil edilir.