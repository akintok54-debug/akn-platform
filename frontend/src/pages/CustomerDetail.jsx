import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import StatCard from '../components/ui/StatCard';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    type: 'customer',
    phone: '',
    mobilePhone: '',
    email: '',
    taxOffice: '',
    taxNumber: '',
    address: '',
    city: '',
    district: '',
    contactPerson: '',
    balance: 0,
    riskLimit: 0,
    discountRate: 0,
    customerCategory: 'retail',
    note: '',
  });
  const [transactionType, setTransactionType] = useState('ORDER');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');
  const [scheduleForm, setScheduleForm] = useState({ label: '', amount: '', dueDate: '', status: 'Beklemede' });
  const [shareHistory, setShareHistory] = useState({ pdfArchive: [], whatsappHistory: [], mailHistory: [], notificationHistory: [] });
  const [portalInfo, setPortalInfo] = useState({ portalLink: '', isEnabled: true, secureToken: '' });

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/customers/${id}`);
      const data = response?.data?.customer || response?.data;
      if (data) {
        setCustomer(data);
        setFormData({
          companyName: data.companyName || data.name || '',
          type: data.type || 'customer',
          phone: data.phone || '',
          mobilePhone: data.mobilePhone || '',
          email: data.email || '',
          taxOffice: data.taxOffice || '',
          taxNumber: data.taxNumber || '',
          address: data.address || '',
          city: data.city || '',
          district: data.district || '',
          contactPerson: data.contactPerson || '',
          balance: data.balance || 0,
          riskLimit: data.riskLimit || 0,
          discountRate: data.discountRate || 0,
          customerCategory: data.customerCategory || 'retail',
          note: data.note || '',
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCustomer();
    }
  }, [id]);

  const buildPayload = (extra = {}) => ({
    ...formData,
    ...extra,
    balance: Number(formData.balance || 0),
    riskLimit: Number(formData.riskLimit || 0),
    discountRate: Number(formData.discountRate || 0),
    customerCategory: formData.customerCategory || 'retail',
    mobilePhone: formData.mobilePhone || '',
    city: formData.city || '',
    district: formData.district || '',
    contactPerson: formData.contactPerson || '',
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/customers/${id}`, buildPayload());
      await fetchCustomer();
      alert('Müşteri bilgileri güncellendi.');
    } catch (error) {
      console.error(error);
      alert('Güncelleme sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleActiveToggle = async () => {
    try {
      await api.put(`/customers/${id}`, buildPayload({ active: !customer?.active }));
      await fetchCustomer();
    } catch (error) {
      console.error(error);
      alert('Durum güncellenemedi.');
    }
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/customers/${id}/transactions`, {
        type: transactionType,
        amount: Number(transactionAmount || 0),
        description: transactionDescription,
      });
      setTransactionAmount('');
      setTransactionDescription('');
      await fetchCustomer();
      alert('İşlem kaydedildi.');
    } catch (error) {
      console.error(error);
      alert('İşlem kaydedilirken hata oluştu.');
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      const nextSchedule = [
        ...(customer?.paymentSchedule || []),
        {
          label: scheduleForm.label,
          amount: Number(scheduleForm.amount || 0),
          dueDate: scheduleForm.dueDate,
          status: scheduleForm.status,
        },
      ];

      await api.put(`/customers/${id}`, buildPayload({ paymentSchedule: nextSchedule }));
      setScheduleForm({ label: '', amount: '', dueDate: '', status: 'Beklemede' });
      await fetchCustomer();
      alert('Taksit eklendi.');
    } catch (error) {
      console.error(error);
      alert('Taksit eklenirken hata oluştu.');
    }
  };

  const updateScheduleStatus = async (index, status) => {
    try {
      const nextSchedule = [...(customer?.paymentSchedule || [])];
      nextSchedule[index] = { ...nextSchedule[index], status };

      await api.put(`/customers/${id}`, buildPayload({ paymentSchedule: nextSchedule }));
      await fetchCustomer();
    } catch (error) {
      console.error(error);
      alert('Taksit durumu güncellenemedi.');
    }
  };

  const removeScheduleItem = async (index) => {
    try {
      const nextSchedule = [...(customer?.paymentSchedule || [])];
      nextSchedule.splice(index, 1);

      await api.put(`/customers/${id}`, buildPayload({ paymentSchedule: nextSchedule }));
      await fetchCustomer();
    } catch (error) {
      console.error(error);
      alert('Taksit silinemedi.');
    }
  };

  const fetchShareHistory = async () => {
    try {
      const response = await api.get(`/customers/${id}/share/history`);
      setShareHistory(response?.data || { pdfArchive: [], whatsappHistory: [], mailHistory: [], notificationHistory: [] });
    } catch (error) {
      console.error(error);
      alert('Geçmiş yüklenemedi.');
    }
  };

  const fetchPortalLink = async () => {
    try {
      const response = await api.get(`/customers/${id}/portal/link`);
      setPortalInfo({
        portalLink: response?.data?.portalLink || '',
        isEnabled: response?.data?.isEnabled !== false,
        secureToken: response?.data?.secureToken || '',
      });
      return response?.data?.portalLink || '';
    } catch (error) {
      console.error(error);
      alert('Bayi portal linki alınamadı.');
      return '';
    }
  };

  const openPortal = async () => {
    const link = portalInfo.portalLink || (await fetchPortalLink());
    if (link) {
      window.open(link, '_blank');
    }
  };

  const copyPortalLink = async () => {
    const link = portalInfo.portalLink || (await fetchPortalLink());
    if (!link) return;
    await navigator.clipboard.writeText(link);
    alert('Bayi portal linki kopyalandi.');
  };

  const refreshPortalLink = async () => {
    try {
      const response = await api.post(`/customers/${id}/portal/link/refresh`);
      setPortalInfo({
        portalLink: response?.data?.portalLink || '',
        isEnabled: true,
        secureToken: response?.data?.secureToken || '',
      });
      alert('Bayi portal linki yenilendi.');
    } catch (error) {
      console.error(error);
      alert('Bayi portal linki yenilenemedi.');
    }
  };

  const deactivatePortalLink = async () => {
    try {
      await api.post(`/customers/${id}/portal/deactivate`);
      setPortalInfo((prev) => ({ ...prev, isEnabled: false }));
      alert('Bayi portal linki pasif yapildi.');
    } catch (error) {
      console.error(error);
      alert('Bayi portal linki pasif yapilamadi.');
    }
  };

  const handleStatementPdf = async () => {
    try {
      const response = await api.get(`/customers/${id}/statement/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `musteri-ekstresi-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      await fetchShareHistory();
    } catch (error) {
      console.error(error);
      alert('PDF indirilemedi.');
    }
  };

  const handleWhatsAppShare = async () => {
    try {
      const response = await api.post(`/customers/${id}/share/whatsapp`);
      if (response?.data?.url) {
        window.open(response.data.url, '_blank');
      }
      await fetchShareHistory();
    } catch (error) {
      console.error(error);
      alert('WhatsApp paylaşımı başlatılamadı.');
    }
  };

  const handleMailShare = async () => {
    try {
      const response = await api.post(`/customers/${id}/share/mail`);
      if (response?.data?.url) {
        window.location.href = response.data.url;
      }
      await fetchShareHistory();
    } catch (error) {
      console.error(error);
      alert('E-posta paylaşımı başlatılamadı.');
    }
  };

  const handleDebtReminder = async () => {
    try {
      const response = await api.post(`/customers/${id}/reminder/debt`);
      alert(response?.data?.message || 'Borç hatırlatma metni oluşturuldu.');
      await fetchShareHistory();
    } catch (error) {
      console.error(error);
      alert('Borç hatırlatma oluşturulamadı.');
    }
  };

  const handleExportExcel = () => {
    const rows = (customer.transactions || []).map((trx) => [
      trx.type || '',
      Number(trx.amount || 0).toFixed(2),
      trx.description || '',
      trx.date ? new Date(trx.date).toLocaleDateString('tr-TR') : '',
    ]);
    const csv = [['Tur', 'Tutar', 'Aciklama', 'Tarih'], ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `musteri-islemleri-${id}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const actionButtonStyle = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  };

  useEffect(() => {
    if (id) {
      fetchPortalLink();
    }
  }, [id]);

  if (loading) {
    return <div style={{ padding: 20 }}>Yükleniyor...</div>;
  }

  if (!customer) {
    return <div style={{ padding: 20 }}>Müşteri bulunamadı.</div>;
  }

  const transactions = customer.transactions || [];
  const totalTransactions = transactions.length;
  const totalAmount = transactions.reduce((sum, trx) => sum + Number(trx.amount || 0), 0);
  const orderCount = transactions.filter((trx) => trx.type === 'ORDER').length;
  const invoiceCount = transactions.filter((trx) => trx.type === 'INVOICE').length;
  const paymentSchedule = customer.paymentSchedule || [];
  const latestTransaction = transactions[0];
  const riskState = Number(customer.balance || 0) > Number(customer.riskLimit || 0)
    ? { label: 'Riskli', color: '#dc2626' }
    : Number(customer.balance || 0) > 0
      ? { label: 'Dikkat', color: '#d97706' }
      : { label: 'Normal', color: '#16a34a' };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <button onClick={() => navigate('/customers')} style={{ marginBottom: 16, padding: '8px 12px' }}>
        ← Müşterilere Dön
      </button>

      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #2563eb 100%)', color: '#fff', padding: 20, borderRadius: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>{customer.companyName || customer.name}</h2>
            <p style={{ margin: '6px 0 0', opacity: 0.95 }}><strong>Kod:</strong> {customer.customerCode || customer.code || id}</p>
          </div>
          <button onClick={handleActiveToggle} style={{ padding: '8px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', background: customer.active ? '#fef2f2' : '#ecfeff', color: customer.active ? '#dc2626' : '#0f766e', fontWeight: 700 }}>
            {customer.active ? 'Aktif Kart' : 'Pasif Kart'}
          </button>
        </div>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          style={{ ...actionButtonStyle, background: '#16a34a', color: '#fff', fontWeight: 700 }}
          onClick={() => navigate(`/sales?customerId=${id}&customerName=${encodeURIComponent(customer.companyName || customer.name || '')}`)}
        >
          🛒 Satış Yap
        </button>
        <button style={actionButtonStyle} onClick={openPortal}>🔗 Bayi Portalı</button>
        <button style={actionButtonStyle} onClick={copyPortalLink}>📋 Linki Kopyala</button>
        <button style={actionButtonStyle} onClick={handleStatementPdf}>📄 Hesap Ekstresi</button>
        <button style={actionButtonStyle} onClick={handleWhatsAppShare}>📱 WhatsApp Gönder</button>
        <button style={actionButtonStyle} onClick={handleMailShare}>📧 Mail Gönder</button>
        <button style={actionButtonStyle} onClick={handleExportExcel}>📥 Excel</button>
        <button style={actionButtonStyle} onClick={handlePrint}>🖨 Yazdır</button>
        <button style={actionButtonStyle} onClick={handleDebtReminder}>🔔 Borç Hatırlatma Gönder</button>
        <button style={actionButtonStyle} onClick={refreshPortalLink}>🔄 Linki Yenile</button>
        <button style={actionButtonStyle} onClick={deactivatePortalLink}>❌ Linki Pasif Yap</button>
        <button style={actionButtonStyle} onClick={fetchShareHistory}>📂 PDF Arşivi</button>
        <button style={actionButtonStyle} onClick={fetchShareHistory}>📜 Gönderim Geçmişi</button>
      </div>

      <div style={{ marginBottom: 12, fontSize: 13, color: '#334155', wordBreak: 'break-all' }}>
        <strong>Portal Linki:</strong> {portalInfo.portalLink || 'Henüz oluşturulmadı'}
        <span style={{ marginLeft: 8, color: portalInfo.isEnabled ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
          {portalInfo.isEnabled ? 'Aktif' : 'Pasif'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 8 }}>
        <StatCard title="Bakiye" value={`${Number(customer.balance || 0).toLocaleString('tr-TR')} TL`} accent="#2563eb" />
        <StatCard title="Toplam İşlem" value={totalTransactions} accent="#16a34a" />
        <StatCard title="Toplam Tutar" value={`${Number(totalAmount).toLocaleString('tr-TR')} TL`} accent="#d97706" />
        <StatCard title="Sipariş / Fatura" value={`${orderCount} / ${invoiceCount}`} accent="#7c3aed" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>İletişim</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>{customer.phone || '-'}</div>
          <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{customer.mobilePhone || 'Cep telefonu yok'}</div>
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Konum</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>{`${customer.city || '-'} / ${customer.district || '-'}`}</div>
          <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{customer.contactPerson || 'Yetkili kişi belirtilmedi'}</div>
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>İskonto / Segment</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>{customer.discountRate ? `${customer.discountRate}%` : '0%'}</div>
          <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{customer.customerCategory === 'dealer' ? 'Bayi' : customer.customerCategory === 'wholesale' ? 'Toptan' : 'Perakende'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Risk Durumu</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: riskState.color, marginTop: 6 }}>{riskState.label}</div>
          <div style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>Risk limiti: {Number(customer.riskLimit || 0).toLocaleString('tr-TR')} TL</div>
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Son İşlem</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>{latestTransaction ? `${latestTransaction.type} • ${Number(latestTransaction.amount || 0).toLocaleString('tr-TR')} TL` : 'Henüz işlem yok'}</div>
          <div style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>{latestTransaction?.description || 'Açıklama yok'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr 1fr', marginTop: 20 }}>
        <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
          <h3>Müşteri Bilgileri</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
            <label>
              Firma / Cari Adı
              <input name="companyName" value={formData.companyName} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Tür
              <select name="type" value={formData.type} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }}>
                <option value="customer">Müşteri</option>
                <option value="supplier">Tedarikçi</option>
                <option value="both">Müşteri & Tedarikçi</option>
              </select>
            </label>

            <label>
              Telefon
              <input name="phone" value={formData.phone} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Cep Telefonu
              <input name="mobilePhone" value={formData.mobilePhone} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              E-posta
              <input name="email" value={formData.email} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Yetkili Kişi
              <input name="contactPerson" value={formData.contactPerson} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Vergi Dairesi
              <input name="taxOffice" value={formData.taxOffice} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Vergi No / TCKN
              <input name="taxNumber" value={formData.taxNumber} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Adres
              <textarea name="address" value={formData.address} onChange={handleChange} rows={3} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              İl
              <input name="city" value={formData.city} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              İlçe
              <input name="district" value={formData.district} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Bakiye (TL)
              <input type="number" name="balance" value={formData.balance} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Risk Limiti (TL)
              <input type="number" name="riskLimit" value={formData.riskLimit} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              İskonto Oranı (%)
              <input type="number" name="discountRate" value={formData.discountRate} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Bayi / Perakende
              <select name="customerCategory" value={formData.customerCategory} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }}>
                <option value="retail">Perakende</option>
                <option value="dealer">Bayi</option>
                <option value="wholesale">Toptan</option>
              </select>
            </label>

            <label>
              Not
              <textarea name="note" value={formData.note} onChange={handleChange} rows={3} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <button type="submit" disabled={saving} style={{ padding: '10px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              {saving ? 'Kaydediliyor...' : 'Bilgileri Güncelle'}
            </button>
          </form>
        </div>

        <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <h3>Ödeme Takvimi</h3>
          <form onSubmit={handleScheduleSubmit} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            <input
              placeholder="Taksit adı"
              value={scheduleForm.label}
              onChange={(e) => setScheduleForm({ ...scheduleForm, label: e.target.value })}
              style={{ padding: 8 }}
            />
            <input
              type="number"
              placeholder="Tutar"
              value={scheduleForm.amount}
              onChange={(e) => setScheduleForm({ ...scheduleForm, amount: e.target.value })}
              style={{ padding: 8 }}
            />
            <input
              type="date"
              value={scheduleForm.dueDate}
              onChange={(e) => setScheduleForm({ ...scheduleForm, dueDate: e.target.value })}
              style={{ padding: 8 }}
            />
            <select
              value={scheduleForm.status}
              onChange={(e) => setScheduleForm({ ...scheduleForm, status: e.target.value })}
              style={{ padding: 8 }}
            >
              <option value="Beklemede">Beklemede</option>
              <option value="Planlandı">Planlandı</option>
              <option value="Ödendi">Ödendi</option>
            </select>
            <button type="submit" style={{ padding: '8px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              Taksit Ekle
            </button>
          </form>

          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {paymentSchedule.length > 0 ? paymentSchedule.map((item, index) => (
              <div key={`${item.label}-${index}`} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{item.label}</strong>
                  <span style={{ color: item.status === 'Ödendi' ? '#16a34a' : item.status === 'Beklemede' ? '#b45309' : '#2563eb', fontWeight: 600 }}>{item.status}</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 14, color: '#4b5563' }}>
                  {item.amount} TL • {item.dueDate || '-'}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => updateScheduleStatus(index, 'Ödendi')} style={{ padding: '6px 8px', border: 'none', borderRadius: 4, background: '#16a34a', color: '#fff', cursor: 'pointer' }}>Ödendi</button>
                  <button onClick={() => updateScheduleStatus(index, 'Beklemede')} style={{ padding: '6px 8px', border: 'none', borderRadius: 4, background: '#f59e0b', color: '#fff', cursor: 'pointer' }}>Beklemede</button>
                  <button onClick={() => removeScheduleItem(index)} style={{ padding: '6px 8px', border: 'none', borderRadius: 4, background: '#dc2626', color: '#fff', cursor: 'pointer' }}>Sil</button>
                </div>
              </div>
            )) : <p>Henüz taksit eklenmemiş.</p>}
          </div>

          <h3 style={{ marginTop: 24 }}>İşlem Kaydet</h3>
          <form onSubmit={handleTransaction} style={{ display: 'grid', gap: 12 }}>
            <label>
              İşlem Türü
              <select value={transactionType} onChange={(e) => setTransactionType(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }}>
                <option value="ORDER">Sipariş</option>
                <option value="INVOICE">Fatura</option>
                <option value="RETURN">İade</option>
                <option value="COLLECTION">Tahsilat</option>
              </select>
            </label>

            <label>
              Tutar (TL)
              <input type="number" value={transactionAmount} onChange={(e) => setTransactionAmount(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Açıklama
              <textarea value={transactionDescription} onChange={(e) => setTransactionDescription(e.target.value)} rows={3} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <button type="submit" style={{ padding: '10px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              İşlem Kaydet
            </button>
          </form>

          <h3 style={{ marginTop: 24 }}>Geçmiş İşlemler</h3>
          {transactions.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: 8, textAlign: 'left' }}>Tür</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Tutar</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Açıklama</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((trx, idx) => (
                    <tr key={`${trx.type}-${idx}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: 8 }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: 999,
                          background: trx.type === 'ORDER' ? '#dbeafe' : trx.type === 'INVOICE' ? '#dcfce7' : trx.type === 'RETURN' ? '#fef2f2' : '#fef3c7',
                          color: '#111827',
                          fontWeight: 600,
                          fontSize: 12,
                        }}>
                          {trx.type}
                        </span>
                      </td>
                      <td style={{ padding: 8 }}>{trx.amount || 0} TL</td>
                      <td style={{ padding: 8 }}>{trx.description || '-'}</td>
                      <td style={{ padding: 8 }}>{trx.date ? new Date(trx.date).toLocaleDateString('tr-TR') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Henüz işlem kaydı yok.</p>
          )}

          <h3 style={{ marginTop: 24 }}>PDF Arşivi</h3>
          {shareHistory.pdfArchive?.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: 8, textAlign: 'left' }}>Tarih</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Tip</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Dosya</th>
                  </tr>
                </thead>
                <tbody>
                  {shareHistory.pdfArchive.map((item) => (
                    <tr key={item._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: 8 }}>{item.createdAt ? new Date(item.createdAt).toLocaleString('tr-TR') : '-'}</td>
                      <td style={{ padding: 8 }}>{item.pdfType || '-'}</td>
                      <td style={{ padding: 8 }}>{item.fileName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Henüz PDF arşiv kaydı yok.</p>
          )}

          <h3 style={{ marginTop: 24 }}>Gönderim Geçmişi</h3>
          {shareHistory.whatsappHistory?.length > 0 || shareHistory.mailHistory?.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {(shareHistory.whatsappHistory || []).map((item) => (
                <div key={item._id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, background: '#fafafa' }}>
                  <strong>WhatsApp</strong> • {item.phone || '-'} • {item.status || '-'}
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{item.createdAt ? new Date(item.createdAt).toLocaleString('tr-TR') : '-'}</div>
                </div>
              ))}
              {(shareHistory.mailHistory || []).map((item) => (
                <div key={item._id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, background: '#fafafa' }}>
                  <strong>E-posta</strong> • {item.toEmail || '-'} • {item.subject || '-'}
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{item.createdAt ? new Date(item.createdAt).toLocaleString('tr-TR') : '-'}</div>
                </div>
              ))}
            </div>
          ) : (
            <p>Henüz gönderim geçmişi yok.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
