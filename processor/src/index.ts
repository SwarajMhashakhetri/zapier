import "dotenv/config";
import { Kafka } from "kafkajs";
import { db } from "./db/index.js"; 
import { zapRunOutbox } from "./db/schema.js";
import { inArray, asc } from "drizzle-orm";

const TOPIC_NAME = "zap-events";

const kafka = new Kafka({
  clientId: "outbox-processor",
  brokers: ["localhost:9092"],
});

async function main() {
  const producer = kafka.producer();
  await producer.connect();

  while (true) {
    // 1) fetch pending rows (FIFO-ish)
    const pendingRows = await db
      .select()
      .from(zapRunOutbox)
      .orderBy(asc(zapRunOutbox.id))
      .limit(10);

    if (pendingRows.length === 0) {
      // prevent tight loop
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    console.log(pendingRows);

    // 2) send to Kafka (await is important)
    await producer.send({
      topic: TOPIC_NAME,
      messages: pendingRows.map((r) => ({
        value: JSON.stringify({
          zapRunId: r.zapRunId,
          stage: 0,
        }),
      })),
    });

    // 3) delete processed rows
    await db
      .delete(zapRunOutbox)
      .where(
        inArray(
          zapRunOutbox.id,
          pendingRows.map((x) => x.id)
        )
      );

    // 4) throttle loop
    await new Promise((r) => setTimeout(r, 3000));
  }
}

main().catch((e) => {
  console.error("Outbox processor crashed:", e);
  process.exit(1);
});