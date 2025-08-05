import React from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, Text, List } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

// This is the server-side function that fetches data before the page loads.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Authenticate the request to get an admin API context
  const { admin } = await authenticate.admin(request);

  // Define the GraphQL query to fetch the first 10 products
  const response = await admin.graphql(
    `#graphql
    query {
      products(first: 10) {
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

  // Parse the JSON response
  const responseJson = await response.json();

  // Return the product data to the component
  return json({
    products: responseJson.data.products.edges,
  });
};

// This is the React component that renders the UI.
export default function Index() {
  // Use the useLoaderData hook to get the data returned from the loader
  const { products } = useLoaderData<typeof loader>();

  return (
    <>
      <TitleBar title="Waypoint Product Dashboard" />
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">
                  Product List
                </Text>
                <Text as="p">
                  Here are the first 10 products from your store.
                </Text>
                {products.length > 0 ? (
                  <List type="bullet">
                    {products.map((productItem: any, index: number) => (
                      <List.Item key={index}>
                        {productItem.node.title}
                      </List.Item>
                    ))}
                  </List>
                ) : (
                  <Text as="p">
                    No products found in your store.
                  </Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </>
  );
}
