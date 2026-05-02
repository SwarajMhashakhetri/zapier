import { Router } from "express";
import { db } from "../db/index.js";
import { availableActions } from "../db/schema.js";

const router = Router();

router.get("/available", async (req, res) => {
  const actions = await db.select().from(availableActions);

  res.json({
    availableActions: actions,
  });
});

export const actionRouter = router;