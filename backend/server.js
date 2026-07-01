import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Impor fungsi inisialisasi DB dan client Supabase
import { initDb, getSupabaseClient } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Konfigurasi Manajemen File Gambar (Multer) dengan Memory Storage untuk diteruskan ke Supabase Storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Fungsi utilitas untuk upload ke Supabase Storage
async function uploadToSupabase(file) {
  const supabase = getSupabaseClient();
  const fileExt = file.originalname.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('products')
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error('Gagal mengunggah gambar ke Supabase Storage: ' + error.message);
  }

  const { data: publicUrlData } = supabase.storage
    .from('products')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

// Hubungkan ke Database MongoDB Cloud Atlas
initDb();

// ==========================================
//          RUTE API / ENDPOINT CRUD
// ==========================================

// 1. READ: Ambil Semua Produk
app.get('/api/products', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .neq('status', 'dihapus')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json([]);
  }
});

// 2. CREATE: Tambah Produk Baru
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, price, description, size, stock, category, image_url } = req.body;
    let imageUrl = image_url || '';
    
    if (req.file) {
      imageUrl = await uploadToSupabase(req.file);
    }
    
    const supabase = getSupabaseClient();

    const newProduct = {
      name,
      price: Number(price),
      description,
      size,
      stock: Number(stock),
      category,
      image_url: imageUrl
    };

    const { data, error } = await supabase
      .from('products')
      .insert(newProduct)
      .select('*');

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(403).json({ message: 'Gagal menambah produk (Cek RLS Supabase)' });
    }
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. UPDATE: Mengedit Data Produk
app.put('/api/products/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, description, size, stock, category } = req.body;
    const supabase = getSupabaseClient();

    const updateData = {
      name,
      price: Number(price),
      description,
      size,
      stock: Number(stock),
      category
    };

    if (req.file) {
      updateData.image_url = await uploadToSupabase(req.file);
    } else if (req.body.image_url) {
      updateData.image_url = req.body.image_url;
    }

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select('*');

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Produk tidak ditemukan atau akses ditolak (Cek RLS Supabase)' });
    }

    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. DELETE: Hapus Produk Aman (Soft Delete)
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .update({ status: 'dihapus' })
      .eq('id', id)
      .select('*');

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Produk tidak ditemukan atau akses ditolak (Cek RLS)' });
    }

    res.json({ message: 'Produk berhasil dihapus (Soft Delete)' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
//          AUTH ENDPOINTS
// ==========================================

// Helper: Generate OTP (6 digit)
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// Helper: Hash password
async function hashPassword(password) {
  return await bcryptjs.hash(password, 10);
}

// Helper: Compare password
async function comparePassword(password, hash) {
  return await bcryptjs.compare(password, hash);
}

// Helper: Generate JWT Token
function generateToken(userId, email) {
  return jwt.sign({ id: userId, email }, process.env.JWT_SECRET || 'supersecretkeythriftshoppolinela3d2026', { expiresIn: '7d' });
}

// 5. REGISTER: Daftar User Baru
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password harus diisi' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password minimal 6 karakter' });
    }

    // Cek email sudah terdaftar
    const supabase = getSupabaseClient();
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ message: 'Email sudah terdaftar' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert user baru
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({ email, password_hash: passwordHash })
      .select('id, email, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({ 
      message: 'Registrasi berhasil! Silakan login.',
      user: newUser 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat registrasi' });
  }
});

// 6. LOGIN: User Login
app.post('/api/auth/user-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password harus diisi' });
    }

    // Cari user
    const supabase = getSupabaseClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    // Verifikasi password
    const passwordValid = await comparePassword(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat login' });
  }
});

// 7. FORGOT PASSWORD: Request Reset Password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validasi input
    if (!email) {
      return res.status(400).json({ message: 'Email harus diisi' });
    }

    // Cari user
    const supabase = getSupabaseClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      // Jangan reveal apakah email terdaftar atau tidak (security best practice)
      return res.json({ message: 'Jika email terdaftar, Anda akan menerima kode reset' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 menit

    // Update user dengan OTP
    const { error: updateError } = await supabase
      .from('users')
      .update({ reset_otp: otp, reset_otp_expires_at: expiresAt })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // TODO: Kirim email dengan OTP
    // Untuk demo, log OTP ke console
    console.log(`[DEMO] OTP untuk ${email}: ${otp}`);

    res.json({ message: 'Kode reset telah dikirim ke email Anda. Gunakan kode 6 digit yang diberikan.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// 8. RESET PASSWORD: Verifikasi OTP dan Update Password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Validasi input
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, dan password baru harus diisi' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password minimal 6 karakter' });
    }

    // Cari user
    const supabase = getSupabaseClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'Email tidak ditemukan' });
    }

    // Verifikasi OTP
    if (user.reset_otp !== otp) {
      return res.status(401).json({ message: 'Kode OTP salah' });
    }

    // Cek OTP sudah expired
    if (new Date() > new Date(user.reset_otp_expires_at)) {
      return res.status(401).json({ message: 'Kode OTP sudah kadaluarsa' });
    }

    // Hash password baru
    const passwordHash = await hashPassword(newPassword);

    // Update password dan clear OTP
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: passwordHash, reset_otp: null, reset_otp_expires_at: null })
      .eq('id', user.id);

    if (updateError) throw updateError;

    res.json({ message: 'Password berhasil direset. Silakan login dengan password baru Anda.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// ==========================================
//          ADMIN ENDPOINTS
// ==========================================

// Hardcoded Admin Credentials (untuk production, pindahkan ke database)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123' // Plaintext untuk demo - jangan gunakan di production!
};

// 9. ADMIN LOGIN: Hardcoded admin credentials
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validasi input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password harus diisi' });
    }

    // Cek username dan password
    if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    // Generate token
    const token = generateToken('admin', username);

    res.json({
      message: 'Login admin berhasil',
      token,
      admin: {
        id: 'admin',
        username: username
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat login' });
  }
});

