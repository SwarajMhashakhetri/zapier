import { Router } from "express";
import { authMiddleware } from "../middleware.js";
import { ZapCreateSchema } from "../types/index.js";
import { db } from "../db/index.js";
import {
  zaps,
  triggers,
  actions,
  availableActions,
  availableTriggers,
} from "../db/schema.js";
import { eq, inArray, asc } from "drizzle-orm";

const router = Router();

/* ---------------- CREATE ZAP ---------------- */
router.post("/", authMiddleware, async (req, res) => {
  // @ts-ignore
  const id: string = req.id;

  const parsed = ZapCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(411).json({ message: "Incorrect inputs" });
  }

  const zapId = await db.transaction(async (tx) => {
    const [zap] = await tx
      .insert(zaps)
      .values({
        userId: parseInt(id),
        triggerId: null,
      })
      .returning();

    if (!zap) throw new Error("Zap creation failed");

    await tx.insert(actions).values(
      parsed.data.actions.map((x, index) => ({
        zapId: zap.id,
        actionId: x.availableActionId,
        sortingOrder: index,
      }))
    );

    const [trigger] = await tx
      .insert(triggers)
      .values({
        zapId: zap.id,
        triggerId: parsed.data.availableTriggerId,
      })
      .returning();

    if (!trigger) throw new Error("Trigger creation failed");

    await tx
      .update(zaps)
      .set({ triggerId: trigger.id })
      .where(eq(zaps.id, zap.id));

    return zap.id;
  });

  return res.json({ zapId });
});


/* ---------------- GET ALL ZAPS  ---------------- */
router.get("/", authMiddleware, async (req, res) => {
  // @ts-ignore
  const userId = parseInt(req.id);

  // 1. fetch zaps
  const zapList = await db
    .select()
    .from(zaps)
    .where(eq(zaps.userId, userId));

  if (zapList.length === 0) {
    return res.json({ zaps: [] });
  }

  const zapIds = zapList.map((z) => z.id);

  // 2. fetch actions (ordered)
  const actionRows = await db
    .select({
      zapId: actions.zapId,
      id: actions.id,
      sortingOrder: actions.sortingOrder,
      type: {
        id: availableActions.id,
        name: availableActions.name,
      },
    })
    .from(actions)
    .leftJoin(
      availableActions,
      eq(actions.actionId, availableActions.id)
    )
    .where(inArray(actions.zapId, zapIds))
    .orderBy(asc(actions.sortingOrder));

  // 3. fetch triggers
  const triggerRows = await db
    .select({
      zapId: triggers.zapId,
      id: triggers.id,
      type: {
        id: availableTriggers.id,
        name: availableTriggers.name,
      },
    })
    .from(triggers)
    .leftJoin(
      availableTriggers,
      eq(triggers.triggerId, availableTriggers.id)
    )
    .where(inArray(triggers.zapId, zapIds));

  // 4. group actions
  const actionsMap = new Map<string, any[]>();
  for (const row of actionRows) {
    if (!actionsMap.has(row.zapId)) {
      actionsMap.set(row.zapId, []);
    }
    actionsMap.get(row.zapId)!.push({
      id: row.id,
      sortingOrder: row.sortingOrder,
      type: row.type,
    });
  }

  // 5. map triggers
  const triggerMap = new Map<string, any>();
  for (const row of triggerRows) {
    triggerMap.set(row.zapId, {
      id: row.id,
      type: row.type,
    });
  }

  // 6. final shape
  const result = zapList.map((zap) => ({
    ...zap,
    trigger: triggerMap.get(zap.id) || null,
    actions: actionsMap.get(zap.id) || [],
  }));

  return res.json({ zaps: result });
});


/* ---------------- GET SINGLE ZAP ---------------- */
router.get("/:zapId", authMiddleware, async (req, res) => {
  // @ts-ignore
  const userId = parseInt(req.id);
  const rawZapId = req.params.zapId;

  const zapId = Array.isArray(rawZapId) ? rawZapId[0] : rawZapId;

    if (!zapId) {
        return res.status(400).json({ error: "Invalid zapId" });
    }

  const zap = await db
    .select()
    .from(zaps)
    .where(eq(zaps.id, zapId));

    const zapData = zap[0];

    if (!zapData) {
        return res.status(404).json({ zap: null });
    }

  if (!zap.length || zapData.userId !== userId) {
    return res.status(404).json({ zap: null });
  }

  const actionRows = await db
    .select({
      id: actions.id,
      sortingOrder: actions.sortingOrder,
      type: {
        id: availableActions.id,
        name: availableActions.name,
      },
    })
    .from(actions)
    .leftJoin(
      availableActions,
      eq(actions.actionId, availableActions.id)
    )
    .where(eq(actions.zapId, zapId))
    .orderBy(asc(actions.sortingOrder));

  const triggerRow = await db
    .select({
      id: triggers.id,
      type: {
        id: availableTriggers.id,
        name: availableTriggers.name,
      },
    })
    .from(triggers)
    .leftJoin(
      availableTriggers,
      eq(triggers.triggerId, availableTriggers.id)
    )
    .where(eq(triggers.zapId, zapId));

  return res.json({
    zap: {
      ...zap[0],
      trigger: triggerRow[0] || null,
      actions: actionRows,
    },
  });
});

export const zapRouter = router;