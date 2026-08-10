const calculateSaleTotals = ({ subtotal, vatRate = 20, discount = 0, paidAmount = 0 }) => {
  const normalizedSubtotal = Number(subtotal || 0);
  const normalizedVatRate = Number(vatRate || 0);
  const normalizedDiscount = Number(discount || 0);
  const normalizedPaidAmount = Number(paidAmount || 0);

  const vatTotal = Number((normalizedSubtotal * (normalizedVatRate / 100)).toFixed(2));
  const totalAmount = Number((normalizedSubtotal + vatTotal - normalizedDiscount).toFixed(2));
  const dueAmount = Number(Math.max(0, totalAmount - normalizedPaidAmount).toFixed(2));

  return { vatTotal, totalAmount, dueAmount };
};

const shouldApplyStockMovement = ({ status, paymentStatus }) => {
  const normalizedStatus = String(status || "").toUpperCase();
  const normalizedPaymentStatus = String(paymentStatus || "").toUpperCase();
  return normalizedStatus !== "TASLAK" && normalizedPaymentStatus !== "IPTAL";
};

module.exports = { calculateSaleTotals, shouldApplyStockMovement };
