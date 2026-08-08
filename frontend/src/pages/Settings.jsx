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
  const [loading, setLoading] = useState(false);
  const [profileName, setProfileName] = useState('Satış Temsilcisi');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedUserRole, setSelectedUserRole] = useState('sales');
  const [newUser, setNewUser] = useState({ name: '', email: '', userName: '', password: '', role: 'sales', customerId: '' });
  const [activeTab, setActiveTab] = useState('company');
  const [permissions, setPermissions] = useState({
    customers: true,
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
  }, []);

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
      setNewUser({ name: '', email: '', userName: '', password: '', role: 'sales', customerId: '' });
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
            <form onSubmit={handleCreateUser} style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
              <input value={newUser.name} onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ad Soyad" style={inputStyle} />
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
                    <option key={user._id} value={user._id}>{user.name} ({user.email})</option>
                  ))}
                </select>
                <select value={selectedUserRole} onChange={(e) => setSelectedUserRole(e.target.value)} style={inputStyle}>
                  {roles.map((role) => (<option key={role} value={role}>{role}</option>))}
                </select>
                <button type="button" onClick={handleUpdateUserRole} style={primaryButtonStyle}>Rolü Güncelle</button>
              </div>
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
