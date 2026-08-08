const STATUS_MAP = {
  Bekliyor: 'BEKLEMEDE',
  'Hazırlanıyor': 'HAZIRLANDI',
  Kargoda: 'KARGODA',
  'Teslim edildi': 'TESLIM_EDILDI',
  Tamamlandı: 'TESLIM_EDILDI',
  İptal: 'IPTAL',
};

const STATUS_LABELS = {
  BEKLEMEDE: 'Gelen Sipariş',
  HAZIRLANDI: 'Hazırlanıyor',
  KARGODA: 'Kargoda',
  TESLIM_EDILDI: 'Teslim edildi',
  IPTAL: 'İptal',
};

function normalizeOrderStatus(status) {
  return STATUS_MAP[status] || 'BEKLEMEDE';
}

function getOrderStatusLabel(status) {
  return STATUS_LABELS[status] || 'Gelen Sipariş';
}

module.exports = { normalizeOrderStatus, getOrderStatusLabel };
