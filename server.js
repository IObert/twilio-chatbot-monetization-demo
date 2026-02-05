import Stripe from "stripe";
import twilio from "twilio";
import express from "express";

const app = express();
const paidUsers = new Set();

// Configuration
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const SENDER_NAME = process.env.SENDER || "";

if (!STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined in environment variables.");
}

if (!SENDER_NAME) {
  throw new Error("SENDER is not defined in environment variables.");
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-01-28.clover",
});

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

const dadJokes = [
  "Why don't eggs tell jokes? They'd crack each other up! 🥚😂",
  "I'm afraid for the calendar. Its days are numbered. 📅😱",
  "What do you call a fake noodle? An impasta! 🍝😎",
  "Why did the scarecrow win an award? He was outstanding in his field! 🌾🏆",
  "I only know 25 letters of the alphabet. I don't know y. 🔤🤷",
];

const DAD_JOKE_PRICE = 299;

function getRandomJoke() {
  return dadJokes[Math.floor(Math.random() * dadJokes.length)];
}

async function sendPaymentLink(to, from) {
  const url = await createCheckoutSession(to);
  await twilioClient.messages.create({
    contentSid: "HXa9f820df155dad36b03a757e97137e64",
    contentVariables: JSON.stringify({ 1: url.replace("https://checkout.stripe.com/c/pay/", "") }),
    from,
    to,
  });
}

async function createCheckoutSession(customerPhone) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: "Premium Dad Jokes - Lifetime Access",
          description: "Unlock unlimited access to the finest, corniest dad jokes known to mankind! 🤣",
        },
        unit_amount: DAD_JOKE_PRICE,
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/cancel`,
    metadata: { phone: customerPhone },
    customer_creation: "always",
  });

  return session.url || "";
}

app.use(express.urlencoded({ extended: true }));

app.post("/messaging", async (req, res) => {
  const from = req.body.From || "";
  const to = req.body.To || "";
  const body = (req.body.Body || "").toLowerCase().trim();

  console.log(`Received message from ${from}: ${body}`);

  const twiml = new twilio.twiml.MessagingResponse();

  if (body === "get more jokes") {
    // Button click, no action
  } else if (["help", "hello", "start"].includes(body)) {
    twiml.message(
      `👋 Welcome to the ULTIMATE Dad Joke Generator! 🎉\n\n` +
      `For just $${(DAD_JOKE_PRICE / 100).toFixed(2)}, you'll unlock LIFETIME access to the corniest, ` +
      `most groan-worthy dad jokes on the planet! 🌎\n\n` +
      `Why pay? Because FREE dad jokes are like free hugs from strangers... ` +
      `slightly uncomfortable and probably not worth it. 😅\n\n` +
      `Reply with ANY message to get started!`
    );
  } else if (paidUsers.has(from)) {
    twiml.message(`🎭 HERE'S YOUR PREMIUM DAD JOKE:\n\n${getRandomJoke()}\n\n😂 Want another? Just text me again!`);
  } else {
    try {
      await sendPaymentLink(from, to);
    } catch (error) {
      console.error("Error creating checkout:", error);
      twiml.message("🤖 Error: Even robots need to eat... I mean, process payments! Try again later.");
    }
  }

  res.type("text/xml").send(twiml.toString());
});

app.get("/success", async (req, res) => {
  const sessionId = req.query.session_id;
  if (!sessionId) return res.status(400).send("Missing session_id");

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const phone = session.metadata?.phone;
    const amount = session.amount_total ? (session.amount_total / 100).toFixed(2) : "0.00";

    console.log(`✅ Payment: ${sessionId} | ${session.customer_details?.email} | ${phone} | $${amount}`);

    if (phone) {
      paidUsers.add(phone);
      await twilioClient.messages.create({
        from: `rcs:${SENDER_NAME}`,
        to: phone,
        body: `🎉 Thank you for your purchase! You've unlocked PREMIUM DAD JOKES! 🎉\n\n` +
          `Here's your first joke:\n\n${getRandomJoke()}\n\n😂 Text me anytime for more!`,
      });
    }

    res.redirect(`sms:${SENDER_NAME}@rbm.goog?body=I want my dad jokes!`);
  } catch (error) {
    console.error("Error retrieving session:", error);
    res.status(500).send("Error retrieving payment information");
  }
});

app.use((req, res) => {
  res.status(404).send("Not Found");
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
