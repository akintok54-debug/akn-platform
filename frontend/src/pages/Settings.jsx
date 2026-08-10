import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const Settings = () => {
  const [company, setCompany] = useState({
    companyName: '',
    taxNumber: '',
    taxOffice: '',
    phone: '',
    email: '',
    address: '',
    logo: '',
    theme: 'light',
    taxRates: { kdv1: 1, kdv10: 10, kdv20: 20, withholding: 0 },
    printSettings: { paperSize: 'A4', showLogo: true, showSignature: false, footerText: '' },
  });
  const [profiles, setProfiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [ideasoft, setIdeasoft] = useState({ loading: false, status: null, syncing: false, resource: '', message: '' });
  const [ecommercePreview, setEcommercePreview] = useState({ loading: false, items: [], search: '', imagesOnly: false });
  const [loading, setLoading] = useState(false);
  const [profileName, setProfileName] = useState('Satış Temsilcisi');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedUserRole, setSelectedUserRole] = useState('sales');
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', userName: '', password: '', role: 'sales', customerId: '' });
  const [inviteRole, setInviteRole] = useState('sales');
  const [inviteCustomerId, setInviteCustomerId] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const [permissions, setPermissions] = useState({
    customers: true,
    suppliers: true,
    products: true,
    sales: true,
    invoices: true,
    accounting: false,
    reports: true,
    settings: false,
    cash: false,
    bank: false,
    inventory: true,
    approvePayments: false,
  });

  useEffect(() => {
    fetchCompany();
    fetchProfiles();
    fetchUsers();
    fetchRoles();
    fetchCustomers();
    fetchIdeaSoftStatus();
  }, []);

  useEffect(() => {
    if (activeTab === 'ecommerce' && ecommercePreview.items.length === 0 && !ecommercePreview.loading) {
      fetchEcommerceProducts();
    }
  }, [activeTab]);

  const fetchCompany = async () => {
    try {
      const response = await api.get('/company/me');
      const data = response?.data?.company;
      if (data) {
        setCompany((prev) => ({ ...prev, ...data, taxRates: { ...prev.taxRates, ...(data.taxRates || {}) }, printSettings: { ...prev.printSettings, ...(data.printSettings || {}) } }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const response = await api.get('/permissions');
      setProfiles(response?.data?.profiles || []);
      if (response?.data?.profiles?.length) {
        setSelectedProfileId(response.data.profiles[0]._id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/permissions/users');
      setUsers(response?.data?.users || []);
      if (response?.data?.users?.length) {
        setSelectedUserId(response.data.users[0]._id);
        setSelectedUserRole(response.data.users[0].role || 'sales');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.get('/permissions/roles');
      setRoles(response?.data?.roles || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers?page=1&limit=200');
      setCustomers(response?.data?.customers || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchIdeaSoftStatus = async () => {
    setIdeasoft((prev) => ({ ...prev, loading: true }));
    try {
      const response = await api.get('/erp/ideasoft/status');
      setIdeasoft((prev) => ({
        ...prev,
        loading: false,
        status: response?.data || null,
        message: response?.data?.connected ? 'IdeaSoft bağlı.' : 'IdeaSoft henüz bağlı değil.',
      }));
    } catch (error) {
      console.error(error);
      setIdeasoft((prev) => ({ ...prev, loading: false, message: error?.response?.data?.message || 'IdeaSoft durumu alınamadı.' }));
    }
  };

  const fetchEcommerceProducts = async () => {
    setEcommercePreview((prev) => ({ ...prev, loading: true }));
    try {
      const response = await api.get('/products');
      const items = response?.data?.data || response?.data?.products || response?.data || [];
      setEcommercePreview((prev) => ({ ...prev, loading: false, items: Array.isArray(items) ? items : [] }));
    } catch (error) {
      console.error(error);
      setEcommercePreview((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCompany((prev) => ({ ...prev, [name]: value }));
  };

  const handlePermissionToggle = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/company/me', company);
      localStorage.setItem('company', JSON.stringify(company));
      window.dispatchEvent(new Event('company-settings-updated'));
      alert('Firma ayarları kaydedildi.');
    } catch (error) {
      console.error(error);
      alert('Ayarlar kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await api.post('/permissions', {
        name: profileName,
        role: 'sales',
        permissions,
      });
      setProfileName('Satış Temsilcisi');
      setPermissions({
        customers: true,
        suppliers: true,
        products: true,
        sales: true,
        invoices: true,
        accounting: false,
        reports: true,
        settings: false,
        cash: false,
        bank: false,
        inventory: true,
        approvePayments: false,
      });
      fetchProfiles();
      alert('İzin profili oluşturuldu.');
    } catch (error) {
      console.error(error);
      alert('Profil kaydedilemedi.');
    }
  };

  const handleAssignProfile = async () => {
    if (!selectedUserId || !selectedProfileId) {
      alert('Kullanıcı ve profil seçmelisiniz.');
      return;
    }

    try {
      await api.post('/permissions/assign', { userId: selectedUserId, profileId: selectedProfileId });
      fetchUsers();
      alert('Profil kullanıcıya atanmıştır.');
    } catch (error) {
      console.error(error);
      alert('Profil atanamadı.');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/permissions/users', newUser);
      setNewUser({ name: '', email: '', phone: '', userName: '', password: '', role: 'sales', customerId: '' });
      await fetchUsers();
      alert('Kullanıcı eklendi.');
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || 'Kullanıcı eklenemedi.');
    }
  };

  const handleUpdateUserRole = async () => {
    if (!selectedUserId) return;
    try {
      await api.put(`/permissions/users/${selectedUserId}`, { role: selectedUserRole });
      await fetchUsers();
      alert('Kullanıcı rolü güncellendi.');
    } catch (error) {
      console.error(error);
      alert('Kullanıcı rolü güncellenemedi.');
    }
  };

  const handleGenerateInviteLink = async () => {
    if (inviteRole === 'dealer' && !inviteCustomerId) {
      alert('Bayi daveti için müşteri seçmelisiniz.');
      return;
    }

    setInviteLoading(true);
    try {
      const response = await api.post('/permissions/invite-link', {
        role: inviteRole,
        customerId: inviteCustomerId,
      });

      const token = response?.data?.token;
      if (!token) {
        throw new Error('Davet tokeni alınamadı.');
      }

      const link = `${window.location.origin}/register?invite=${encodeURIComponent(token)}`;
      setInviteLink(link);

      try {
        await navigator.clipboard.writeText(link);
      } catch (clipboardError) {
        console.warn(clipboardError);
      }

      alert('Davet linki oluşturuldu.');
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || 'Davet linki oluşturulamadı.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      const response = await api.get('/company/backup');
      const blob = new Blob([JSON.stringify(response?.data || {}, null, 2)], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `akn-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Yedekleme alınamadı.');
    }
  };

  const handleIdeaSoftConnect = async () => {
    try {
      const response = await api.get('/erp/ideasoft/auth-url');
      const authUrl = response?.data?.authUrl;
      if (!authUrl) {
        alert('Bağlantı adresi alınamadı.');
        return;
      }
      window.open(authUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || 'IdeaSoft bağlantısı başlatılamadı.');
    }
  };

  const handleIdeaSoftSync = async (resource) => {
    setIdeasoft((prev) => ({ ...prev, syncing: true, resource, message: '' }));
    try {
      const response = await api.post(`/erp/ideasoft/sync/${resource}`, { preview: false });
      const summary = response?.data?.summary || {};
      const imageNote = resource === 'products' ? ` Görseller de kaydedildi.` : '';
      setIdeasoft((prev) => ({
        ...prev,
        syncing: false,
        resource: '',
        message: `${resource} senkronu tamamlandı. ${summary.inserted || 0} eklendi, ${summary.updated || 0} güncellendi.${imageNote}`,
        status: prev.status,
      }));
      await fetchIdeaSoftStatus();
      alert(`${resource} senkronu tamamlandı.`);
    } catch (error) {
      console.error(error);
      setIdeasoft((prev) => ({ ...prev, syncing: false, resource: '', message: error?.response?.data?.message || 'Senkron başarısız.' }));
      alert(error?.response?.data?.message || 'Senkron başarısız.');
    }
  };

  const hasProductImage = (product) => Boolean(product?.image || (Array.isArray(product?.images) && product.images.length > 0));

  const getProductImage = (product) => {
    if (product?.image) return product.image;
    if (Array.isArray(product?.images) && product.images.length > 0) {
      const firstImage = product.images[0];
      if (typeof firstImage === 'string') return firstImage;
      if (firstImage && typeof firstImage === 'object') return firstImage.url || firstImage.src || firstImage.imageUrl || '';
    }
    return '';
  };

  const ecommerceFilteredItems = ecommercePreview.items.filter((product) => {
    const searchText = ecommercePreview.search.trim().toLowerCase();
    const matchesSearch = !searchText || [product.name, product.sku, product.barcode, product.brand, product.category]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(searchText);
    const matchesImageFilter = !ecommercePreview.imagesOnly || hasProductImage(product);
    return matchesSearch && matchesImageFilter;
  });

  const updateTaxRate = (key, value) => {
    setCompany((prev) => ({ ...prev, taxRates: { ...(prev.taxRates || {}), [key]: Number(value || 0) } }));
  };

  const updatePrintSettings = (key, value) => {
    setCompany((prev) => ({ ...prev, printSettings: { ...(prev.printSettings || {}), [key]: value } }));
  };

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 20 }}>
        <div style={{ background: '#fff', padding: 24, borderRadius: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
          <h2>⚙️ Ayarlar</h2>
          <p style={{ color: '#6b7280' }}>Firma bilgileri, kullanıcılar, yetkilendirme, roller, yedekleme, tema, logo, vergi oranları ve yazdırma ayarlarını yönetin.</p>

          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tabs.map((tab) => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} style={{ ...tabButtonStyle, ...(activeTab === tab.key ? activeTabStyle : {}) }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

          {activeTab === 'ecommerce' && (
            <div style={{ background: '#fff', padding: 24, borderRadius: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
              <h3 style={{ marginTop: 0 }}>🛒 E-Ticaret Yönetimi</h3>
              <p style={{ color: '#6b7280' }}>IdeaSoft bağlantı durumu, kaynak senkronu ve ürün görsel aktarımı burada yönetilir.</p>

              <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Bağlantı Durumu</div>
                  <div style={{ color: '#475569', fontSize: 14 }}>
                    {ideasoft.loading ? 'Durum kontrol ediliyor...' : ideasoft.status?.connected ? 'IdeaSoft bağlı ve senkrona hazır.' : 'Bağlantı henüz kurulmamış.'}
                  </div>
                  {ideasoft.status?.connection?.connectedAt && (
                    <div style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>
                      Bağlantı zamanı: {new Date(ideasoft.status.connection.connectedAt).toLocaleString('tr-TR')}
                    </div>
                  )}
                  {ideasoft.status?.callbackUrl && (
                    <div style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>
                      Callback: {ideasoft.status.callbackUrl}
                    </div>
                  )}
                  {ideasoft.message && (
                    <div style={{ color: '#0f172a', fontSize: 13, marginTop: 8, fontWeight: 600 }}>{ideasoft.message}</div>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <button type="button" onClick={handleIdeaSoftConnect} style={primaryButtonStyle}>IdeaSoft Bağlantısı Kur</button>
                  <button type="button" onClick={fetchIdeaSoftStatus} style={tabButtonStyle}>Durumu Yenile</button>
                  <button type="button" onClick={fetchEcommerceProducts} style={tabButtonStyle}>Ürünleri Yenile</button>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, background: '#fff' }}>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>Senkron Kaynakları</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    {ideasoft.status?.config?.resources?.length
                      ? ideasoft.status.config.resources.map((resource) => {
                          const isSyncing = ideasoft.syncing && ideasoft.resource === resource;
                          const labelMap = {
                            products: 'Ürünler ve resimler',
                            stock: 'Stok',
                            prices: 'Fiyatlar',
                            customers: 'Müşteriler',
                            orders: 'Siparişler',
                            invoices: 'Faturalar',
                            suppliers: 'Tedarikçiler',
                          };
                          return (
                            <button
                              key={resource}
                              type="button"
                              onClick={() => handleIdeaSoftSync(resource)}
                              disabled={isSyncing || !ideasoft.status?.connected}
                              style={{
                                ...tabButtonStyle,
                                padding: '12px 14px',
                                textAlign: 'left',
                                opacity: !ideasoft.status?.connected ? 0.55 : 1,
                                cursor: isSyncing ? 'wait' : 'pointer',
                              }}
                            >
                              <div style={{ fontWeight: 700 }}>{labelMap[resource] || resource}</div>
                              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{isSyncing ? 'Senkron yapılıyor...' : 'Şimdi senkronla'}</div>
                            </button>
                          );
                        })
                      : null}
                  </div>
                  <div style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>
                    Ürün senkronunda resim URL'leri ve çoklu görseller de sisteme kaydedilir.
                  </div>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, background: '#fff' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>Ürün Önizleme</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>
                        {ecommercePreview.loading ? 'Ürünler yükleniyor...' : `${ecommerceFilteredItems.length} / ${ecommercePreview.items.length} ürün gösteriliyor`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                      <input
                        value={ecommercePreview.search}
                        onChange={(e) => setEcommercePreview((prev) => ({ ...prev, search: e.target.value }))}
                        placeholder="Ürün, SKU, barkod ara"
                        style={{ ...inputStyle, width: 240 }}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155' }}>
                        <input
                          type="checkbox"
                          checked={ecommercePreview.imagesOnly}
                          onChange={(e) => setEcommercePreview((prev) => ({ ...prev, imagesOnly: e.target.checked }))}
                        />
                        Sadece görseli olanlar
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    {ecommerceFilteredItems.slice(0, 12).map((product) => {
                      const image = getProductImage(product);
                      return (
                        <div key={product._id || product.id || `${product.sku}-${product.name}`} style={{ border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', background: '#f8fafc' }}>
                          <div style={{ aspectRatio: '1 / 1', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {image ? (
                              <img src={image} alt={product.name || 'Ürün'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: 13 }}>Görsel yok</span>
                            )}
                          </div>
                          <div style={{ padding: 12, display: 'grid', gap: 6 }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{product.name || 'İsimsiz Ürün'}</div>
                            <div style={{ fontSize: 13, color: '#64748b' }}>{product.sku || '-'}{product.barcode ? ` • ${product.barcode}` : ''}</div>
                            <div style={{ fontSize: 13, color: '#475569' }}>
                              Fiyat: {Number(product.salePrice || 0).toLocaleString('tr-TR')} TL
                            </div>
                            <div style={{ fontSize: 13, color: '#475569' }}>
                              Stok: {Number(product.stock || 0)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!ecommercePreview.loading && ecommerceFilteredItems.length === 0 && (
                    <div style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>Bu filtreye uygun ürün bulunamadı.</div>
                  )}
                </div>
              </div>
            </div>
          )}

        {(activeTab === 'company' || activeTab === 'theme' || activeTab === 'tax' || activeTab === 'print' || activeTab === 'logo') && (
          <div style={{ background: '#fff', padding: 24, borderRadius: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
            <h3 style={{ marginTop: 0 }}>Firma Bilgileri</h3>
            <form onSubmit={handleSave} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            <input name="companyName" value={company.companyName || ''} onChange={handleChange} placeholder="Firma adı" style={inputStyle} />
            <input name="taxNumber" value={company.taxNumber || ''} onChange={handleChange} placeholder="Vergi no" style={inputStyle} />
            <input name="taxOffice" value={company.taxOffice || ''} onChange={handleChange} placeholder="Vergi dairesi" style={inputStyle} />
            <input name="phone" value={company.phone || ''} onChange={handleChange} placeholder="Telefon" style={inputStyle} />
            <input name="email" value={company.email || ''} onChange={handleChange} placeholder="E-posta" style={inputStyle} />
            <textarea name="address" value={company.address || ''} onChange={handleChange} placeholder="Adres" rows={4} style={inputStyle} />

            {activeTab === 'logo' && (
              <>
                <h4 style={{ marginBottom: 0 }}>Logo</h4>
                <input name="logo" value={company.logo || ''} onChange={handleChange} placeholder="Logo bağlantısı" style={inputStyle} />
              </>
            )}

            {activeTab === 'theme' && (
              <>
                <h4 style={{ marginBottom: 0 }}>Tema</h4>
                <select name="theme" value={company.theme || 'light'} onChange={handleChange} style={inputStyle}>
                  <option value="light">Açık</option>
                  <option value="dark">Koyu</option>
                  <option value="ocean">Okyanus</option>
                  <option value="corporate">Kurumsal</option>
                </select>
              </>
            )}

            {activeTab === 'tax' && (
              <>
                <h4 style={{ marginBottom: 0 }}>Vergi Oranları</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input type="number" value={company.taxRates?.kdv1 ?? 1} onChange={(e) => updateTaxRate('kdv1', e.target.value)} placeholder="KDV 1" style={inputStyle} />
                  <input type="number" value={company.taxRates?.kdv10 ?? 10} onChange={(e) => updateTaxRate('kdv10', e.target.value)} placeholder="KDV 10" style={inputStyle} />
                  <input type="number" value={company.taxRates?.kdv20 ?? 20} onChange={(e) => updateTaxRate('kdv20', e.target.value)} placeholder="KDV 20" style={inputStyle} />
                  <input type="number" value={company.taxRates?.withholding ?? 0} onChange={(e) => updateTaxRate('withholding', e.target.value)} placeholder="Stopaj" style={inputStyle} />
                </div>
              </>
            )}

            {activeTab === 'print' && (
              <>
                <h4 style={{ marginBottom: 0 }}>Yazdırma Ayarları</h4>
                <select value={company.printSettings?.paperSize || 'A4'} onChange={(e) => updatePrintSettings('paperSize', e.target.value)} style={inputStyle}>
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="Letter">Letter</option>
                </select>
                <label style={switchLabelStyle}>
                  <input type="checkbox" checked={!!company.printSettings?.showLogo} onChange={(e) => updatePrintSettings('showLogo', e.target.checked)} />
                  Logo göster
                </label>
                <label style={switchLabelStyle}>
                  <input type="checkbox" checked={!!company.printSettings?.showSignature} onChange={(e) => updatePrintSettings('showSignature', e.target.checked)} />
                  İmza alanı göster
                </label>
                <textarea value={company.printSettings?.footerText || ''} onChange={(e) => updatePrintSettings('footerText', e.target.value)} placeholder="Alt bilgi" rows={3} style={inputStyle} />
              </>
            )}

            <button type="submit" disabled={loading} style={primaryButtonStyle}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </form>
        </div>
        )}

        {(activeTab === 'authorization' || activeTab === 'roles') && (
        <div style={{ background: '#fff', padding: 24, borderRadius: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
          <h3 style={{ marginTop: 0 }}>🔐 Yönetici Yetki Profilleri</h3>
          <p style={{ color: '#6b7280' }}>Satış temsilcisine vereceğiniz erişimleri işaretleyin. İşaretlenmeyen modüller kullanılamaz.</p>

          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            <input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Profil adı" style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {permissionItems.map((item) => (
                <label key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc' }}>
                  <span style={{ fontWeight: 600 }}>{item.label}</span>
                  <input type="checkbox" checked={permissions[item.key]} onChange={() => handlePermissionToggle(item.key)} />
                </label>
              ))}
            </div>
            <button onClick={handleSaveProfile} style={primaryButtonStyle}>Profili Kaydet</button>
          </div>

          {activeTab === 'roles' && (
            <div style={{ marginTop: 18, border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
              <h4 style={{ marginTop: 0 }}>Roller</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {roles.map((role) => (
                  <span key={role} style={{ padding: '6px 10px', borderRadius: 999, background: '#e2e8f0', color: '#0f172a', fontSize: 13, fontWeight: 700 }}>
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
              <h4 style={{ marginTop: 0, marginBottom: 10 }}>Kullanıcıya Profil Ata</h4>
              <div style={{ display: 'grid', gap: 10 }}>
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} style={inputStyle}>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>{user.name} ({user.email})</option>
                  ))}
                </select>
                <select value={selectedProfileId} onChange={(e) => setSelectedProfileId(e.target.value)} style={inputStyle}>
                  {profiles.map((profile) => (
                    <option key={profile._id} value={profile._id}>{profile.name}</option>
                  ))}
                </select>
                <button onClick={handleAssignProfile} style={primaryButtonStyle}>Ata</button>
              </div>
            </div>

            <div>
              <h4 style={{ marginBottom: 10 }}>Mevcut Profiller</h4>
              {profiles.length === 0 ? <p style={{ color: '#64748b' }}>Henüz profil yok.</p> : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {profiles.map((profile) => (
                    <div key={profile._id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fafafa' }}>
                      <div style={{ fontWeight: 700 }}>{profile.name}</div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                        {Object.entries(profile.permissions || {}).filter(([, value]) => value).map(([key]) => permissionLabels[key] || key).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {activeTab === 'users' && (
          <div style={{ background: '#fff', padding: 24, borderRadius: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
            <h3 style={{ marginTop: 0 }}>👥 Kullanıcılar</h3>
            <div style={{ border: '1px solid #dbe3ef', borderRadius: 12, padding: 16, background: '#f8fafc', marginBottom: 16 }}>
              <h4 style={{ marginTop: 0 }}>Davet Linki</h4>
              <div style={{ display: 'grid', gap: 10 }}>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={inputStyle}>
                  {roles.map((role) => (<option key={role} value={role}>{role}</option>))}
                </select>
                {inviteRole === 'dealer' && (
                  <select value={inviteCustomerId} onChange={(e) => setInviteCustomerId(e.target.value)} style={inputStyle}>
                    <option value="">Bayi Müşteri Kaydı Seçin</option>
                    {customers.map((customer) => (
                      <option key={customer._id} value={customer._id}>
                        {(customer.companyName || customer.name || 'Müşteri')} ({customer.customerCode || '-'})
                      </option>
                    ))}
                  </select>
                )}
                <button type="button" onClick={handleGenerateInviteLink} disabled={inviteLoading} style={primaryButtonStyle}>
                  {inviteLoading ? 'Hazırlanıyor...' : 'Davet Linki Oluştur'}
                </button>
                {inviteLink && (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <input value={inviteLink} readOnly style={inputStyle} />
                    <button type="button" onClick={() => navigator.clipboard.writeText(inviteLink)} style={{ ...primaryButtonStyle, background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)' }}>
                      Linki Kopyala
                    </button>
                  </div>
                )}
              </div>
            </div>
            <form onSubmit={handleCreateUser} style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
              <input value={newUser.name} onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ad Soyad" style={inputStyle} />
              <input value={newUser.phone} onChange={(e) => setNewUser((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Telefon" style={inputStyle} />
              <input value={newUser.userName} onChange={(e) => setNewUser((prev) => ({ ...prev, userName: e.target.value }))} placeholder="Kullanıcı Adı" style={inputStyle} />
              <input value={newUser.email} onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))} placeholder="E-posta" style={inputStyle} />
              <input value={newUser.password} onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))} placeholder="Şifre (boşsa 123456)" style={inputStyle} />
              <select value={newUser.role} onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))} style={inputStyle}>
                {roles.map((role) => (<option key={role} value={role}>{role}</option>))}
              </select>
              {newUser.role === 'dealer' && (
                <select value={newUser.customerId} onChange={(e) => setNewUser((prev) => ({ ...prev, customerId: e.target.value }))} style={inputStyle}>
                  <option value="">Bayi Müşteri Kaydı Seçin</option>
                  {customers.map((customer) => (
                    <option key={customer._id} value={customer._id}>
                      {(customer.companyName || customer.name || 'Müşteri')} ({customer.customerCode || '-'})
                    </option>
                  ))}
                </select>
              )}
              <button type="submit" style={primaryButtonStyle}>Kullanıcı Ekle</button>
            </form>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
              <h4 style={{ marginTop: 0 }}>Rol Güncelle</h4>
              <div style={{ display: 'grid', gap: 10 }}>
                <select value={selectedUserId} onChange={(e) => {
                  const userId = e.target.value;
                  setSelectedUserId(userId);
                  const found = users.find((item) => item._id === userId);
                  setSelectedUserRole(found?.role || 'sales');
                }} style={inputStyle}>
                  {users.map((user) => (
                      <option key={user._id} value={user._id}>{user.name} ({user.email}{user.phone ? `, ${user.phone}` : ''})</option>
                    ))}
                </select>
                <select value={selectedUserRole} onChange={(e) => setSelectedUserRole(e.target.value)} style={inputStyle}>
                  {roles.map((role) => (<option key={role} value={role}>{role}</option>))}
                </select>
                <button type="button" onClick={handleUpdateUserRole} style={primaryButtonStyle}>Rolü Güncelle</button>
              </div>
            </div>

              <div style={{ marginTop: 16 }}>
                <h4 style={{ marginBottom: 10 }}>Personel Listesi</h4>
                {users.length === 0 ? (
                  <p style={{ color: '#64748b' }}>Henüz personel yok.</p>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {users.map((user) => (
                      <div key={user._id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fafafa' }}>
                        <div style={{ fontWeight: 700 }}>{user.name}</div>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                          E-posta: {user.email || '-'}
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                          Telefon: {user.phone || '-'}
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                          Kullanıcı Adı: {user.userName || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div style={{ background: '#fff', padding: 24, borderRadius: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
            <h3 style={{ marginTop: 0 }}>🗄️ Yedekleme</h3>
            <p style={{ color: '#6b7280' }}>Sistem verilerini JSON olarak indirip yedekleyebilirsiniz.</p>
            <button type="button" onClick={handleBackup} style={primaryButtonStyle}>Yedekleme Al</button>
          </div>
        )}
      </div>
    </Layout>
  );
};

const inputStyle = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #dbe3ef',
  width: '100%',
};

const primaryButtonStyle = {
  padding: '10px 14px',
  background: 'linear-gradient(135deg, #2563eb 0%, #0f172a 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 700,
};

const tabButtonStyle = {
  border: '1px solid #dbe3ef',
  background: '#fff',
  borderRadius: 10,
  padding: '8px 10px',
  cursor: 'pointer',
  fontWeight: 600,
};

const activeTabStyle = {
  background: '#0f172a',
  color: '#fff',
  borderColor: '#0f172a',
};

const switchLabelStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  color: '#334155',
  fontSize: 14,
};

const tabs = [
  { key: 'company', label: 'Firma Bilgileri' },
  { key: 'ecommerce', label: 'E-Ticaret' },
  { key: 'users', label: 'Kullanıcılar' },
  { key: 'authorization', label: 'Yetkilendirme' },
  { key: 'roles', label: 'Roller' },
  { key: 'backup', label: 'Yedekleme' },
  { key: 'theme', label: 'Tema' },
  { key: 'logo', label: 'Logo' },
  { key: 'tax', label: 'Vergi Oranları' },
  { key: 'print', label: 'Yazdırma Ayarları' },
];

const permissionItems = [
  { key: 'customers', label: 'Müşteriler' },
  { key: 'suppliers', label: 'Tedarikçiler' },
  { key: 'products', label: 'Ürünler' },
  { key: 'sales', label: 'Satış' },
  { key: 'invoices', label: 'Faturalar' },
  { key: 'accounting', label: 'Muhasebe' },
  { key: 'reports', label: 'Raporlar' },
  { key: 'settings', label: 'Ayarlar' },
  { key: 'cash', label: 'Kasa Hareketleri' },
  { key: 'bank', label: 'Banka Hareketleri' },
  { key: 'inventory', label: 'Stok / Envanter' },
  { key: 'approvePayments', label: 'Ödeme Onayı' },
];

const permissionLabels = {
  customers: 'Müşteriler',
  suppliers: 'Tedarikçiler',
  products: 'Ürünler',
  sales: 'Satış',
  invoices: 'Faturalar',
  accounting: 'Muhasebe',
  reports: 'Raporlar',
  settings: 'Ayarlar',
  cash: 'Kasa Hareketleri',
  bank: 'Banka Hareketleri',
  inventory: 'Stok / Envanter',
  approvePayments: 'Ödeme Onayı',
};

export default Settings;