// 10. DATABASE STATUS: Check Supabase connection
app.get('/api/db-status', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    
    // Test connection with a simple query
    const { data, error } = await supabase
      .from('products')
      .select('count', { count: 'exact' })
      .limit(0);

    if (error) {
      return res.status(500).json({
        type: 'error',
        connected: false,
        message: 'Koneksi Supabase gagal'
      });
    }

    res.json({
      type: 'supabase',
      connected: true,
      message: 'Terhubung ke Supabase PostgreSQL'
    });
  } catch (error) {
    console.error('DB status error:', error);
    res.status(500).json({
      type: 'error',
      connected: false,
      message: 'Error memeriksa koneksi database'
    });
  }
});

// 11. IMAGE UPLOAD: Upload gambar produk
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    // Verify token (optional, but recommended for security)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token tidak ditemukan' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diupload' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({
      message: 'Gambar berhasil diupload',
      url: imageUrl
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Gagal mengupload gambar' });
  }
});

// 12. STATS: Get product statistics
app.get('/api/stats', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    
    // Get all products
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .neq('status', 'dihapus');

    if (error) throw error;

    // Calculate stats
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const categories = new Set(products.map(p => p.category));
    const categoriesCount = categories.size;

    res.json({
      totalProducts,
      totalStock,
      categoriesCount
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      totalProducts: 0, 
      totalStock: 0, 
      categoriesCount: 0 
    });
  }
});

// ==========================================
//          TRANSAKSI ENDPOINTS
// ==========================================

// 13. TRANSAKSI: Catat Riwayat Pembelian
app.post('/api/transactions', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let userId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkeythriftshoppolinela3d2026');
        userId = decoded.id;
      } catch (err) {
        console.error("Token verification failed:", err);
      }
    }

    if (!userId) {
      return res.status(401).json({ message: 'Harus login untuk mencatat riwayat transaksi' });
    }

    const { products } = req.body;
    if (!products || products.length === 0) {
      return res.status(400).json({ message: 'Produk tidak boleh kosong' });
    }

    const supabase = getSupabaseClient();
    
    const records = products.map(p => ({
      user_id: userId,
      product_id: p.product_id,
      status: 'Pending'
    }));

    const { data, error } = await supabase
      .from('transactions')
      .insert(records)
      .select('*');

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Transaction error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mencatat transaksi' });
  }
});

// 14. GET TRANSAKSI: Ambil Semua Riwayat Transaksi (Admin)
app.get('/api/transactions', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('transactions')
      .select('*, users(email), products(name, price, category, size, image_url)')
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Gagal mengambil data transaksi' });
  }
});

// 15. UPDATE STATUS TRANSAKSI: Ubah status menjadi Selesai / Pending
app.patch('/api/transactions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Pending', 'Selesai'].includes(status)) {
      return res.status(400).json({ message: 'Status harus Pending atau Selesai' });
    }

    const supabase = getSupabaseClient();

    // Update status transaksi
    const { data, error } = await supabase
      .from('transactions')
      .update({ status })
      .eq('id', id)
      .select('*');

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    }

    const transaction = data[0];

    // Jika Selesai → soft-delete produk (hilang dari toko)
    // Jika Pending (uncheck) → kembalikan produk ke toko
    if (transaction.product_id) {
      const productStatus = status === 'Selesai' ? 'dihapus' : 'tersedia';
      await supabase
        .from('products')
        .update({ status: productStatus })
        .eq('id', transaction.product_id);
    }

    res.json(transaction);
  } catch (error) {
    console.error('Update transaction status error:', error);
    res.status(500).json({ message: 'Gagal memperbarui status transaksi' });
  }
});

// Jalankan Server
const server = app.listen(PORT, () => {
  console.log(`Server Backend berjalan di http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} sudah digunakan. Tutup proses lama atau ubah PORT di file .env.`);
  } else {
    console.error(error);
  }
  process.exit(1);
});