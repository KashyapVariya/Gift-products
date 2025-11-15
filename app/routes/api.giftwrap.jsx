import { json } from "@remix-run/node";
import { getGiftWrapData } from "../utils/db_utility.server";

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) return json({ error: "Missing shop" }, { status: 400 });

  const data = await getGiftWrapData(shop);
  return json(data || {});
}
