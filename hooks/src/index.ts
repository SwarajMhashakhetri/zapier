import express from "express";
import { db } from "./db/index.js";
import { zapRuns, zapRunOutbox } from "./db/schema.js";
import "dotenv/config";

const app = express();
app.use(express.json());

app.post("/hooks/catch/:userId/:zapId", async (req, res) => {
  const zapId = req.params.zapId;
  const body = req.body;

  console.log("reached here");

  try {
    await db.transaction(async (tx) => {
      console.log("reached here 2");

      const result = await tx
        .insert(zapRuns)
        .values({
          zapId,
          metadata: body,
        })
        .returning();

      console.log("reached here 3");

      if (!result[0]) {
        throw new Error("Failed to create zapRun");
      }
      const run = result[0];

      await tx.insert(zapRunOutbox).values({
        zapRunId: run.id,
      });
    });

    res.json({ message: "Webhook received" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(3000);