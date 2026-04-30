import express from "express";
import cors from "cors";
import { userRouter } from "./router/user.js";
import { zapRouter } from "./router/zap.js";

const app = express();

app.use(express.json());
app.use(cors())

app.use("/api/v1/user", userRouter);
app.use("/api/v1/zap", zapRouter);


app.listen(3000);