const mongoose = require('mongoose');
const User = require('../models/User');

const run = async () => {
  const targetEmail = String(process.env.TARGET_EMAIL || '').trim().toLowerCase();
  const expectedEmail = String(process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const mongoUri = String(process.env.MONGO_URI || '').trim();

  if (!targetEmail) {
    console.error('TARGET_EMAIL is required.');
    process.exit(1);
  }

  if (!expectedEmail || targetEmail !== expectedEmail) {
    console.error('TARGET_EMAIL does not match SUPER_ADMIN_EMAIL.');
    process.exit(1);
  }

  if (!mongoUri || /your_username|your_password|your_cluster|localhost|127\.0\.0\.1/i.test(mongoUri)) {
    console.error('Production MONGO_URI is not configured safely.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });

  const user = await User.findOne({ email: targetEmail });
  if (!user) {
    console.error(`User not found for ${targetEmail}`);
    process.exit(1);
  }

  if (user.role === 'SUPER_ADMIN') {
    console.log(JSON.stringify({ email: user.email, role: user.role, updated: false }, null, 2));
    await mongoose.disconnect();
    return;
  }

  user.role = 'SUPER_ADMIN';
  user.isActive = true;
  await user.save();

  console.log(JSON.stringify({ email: user.email, role: user.role, updated: true }, null, 2));
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
