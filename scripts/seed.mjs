import postgres from "postgres";
import bcrypt from "bcryptjs";

const sql = postgres(process.env.DATABASE_URL);

const PETES = [
  ["Manjeshwar", "MJS", "Devadas Prabhu", "9020155656"],
  ["Hosdurg", "HSD", "Pratheep Pai H.", "9447878577"],
  ["Kasaragod", "KSG", "K. Sanjay Kamath", "9495345206"],
  ["Kundapur", "KDP", "Mallinath Kamath", "9538382777"],
  ["Gangolli", "GNG", "B. Prakash Padiyar", "9620334274"],
  ["Udupi", "UDP", "Vishal Shenoy P.", "9880901832"],
  ["Kaup", "KAP", "Rajendra Bhat", "9845353179"],
  ["Karkala", "KRK", "M. Premananda Pai", "9448151467"],
  ["Moodabidri", "MDB", "B. Raghavendra Kamath", "9620370757"],
  ["Bantwala", "BNT", "S. Subraya Nayak", "9964552790"],
  ["Belthangady", "BLT", "Shasidhar Pai R. B.", "9900494153"],
  ["Puttur", "PTR", "M. Dinesh Kamath", "8861021147"],
  ["Bellare", "BLR", "K. Ashok Prabhu", "9343293764"],
  ["Mulky", "MLK", "V. Shivaram Kamath", "9845082607"],
  ["Gurpur", "GRP", "G. Krishnananda Pai", "9449770505"],
  ["Mangalore-1", "MG1", "G. Gopalakrishna Kamath", "9886749779"],
  ["Mangalore-2", "MG2", "P. Sudhir Bhagath", "9980159151"],
  ["Ullal", "ULL", "M. Anil Pai", "9591857157"],
];

async function main() {
  for (const [name, shortCode, memberName, memberMobile] of PETES) {
    await sql`
      INSERT INTO petes (name, short_code, member_name, member_mobile)
      VALUES (${name}, ${shortCode}, ${memberName}, ${memberMobile})
      ON CONFLICT (name) DO NOTHING
    `;
  }
  console.log(`Seeded ${PETES.length} petes (idempotent).`);

  const [existing] = await sql`SELECT id FROM users WHERE username = 'admin'`;
  if (existing) {
    console.log("Super admin 'admin' already exists — leaving password unchanged.");
  } else {
    const password = process.env.SEED_ADMIN_PASSWORD || `Temple${Math.floor(1000 + Math.random() * 9000)}!`;
    const hash = await bcrypt.hash(password, 10);
    await sql`
      INSERT INTO users (username, password_hash, role, active)
      VALUES ('admin', ${hash}, 'super_admin', true)
    `;
    console.log("=".repeat(50));
    console.log("Created super admin account:");
    console.log(`  username: admin`);
    console.log(`  password: ${password}`);
    console.log("Save this password now — it will not be shown again.");
    console.log("=".repeat(50));
  }

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
