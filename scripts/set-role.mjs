// Promote/demote a user by email.
// Usage: node --env-file=.env.local scripts/set-role.mjs <email> <user|admin>
import mongoose from "mongoose";

const [, , email, role = "admin"] = process.argv;

if (!email || !["user", "admin"].includes(role)) {
  console.error("Usage: node --env-file=.env.local scripts/set-role.mjs <email> <user|admin>");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI not set (run with --env-file=.env.local)");
  process.exit(1);
}

await mongoose.connect(uri, { dbName: process.env.MONGODB_DB });
const res = await mongoose.connection
  .collection("users")
  .updateOne({ email: email.toLowerCase() }, { $set: { role } });

console.log(
  res.matchedCount
    ? `OK: ${email} -> role=${role}`
    : `No user found with email ${email}`
);
await mongoose.disconnect();
