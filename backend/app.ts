import express from "express";
import { router as index } from "./controller/index";
import { customerRouter } from "./controller/customer";
import { orderRouter } from "./controller/order";

export const app = express();

app.use(express.json());
app.use("/", index);
app.use("/customers", customerRouter);
app.use("/orders", orderRouter);
export default app;
