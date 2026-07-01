import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, LogOut, Database, ShoppingBag, 
  Layers, Package, AlertCircle, X, ChevronRight, MessageSquare,
  CheckCircle2, Clock, ClipboardList
} from 'lucide-react';

const AdminPanel = ({ onNavigateToHome }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [token, setToken] = useState('');
  
  // Inventory state
  const [products, setProducts] = useState([]);
  const [dbStatus, setDbStatus] = useState({ type: 'fallback_json', connected: false });
  const [stats, setStats] = useState({ totalProducts: 0, totalStock: 0, categoriesCount: 0 });
  const [loading, setLoading] = useState(false);

  // Transactions state
  const [transactions, setTransactions] = useState([]);

  // Form modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [currentProductId, setCurrentProductId] = useState(null);
  
  // Product form fields
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formSize, setFormSize] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formCategory, setFormCategory] = useState('Outerwear');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Ukuran file terlalu besar. Maksimal 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    setUploadSuccess(false);
    setFormError('');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setFormImageUrl(data.url);
        setUploadSuccess(true);
      } else {
        setFormError(data.message || 'Gagal mengunggah gambar.');
      }
    } catch (err) {
      setFormError('Terjadi kesalahan koneksi saat mengunggah gambar.');
    } finally {
      setUploading(false);
    }
  };

  // Check login on component load
  useEffect(() => {
    const savedToken = localStorage.getItem('thrift_admin_token');
    if (savedToken) {
      setToken(savedToken);
      setIsLoggedIn(true);
      fetchAdminData(savedToken);
    }
  }, []);

  // Fetch data if logged in
  const fetchAdminData = async (authToken) => {
    setLoading(true);
    const headers = { 'Authorization': `Bearer ${authToken}` };
    try {
      // Fetch products
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }

      // Fetch database status
      const dbRes = await fetch('/api/db-status');
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        setDbStatus(dbData);
      }

      // Fetch stats
      const statsRes = await fetch('/api/stats', { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch transactions
      const txRes = await fetch('/api/transactions', { headers });
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData);
      }
    } catch (error) {
      console.error("Gagal memuat data admin:", error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle transaction status
  const handleToggleTransactionStatus = async (txId, currentStatus) => {
    const newStatus = currentStatus === 'Pending' ? 'Selesai' : 'Pending';
    try {
      const res = await fetch(`/api/transactions/${txId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setTransactions(prev => prev.map(tx =>
          tx.id === txId ? { ...tx, status: newStatus } : tx
        ));
        // Refresh products list to show/hide the product
        fetchAdminData(token);
      } else {
        alert('Gagal memperbarui status transaksi.');
      }
    } catch (err) {
      alert('Gagal menghubungi server.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('thrift_admin_token', data.token);
        setToken(data.token);
        setIsLoggedIn(true);
        fetchAdminData(data.token);
      } else {
        setLoginError(data.message || 'Username atau password salah.');
      }
    } catch (err) {
      setLoginError('Koneksi ke server backend gagal.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('thrift_admin_token');
    setToken('');
    setIsLoggedIn(false);
    setProducts([]);
  };

  // Open Modal for Add
  const openAddModal = () => {
    setModalMode('add');
    setCurrentProductId(null);
    setFormName('');
    setFormPrice('');
    setFormSize('');
    setFormImageUrl('');
    setFormStock('');
    setFormCategory('Outerwear');
    setFormDescription('');
    setFormError('');
    setUploadSuccess(false);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const openEditModal = (product) => {
    setModalMode('edit');
    setCurrentProductId(product.id);
    setFormName(product.name);
    setFormPrice(product.price);
    setFormSize(product.size);
    setFormImageUrl(product.image_url || '');
    setFormStock(product.stock);
    setFormCategory(product.category);
    setFormDescription(product.description || '');
    setFormError('');
    setUploadSuccess(false);
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formName || !formPrice || !formSize || !formCategory || formStock === '') {
      setFormError('Semua field wajib diisi (kecuali deskripsi & URL gambar).');
      return;
    }

    const payload = {
      name: formName,
      price: parseFloat(formPrice),
      size: formSize,
      image_url: formImageUrl || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500',
      stock: parseInt(formStock),
      category: formCategory,
      description: formDescription
    };

    const url = modalMode === 'add' ? '/api/products' : `/api/products/${currentProductId}`;
    const method = modalMode === 'add' ? 'POST' : 'PUT';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setIsModalOpen(false);
        fetchAdminData(token); // refresh
      } else {
        setFormError(data.message || 'Gagal menyimpan produk.');
      }
    } catch (err) {
      setFormError('Gagal menghubungi server.');
    }
  };

  // Handle Delete Product
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchAdminData(token); // refresh
      } else {
        alert('Gagal menghapus produk.');
      }
    } catch (err) {
      alert('Gagal menghubungi server.');
    }
  };

  // Contact customer helper or admin tools linked to WA
  const openAdminWA = () => {
    const text = encodeURIComponent('Halo Admin Thriftshop Polinela, saya ingin berkonsultasi mengenai pengelolaan dashboard toko.');
    window.open(`https://wa.me/6285783252484?text=${text}`, '_blank');
  };

  // Return Login Screen if not authenticated
  if (!isLoggedIn) {
    return (
      <div className="admin-login-container">
        <div className="ambient-glow ambient-1"></div>
        <div className="ambient-glow ambient-2"></div>
        
        <div className="glass-panel login-card">
          <div className="login-header">
            <div className="logo-icon" style={{ display: 'inline-flex', marginBottom: '16px' }}>
              <Database size={24} color="#fff" />
            </div>
            <h2>Admin Login</h2>
            <p>Kelola Inventori Thriftshop Polinela</p>
          </div>

          {loginError && (
            <div className="error-message">
              <AlertCircle size={18} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Masukkan username admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Masukkan password admin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              Masuk ke Dashboard
            </button>
          </form>

          <button 
            onClick={onNavigateToHome} 
            className="btn btn-outline" 
            style={{ width: '100%', marginTop: '16px' }}
          >
            Kembali ke Toko
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <div className="ambient-glow ambient-1"></div>
      <div className="ambient-glow ambient-2"></div>

      <div className="container">
        {/* Admin Navigation */}
        <div className="admin-header-row">
          <div className="admin-title-area">
            <h2>Dashboard Admin</h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
              {dbStatus.connected && dbStatus.type === 'sqlserver' ? (
                <span className="db-status-pill">
                  <Database size={12} /> Connected: SQL Server ({dbStatus.host})
                </span>
              ) : (
                <span className="db-status-pill fallback">
                  <AlertCircle size={12} /> Local JSON Failover (MSSQL Offline)
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={openAdminWA} className="btn btn-outline" style={{ borderColor: '#25d366', color: '#25d366' }}>
              <MessageSquare size={16} /> Hubungi Developer (WA)
            </button>
            <button onClick={onNavigateToHome} className="btn btn-secondary">
              Lihat Toko
            </button>
            <button onClick={handleLogout} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
              <LogOut size={16} /> Keluar
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="admin-stats-grid">
          <div className="glass-panel stat-card">
            <div className="stat-icon">
              <ShoppingBag size={24} />
            </div>
            <div>
              <div className="stat-value">{stats.totalProducts}</div>
              <div className="stat-label">Total Item Produk</div>
            </div>
          </div>

          <div className="glass-panel stat-card">
            <div className="stat-icon">
              <Package size={24} />
            </div>
            <div>
              <div className="stat-value">{stats.totalStock} Pcs</div>
              <div className="stat-label">Jumlah Stok Total</div>
            </div>
          </div>

          <div className="glass-panel stat-card">
            <div className="stat-icon">
              <Layers size={24} />
            </div>
            <div>
              <div className="stat-value">{stats.categoriesCount}</div>
              <div className="stat-label">Kategori Aktif</div>
            </div>
          </div>
        </div>

        {/* Inventory Table Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3>Kelola Inventori Produk</h3>
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus size={16} /> Tambah Produk Baru
          </button>
        </div>

        {/* Products Table */}
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Kategori</th>
                <th>Ukuran</th>
                <th>Harga</th>
                <th>Stok</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textLines: 'center', padding: '40px', color: '#9ca3af', textAlign: 'center' }}>
                    Belum ada produk terdaftar. Klik "Tambah Produk Baru" untuk memulai.
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.id}>
                    <td>
                      <div className="table-product-cell">
                        <img 
                          src={prod.image_url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=100'} 
                          alt={prod.name} 
                          className="table-product-img"
                        />
                        <div>
                          <div className="table-product-name">{prod.name}</div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>ID: {prod.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{prod.category}</td>
                    <td><span className="product-size-tag">{prod.size}</span></td>
                    <td style={{ fontWeight: 700 }}>
                      Rp {parseFloat(prod.price).toLocaleString('id-ID')}
                    </td>
                    <td>
                      <span style={{ color: prod.stock <= 3 ? '#ec4899' : 'inherit', fontWeight: prod.stock <= 3 ? 600 : 'normal' }}>
                        {prod.stock} Pcs {prod.stock <= 3 && '(Stok Menipis)'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                        <button onClick={() => openEditModal(prod)} className="action-btn edit" title="Edit Produk">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteProduct(prod.id)} className="action-btn delete" title="Hapus Produk">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Transactions Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', marginTop: '48px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardList size={22} />
            Riwayat Transaksi
          </h3>
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>
            {transactions.filter(t => t.status === 'Pending').length} Pending &bull; {transactions.filter(t => t.status === 'Selesai').length} Selesai
          </span>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>✓</th>
                <th>Produk</th>
                <th>Pembeli</th>
                <th>Tanggal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', color: '#9ca3af', textAlign: 'center' }}>
                    Belum ada riwayat transaksi.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} style={{ opacity: tx.status === 'Selesai' ? 0.6 : 1 }}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={tx.status === 'Selesai'}
                        onChange={() => handleToggleTransactionStatus(tx.id, tx.status)}
                        style={{
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                          accentColor: '#10b981'
                        }}
                        title={tx.status === 'Selesai' ? 'Tandai kembali sebagai Pending' : 'Tandai sebagai Selesai'}
                      />
                    </td>
                    <td>
                      <div className="table-product-cell">
                        <img
                          src={tx.products?.image_url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=100'}
                          alt={tx.products?.name || 'Produk'}
                          className="table-product-img"
                        />
                        <div>
                          <div className="table-product-name" style={{ textDecoration: tx.status === 'Selesai' ? 'line-through' : 'none' }}>
                            {tx.products?.name || 'Produk Tidak Dikenal'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            {tx.products?.category} &bull; {tx.products?.size} &bull; Rp {parseFloat(tx.products?.price || 0).toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '13px' }}>{tx.users?.email || '-'}</td>
                    <td style={{ fontSize: '13px' }}>
                      {tx.transaction_date ? new Date(tx.transaction_date).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td>
                      {tx.status === 'Selesai' ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                          background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          <CheckCircle2 size={14} /> Selesai
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                          background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)'
                        }}>
                          <Clock size={14} /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <div className={`modal-overlay ${isModalOpen ? 'open' : ''}`}>
        <div className="glass-panel admin-modal">
          <div className="modal-header">
            <h3>{modalMode === 'add' ? 'Tambah Produk Baru' : 'Edit Produk'}</h3>
            <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {formError && (
            <div className="error-message">
              <AlertCircle size={18} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit}>
            <div className="form-group">
              <label className="form-label">Nama Produk</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Contoh: Jaket Varsity Vintage"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Harga (Rp)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Contoh: 120000"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ukuran (Size)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Contoh: XL, L, M, 32"
                  value={formSize}
                  onChange={(e) => setFormSize(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <select 
                  className="form-input"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  style={{ background: '#08080c' }}
                >
                  <option value="Outerwear">Outerwear</option>
                  <option value="Shirts">Shirts</option>
                  <option value="Pants">Pants</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Stok</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Contoh: 10"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Foto Produk (Upload / URL)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  id="image-upload-file"
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Pilih file atau masukkan URL gambar..."
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <label 
                    htmlFor="image-upload-file" 
                    className="btn btn-secondary"
                    style={{ padding: '0 16px', margin: 0, height: '42px', fontSize: '13px', display: 'flex', alignItems: 'center', cursor: 'pointer', borderRadius: '12px' }}
                  >
                    {uploading ? 'Mengupload...' : 'Pilih File'}
                  </label>
                </div>
                {uploadSuccess && <span style={{ fontSize: '11px', color: '#10b981', display: 'block', marginTop: '2px' }}>✓ Gambar berhasil diunggah!</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <textarea 
                className="form-input" 
                placeholder="Detail bahan, kondisi barang, dll."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows="3"
                style={{ resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
              >
                Batal
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ flex: 2 }}
              >
                {modalMode === 'add' ? 'Tambahkan Produk' : 'Perbarui Produk'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
