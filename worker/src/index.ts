import "dotenv/config";
import { Kafka } from "kafkajs";

const TOPIC_NAME = "zap-events";

const kafka = new Kafka({
  clientId: "main-worker",
  brokers: ["localhost:9092"],
});

async function main() {
  const consumer = kafka.consumer({ groupId: "main-worker" });

  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: false }); 

  await consumer.run({
    autoCommit: false,

    eachMessage: async ({ topic, partition, message }) => {
      const zapRunId = message.value?.toString();

      if (!zapRunId) return;

      console.log({
        partition,
        offset: message.offset,
        zapRunId,
      });

      try {
        await new Promise((r) => setTimeout(r, 2000));

        console.log("processing done");

        await consumer.commitOffsets([
          {
            topic,
            partition,
            offset: (parseInt(message.offset) + 1).toString(),
          },
        ]);
      } catch (err) {
        console.error("Processing failed:", err);
      }
    },
  });
}

main();