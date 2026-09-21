import { Router, type IRouter, type RequestHandler } from "express";
import { db, ordersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";

const router: IRouter = Router();
const ADMIN_COOKIE = "myoko_admin_session";
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const orderStatuses = new Set(["new", "confirmed", "making", "ready", "completed", "cancelled"]);
const paymentStatuses = new Set(["unpaid", "paid"]);

const getSecret = (key: string) => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

const sign = (payload: string) =>
  createHmac("sha256", getSecret("SESSION_SECRET")).update(payload).digest("hex");

const createSessionToken = () => {
  const payload = String(Date.now());
  return `${payload}.${sign(payload)}`;
};

const hasValidSession = (req: Parameters<RequestHandler>[0]) => {
  const token = req.cookies?.[ADMIN_COOKIE];
  if (typeof token !== "string") return false;
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature || Date.now() - Number(issuedAt) > SESSION_MAX_AGE_MS) return false;
  const expected = sign(issuedAt);
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

const requireAdmin: RequestHandler = (req, res, next) => {
  try {
    if (!hasValidSession(req)) return res.status(401).json({ message: "Admin login required" });
    return next();
  } catch (error) {
  req.log?.error({ err: error }, "Admin login failed");
  return res.status(500).json({
    message: error instanceof Error ? error.message : "Admin login failed",
  });
}
};

router.post("/admin/login", (req, res) => {
  console.log("[ADMIN LOGIN] POST reached Express");

  try {
    console.log("[ADMIN LOGIN] Reading password");

    const submitted =
      typeof req.body?.password === "string"
        ? req.body.password
        : "";

    console.log("[ADMIN LOGIN] Reading environment variables");

    const expected = getSecret("MYOKO_ADMIN_PASSWORD");

    console.log("[ADMIN LOGIN] Comparing password");

    const submittedBuffer = Buffer.from(submitted);
    const expectedBuffer = Buffer.from(expected);

    const valid =
      submittedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(submittedBuffer, expectedBuffer);

    console.log("[ADMIN LOGIN] Password comparison complete:", valid);

    if (!valid) {
      return res.status(401).json({
        message: "Incorrect password",
      });
    }

    console.log("[ADMIN LOGIN] Creating session");

    const token = createSessionToken();

    console.log("[ADMIN LOGIN] Setting cookie");

    res.cookie(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: SESSION_MAX_AGE_MS,
      path: "/",
    });

    console.log("[ADMIN LOGIN] Sending success response");

    return res.json({
      authenticated: true,
    });
  } catch (error) {
    console.error("[ADMIN LOGIN] ERROR:", error);

    req.log?.error(
      { err: error },
      "Admin login failed",
    );

    return res.status(503).json({
      message: "Admin access is not configured",
    });
  }
});

router.get("/admin/session", (req, res) => {
  try {
    return res.json({ authenticated: hasValidSession(req) });
  } catch {
    return res.json({ authenticated: false });
  }
});

router.post("/admin/logout", (_req, res) => {
  res.clearCookie(ADMIN_COOKIE, {
  httpOnly: true,
  sameSite: "none",
  secure: true,
  path: "/",
});
  return res.json({ authenticated: false });
});

router.get("/admin/orders", requireAdmin, async (req, res) => {
  try {
    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
    return res.json({ orders });
  } catch (error) {
    req.log?.error({ err: error }, "Order list failed");
    return res.status(500).json({ message: "Could not load orders" });
  }
});

router.patch("/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const orderId = typeof req.params.id === "string" ? req.params.id : undefined;
    const orderStatus = req.body?.orderStatus;
    const paymentStatus = req.body?.paymentStatus;
    if (!orderId) return res.status(400).json({ message: "Invalid order id" });
    if (orderStatus !== undefined && (typeof orderStatus !== "string" || !orderStatuses.has(orderStatus))) {
      return res.status(400).json({ message: "Invalid order status" });
    }
    if (paymentStatus !== undefined && (typeof paymentStatus !== "string" || !paymentStatuses.has(paymentStatus))) {
      return res.status(400).json({ message: "Invalid payment status" });
    }
    if (orderStatus === undefined && paymentStatus === undefined) {
      return res.status(400).json({ message: "No status update provided" });
    }

    const [order] = await db
      .update(ordersTable)
      .set({
        ...(orderStatus !== undefined ? { orderStatus } : {}),
        ...(paymentStatus !== undefined ? { paymentStatus } : {}),
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, orderId))
      .returning();

    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json({ order });
  } catch (error) {
    req.log?.error({ err: error }, "Order update failed");
    return res.status(500).json({ message: "Could not update order" });
  }
});

export default router;