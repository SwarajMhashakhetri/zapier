import "dotenv/config";
import { Kafka } from "kafkajs";
import { db } from "./db/index.js";
import { zapRunOutbox } from "./db/schema.js";
import { inArray } from "drizzle-orm";

const TOPIC_NAME = "zap-events";

const kafka = new Kafka({
  clientId: "outbox-processor",
  brokers: ["localhost:9092"],
});

async function main() {
  const producer = kafka.producer();
  await producer.connect();

  while (true) {
    // 1. fetch pending rows
    const pendingRows = await db
      .select()
      .from(zapRunOutbox)
      .limit(10);

    if (pendingRows.length === 0) {
      await new Promise((r) => setTimeout(r, 500)); // ✅ prevent CPU burn
      continue;
    }

    // 2. send to Kafka
    await producer.send({
      topic: TOPIC_NAME,
      messages: pendingRows.map((r) => ({
        value: r.zapRunId,
      })),
    });

    // 3. delete processed rows
    await db
      .delete(zapRunOutbox)
      .where(
        inArray(
          zapRunOutbox.id,
          pendingRows.map((x) => x.id)
        )
      );
  }
}

main();