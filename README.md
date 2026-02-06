# Dad Jokes Paywall: Monetizing Chatbots on RCS and WhatsApp

A demo chatbot that shows how to add a paywall to rich messaging experiences on RCS and WhatsApp using Twilio and Stripe.

📖 **Read the full blog post**: [Rich Messages, Richer Experiences: Monetizing Chatbots on RCS and WhatsApp](https://www.twilio.com/blog/monetizing-chatbots-rcs-whatsapp)

## What This Demo Does

This bot delivers premium AI-generated dad jokes via RCS after users complete a one-time payment. It demonstrates:

- Creating Stripe Checkout Sessions dynamically in a chatbot flow
- Sending rich payment links via RCS using Twilio content templates
- Confirming payments and unlocking premium content
- Maintaining user entitlements without separate accounts

## Prerequisites

- **Twilio Account**: With RCS messaging enabled ([get started](https://www.twilio.com/docs/messaging/channels/rcs))
- **RCS Test Sender**: [Create an RCS sender](https://www.twilio.com/docs/rcs/onboarding#create-an-rcs-sender) to test with. Check if your carrier supports RCS. If not, use [WhatsApp as a fallback](https://www.twilio.com/docs/whatsapp/sandbox)
- **Stripe Account**: In test mode with API keys
- **Runtime**: Deno 2.0+ or Node.js 18+ (choose one)

## Quick Start

### 1. Clone and Configure

```bash
git clone <repository-url>
cd paywall
```

Create a `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
SENDER=your-rcs-sender-id
```

### 2. Run the Server

**Option A: Using Deno**

```bash
deno run --watch --env-file --allow-env --allow-net main.ts
```

**Option B: Using Node.js**

```bash
npm install
npm run dev
```

### 3. Expose with ngrok

In a separate terminal:

```bash
ngrok http 3000
```

Configure the Twilio webhook to point to `https://your-ngrok-url.ngrok.io/messaging`.

## How It Works

1. User sends a message to your RCS bot
2. If not paid, bot sends a Stripe Checkout link via rich message template
3. User completes payment on Stripe's hosted page
4. Stripe redirects to `/success?session_id=...`
5. Bot marks user as paid and sends premium content
6. Future messages deliver dad jokes instantly

## Project Structure

```
├── main.ts          # Deno/TypeScript implementation
├── server.js        # Node.js/JavaScript implementation
├── package.json     # Node.js dependencies
├── deno.json        # Deno configuration
└── .env             # Environment variables (create this)
```

## Key Files

- **main.ts**: Full TypeScript implementation for Deno runtime
- **server.js**: Express-based JavaScript version for Node.js
- Both versions implement identical functionality

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe API secret key | `sk_test_...` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `AC...` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `...` |
| `SENDER` | RCS sender ID | `your-brand` |

## Endpoints

- `POST /messaging` - Twilio webhook for inbound RCS messages
- `GET /success?session_id=xxx` - Payment confirmation redirect

## Production Considerations

This is a demo. For production:

- Replace in-memory `Set` with a database
- Add Stripe webhook handling for payment events
- Implement proper error handling and retry logic
- Add logging and monitoring
- Support subscriptions and recurring billing
- Handle multi-device access patterns
- Add user session management

## Resources

- [Twilio RCS Documentation](https://www.twilio.com/docs/messaging/channels/rcs)
- [Stripe Checkout Sessions](https://docs.stripe.com/payments/checkout)
- [WhatsApp Business Platform](https://www.twilio.com/docs/whatsapp)
- [Blog Post: Monetizing Chatbots](https://www.twilio.com/blog/monetizing-chatbots-rcs-whatsapp)

## License

MIT

---

Built with ❤️ by Twilio
