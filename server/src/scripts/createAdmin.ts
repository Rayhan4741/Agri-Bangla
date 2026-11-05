/** Creates (or promotes) the admin account from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME. */
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { connectDb, disconnectDb } from '../db.js';
import { User } from '../models/User.js';

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';
  const name = process.env.ADMIN_NAME || 'Admin';
  if (!email || password.length < 10) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 10 characters) in server/.env first.');
    process.exit(1);
  }
  await connectDb(config.MONGODB_URI);
  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    existing.passwordHash = await bcrypt.hash(password, 12);
    await existing.save();
    console.log(`Updated ${email}: role=admin, password reset.`);
  } else {
    await User.create({ name, email, role: 'admin', passwordHash: await bcrypt.hash(password, 12) });
    console.log(`Created admin ${email}.`);
  }
  await disconnectDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
