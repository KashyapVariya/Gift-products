import {
  json,
  redirect,
} from "@remix-run/node";
import { useActionData, useLoaderData, Form } from "@remix-run/react";
import {
  Box,
  Card,
  Layout,
  Page,
  TextField,
  FormLayout,
  Checkbox,
  Select,
  Button,
  Text,
  BlockStack,
  InlineStack,
  Banner,
  DropZone,
} from "@shopify/polaris";
import { useEffect, useState } from "react";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server.js";
import { getSettings, upsertSettings, getGiftWrapProductId } from "../utils/db_utility.server.js";
import { updateProduct } from "../utils/shopify-product.server.js"

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    if (!session?.shop) return redirect("/auth");

    const settings = await getSettings(session.shop);
    return json({ settings });
  } catch (error) {
    console.error("Loader error:", error);
    return json({ settings: null, error: "Failed to load settings." }, { status: 500 });
  }
};

export const action = async ({ request }) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    if (!session?.shop) return redirect("/auth");

    const formData = await request.formData();
    const parseBoolean = (val) => val === "true";

    const data = {
      shop: session.shop,
      isEnabled: formData.get("appStatus") === "enabled",
      productTitle: formData.get("productTitle"),
      giftTitle: formData.get("giftTitle"),
      price: parseInt(formData.get("price") || "0", 10),
      isIcon: parseBoolean(formData.get("enableIcon")),
      icon: "https://cdn-icons-png.flaticon.com/512/3534/3534140.png",
      isImage: parseBoolean(formData.get("enableImage")),
      image: "",
      displayOption: formData.get("selectedPage"),
      enableNotes: parseBoolean(formData.get("enableNote")),
      customCss: "",
    };

    await upsertSettings(session.shop, data);
    const productId = await getGiftWrapProductId(session.shop);
    console.log(productId, "productId");

    await updateProduct(admin, productId, data);

    return json({ success: true });
  } catch (error) {
    console.error("Action error:", error);
    return json({ success: false, message: "Something went wrong while saving settings." }, { status: 500 });
  }
};

