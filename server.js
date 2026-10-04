import express from "express";
import webpush from "web-push";

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_EMAIL) {
  console.warn(
    "VAPID environment variables are not configured yet."
  );
} else {
  webpush.setVapidDetails(
    VAPID_EMAIL,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

const subscriptions = new Map();

app.get("/", (req, res) => {
  res.json({
    name: "ClearDay Server",
    version: "0.8.0",
    status: "online"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

app.post("/subscribe", (req, res) => {
  const subscription = req.body;

  if (
    !subscription ||
    !subscription.endpoint
  ) {
    return res.status(400).json({
      error: "Invalid subscription"
    });
  }

  subscriptions.set(
    subscription.endpoint,
    subscription
  );

  res.json({
    success: true
  });
});

app.post("/push", async (req, res) => {
  if (
    !VAPID_PUBLIC_KEY ||
    !VAPID_PRIVATE_KEY ||
    !VAPID_EMAIL
  ) {
    return res.status(500).json({
      error: "VAPID keys are not configured"
    });
  }

  const {
    endpoint,
    title = "ClearDay",
    body = "У вас новое напоминание"
  } = req.body;

  if (!endpoint) {
    return res.status(400).json({
      error: "Endpoint is required"
    });
  }

  const subscription =
    subscriptions.get(endpoint);

  if (!subscription) {
    return res.status(404).json({
      error: "Subscription not found"
    });
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title,
        body
      })
    );

    res.json({
      success: true
    });

  } catch (error) {

    console.error(
      "Push error:",
      error
    );

    if (
      error.statusCode === 404 ||
      error.statusCode === 410
    ) {
      subscriptions.delete(endpoint);
    }

    res.status(500).json({
      error: "Push failed"
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `ClearDay Server listening on port ${PORT}`
  );
});