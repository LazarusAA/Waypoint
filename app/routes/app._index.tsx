import React from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, Text, ResourceList, ResourceItem, Button } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { gemini } from "../lib/gemini.server";

// SERVER-SIDE LOADER: Fetches products when the page loads
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
            handle
          }
        }
      }
    }`
  );
  const responseJson = await response.json();
  return json({
    products: responseJson.data.products.edges,
  });
};

// SERVER-SIDE ACTION: Handles form submissions (e.g., button clicks)
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const productTitle = formData.get("productTitle") as string;
  
  const prompt = `You are an expert international customs agent. Your task is to generate a customs declaration for an e-commerce product.
  Based on the product title "${productTitle}", perform two tasks:
  1. Generate a concise, literal, and accurate product description suitable for a customs form. Avoid marketing jargon.
  2. Determine the most likely 6-digit Harmonized System (HS) code for this item.
  
  Return the response as a single, minified JSON object with two keys: "customs_description" and "hs_code".`;

  try {
    const result = await gemini.generateContent(prompt);
    const response = result.response;
    const aiResponseText = response.text();
    
    // For now, we just log the response to the server console for verification.
    console.log("✅ AI Classification successful for:", productTitle);
    console.log("🤖 AI Response:", aiResponseText);
    
    return json({ success: true, data: aiResponseText });
  } catch (error) {
    console.error("🔴 AI Classification failed:", error);
    return json({ success: false, error: "AI call failed" }, { status: 500 });
  }
};

// CLIENT-SIDE COMPONENT: Renders the UI
export default function Index() {
  const { products } = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="Waypoint Product Dashboard" />
      <Layout>
        <Layout.Section>
          <Card>
            <ResourceList
              resourceName={{ singular: 'product', plural: 'products' }}
              items={products}
              renderItem={(item: any) => {
                const { id, title } = item.node;
                return (
                  <ResourceItem id={id} accessibilityLabel={`View details for ${title}`}>
                    <BlockStack direction="row" align="space-between" inlineAlign="center">
                      <Text variant="bodyMd" fontWeight="bold" as="h3">
                        {title}
                      </Text>
                      <Form method="post">
                        <input type="hidden" name="productTitle" value={title} />
                        <Button submit={true}>Classify</Button>
                      </Form>
                    </BlockStack>
                  </ResourceItem>
                );
              }}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
