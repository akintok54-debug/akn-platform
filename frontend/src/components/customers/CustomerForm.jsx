import React from 'react';

const CustomerForm = ({ formData, onChange, onSubmit, submitting, onCancel, isEdit }) => {
  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Firma / Cari Adı</span>
          <input name="companyName" value={formData.companyName || ''} onChange={onChange} required style={inputStyle} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Tür</span>
          <select name="type" value={formData.type || 'customer'} onChange={onChange} style={inputStyle}>
            <option value="customer">Müşteri</option>
            <option value="supplier">Tedarikçi</option>
            <option value="both">Müşteri & Tedarikçi</option>
          </select>
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Telefon</span>
          <input name="phone" value={formData.phone || ''} onChange={onChange} style={inputStyle} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Cep Telefonu</span>
          <input name="mobilePhone" value={formData.mobilePhone || ''} onChange={onChange} style={inputStyle} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>E-posta</span>
          <input type="email" name="email" value={formData.email || ''} onChange={onChange} style={inputStyle} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Vergi Dairesi</span>
          <input name="taxOffice" value={formData.taxOffice || ''} onChange={onChange} style={inputStyle} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Vergi No / TCKN</span>
          <input name="taxNumber" value={formData.taxNumber || ''} onChange={onChange} style={inputStyle} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>İl</span>
          <input name="city" value={formData.city || ''} onChange={onChange} style={inputStyle} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>İlçe</span>
          <input name="district" value={formData.district || ''} onChange={onChange} style={inputStyle} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Cari Bakiye (TL)</span>
          <input type="number" name="balance" value={formData.balance || 0} onChange={onChange} style={inputStyle} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Risk Limiti (TL)</span>
          <input type="number" name="riskLimit" value={formData.riskLimit || 0} onChange={onChange} style={inputStyle} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>İskonto Oranı (%)</span>
          <input type="number" name="discountRate" value={formData.discountRate || 0} onChange={onChange} style={inputStyle} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Bayi / Perakende</span>
          <select name="customerCategory" value={formData.customerCategory || 'retail'} onChange={onChange} style={inputStyle}>
            <option value="retail">Perakende</option>
            <option value="dealer">Bayi</option>
            <option value="wholesale">Toptan</option>
          </select>
        </label>
      </div>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Adres</span>
        <textarea name="address" value={formData.address || ''} onChange={onChange} rows={2} style={{ ...inputStyle, minHeight: 70 }} />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Yetkili Kişi</span>
        <input name="contactPerson" value={formData.contactPerson || ''} onChange={onChange} style={inputStyle} />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Notlar</span>
        <textarea name="note" value={formData.note || ''} onChange={onChange} rows={3} style={{ ...inputStyle, minHeight: 90 }} />
      </label>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        {onCancel && (
          <button type="button" onClick={onCancel} style={secondaryButtonStyle}>İptal</button>
        )}
        <button type="submit" disabled={submitting} style={primaryButtonStyle}>
          {submitting ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #dbe3ef',
  background: '#fff',
  fontSize: 14,
};

const primaryButtonStyle = {
  padding: '10px 16px',
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
  background: 'linear-gradient(135deg, #2563eb 0%, #0f172a 100%)',
  color: '#fff',
  fontWeight: 700,
};

const secondaryButtonStyle = {
  padding: '10px 16px',
  border: '1px solid #dbe3ef',
  borderRadius: 10,
  cursor: 'pointer',
  background: '#fff',
  color: '#334155',
  fontWeight: 700,
};

export default CustomerForm;
