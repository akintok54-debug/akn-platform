import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const emptyItem = {
  productId: "",
  productName: "",
  sku: "",
  quantity: 1,
  unitPrice: 0,
  vat: 20,
};

function PurchaseInvoiceModal({ supplier, onClose, onSaved }) {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [paymentType, setPaymentType] = useState("OPEN_ACCOUNT");

  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [items, setItems] = useState([]);
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Ürünleri getir
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);

      try {
        const response = await api.get("/products", {
          params: { limit: 5000 },
        });

        const list =
          response?.data?.data ||
          response?.data?.products ||
          [];

        setProducts(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error(error);
        setErrorMessage("Ürünler yüklenemedi.");
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Ürün arama
  const filteredProducts = useMemo(() => {
    const term = String(productSearch || "")
      .trim()
      .toLowerCase();

    if (!term) return [];

    return products
      .filter((product) => {
        const text = [
          product.name,
          product.sku,
          product.barcode,
          product.brand,
          product.oemCode,
        ]
          .join(" ")
          .toLowerCase();

        return text.includes(term);
      })
      .slice(0, 20);
  }, [products, productSearch]);

  // Ürün ekle
  const addProduct = (product) => {
    if (!product?._id) return;

    const existing = items.find(
      (item) => item.productId === product._id
    );

    if (existing) {
      setItems((prev) =>
        prev.map((item) =>
          item.productId === product._id
            ? {
                ...item,
                quantity: Number(item.quantity || 0) + 1,
              }
            : item
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          ...emptyItem,
          productId: product._id,
          productName: product.name || "",
          sku: product.sku || "",
          unitPrice: Number(product.purchasePrice || 0),
          vat: Number(product.vat ?? 20),
        },
      ]);
    }

    setProductSearch("");
  };

  // Satır güncelle
  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  // Satır sil
  const removeItem = (index) => {
    setItems((prev) =>
      prev.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  // Ara toplam
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);

      return sum + quantity * unitPrice;
    }, 0);
  }, [items]);

  // KDV
  const vatTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const vat = Number(item.vat || 0);

      return sum + (quantity * unitPrice * vat) / 100;
    }, 0);
  }, [items]);

  // Genel toplam
  const grandTotal = subtotal + vatTotal;

  const money = (value) =>
    Number(value || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const validate = () => {
    if (!supplier?._id) {
      return "Tedarikçi bulunamadı.";
    }

    if (!invoiceNo.trim()) {
      return "Fatura numarası giriniz.";
    }

    if (items.length === 0) {
      return "Faturaya en az bir ürün ekleyiniz.";
    }

    for (const item of items) {
      if (!item.productId) {
        return "Faturadaki ürünlerden biri geçersiz.";
      }

      if (Number(item.quantity) <= 0) {
        return `${item.productName} için miktar geçersiz.`;
      }

      if (Number(item.unitPrice) < 0) {
        return `${item.productName} için alış fiyatı geçersiz.`;
      }
    }

    return "";
  };

  // Kaydet
  const handleSave = async () => {
    const validationError = validate();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const payload = {
      supplierId: supplier._id,

      invoiceNo: invoiceNo.trim(),

      invoiceDate,

      paymentType,

      description: description.trim(),

      items: items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        vat: Number(item.vat),
      })),

      subtotal,

      vatTotal,

      totalAmount: grandTotal,
    };

    try {
      /*
       * Backend endpointini birazdan oluşturacağız.
       * Endpoint:
       * POST /purchase-invoices
       */
      const response = await api.post(
        "/purchase-invoices",
        payload
      );

      if (response?.data?.success === false) {
        throw new Error(
          response?.data?.message ||
            "Fatura kaydedilemedi."
        );
      }

      if (onSaved) {
        onSaved(response.data);
      }

      onClose();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Alış faturası kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!supplier) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* BAŞLIK */}
        <div style={headerStyle}>
          <div>
            <div style={smallTitleStyle}>
              ALIŞ FATURASI
            </div>

            <h2 style={{ margin: "4px 0" }}>
              {supplier.name}
            </h2>

            <div style={mutedStyle}>
              Tedarikçi Kodu: {supplier.code || "-"}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={closeButtonStyle}
          >
            ×
          </button>
        </div>

        {errorMessage ? (
          <div style={errorStyle}>
            {errorMessage}
          </div>
        ) : null}

        {/* FATURA BİLGİLERİ */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            Fatura Bilgileri
          </h3>

          <div style={grid3Style}>
            <div>
              <label style={labelStyle}>
                Fatura No
              </label>

              <input
                value={invoiceNo}
                onChange={(e) =>
                  setInvoiceNo(e.target.value)
                }
                placeholder="Örn: A202600001"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Fatura Tarihi
              </label>

              <input
                type="date"
                value={invoiceDate}
                onChange={(e) =>
                  setInvoiceDate(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Ödeme Şekli
              </label>

              <select
                value={paymentType}
                onChange={(e) =>
                  setPaymentType(e.target.value)
                }
                style={inputStyle}
              >
                <option value="OPEN_ACCOUNT">
                  Açık Hesap
                </option>

                <option value="CASH">
                  Peşin
                </option>

                <option value="PROMISSORY_NOTE">
                  Senet
                </option>

                <option value="CHECK">
                  Çek
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* ÜRÜN ARAMA */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            Ürün Ekle
          </h3>

          <div style={{ position: "relative" }}>
            <input
              value={productSearch}
              onChange={(e) =>
                setProductSearch(e.target.value)
              }
              placeholder={
                loadingProducts
                  ? "Ürünler yükleniyor..."
                  : "Ürün adı, stok kodu veya barkod ara..."
              }
              style={searchStyle}
              disabled={loadingProducts}
            />

            {productSearch &&
            filteredProducts.length > 0 ? (
              <div style={productDropdownStyle}>
                {filteredProducts.map((product) => (
                  <button
                    key={product._id}
                    type="button"
                    onClick={() =>
                      addProduct(product)
                    }
                    style={productOptionStyle}
                  >
                    <strong>
                      {product.name}
                    </strong>

                    <span style={mutedStyle}>
                      {product.sku
                        ? `Kod: ${product.sku}`
                        : ""}

                      {product.barcode
                        ? ` | Barkod: ${product.barcode}`
                        : ""}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* ÜRÜNLER */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            Fatura Kalemleri
          </h3>

          {items.length === 0 ? (
            <div style={emptyStyle}>
              Henüz ürün eklenmedi.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>
                      Ürün
                    </th>

                    <th style={thStyle}>
                      Miktar
                    </th>

                    <th style={thStyle}>
                      Alış Fiyatı
                    </th>

                    <th style={thStyle}>
                      KDV %
                    </th>

                    <th style={thStyle}>
                      Tutar
                    </th>

                    <th style={thStyle}>
                      İşlem
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => {
                    const lineTotal =
                      Number(item.quantity || 0) *
                      Number(item.unitPrice || 0);

                    return (
                      <tr key={`${item.productId}-${index}`}>
                        <td style={tdStyle}>
                          <strong>
                            {item.productName}
                          </strong>

                          <div style={mutedStyle}>
                            {item.sku || "-"}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                            style={numberInputStyle}
                          />
                        </td>

                        <td style={tdStyle}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "unitPrice",
                                e.target.value
                              )
                            }
                            style={numberInputStyle}
                          />
                        </td>

                        <td style={tdStyle}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.vat}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "vat",
                                e.target.value
                              )
                            }
                            style={smallNumberInputStyle}
                          />
                        </td>

                        <td style={tdStyle}>
                          <strong>
                            {money(lineTotal)} TL
                          </strong>
                        </td>

                        <td style={tdStyle}>
                          <button
                            type="button"
                            onClick={() =>
                              removeItem(index)
                            }
                            style={deleteButtonStyle}
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AÇIKLAMA */}
        <div style={sectionStyle}>
          <label style={labelStyle}>
            Açıklama
          </label>

          <textarea
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            rows={3}
            placeholder="Fatura ile ilgili not..."
            style={textareaStyle}
          />
        </div>

        {/* TOPLAM */}
        <div style={totalBoxStyle}>
          <div>
            <span>Mal/Hizmet Toplamı</span>
            <strong>
              {money(subtotal)} TL
            </strong>
          </div>

          <div>
            <span>KDV Toplamı</span>
            <strong>
              {money(vatTotal)} TL
            </strong>
          </div>

          <div style={grandTotalStyle}>
            <span>GENEL TOPLAM</span>

            <strong>
              {money(grandTotal)} TL
            </strong>
          </div>
        </div>

        {/* BUTONLAR */}
        <div style={footerStyle}>
          <button
            type="button"
            onClick={onClose}
            style={cancelButtonStyle}
            disabled={saving}
          >
            İptal
          </button>

          <button
            type="button"
            onClick={handleSave}
            style={saveButtonStyle}
            disabled={saving}
          >
            {saving
              ? "Kaydediliyor..."
              : "Faturayı Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------- */
/* STİLLER */
/* -------------------------------------------------- */

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  zIndex: 9999,
};

const modalStyle = {
  width: "min(1100px, 100%)",
  maxHeight: "92vh",
  overflowY: "auto",
  background: "#fff",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 25px 70px rgba(0,0,0,0.25)",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  marginBottom: 16,
};

const smallTitleStyle = {
  fontSize: 12,
  fontWeight: 800,
  color: "#64748b",
  letterSpacing: "0.15em",
};

const mutedStyle = {
  color: "#64748b",
  fontSize: 13,
  marginTop: 3,
};

const closeButtonStyle = {
  border: "none",
  background: "#f1f5f9",
  width: 38,
  height: 38,
  borderRadius: 10,
  fontSize: 25,
  cursor: "pointer",
};

const sectionStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 14,
  marginBottom: 12,
};

const sectionTitleStyle = {
  margin: "0 0 12px",
  fontSize: 16,
};

const grid3Style = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 5,
  color: "#334155",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  outline: "none",
};

const searchStyle = {
  ...inputStyle,
  fontSize: 15,
};

const textareaStyle = {
  ...inputStyle,
  resize: "vertical",
};

const productDropdownStyle = {
  position: "absolute",
  top: "calc(100% + 5px)",
  left: 0,
  right: 0,
  background: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  boxShadow: "0 12px 30px rgba(15,23,42,0.15)",
  overflow: "hidden",
  zIndex: 20,
};

const productOptionStyle = {
  width: "100%",
  border: "none",
  borderBottom: "1px solid #e2e8f0",
  background: "#fff",
  padding: 11,
  textAlign: "left",
  cursor: "pointer",
  display: "grid",
  gap: 3,
};

const emptyStyle = {
  padding: 20,
  textAlign: "center",
  color: "#64748b",
  background: "#f8fafc",
  borderRadius: 10,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 750,
};

const thStyle = {
  textAlign: "left",
  padding: 9,
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 13,
};

const tdStyle = {
  padding: 9,
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "middle",
};

const numberInputStyle = {
  width: 100,
  padding: "8px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
};

const smallNumberInputStyle = {
  width: 65,
  padding: "8px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
};

const deleteButtonStyle = {
  border: "1px solid #fecaca",
  background: "#fff",
  color: "#b91c1c",
  borderRadius: 8,
  padding: "7px 10px",
  cursor: "pointer",
};

const errorStyle = {
  padding: 11,
  marginBottom: 12,
  borderRadius: 10,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#b91c1c",
};

const totalBoxStyle = {
  display: "grid",
  gap: 8,
  background: "#f8fafc",
  borderRadius: 14,
  padding: 15,
  marginBottom: 15,
};

const grandTotalStyle = {
  display: "flex",
  justifyContent: "space-between",
  borderTop: "2px solid #cbd5e1",
  paddingTop: 10,
  fontSize: 18,
};

const footerStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const cancelButtonStyle = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  borderRadius: 10,
  padding: "11px 18px",
  cursor: "pointer",
};

const saveButtonStyle = {
  border: "none",
  background: "#0f766e",
  color: "#fff",
  borderRadius: 10,
  padding: "11px 20px",
  cursor: "pointer",
  fontWeight: 700,
};

export default PurchaseInvoiceModal;