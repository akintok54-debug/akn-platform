const Product = require('../models/Product');
const Customer = require('../models/customer');
const Sale = require('../models/Sale');
const Account = require('../models/Account');
const AccountTransaction = require('../models/AccountTransaction');
const { buildErpOverview } = require('../utils/erpUtils');

const getErpOverview = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.user?.company || null;
    const filter = companyId ? { companyId } : {};

    const [products, customers, sales, accounts, transactions] = await Promise.all([
      Product.find(filter).lean(),
      Customer.find(filter).lean(),
      Sale.find(filter).populate('customerId', 'companyName name').lean(),
      Account.find(filter).lean(),
      AccountTransaction.find(filter).populate('customerId', 'companyName name').lean(),
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
