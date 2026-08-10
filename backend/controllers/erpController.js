const Product = require('../models/Product');
const Customer = require('../models/customer');
const Sale = require('../models/Sale');
const Account = require('../models/Account');
const AccountTransaction = require('../models/AccountTransaction');
const { buildErpOverview } = require('../utils/erpUtils');
const { getCompanyId } = require('../utils/tenantScope');

const getErpOverview = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Sirket bilgisi bulunamadi.' });
    }

    const companyFilter = { company: companyId };
    const companyIdFilter = { companyId };

    const [products, customers, sales, accounts, transactions] = await Promise.all([
      Product.find(companyFilter).lean(),
      Customer.find(companyFilter).lean(),
      Sale.find(companyIdFilter).populate('customerId', 'companyName name').lean(),
      Account.find(companyIdFilter).lean(),
      AccountTransaction.find(companyIdFilter).populate('customerId', 'companyName name').lean(),
    ]);

    const overview = buildErpOverview({ products, customers, sales, accounts, transactions });

    res.json({ success: true, overview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getErpOverview,
};
