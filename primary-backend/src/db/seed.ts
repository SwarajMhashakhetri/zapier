import "dotenv/config";
import { db } from "./index.js"; 
import {
  availableActions,
  availableTriggers,
} from "./schema.js";

async function main() {
  console.log("🌱 Seeding database...");

  // Insert Trigger
  await db.insert(availableTriggers).values({
    id: "webhook",
    name: "Webhook",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRIovxkR9l-OlwpjTXV1B4YNh0W_s618ijxAQ&s",
  });

  // Insert Actions
  await db.insert(availableActions).values([
    {
      id: "send-sol",
      name: "Send Solana",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT10458YI0Lf1-Zx4fGwhWxI_x4oPCD034xaw&s",
    },
    {
      id: "email",
      name: "Send Email",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ4nd82eFk5SaBPRIeCpmwL7A4YSokA-kXSmw&s",
    },
  ]);

  console.log("✅ Seeding complete");
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});