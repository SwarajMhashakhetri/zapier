import { Router } from "express";
import { db } from "../db/index.js";
import { availableTriggers } from "../db/schema.js";

const router = Router();

router.get("/available", async (req, res) => {
  const triggers = await db.select().from(availableTriggers);

  res.json({
    availableTriggers: triggers,
  });
});

export const triggerRouter = router;