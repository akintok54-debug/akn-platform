import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import CustomerForm from '../components/customers/CustomerForm';
import CustomerTable from '../components/customers/CustomerTable';

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState(getInitialFormData());
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [lastBulkReport, setLastBulkReport] = useState([]);
  const [lastBulkAction, setLastBulkAction] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/customers');
      const customerList = response?.data?.success ? response.data.customers || [] : Array.isArray(response.data) ? response.data : response?.data?.data || [];
      setCustomers(customerList);
      setPage(1);
      setSelectedCustomerIds([]);
    } catch (error) {
      console.error(error);
      setErrorMessage('Müşteri listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return customers.filter((customer) => {
      const haystack = [
        customer.companyName, customer.name, customer.customerCode, customer.code, customer.phone, customer.taxNumber, customer.taxOffice, customer.city, customer.district, customer.contactPerson, customer.note,
      ].join(' ').toLowerCase();

      const matchesSearch = haystack.includes(term);
      const matchesType = typeFilter === 'all' ? true : customer.type === typeFilter;
      const matchesStatus = statusFilter === 'all' ? true : statusFilter === 'active' ? customer.active !== false : customer.active === false;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [customers, searchTerm, typeFilter, statusFilter]);

  const pagedCustomers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [searchTerm, typeFilter, statusFilter]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetForm = () => {
    setFormData(getInitialFormData());
    setEditingCustomer(null);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      companyName: customer.companyName || customer.name || '',
      type: customer.type || 'customer',
      phone: customer.phone || '',
      email: customer.email || '',
      taxOffice: customer.taxOffice || '',
      taxNumber: customer.taxNumber || '',
      address: customer.address || '',
      city: customer.city || '',
      district: customer.district || '',
      balance: customer.balance || 0,
      riskLimit: customer.riskLimit || 0,
      discountRate: customer.discountRate || 0,
      customerCategory: customer.customerCategory || 'retail',
      mobilePhone: customer.mobilePhone || '',
      contactPerson: customer.contactPerson || '',
      note: customer.note || '',
      active: customer.active !== false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    const payload = {
      customerCode: editingCustomer?.customerCode || `CR${Date.now()}`,
      code: editingCustomer?.customerCode || `CR${Date.now()}`,
      ...formData,
      balance: Number(formData.balance || 0),
      riskLimit: Number(formData.riskLimit || 0),
      discountRate: Number(formData.discountRate || 0),
      customerCategory: formData.customerCategory || 'retail',
      mobilePhone: formData.mobilePhone || '',
      active: formData.active !== false,
    };

    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer._id || editingCustomer.id}`, payload);
      } else {
        await api.post('/customers', payload);
      }
      await fetchCustomers();
      resetForm();
      setErrorMessage('');
    } catch (error) {
      console.error(error);
      const backendMessage = error?.response?.data?.message || 'İşlem sırasında hata oluştu.';
      setErrorMessage(backendMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customerId) => {
    if (!customerId) return;
    const confirmed = window.confirm('Bu müşteriyi silmek istediğinize emin misiniz?');
    if (!confirmed) return;

    try {
      await api.delete(`/customers/${customerId}`);
      await fetchCustomers();
    } catch (error) {
      console.error(error);
      setErrorMessage('Müşteri silinemedi.');
    }
  };

  const handleSelectCustomer = (customerId, checked) => {
    if (!customerId) return;
    setSelectedCustomerIds((prev) => {
      if (checked) {
        if (prev.includes(customerId)) return prev;
        return [...prev, customerId];
      }
      return prev.filter((id) => id !== customerId);
    });
  };

  const handleSelectAllPage = (checked) => {
    const idsOnPage = pagedCustomers.map((customer) => customer._id || customer.id).filter(Boolean);
    setSelectedCustomerIds((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...idsOnPage]));
      }
      return prev.filter((id) => !idsOnPage.includes(id));
    });
  };

  const handleBulkPortalAction = async (action) => {
    if (!selectedCustomerIds.length) {
      alert('Lutfen en az bir musteri secin.');
      return;
    }

    const actionLabelMap = {
      generate: 'olusturulacak',
      refresh: 'yenilenecek',
      deactivate: 'pasif yapilacak',
    };
    const confirmed = window.confirm(`${selectedCustomerIds.length} musteri icin portal linkleri ${actionLabelMap[action]} . Devam edilsin mi?`);
    if (!confirmed) return;

    try {
      const response = await api.post('/customers/portal/bulk', {
        action,
        customerIds: selectedCustomerIds,
      });
      setLastBulkAction(action);
      setLastBulkReport(response?.data?.customers || []);
      alert(`${response?.data?.updatedCount || 0} kayit basariyla guncellendi.`);
      await fetchCustomers();
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || 'Toplu portal islemi basarisiz.');
    }
  };

  const exportBulkReportCsv = () => {
    if (!lastBulkReport.length) {
      alert('Indirilecek toplu islem raporu bulunamadi.');
      return;
    }

    const rows = lastBulkReport.map((item) => [
      item.customerId || '',
      item.companyName || '',
      item.portalLink || '',
      item.enabled ? 'Aktif' : 'Pasif',
    ]);

    const csv = [['Islem', 'Musteri ID', 'Firma', 'Portal Linki', 'Durum'], ...rows.map((row) => [lastBulkAction || '-', ...row])]
      .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `toplu-portal-islem-raporu-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #2563eb 100%)', color: '#fff', padding: 24, borderRadius: 20, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>Müşteriler</h2>
            <p style={{ margin: '6px 0 0', opacity: 0.95 }}>Profesyonel cari yönetimi, modern tablo görünümü ve hızlı filtreleme.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={openCreate} style={{ padding: '10px 16px', border: 'none', borderRadius: 999, cursor: 'pointer', background: '#fff', color: '#0f172a', fontWeight: 700 }}>
              + Yeni Müşteri
            </button>
            <button onClick={() => navigate('/reports/customers')} style={{ padding: '10px 16px', border: 'none', borderRadius: 999, cursor: 'pointer', background: '#10b981', color: '#fff', fontWeight: 700 }}>
              📊 Cari Raporu
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div style={{ padding: 12, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 12, marginBottom: 16 }}>
          {errorMessage}
        </div>
      )}

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 18, marginBottom: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{editingCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}</h3>
            <button type="button" onClick={resetForm} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>Kapat</button>
          </div>
          <CustomerForm formData={formData} onChange={handleChange} onSubmit={handleSubmit} submitting={submitting} onCancel={resetForm} isEdit={!!editingCustomer} />
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Müşteri Listesi</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Ara: isim, kod, telefon, vergi..." style={filterInputStyle} />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={filterInputStyle}>
              <option value="all">Tüm Türler</option>
              <option value="customer">Müşteri</option>
              <option value="supplier">Tedarikçi</option>
              <option value="both">Müşteri & Tedarikçi</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={filterInputStyle}>
              <option value="all">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button onClick={() => handleBulkPortalAction('generate')} style={bulkActionBtn}>Secilenlere Portal Linki Olustur</button>
          <button onClick={() => handleBulkPortalAction('refresh')} style={bulkActionBtn}>Secilenlerin Linkini Yenile</button>
          <button onClick={() => handleBulkPortalAction('deactivate')} style={{ ...bulkActionBtn, background: '#fee2e2', borderColor: '#fecaca', color: '#b91c1c' }}>Secilenlerin Linkini Pasif Yap</button>
          <button onClick={exportBulkReportCsv} style={{ ...bulkActionBtn, background: '#ecfeff', borderColor: '#bae6fd', color: '#0369a1' }}>Toplu Islem Raporu CSV</button>
          <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: 14 }}>Secili: {selectedCustomerIds.length}</div>
        </div>

        {loading ? <div style={{ padding: 20 }}>Yükleniyor...</div> : (
          <>
            <CustomerTable
              customers={pagedCustomers}
              onView={(id) => navigate(`/customers/${id}`)}
              onEdit={openEdit}
              onDelete={handleDelete}
              selectedCustomerIds={selectedCustomerIds}
              onSelectCustomer={handleSelectCustomer}
              onSelectAllPage={handleSelectAllPage}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ color: '#64748b', fontSize: 14 }}>Toplam: {filteredCustomers.length} kayıt</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={pageButtonStyle}>Önceki</button>
                <span style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 700 }}>Sayfa {page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageButtonStyle}>Sonraki</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const getInitialFormData = () => ({
  companyName: '',
  type: 'customer',
  phone: '',
  email: '',
  taxOffice: '',
  taxNumber: '',
  address: '',
  city: '',
  district: '',
  balance: 0,
  riskLimit: 0,
  discountRate: 0,
  customerCategory: 'retail',
  mobilePhone: '',
  contactPerson: '',
  note: '',
  active: true,
});

const filterInputStyle = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #dbe3ef',
  minWidth: 220,
};

const pageButtonStyle = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #dbe3ef',
  background: '#fff',
  cursor: 'pointer',
};

const bulkActionBtn = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #dbe3ef',
  background: '#eff6ff',
  color: '#1d4ed8',
  cursor: 'pointer',
  fontWeight: 700,
};

export default Customers;