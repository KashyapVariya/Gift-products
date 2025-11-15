import prisma from "../db.server.js";

/**
 * Get settings for a specific shop
 * @param {string} shop - Shopify shop domain
 * @returns {Promise<Object|null>}
 */
export async function getSettings(shop) {
  return prisma.settings.findFirst({
    where: { shop },
  });
}

/**
 * Create new settings for a shop
 * @param {string} shop - Shopify shop domain
 * @param {object} data - Settings data
 * @returns {Promise<Object>}
 */
export async function createSettings(shop, data) {
  return prisma.settings.create({
    data: {
      ...data,
      shop,
    },
  });
}

/**
 * Update existing settings for a shop
 * @param {string} shop - Shopify shop domain
 * @param {object} data - Settings data to update
 * @returns {Promise<Object>}
 */
export async function updateSettings(shop, data) {
  const existing = await getSettings(shop);
  if (!existing) throw new Error("Settings not found for shop");

  return prisma.settings.update({
    where: { id: existing.id },
    data,
  });
}

/**
 * Upsert settings for a shop
 * If exists → update, else → create
 * @param {string} shop - Shopify shop domain
 * @param {object} data - Settings data
 * @returns {Promise<Object>}
 */
export async function upsertSettings(shop, data) {
  const existing = await getSettings(shop);

  if (existing) {
    return updateSettings(shop, data);
  } else {
    return createSettings(shop, data);
  }

}

/**
 * Delete settings for a shop
 * @param {string} shop - Shopify shop domain
 * @returns {Promise<Object|null>}
 */
export async function deleteSettings(shop) {
  const existing = await getSettings(shop);
  if (!existing) return null;

  return prisma.settings.delete({
    where: { id: existing.id },
  });
}

/**
 * Get the product entry for a shop
 * @param {string} shop - Shopify shop domain
 * @returns {Promise<Object|null>}
 */
export async function getGiftWrapProductId(shop) {
  const result = await prisma.products.findUnique({
    where: { shop },
    select: { productId: true },
  });

  return result?.productId || null;
}

export async function getGiftWrapData(shop) {
  const settings = await prisma.settings.findFirst({
    where: { shop },
  });

  if (!settings) return null;

  const product = await prisma.products.findUnique({
    where: { shop },
    select: { productId: true, variantId: true },
  });

  return {
    ...settings,
    product,
  };
}

