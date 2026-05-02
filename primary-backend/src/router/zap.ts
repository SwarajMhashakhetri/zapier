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
    // 1. create zap
    const [zap] = await tx
      .insert(zaps)
      .values({
        userId: parseInt(id),
        triggerId: null,
      })
      .returning();

    if (!zap) throw new Error("Zap creation failed");

    // 2. create actions
    await tx.insert(actions).values(
      parsed.data.actions.map((x, index) => ({
        zapId: zap.id,
        actionId: x.availableActionId,
        sortingOrder: index,
        metadata: x.actionMetadata || {},
      }))
    );

    // 3. create trigger
    const [trigger] = await tx
      .insert(triggers)
      .values({
        zapId: zap.id,
        triggerId: parsed.data.availableTriggerId,
        metadata: parsed.data.triggerMetadata || {},
      })
      .returning();

    if (!trigger) throw new Error("Trigger creation failed");

    // 4. update zap with triggerId
    await tx
      .update(zaps)
      .set({ triggerId: trigger.id })
      .where(eq(zaps.id, zap.id));

    return zap.id;
  });

  return res.json({ zapId });
});

/* ---------------- GET ALL ZAPS ---------------- */
router.get("/", authMiddleware, async (req, res) => {
  // @ts-ignore
  const userId = parseInt(req.id);

  const zapList = await db
    .select()
    .from(zaps)
    .where(eq(zaps.userId, userId));

  if (!zapList.length) {
    return res.json({ zaps: [] });
  }

  const zapIds = zapList.map((z) => z.id);

  // actions + type
  const actionRows = await db
    .select({
      zapId: actions.zapId,
      id: actions.id,
      metadata: actions.metadata,
      sortingOrder: actions.sortingOrder,
      type: {
        id: availableActions.id,
        name: availableActions.name,
        image: availableActions.image,
      },
    })
    .from(actions)
    .leftJoin(
      availableActions,
      eq(actions.actionId, availableActions.id)
    )
    .where(inArray(actions.zapId, zapIds))
    .orderBy(asc(actions.sortingOrder));

  // triggers + type
  const triggerRows = await db
    .select({
      zapId: triggers.zapId,
      id: triggers.id,
      metadata: triggers.metadata,
      type: {
        id: availableTriggers.id,
        name: availableTriggers.name,
        image: availableTriggers.image,
      },
    })
    .from(triggers)
    .leftJoin(
      availableTriggers,
      eq(triggers.triggerId, availableTriggers.id)
    )
    .where(inArray(triggers.zapId, zapIds));

  // group actions
  const actionsMap = new Map<string, any[]>();
  for (const row of actionRows) {
    if (!actionsMap.has(row.zapId)) {
      actionsMap.set(row.zapId, []);
    }
    actionsMap.get(row.zapId)!.push({
      id: row.id,
      metadata: row.metadata,
      sortingOrder: row.sortingOrder,
      type: row.type,
    });
  }

  // map triggers
  const triggerMap = new Map<string, any>();
  for (const row of triggerRows) {
    triggerMap.set(row.zapId, {
      id: row.id,
      metadata: row.metadata,
      type: row.type,
    });
  }

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

  if (!zap.length || zapData.userId !== userId){
    return res.status(404).json({ zap: null });
  }

  const actionRows = await db
    .select({
      id: actions.id,
      metadata: actions.metadata,
      sortingOrder: actions.sortingOrder,
      type: {
        id: availableActions.id,
        name: availableActions.name,
        image: availableActions.image,
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
      metadata: triggers.metadata,
      type: {
        id: availableTriggers.id,
        name: availableTriggers.name,
        image: availableTriggers.image,
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