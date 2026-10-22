import { redirect } from "next/navigation";

/**
 * /delivery/<id> -- where every delivery notification points (DispatchController,
 * DeliveryController: url "/delivery/{id}"). There was no page here, so each of
 * those links opened a 404. The Delivery screen opens one delivery's detail from
 * ?open=<id>; this sends the notification there. A server component: nothing
 * to ship to the browser for a redirect.
 */
export default async function DeliveryLink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  redirect(Number.isInteger(n) && n > 0 ? `/delivery?open=${n}` : "/delivery");
}
