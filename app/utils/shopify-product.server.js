import prisma from "../db.server";

const TITLE = "Gift Wrap";
const STATUS = "ACTIVE";


export async function getProductById(admin, productId) {
  try {
    const query = `
      query GetProduct($id: ID!) {
        product(id: $id) {
          id
          title
          status
        }
      }
    `;

    const response = await admin.graphql(query, {
      variables: { id: productId },
    });

    const result = await response.json();

    if (!result?.data?.product) {
      return { success: false, message: "Product not found." };
    }

    return { success: true, data: result.data.product };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function createDefaultGiftWrapProduct(admin, session) {
  console.log("[GiftWrap] Starting product creation...");

  try {
    const createProductMutation = `
      mutation ProductCreate($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const productInput = {
      title: TITLE,
      status: STATUS,
    };

    const response = await admin.graphql(createProductMutation, {
      variables: { input: productInput },
    });

    const result = await response.json();

    if (result.errors?.length) {
      console.error("[GiftWrap] GraphQL Errors:", result.errors);
      return { success: false, error: result.errors };
    }

    const product = result.data?.productCreate?.product;
    const userErrors = result.data?.productCreate?.userErrors;

    if (userErrors?.length) {
      console.error("[GiftWrap] User Errors:", userErrors);
      return { success: false, error: userErrors };
    }

    if (!product?.id) {
      console.error("[GiftWrap] Product creation failed. No ID returned.");
      return { success: false, error: "Product creation failed. No product ID returned." };
    }

    console.log("[GiftWrap] Product created:", product);
    const publishResult = await publishProductToOnlineStore(admin, product.id);

    if (!publishResult.success) {
      console.error("[GiftWrap] Product created but not published:", publishResult.error);
    } else {
      console.log("[GiftWrap] Product published to Online Store");
    }

    const existingInDb = await prisma.products.findUnique({
      where: { shop: session.shop },
    });

    if (existingInDb) {
      console.warn("[GiftWrap] Product already stored in DB. Skipping DB insert.");
      return {
        success: true,
        message: "Product already created and stored.",
        data: product,
      };
    }

    const variantResult = await getFirstVariantId(admin, product.id);
    if (!variantResult.success) {
      console.error("[GiftWrap] Failed to fetch variant ID:", variantResult.error);
      return {
        success: false,
        error: "Product created, but failed to get variant ID: " + variantResult.error,
      };
    }

    const variantId = variantResult.data.id;

    await prisma.products.create({
      data: {
        shop: session.shop,
        productId: product.id,
        variantId: variantId,
      },
    });

    console.log("[GiftWrap] Product and variant ID stored in DB:", {
      productId: product.id,
      variantId,
    });

    return { success: true, data: { ...product, variantId } };
  } catch (error) {
    console.error("[GiftWrap] Exception:", error);
    return {
      success: false,
      error: typeof error === "string" ? error : error?.message || "Unknown error",
    };
  }
}

export async function publishProductToOnlineStore(admin, productId) {
  try {
    // Step 1: Get the Online Store publication ID
    const getPublicationsQuery = `
      query {
        publications(first: 10) {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `;

    const pubRes = await admin.graphql(getPublicationsQuery);
    const pubJson = await pubRes.json();

    const onlineStore = pubJson?.data?.publications?.edges?.find(
      (edge) => edge.node.name === "Online Store"
    );

    if (!onlineStore) {
      return { success: false, error: "Online Store publication not found" };
    }

    const publicationId = onlineStore.node.id;

    // Step 2: Publish using correct mutation
    const publishMutation = `
      mutation PublishablePublish($productId: ID!, $publicationId: ID!) {
        publishablePublish(
          id: $productId,
          input: { publicationId: $publicationId }
        ) {
          publishable {
            ... on Product {
              id
              handle
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      productId,
      publicationId,
    };

    const publishRes = await admin.graphql(publishMutation, { variables });
    const publishJson = await publishRes.json();

    const errors = publishJson?.data?.publishablePublish?.userErrors;
    if (errors?.length) {
      return {
        success: false,
        error: errors.map((e) => e.message).join(", "),
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Error while publishing product",
    };
  }
}

// 3. Update product
export async function updateProduct(admin, productId, updates) {
  try {
    const mutation = `
      mutation ProductUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const input = {
      id: productId,
      title: updates.productTitle,
    };

    const response = await admin.graphql(mutation, {
      variables: { input },
    });

    const result = await response.json();

    if (result.data?.productUpdate?.userErrors?.length) {
      return { success: false, error: result.data.productUpdate.userErrors };
    }

    const updatedProduct = result.data.productUpdate.product;

    // If a new price is provided, update the variant
    let updatedVariant = null;
    if (updates.price) {
      const variantResult = await updateGiftWrapVariantPrice(admin, productId, updates.price);

      if (!variantResult.success) {
        return { success: false, error: variantResult.error };
      }

      updatedVariant = variantResult.data;
    }

    return { success: true, data: { product: updatedProduct, variant: updatedVariant } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 4. Delete product
export async function deleteProduct(admin, productId) {
  try {
    const mutation = `
      mutation ProductDelete($input: ProductDeleteInput!) {
        productDelete(input: $input) {
          deletedProductId
          userErrors {
            field
            message
          }
        }
      }
    `;

    const input = { id: productId };

    const response = await admin.graphql(mutation, {
      variables: { input },
    });

    const result = await response.json();

    if (result.data?.productDelete?.userErrors?.length) {
      return { success: false, error: result.data.productDelete.userErrors };
    }

    return {
      success: true,
      deletedProductId: result.data.productDelete.deletedProductId,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


export async function getFirstVariantId(admin, productId) {
  try {
    const query = `
      query GetProductVariants($id: ID!) {
        product(id: $id) {
          variants(first: 1) {
            edges {
              node {
                id
                price
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(query, {
      variables: { id: productId },
    });

    const json = await response.json();

    const variantEdge = json?.data?.product?.variants?.edges?.[0];

    if (!variantEdge?.node?.id) {
      return { success: false, error: "No variant found for the product." };
    }

    return { success: true, data: variantEdge.node };
  } catch (error) {
    return { success: false, error: error.message || "Error fetching variant ID." };
  }
}

export async function updateGiftWrapVariantPrice(admin, productId, newPrice) {
  try {
    if (!newPrice) return { success: false };

    console.log("[GiftWrap] Fetching variant for product:", productId);

    const VariantRes = await getFirstVariantId(admin, productId);
    if (!VariantRes.success) return { success: false, error: VariantRes.error };

    const variant = VariantRes.data;

    const mutation = `
      mutation ProductVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants {
            id
            price
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      productId: productId,
      variants: [
        {
          id: variant.id,
          price: newPrice,
        },
      ],
    };

    const updateRes = await admin.graphql(mutation, { variables });
    const updateJson = await updateRes.json();

    const userErrors = updateJson?.data?.productVariantsBulkUpdate?.userErrors;
    if (userErrors?.length) {
      return { success: false, error: userErrors };
    }

    const updated = updateJson?.data?.productVariantsBulkUpdate?.productVariants?.[0];
    console.log("[GiftWrap] Price updated:", updated);

    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: error.message || "Unknown error" };
  }
}
