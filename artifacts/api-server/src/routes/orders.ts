import { Router, type IRouter } from "express";
import { db, ordersTable } from "@workspace/db";
import { randomUUID } from "node:crypto";

type Offer = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

const offers: Offer[] = [
  { id: "special-one", name: "The Special One Offer", quantity: 1, price: 27000 },
  { id: "better-together", name: "The Better Together Offer", quantity: 2, price: 45000 },
  { id: "gang", name: "The Gang Offer", quantity: 4, price: 100000 },
  { id: "family", name: "The Family Offer", quantity: 7, price: 167000 },
];

const deliveryPreferences = new Set([
  "Deliver at Morning Break",
  "Deliver at Lunch",
  "Deliver at Afternoon Break",
  "Deliver After School",
]);

const bestOfferPlan = (quantity: number) => {
  const plan = Array.from({ length: quantity + 1 }, () => ({
    cost: Number.POSITIVE_INFINITY,
    offers: [] as Offer[],
  }));
  plan[0] = { cost: 0, offers: [] };

  for (let total = 1; total <= quantity; total += 1) {
    for (const offer of offers) {
      if (total < offer.quantity || !Number.isFinite(plan[total - offer.quantity].cost)) {
        continue;
      }

      const candidateOffers = [...plan[total - offer.quantity].offers, offer];
      const candidateCost = plan[total - offer.quantity].cost + offer.price;
      if (
        candidateCost < plan[total].cost ||
        (candidateCost === plan[total].cost &&
          candidateOffers.length < plan[total].offers.length)
      ) {
        plan[total] = { cost: candidateCost, offers: candidateOffers };
      }
    }
  }

  return plan[quantity].offers;
};

const readRequiredText = (value: unknown, field: string, maxLength = 160) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw new Error(`${field} is too long`);
  }
  return text;
};

const readOptionalText = (value: unknown, maxLength = 500) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Delivery notes are invalid");
  const text = value.trim();
  if (text.length > maxLength) throw new Error("Delivery notes are too long");
  return text || null;
};

type CustomOrder = {
  media1: string;
  media2?: string;
  text?: string;
};

const readCustomOrder = (value: unknown): CustomOrder | null => {
  if (value === undefined || value === null) return null;

  if (typeof value !== "object") {
    throw new Error("Custom keychain information is invalid");
  }

  const custom = value as Record<string, unknown>;

  const media1 = readRequiredText(custom.media1, "First media", 500);

  let media2: string | undefined;
  if (custom.media2 !== undefined && custom.media2 !== null && custom.media2 !== "") {
    media2 = readRequiredText(custom.media2, "Second media", 500);
  }

  let text: string | undefined;
  if (custom.text !== undefined && custom.text !== null && custom.text !== "") {
    text = readRequiredText(custom.text, "Personalization", 40);
  }

  return {
    media1,
    ...(media2 ? { media2 } : {}),
    ...(text ? { text } : {}),
  };
};

const router: IRouter = Router();

router.post("/orders", async (req, res) => {
  try {
    const customerName = readRequiredText(req.body?.customerName, "Name");
    const className = readRequiredText(req.body?.className, "Class", 80);
    const school = readRequiredText(req.body?.school, "School", 160);
    const albumName = readRequiredText(req.body?.albumName, "Album name", 160);
    const deliveryPreference = readRequiredText(
      req.body?.deliveryPreference,
      "Delivery preference",
      80,
    );
    const deliveryNotes = readOptionalText(req.body?.deliveryNotes);
    if (!deliveryPreferences.has(deliveryPreference)) {
      throw new Error("Choose one of the available delivery preferences");
    }

    const quantity = Number(req.body?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      throw new Error("The keychain quantity is invalid");
    }

    const custom = readCustomOrder(req.body?.custom);

    const CUSTOM_PRICE = 25000;

const offerPlan = custom ? [] : bestOfferPlan(quantity);

const subtotal = custom
  ? CUSTOM_PRICE * quantity
  : offerPlan.reduce((sum, offer) => sum + offer.price, 0);
    const couponCode =
      typeof req.body?.couponCode === "string"
        ? req.body.couponCode.trim().toUpperCase()
        : "";
    const couponDiscount = couponCode === "MYOKO5K" ? 5000 : 0;
    const loyaltyDiscount =
      req.body?.loyaltyApplied === true ? Math.round(subtotal * 0.3) : 0;
    const total = Math.max(0, subtotal - couponDiscount - loyaltyDiscount);
    const id = randomUUID();
    const orderNumber = `MYK-${new Date()
      .getFullYear()
      .toString()
      .slice(-2)}-${id.slice(0, 6).toUpperCase()}`;

    const [order] = await db
      .insert(ordersTable)
      .values({
        id,
        orderNumber,
        customerName,
        className,
        school,
        albumName,
        deliveryPreference,
        deliveryNotes,
        keychainQuantity: quantity,
        offers: offerPlan,
        custom,
        subtotal,
        couponDiscount,
        loyaltyDiscount,
        total,
      })
      .returning();

    return res.status(201).json({
      orderNumber: order.orderNumber,
      total: order.total,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create order";
    const status = message.includes("required") || message.includes("invalid") || message.includes("too")
      ? 400
      : 500;
    req.log?.error({ err: error }, "Order creation failed");
    return res.status(status).json({ message });
  }
});

export default router;