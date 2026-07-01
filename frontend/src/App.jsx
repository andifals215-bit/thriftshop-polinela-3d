import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, X, ChevronRight, Trash2, 
  Plus, Minus, Info, User, ExternalLink, MessageCircle, AlertCircle 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import ThreeCanvas from './components/ThreeCanvas.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import Background3D from './components/Background3D.jsx';
import WangLinAssistant from './components/WangLinAssistant.jsx';

const WHATSAPP_NUMBER = '6285783252484'; // Format Internasional (tanpa + atau 0 di depan)

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'admin'
  const [products, setProducts] = useState([]);
  const [userToken, setUserToken] = useState(localStorage.getItem('thrift_user_token') || '');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('thrift_user_email') || '');
  
  // User login/register form state
  const [userAuthMode, setUserAuthMode] = useState('login'); // 'login' | 'register' | 'forgot_password' | 'reset_password'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [authNewPassword, setAuthNewPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  const handleUserAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (userAuthMode === 'forgot_password') {
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail })
        });
        const data = await res.json();
        if (res.ok) {
          setAuthSuccess(data.message);
          setUserAuthMode('reset_password');
        } else {
          setAuthError(data.message || 'Terjadi kesalahan.');
        }
      } catch (err) {
        setAuthError('Gagal terhubung ke server.');
      }
      return;
    }

    if (userAuthMode === 'reset_password') {
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, otp: authOtp, newPassword: authNewPassword })
        });
        const data = await res.json();
        if (res.ok) {
          setAuthSuccess(data.message);
          setUserAuthMode('login');
          setAuthOtp('');
          setAuthNewPassword('');
          setAuthPassword('');
        } else {
          setAuthError(data.message || 'Terjadi kesalahan.');
        }
      } catch (err) {
        setAuthError('Gagal terhubung ke server.');
      }
      return;
    }

    const endpoint = userAuthMode === 'login' ? '/api/auth/user-login' : '/api/auth/register';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();

      if (res.ok) {
        if (userAuthMode === 'login') {
          localStorage.setItem('thrift_user_token', data.token);
          localStorage.setItem('thrift_user_email', data.user.email);
          setUserToken(data.token);
          setUserEmail(data.user.email);
          setAuthEmail('');
          setAuthPassword('');
        } else {
          setAuthSuccess(data.message);
          setUserAuthMode('login');
          setAuthPassword('');
        }
      } else {
        setAuthError(data.message || 'Terjadi kesalahan.');
      }
    } catch (err) {
      setAuthError('Gagal terhubung ke server.');
    }
  };

  const handleUserLogout = () => {
    localStorage.removeItem('thrift_user_token');
    localStorage.removeItem('thrift_user_email');
    setUserToken('');
    setUserEmail('');
    setCart([]);
  };
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  // Modal & Cart State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // Load products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter products when search term or category changes
  useEffect(() => {
    let result = products;

    if (selectedCategory !== 'Semua') {
      result = result.filter(p => p.category === selectedCategory);
    }

    if (searchTerm) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(result);
  }, [searchTerm, selectedCategory, products]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
        setFilteredProducts(data);
      }
    } catch (error) {
      console.error("Gagal mengambil data produk:", error);
    } finally {
      setLoading(false);
    }
  };

  // Direct Buy via WhatsApp
  const handleDirectBuy = (product) => {
    if (product.stock <= 0) {
      alert("Maaf, stok barang ini sudah habis.");
      return;
    }

    const message = `*HALO THRIFTSHOP POLINELA!*\n\nSaya tertarik untuk memesan produk berikut:\n\n🛍️ *Detail Produk:*\n- *Nama:* ${product.name}\n- *Kategori:* ${product.category}\n- *Ukuran:* ${product.size}\n- *Harga:* Rp ${parseFloat(product.price).toLocaleString('id-ID')}\n\nMohon informasi ketersediaan dan cara pemesanan selanjutnya. Terima kasih! 🙏✨`;
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    
    // Record Transaction
    if (userToken) {
      try {
        fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify({
            products: [{ product_id: product.id }]
          })
        }).catch(err => console.error("Gagal mencatat transaksi", err));
      } catch (err) {
        console.error("Error saat mencatat transaksi:", err);
      }
    }
    
    // Celebrate with Confetti!
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 }
    });

    // Open WA link
    window.open(waUrl, '_blank');
  };

  // Cart Management
  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert("Maaf, stok barang ini sudah habis.");
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        alert("Jumlah pesanan melebihi stok yang tersedia.");
        return;
      }
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    
    // Auto open cart drawer
    setIsCartOpen(true);
  };

  const updateCartQuantity = (id, change) => {
    const item = cart.find(item => item.id === id);
    if (!item) return;

    const newQty = item.quantity + change;
    if (newQty <= 0) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      // check stock
      if (change > 0 && newQty > item.stock) {
        alert("Jumlah pesanan melebihi stok yang tersedia.");
        return;
      }
      setCart(cart.map(item => 
        item.id === id ? { ...item, quantity: newQty } : item
      ));
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  };

  // Checkout Handler via WhatsApp
  const handleCheckout = (e) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      alert("Keranjang belanja Anda kosong.");
      return;
    }

    if (!customerName || !customerAddress) {
      alert("Harap isi Nama dan Alamat Pengiriman.");
      return;
    }

    // Build WA Order Text
    let message = `*HALO THRIFTSHOP POLINELA!*\n`;
    message += `Saya ingin memesan pakaian dengan rincian berikut:\n\n`;
    
    cart.forEach((item, idx) => {
      message += `${idx + 1}. *${item.name}* (${item.size}) - ${item.quantity}x @ Rp ${parseFloat(item.price).toLocaleString('id-ID')}\n`;
    });

    const total = calculateTotal();
    message += `\n💵 *Total Pembayaran:* Rp ${total.toLocaleString('id-ID')}\n\n`;
    message += `👤 *Data Pemesan:*\n`;
    message += `- *Nama:* ${customerName}\n`;
    message += `- *Alamat:* ${customerAddress}\n`;
    if (customerNotes) {
      message += `- *Catatan:* ${customerNotes}\n`;
    }
    
    message += `\nTerima kasih, mohon segera diproses ya! 🙏✨`;

    // Encode text
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

    // Record Transaction
    if (userToken) {
      try {
        fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify({
            products: cart.map(item => ({ product_id: item.id }))
          })
        }).catch(err => console.error("Gagal mencatat transaksi", err));
      } catch (err) {
        console.error("Error saat mencatat transaksi:", err);
      }
    }

    // Celebrate checkout success with Confetti!
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });

    // Clear cart and state
    setTimeout(() => {
      setCart([]);
      setCustomerName('');
      setCustomerAddress('');
      setCustomerNotes('');
      setIsCartOpen(false);
      
      // Open WA link
      window.open(waUrl, '_blank');
    }, 1000);
  };

  const handleOpenProductDetails = (product) => {
    setSelectedProduct(product);
  };

  const handleFloatingWA = () => {
    const text = encodeURIComponent('Halo Thriftshop Polinela, saya ingin bertanya-tanya tentang produk thrift yang tersedia.');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
  };

  return (
    <div>
      {/* 3D Background */}
      <Background3D />

      {/* Background Ambients */}
      <div className="ambient-glow ambient-1"></div>
      <div className="ambient-glow ambient-2"></div>
      <div className="ambient-glow ambient-3"></div>

      {/* Floating WA support */}
      <div className="wa-floating-btn" onClick={handleFloatingWA} title="Chat WhatsApp Toko">
        <MessageCircle size={28} />
      </div>

      {/* Wang Lin AI Assistant */}
      <WangLinAssistant />

      {/* Main Navigation */}
      <nav className="navbar">
        <div className="container navbar-inner">
          <div className="logo-container" onClick={() => setCurrentPage('home')}>
            <div className="logo-icon">
              <ShoppingBag size={20} color="#fff" />
            </div>
            <div className="logo-text">THRIFTSHOP POLINELA</div>
          </div>

          <div className="nav-links">
            <span 
              className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
              onClick={() => setCurrentPage('home')}
            >
              Koleksi
            </span>
            <span 
              className={`nav-link ${currentPage === 'admin' ? 'active' : ''}`}
              onClick={() => setCurrentPage('admin')}
            >
              Dashboard Admin
            </span>
          </div>

          <div className="nav-actions">
            {currentPage === 'home' && userToken && (
              <button className="btn-icon" onClick={() => setIsCartOpen(true)}>
                <ShoppingBag size={20} />
                {cart.length > 0 && <span className="badge">{cart.reduce((s, i) => s + i.quantity, 0)}</span>}
              </button>
            )}
            
            {userToken ? (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span className="user-email-badge" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {userEmail}
                </span>
                <button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={handleUserLogout}>
                  Logout
                </button>
              </div>
            ) : null}

            {(!userToken || currentPage === 'admin') && (
              <button 
                className="btn btn-outline"
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => setCurrentPage(currentPage === 'home' ? 'admin' : 'home')}
              >
                <User size={14} />
                {currentPage === 'home' ? 'Login Admin' : 'Halaman Toko'}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Render Pages */}
      {currentPage === 'admin' ? (
        <AdminPanel onNavigateToHome={() => setCurrentPage('home')} />
      ) : !userToken ? (
        <div className="admin-login-container">
          <div className="ambient-glow ambient-1"></div>
          <div className="ambient-glow ambient-2"></div>
          
          <div className="glass-panel login-card">
            <div className="login-header">
              <div className="logo-icon" style={{ display: 'inline-flex', marginBottom: '16px' }}>
                <ShoppingBag size={24} color="#fff" />
              </div>
              <h2>
                {userAuthMode === 'login' ? 'Masuk Toko' : 
                 userAuthMode === 'register' ? 'Daftar Akun Baru' :
                 userAuthMode === 'forgot_password' ? 'Lupa Sandi' : 'Reset Sandi'}
              </h2>
              <p>
                {userAuthMode === 'login' ? 'Gunakan email & sandi untuk mulai belanja' : 
                 userAuthMode === 'register' ? 'Silakan lengkapi data registrasi Anda' :
                 userAuthMode === 'forgot_password' ? 'Masukkan email untuk menerima kode reset' : 'Masukkan kode OTP dan sandi baru Anda'}
              </p>
            </div>

            {authError && (
              <div className="error-message">
                <AlertCircle size={18} />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#10b981', fontSize: '13px', marginBottom: '16px', alignItems: 'center' }}>
                <Info size={18} />
                <span>{authSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUserAuth}>
              <div className="form-group">
                <label className="form-label">Alamat Email</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="contoh@email.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  disabled={userAuthMode === 'reset_password'}
                />
              </div>

              {(userAuthMode === 'login' || userAuthMode === 'register') && (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Kata Sandi</label>
                    {userAuthMode === 'login' && (
                      <span 
                        onClick={() => {
                          setUserAuthMode('forgot_password');
                          setAuthError('');
                          setAuthSuccess('');
                        }}
                        style={{ fontSize: '12px', color: 'var(--accent-cyan)', cursor: 'pointer' }}
                      >
                        Lupa Sandi?
                      </span>
                    )}
                  </div>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Masukkan kata sandi Anda"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    style={{ marginTop: '8px' }}
                  />
                </div>
              )}

              {userAuthMode === 'reset_password' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Kode OTP</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Masukkan 6 digit kode OTP"
                      value={authOtp}
                      onChange={(e) => setAuthOtp(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sandi Baru</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="Masukkan sandi baru"
                      value={authNewPassword}
                      onChange={(e) => setAuthNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                {userAuthMode === 'login' ? 'Masuk' : 
                 userAuthMode === 'register' ? 'Daftar Sekarang' : 
                 userAuthMode === 'forgot_password' ? 'Kirim Kode Reset' : 'Simpan Sandi Baru'}
              </button>
            </form>

            <button 
              onClick={() => {
                setUserAuthMode(userAuthMode === 'login' ? 'register' : 'login');
                setAuthError('');
                setAuthSuccess('');
              }} 
              className="btn btn-outline" 
              style={{ width: '100%', marginTop: '16px' }}
            >
              {userAuthMode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <span 
                onClick={() => setCurrentPage('admin')} 
                style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Login sebagai Admin
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Hero Section */}
          <section className="hero">
            <div className="container hero-grid">
              <div className="hero-content">
                <div className="hero-badge">
                  <span>✨ BRAND NEW ARRIVALS</span>
                </div>
                <h1 className="hero-title">
                  Tampil Keren & <br />
                  <span className="brand-gradient">Ramah Lingkungan</span>
                </h1>
                <p className="hero-description">
                  Temukan koleksi pakaian thrift terbaik dan termurah di Polinela. Model terkurasi, dicuci higienis, dan siap menemani gaya harianmu!
                </p>
                <div className="hero-cta">
                  <a href="#koleksi" className="btn btn-primary">
                    Lihat Koleksi <ChevronRight size={16} />
                  </a>
                  <button onClick={handleFloatingWA} className="btn btn-outline">
                    Hubungi Toko (WA)
                  </button>
                </div>
              </div>

              {/* 3D Showcase */}
              <div className="hero-visualizer">
                <ThreeCanvas />
              </div>
            </div>
          </section>

          {/* Catalog Section */}
          <section className="products-section" id="koleksi">
            <div className="container">
              <div className="section-header">
                <div className="section-title">
                  <h2>Katalog Pilihan</h2>
                  <p>Filter pakaian berdasarkan kebutuhan gaya Anda</p>
                </div>

                {/* Search box */}
                <div className="search-container">
                  <Search size={18} className="search-icon" />
                  <input 
                    type="text" 
                    className="search-input" 
                    placeholder="Cari jaket, flanel, celana..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="filter-bar">
                {['Semua', 'Outerwear', 'Shirts', 'Pants', 'Accessories'].map(cat => (
                  <button 
                    key={cat} 
                    className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Loading Indicator */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                  <div className="spin-slow" style={{ display: 'inline-block', marginBottom: '16px' }}>
                    <ShoppingBag size={36} color="#a855f7" />
                  </div>
                  <p>Sedang memuat katalog pakaian thrift terbaik...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                  <Info size={36} style={{ marginBottom: '16px' }} />
                  <p>Tidak ada produk yang sesuai dengan pencarian Anda.</p>
                </div>
              ) : (
                /* Product Grid */
                <div className="product-grid">
                  {filteredProducts.map((prod) => (
                    <div className="glass-panel product-card" key={prod.id}>
                      <div className="product-image-container">
                        <span className="product-card-badge">{prod.category}</span>
                        <img 
                          src={prod.image_url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500'} 
                          alt={prod.name} 
                          className="product-image"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="product-card-glow"></div>
                      </div>

                      <div className="product-info">
                        <div>
                          <div className="product-meta">
                            <span className="product-cat">{prod.category}</span>
                            <span className="product-size-tag">Size: {prod.size}</span>
                          </div>
                          <h3 className="product-name" onClick={() => handleOpenProductDetails(prod)}>
                            {prod.name}
                          </h3>
                        </div>

                        <div className="product-footer">
                          <div>
                            <div className="product-price">
                              Rp {parseFloat(prod.price).toLocaleString('id-ID')}
                            </div>
                            <div className={`product-stock ${prod.stock === 0 ? 'out-of-stock' : ''}`}>
                              {prod.stock > 0 ? `Stok: ${prod.stock} pcs` : 'Habis'}
                            </div>
                          </div>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '8px 16px', fontSize: '13px' }}
                            onClick={() => handleDirectBuy(prod)}
                            disabled={prod.stock <= 0}
                          >
                            Beli
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Footer */}
          <footer className="footer">
            <div className="container">
              <div className="footer-grid">
                <div className="footer-about">
                  <div className="logo-container" style={{ marginBottom: '16px' }}>
                    <div className="logo-icon">
                      <ShoppingBag size={20} color="#fff" />
                    </div>
                    <div className="logo-text">THRIFTSHOP POLINELA</div>
                  </div>
                  <p>
                    Platform Thrift Shop 3D Eksklusif mahasiswa Politeknik Negeri Lampung. Keren, terjangkau, dan berkelanjutan.
                  </p>
                </div>

                <div>
                  <h4 className="footer-links-title">Navigasi</h4>
                  <ul className="footer-links">
                    <li className="footer-link"><a href="#koleksi">Koleksi</a></li>
                    <li className="footer-link"><span style={{ cursor: 'pointer' }} onClick={() => setCurrentPage('admin')}>Login Admin</span></li>
                    <li className="footer-link"><span style={{ cursor: 'pointer' }} onClick={handleFloatingWA}>Hubungi Toko</span></li>
                  </ul>
                </div>

                <div>
                  <h4 className="footer-links-title">Kontak Hubung</h4>
                  <ul className="footer-links" style={{ color: '#9ca3af', fontSize: '14px' }}>
                    <li>📍 Kampus Polinela, Bandar Lampung</li>
                    <li>📞 WhatsApp: 0857-8325-2484</li>
                    <li>✉️ support@thriftshoppolinela.com</li>
                  </ul>
                </div>
              </div>

              <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} Thriftshop Polinela 3D. All rights reserved.</p>
                <p>Designed with ❤️ for Polinela Students</p>
              </div>
            </div>
          </footer>

          {/* Product Detail Modal */}
          <div className={`modal-overlay ${selectedProduct ? 'open' : ''}`}>
            {selectedProduct && (
              <div className="glass-panel product-modal">
                <button className="modal-close" onClick={() => setSelectedProduct(null)}>
                  <X size={18} />
                </button>

                <div className="modal-image-area">
                  <img 
                    src={selectedProduct.image_url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500'} 
                    alt={selectedProduct.name} 
                  />
                </div>

                <div className="modal-info-area">
                  <div className="modal-info-header">
                    <span className="product-cat">{selectedProduct.category}</span>
                    <h2 className="modal-title">{selectedProduct.name}</h2>
                    <div className="modal-price">
                      Rp {parseFloat(selectedProduct.price).toLocaleString('id-ID')}
                    </div>
                  </div>

                  <p className="modal-desc">
                    {selectedProduct.description || "Tidak ada deskripsi detail untuk produk ini. Hubungi admin toko via WhatsApp untuk penjelasan lebih lanjut mengenai kecacatan/detail produk."}
                  </p>

                  <div className="modal-meta-row">
                    <div className="modal-meta-box">
                      <h5>Ukuran</h5>
                      <p><span className="product-size-tag" style={{ fontSize: '12px' }}>{selectedProduct.size}</span></p>
                    </div>
                    <div className="modal-meta-box">
                      <h5>Stok Tersedia</h5>
                      <p>{selectedProduct.stock} Pcs</p>
                    </div>
                    <div className="modal-meta-box">
                      <h5>Kondisi</h5>
                      <p>Very Good (9/10)</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => {
                        handleDirectBuy(selectedProduct);
                        setSelectedProduct(null);
                      }}
                      className="btn btn-primary"
                      style={{ flex: '2 1 180px' }}
                      disabled={selectedProduct.stock <= 0}
                    >
                      Beli via WhatsApp
                    </button>
                    <button 
                      onClick={() => {
                        addToCart(selectedProduct);
                        setSelectedProduct(null);
                      }}
                      className="btn btn-outline"
                      style={{ flex: '1 1 150px' }}
                      disabled={selectedProduct.stock <= 0}
                    >
                      Tambah Keranjang
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cart Drawer */}
          <div className={`cart-drawer-overlay ${isCartOpen ? 'open' : ''}`} onClick={() => setIsCartOpen(false)}>
            <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="cart-header">
                <div className="cart-title">
                  <ShoppingBag size={22} className="text-glow-cyan" />
                  <h3>Keranjang Belanja</h3>
                </div>
                <button className="cart-close-btn" onClick={() => setIsCartOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="cart-items-list">
                {cart.length === 0 ? (
                  <div className="cart-empty">
                    <ShoppingBag size={48} style={{ strokeWidth: 1.5 }} />
                    <h4>Keranjang Kosong</h4>
                    <p>Cari pakaian favoritmu di katalog dan tambahkan ke sini.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div className="cart-item" key={item.id}>
                      <img 
                        src={item.image_url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=100'} 
                        alt={item.name} 
                        className="cart-item-img"
                        loading="lazy"
                      />
                      <div className="cart-item-info">
                        <div>
                          <div className="cart-item-name">{item.name}</div>
                          <div className="cart-item-meta">
                            <span>Size: {item.size}</span>
                            <span>•</span>
                            <span>Stok: {item.stock}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                          <div className="cart-qty-control">
                            <button className="cart-qty-btn" onClick={() => updateCartQuantity(item.id, -1)}><Minus size={10} /></button>
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.quantity}</span>
                            <button className="cart-qty-btn" onClick={() => updateCartQuantity(item.id, 1)}><Plus size={10} /></button>
                          </div>
                          <div className="cart-item-price">
                            Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                      <button className="cart-item-remove" onClick={() => removeFromCart(item.id)} style={{ position: 'absolute', top: '12px', right: '12px' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="cart-footer">
                  <div className="cart-total-row">
                    <span className="cart-total-label">Subtotal</span>
                    <span className="cart-total-val">Rp {calculateTotal().toLocaleString('id-ID')}</span>
                  </div>

                  <form onSubmit={handleCheckout} className="checkout-form">
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>Nama Pemesan</label>
                      <input 
                        type="text" 
                        className="checkout-input" 
                        placeholder="Contoh: Budi Santoso"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>Alamat Pengiriman</label>
                      <input 
                        type="text" 
                        className="checkout-input" 
                        placeholder="Alamat lengkap / Kost"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>Catatan Tambahan (Opsional)</label>
                      <input 
                        type="text" 
                        className="checkout-input" 
                        placeholder="Contoh: Titip di pos satpam kost"
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn btn-primary checkout-btn" style={{ marginTop: '12px' }}>
                      <ShoppingBag size={18} /> Checkout via WhatsApp
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