export default function Settings() {
  const { settings, error } = useLoaderData();
  const actionData = useActionData();

  useEffect(() => {
    if (actionData?.success && window?.shopify?.toast?.show) {
      window.shopify.toast.show("Settings saved successfully");
    } else if (actionData?.success === false && window?.shopify?.toast?.show) {
      window.shopify.toast.show("Failed to save settings");
    }
  }, [actionData]);

  const [appStatus, setAppStatus] = useState(() => settings?.isEnabled ? "enabled" : "disabled");
  const [enableNote, setEnableNote] = useState(() => settings?.enableNotes ?? true);
  const [note, setNote] = useState("");
  const [enableIcon, setEnableIcon] = useState(() => Boolean(settings?.isIcon));
  const [enableImage, setEnableImage] = useState(() => Boolean(settings?.isImage));
  const [selectedPage, setSelectedPage] = useState(() => settings?.displayOption ?? "both");
  const [previewChecked, setPreviewChecked] = useState(false);
  const [productTitle, setProductTitle] = useState(() => settings?.productTitle || "Gift Wrap");
  const [giftTitle, setGiftTitle] = useState(() => settings?.giftTitle || "Add a Gift Wrap to your Order");
  const [price, setPrice] = useState(() => settings?.price?.toString() || "20");
  const [backgroundColor, setBackgroundColor] = useState(() => settings?.backgroundColor || "#ffffff");
  const [fontColor, setFontColor] = useState(() => settings?.fontColor || "#000000");
  const [uploadedImage, setUploadedImage] = useState(() => settings?.image || null);

  const appStatusOptions = [
    { label: "Enabled", value: "enabled" },
    { label: "Disabled", value: "disabled" },
  ];

  const pageOptions = [
    { label: "Cart", value: "cart" },
    { label: "Product", value: "product" },
    { label: "Both", value: "both" },
  ];

  return (
    <Page>
      <TitleBar title="Gift Wrap" />

      {error && (
        <Banner title="Error" status="critical">
          <p>{error}</p>
        </Banner>
      )}

      <Banner title="Important: Do Not Delete the Default Gift Wrap Product" onDismiss={() => { }}>
        <p>
          When you set up Gift Wrap App on your store, the app automatically creates a Gift Wrap Product.
          Don't delete this product to ensure the app works correctly.
        </p>
      </Banner>

      <br />
      <Form method="post">
        <Layout>
          <Layout.Section>
            <Card>
              <FormLayout>
                <Select
                  label="Gift Wrap App Status"
                  name="appStatus"
                  options={appStatusOptions}
                  value={appStatus}
                  onChange={setAppStatus}
                />
              </FormLayout>
            </Card>

            <br />

            <Card title="Gift Wrap Settings">
              <FormLayout>
                <Select
                  label="Select the page to display the gift wrap option"
                  name="selectedPage"
                  options={pageOptions}
                  value={selectedPage}
                  onChange={setSelectedPage}
                />

                <Checkbox
                  label="Would you like to let customers add a note with the gift wrap?"
                  name="enableNote"
                  checked={enableNote}
                  value={enableNote}
                  onChange={setEnableNote}
                  toggle
                />

                <TextField
                  label="Product Title"
                  name="productTitle"
                  value={productTitle}
                  onChange={setProductTitle}
                />

                <TextField
                  label="Title for Gift Wrap"
                  name="giftTitle"
                  value={giftTitle}
                  onChange={setGiftTitle}
                  multiline
                  helpText="If you want to show price with title then use variable '${price}'. ex- ${price} DKK"

                />

                <TextField
                  label="Gift Wrap Price"
                  name="price"
                  type="number"
                  value={price}
                  onChange={setPrice}
                />
              </FormLayout>
            </Card>

            <br />
            <Card title="Display Options">
              <Box>
                <Text variant="headingSm" as="h6">Display Options</Text>
              </Box>
              <FormLayout>
                <Checkbox
                  label="Do you want to display an icon with the title?"
                  name="enableIcon"
                  value={enableIcon}
                  checked={enableIcon}
                  onChange={setEnableIcon}
                  toggle
                />
                {enableIcon && (
                  <>
                    <img
                      src="https://cdn-icons-png.flaticon.com/512/3534/3534140.png"
                      width={50}
                      alt="Icon Preview"
                    />
                    <div style={{ width: 40, height: 40 }}>
                      <DropZone>
                        <DropZone.FileUpload />
                      </DropZone>
                    </div>
                  </>
                )}
              </FormLayout>
              <FormLayout>
                <Checkbox
                  label="Do you want to display a gift wrap image?"
                  name="enableImage"
                  value={enableImage}
                  checked={enableImage}
                  onChange={setEnableImage}
                  toggle
                />

                {enableImage && (
                  <>
                    <div style={{ width: 40, height: 40 }}>
                      <DropZone>
                        <DropZone.FileUpload />
                      </DropZone>
                    </div>
                  </>
                )}
              </FormLayout>
            </Card>

            <br />
            <Card title="Custom Style">
              <FormLayout>
                <TextField
                  label="Custom Style"
                  name="customCss"
                  multiline={10}
                // value={customCss}
                />
              </FormLayout>
            </Card>
            <br />
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card title="Preview" padding="0">
              <Box
                style={{
                  backgroundColor: "black",
                  color: "white",
                  padding: "10px",
                  marginBottom: "6px",
                }}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>Preview</Text>
              </Box>

              <BlockStack
                style={{
                  padding: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <Box>
                  <Checkbox
                    label={
                      <Text>
                        {enableIcon && <span role="img" aria-label="gift" style={{ marginRight: "4px" }}>🎁</span>}
                        {giftTitle.includes("${price}")
                          ? giftTitle.replace("${price}", price)
                          : `${giftTitle}`}
                      </Text>
                    }
                    checked={previewChecked}
                    onChange={setPreviewChecked}
                  />
                </Box>

                {enableImage && uploadedImage ? (
                  <InlineStack gap={200}>
                    <Box width="27%">
                      <img
                        src={uploadedImage}
                        alt="Gift Wrap"
                        style={{
                          maxWidth: "100%",
                          borderRadius: "8px",
                          marginBottom: "10px",
                        }}
                      />
                    </Box>
                    <Box width="70%">
                      {enableNote && (
                        <TextField
                          label=""
                          placeholder="Gift Message Note"
                          multiline={4}
                          autoComplete="off"
                          value={note}
                          onChange={setNote}
                        />
                      )}
                    </Box>
                  </InlineStack>
                ) : (
                  enableNote && (
                    <TextField
                      label=""
                      placeholder="Gift Message Note"
                      multiline={4}
                      autoComplete="off"
                      value={note}
                      onChange={setNote}
                    />
                  )
                )}
              </BlockStack>
            </Card>
            <br />
            <Box>
              <Button size="large" fullWidth variant="primary" submit>Save Settings</Button>
            </Box>
            <br />
          </Layout.Section>
        </Layout>
      </Form>
    </Page>
  );
}
