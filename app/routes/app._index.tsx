import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, Text, Button } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { gemini } from "../lib/gemini.server";
import { TitleBar } from "@shopify/app-bridge-react";

// LOADER: Fetches existing products and their metafields
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
    query {
      products(first: 10, sortKey: TITLE, reverse: false) {
        edges {
          node {
            id
            title
            hs_code: metafield(namespace: "waypoint", key: "hs_code") { value }
            customs_description: metafield(namespace: "waypoint", key: "customs_description") { value }
          }
        }
      }
    }`
  );
  const responseJson = await response.json();
  return json({ products: responseJson.data.products.edges });
};

// ACTION: Called by the 'Classify' button. ONLY returns AI data.
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const productTitle = formData.get("productTitle") as string;
  const productId = formData.get("productId") as string;

  const prompt = `You are an expert customs agent. For the product titled "${productTitle}", provide a customs declaration. Return a single, minified JSON object with "customs_description" and "hs_code".`;
  const result = await gemini.generateContent(prompt);
  const classification = JSON.parse(result.response.text());

  return json({ productId, ...classification });
};

// A new component for the "Save" button and its logic
function SaveButton({ productId, classification }: { productId: string, classification: any }) {
  const fetcher = useFetcher();
  const isLoading = fetcher.state !== "idle";

  return (
    <fetcher.Form method="post" action="/api/save-metafields">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="customsDescription" value={classification.customs_description} />
      <input type="hidden" name="hsCode" value={classification.hs_code} />
      <Button submit variant="primary" loading={isLoading}>
        Save
      </Button>
    </fetcher.Form>
  );
}

// A new component for each product row
function ProductRow({ product }: { product: any }) {
  const fetcher = useFetcher<typeof action>();
  const isLoading = fetcher.state !== "idle";

  // Check if the fetcher has returned data for THIS product row
  const classificationData = fetcher.data && fetcher.data.productId === product.id ? fetcher.data : null;
  const existingData = product.customs_description && product.hs_code ? { customs_description: product.customs_description.value, hs_code: product.hs_code.value } : null;
  const displayData = classificationData || existingData;

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h3" variant="headingMd">{product.title}</Text>
        {displayData && (
          <BlockStack gap="200">
            <Text><b>Description:</b> {displayData.customs_description}</Text>
            <Text><b>HS Code:</b> {displayData.hs_code}</Text>
          </BlockStack>
        )}
        <div style={{display: 'flex', gap: '8px'}}>
          <fetcher.Form method="post">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="productTitle" value={product.title} />
            <Button submit loading={isLoading}>
              {existingData ? 'Re-classify' : 'Classify'}
            </Button>
          </fetcher.Form>
          {classificationData && <SaveButton productId={product.id} classification={classificationData} />}
        </div>
      </BlockStack>
    </Card>
  );
}

// MAIN COMPONENT
export default function Index() {
  const { products } = useLoaderData<typeof loader>();
  return (
    <Page>
      <TitleBar title="Waypoint Product Dashboard" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {products.map((p: any) => (
              <ProductRow key={p.node.id} product={p.node} />
            ))}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
