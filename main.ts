import Stripe from "stripe";
import twilio from "twilio";

// In-memory storage for paid users (in production, use a database)
const paidUsers = new Set<string>();

// Configuration
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const BASE_URL = Deno.env.get("BASE_URL") || `http://localhost:3000`;
const SENDER_NAME = Deno.env.get("SENDER") || "";

if (!STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined in environment variables.");
}

if (!SENDER_NAME) {
  throw new Error("SENDER is not defined in environment variables.");
}

// Initialize Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-01-28.clover",
});

// Initialize Twilio client
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Dad jokes collection
const dadJokes = [
  "Why don't eggs tell jokes? They'd crack each other up! 🥚😂",
  "I'm afraid for the calendar. Its days are numbered. 📅😱",
  "What do you call a fake noodle? An impasta! 🍝😎",
  "Why did the scarecrow win an award? He was outstanding in his field! 🌾🏆",
  "I only know 25 letters of the alphabet. I don't know y. 🔤🤷",
];

// Dad joke paywall price
const DAD_JOKE_PRICE = 299; // $2.99 for lifetime access to premium dad jokes!

// Create Stripe checkout session for a user
async function createCheckoutSession(customerPhone: string): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: "Premium Dad Jokes - Lifetime Access",
          description:
            "Unlock unlimited access to the finest, corniest dad jokes known to mankind! 🤣",
        },
        unit_amount: DAD_JOKE_PRICE,
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/cancel`,
    metadata: {
      phone: customerPhone,
    },
    customer_creation: "always",
  });

  return session.url || "";
}

// Twilio messaging endpoint
async function handleTwilioMessage(req: Request): Promise<Response> {
  const formData = await req.formData();
  const from = formData.get("From")?.toString() || "";
  const to = formData.get("To")?.toString() || "";
  const body = formData.get("Body")?.toString()?.toLowerCase().trim() || "";

  console.log(`Received message from ${from}: ${body}`);

  const MessagingResponse = twilio.twiml.MessagingResponse;
  const twimlResponse = new MessagingResponse();

  // Check if message is "help" or "hello" or "start"
  if (body === "get more jokes") {
    // This means the user clicked the button, no action needed
  } else if (body === "help" || body === "hello" || body === "start") {
    twimlResponse.message(
      `👋 Welcome to the ULTIMATE Dad Joke Generator! 🎉\n\n` +
        `For just $${
          (DAD_JOKE_PRICE / 100).toFixed(2)
        }, you'll unlock LIFETIME access to the corniest, ` +
        `most groan-worthy dad jokes on the planet! 🌎\n\n` +
        `Why pay? Because FREE dad jokes are like free hugs from strangers... ` +
        `slightly uncomfortable and probably not worth it. 😅\n\n` +
        `Reply with ANY message to get started!`,
    );
  } else {
    // Check if user has paid
    if (paidUsers.has(from)) {
      // User has paid, send random dad joke
      const randomJoke = dadJokes[Math.floor(Math.random() * dadJokes.length)];
      twimlResponse.message(
        `🎭 HERE'S YOUR PREMIUM DAD JOKE:\n\n${randomJoke}\n\n😂 Want another? Just text me again!`,
      );
    } else {
      // User hasn't paid, send payment reminder disguised as a dad joke
      try {
        const checkoutUrl = await createCheckoutSession(from);

        // Extract the checkout session suffix from the full URL
        // URL format: https://checkout.stripe.com/c/pay/{suffix}
        const urlSuffix = checkoutUrl.replace(
          "https://checkout.stripe.com/c/pay/",
          "",
        );

        // Send content template message using Twilio client
        await twilioClient.messages.create({
          contentSid: "HXa9f820df155dad36b03a757e97137e64",
          contentVariables: JSON.stringify({ 1: urlSuffix }),
          from: to,
          to: from,
        });
      } catch (error) {
        console.error("Error creating checkout session:", error);
        twimlResponse.message(
          "🤖 Error: Even robots need to eat... I mean, process payments! Try again later.",
        );
      }
    }
  }

  return new Response(twimlResponse.toString(), {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}

// Handle payment success page
async function handlePaymentSuccess(req: Request, url: URL): Promise<Response> {
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    return new Response("Missing session_id", { status: 400 });
  }

  try {
    // Retrieve session details from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Extract payment information
    const email = session.customer_details?.email || "N/A";
    const amountTotal = session.amount_total
      ? (session.amount_total / 100).toFixed(2)
      : "0.00";
    const currency = session.currency?.toUpperCase() || "USD";
    const paymentStatus = session.payment_status;
    const customerPhone = session.metadata?.phone || "N/A";

    // Log payment details
    console.log(`✅ Payment successful!`);
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Email: ${email}`);
    console.log(`   Phone: ${customerPhone}`);
    console.log(`   Amount: ${currency} $${amountTotal}`);
    console.log(`   Payment Status: ${paymentStatus}`);

    // Mark user as paid
    if (customerPhone && customerPhone !== "N/A") {
      paidUsers.add(customerPhone);
      console.log(`   User marked as paid: ${customerPhone}`);
      // send confirmation message and first premium joke via Twilio
      const randomJoke = dadJokes[Math.floor(Math.random() * dadJokes.length)];
      await twilioClient.messages.create({
        from: `rcs:${SENDER_NAME}`,
        to: customerPhone,
        body:
          `🎉 Thank you for your purchase! You've unlocked PREMIUM DAD JOKES! 🎉\n\n` +
          `Here's your first joke:\n\n${randomJoke}\n\n😂 Text me anytime for more!`,
      });
    }

    // Redirect to RCS chat, optional as the user also receives their first joke via RCS
    return Response.redirect(
      `sms:${SENDER_NAME}@rbm.goog?body=I want my dad jokes!`,
      302,
    );
  } catch (error) {
    console.error("Error retrieving session:", error);
    return new Response("Error retrieving payment information", {
      status: 500,
    });
  }
}

// Main server
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Route: Twilio messaging endpoint
  if (url.pathname === "/messaging" && req.method === "POST") {
    return handleTwilioMessage(req);
  }

  // Route: Success page after payment
  if (url.pathname === "/success" && req.method === "GET") {
    return handlePaymentSuccess(req, url);
  }

  // 404 for unknown routes
  return new Response("Not Found", { status: 404 });
}

Deno.serve({ port: 3000 }, handler);
