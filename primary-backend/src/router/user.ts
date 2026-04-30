import { Router } from "express";
import { authMiddleware } from "../middleware.js";
import { SigninSchema, SignupSchema } from "../types/index.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { JWT_PASSWORD } from "../config.js";

const router = Router();

const SALT_ROUNDS = 10;

router.post("/signup", async (req, res) => {
  const parsed = SignupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(411).json({ message: "Incorrect inputs" });
  }

  const { username, password, name } = parsed.data;

  // Check existing user
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, username));

  if (existing.length) {
    return res.status(403).json({ message: "User already exists" });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  await db.insert(users).values({
    email: username,
    password: hashedPassword,
    name,
  });

  return res.json({
    message: "Please verify your account by checking your email",
  });
});

router.post("/signin", async (req, res) => {
  const parsed = SigninSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(411).json({ message: "Incorrect inputs" });
  }

  const { username, password } = parsed.data;

  // Fetch by email only
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, username));

  const user = result[0];
  if (!user) {
    return res.status(403).json({
      message: "Sorry credentials are incorrect",
    });
  }

  // Compare hashed password
  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return res.status(403).json({
      message: "Sorry credentials are incorrect",
    });
  }

  const token = jwt.sign({ id: user.id }, JWT_PASSWORD);

  return res.json({ token });
});

router.get("/", authMiddleware, async (req, res) => {
  // @ts-ignore
  const id = req.id;

  const result = await db
    .select({
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, id));

  return res.json({
    user: result[0] || null,
  });
});

export const userRouter = router;