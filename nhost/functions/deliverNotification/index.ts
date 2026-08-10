import { graphql } from "../_shared/graphql";
import { requireTrustedAction } from "../_shared/http";

type Delivery = {
  id: string;
  status: string;
  destination: string | null;
  payload: { message?: string } | null;
};

function deliveryId(body: unknown): string | undefined {
  const event = (body as { event?: { data?: { new?: { id?: string } } } })
    ?.event;
  return event?.data?.new?.id;
}

export default async function handler(
  req: {
    body: unknown;
    headers: Record<string, string | string[] | undefined>;
  },
  res: { status: (code: number) => { json: (data: unknown) => void } },
) {
  try {
    requireTrustedAction(req);
    const id = deliveryId(req.body);
    if (!id)
      return res
        .status(400)
        .json({ message: "Notification event is missing its delivery ID" });

    const headers = {
      "x-hasura-admin-secret": process.env.NHOST_ADMIN_SECRET ?? "",
    };
    const result = await graphql<{
      notification_deliveries_by_pk: Delivery | null;
    }>(
      `
        query Delivery($id: uuid!) {
          notification_deliveries_by_pk(id: $id) {
            id
            status
            destination
            payload
          }
        }
      `,
      { id },
      headers,
    );
    const delivery = result.notification_deliveries_by_pk;
    if (!delivery)
      return res
        .status(404)
        .json({ message: "Notification delivery not found" });
    if (delivery.status === "delivered")
      return res
        .status(200)
        .json({ accepted: false, reason: "already_delivered" });
    if (delivery.destination !== "slack_default")
      return res
        .status(400)
        .json({ message: "Unsupported notification destination" });

    await graphql(
      `
        mutation Attempt($id: uuid!) {
          update_notification_deliveries_by_pk(
            pk_columns: { id: $id }
            _inc: { attempts: 1 }
            _set: { status: "delivering", error: null }
          ) {
            id
          }
        }
      `,
      { id },
      headers,
    );
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) throw new Error("SLACK_WEBHOOK_URL is not configured");
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: String(
          delivery.payload?.message ?? "Relay Room workflow notification",
        ),
      }),
    });
    if (!response.ok) throw new Error(`Slack returned ${response.status}`);
    await graphql(
      `
        mutation Delivered($id: uuid!, $at: timestamptz!) {
          update_notification_deliveries_by_pk(
            pk_columns: { id: $id }
            _set: { status: "delivered", delivered_at: $at, error: null }
          ) {
            id
          }
        }
      `,
      { id, at: new Date().toISOString() },
      headers,
    );
    return res.status(200).json({ accepted: true });
  } catch (error) {
    const id = deliveryId(req.body);
    if (id) {
      try {
        await graphql(
          `
            mutation Failed($id: uuid!, $message: String!) {
              update_notification_deliveries_by_pk(
                pk_columns: { id: $id }
                _set: { status: "failed", error: $message }
              ) {
                id
              }
            }
          `,
          {
            id,
            message:
              error instanceof Error
                ? error.message
                : "Notification delivery failed",
          },
          { "x-hasura-admin-secret": process.env.NHOST_ADMIN_SECRET ?? "" },
        );
      } catch {
        /* Preserve the original error so Hasura retries the event. */
      }
    }
    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Notification delivery failed",
    });
  }
}
