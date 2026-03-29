import webpush from "web-push";
import type { PushSubscription as DBPushSubscription } from "@shared/schema";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || "mailto:support@kontrib.app";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
  console.log("Web Push: VAPID keys configured");
} else {
  console.warn("Web Push: VAPID keys not found — push notifications disabled");
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

export async function sendPushToSubscription(
  subscription: DBPushSubscription,
  payload: PushPayload
): Promise<boolean> {
  if (!vapidPublicKey || !vapidPrivateKey) return false;

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/kontrib-logo.jpg",
        badge: payload.badge || "/favicon.png",
        url: payload.url || "/",
        tag: payload.tag || "kontrib",
      })
    );
    return true;
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return false;
    }
    console.error("Push send error:", err.message);
    return false;
  }
}

export { vapidPublicKey };
