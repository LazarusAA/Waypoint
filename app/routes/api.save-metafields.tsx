import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const productId = formData.get("productId") as string;
  const customsDescription = formData.get("customsDescription") as string;
  const hsCode = formData.get("hsCode") as string;

  const response = await admin.graphql(
    `#graphql
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          key
          namespace
          value
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            ownerId: productId,
            namespace: "waypoint",
            key: "customs_description",
            type: "single_line_text_field",
            value: customsDescription,
          },
          {
            ownerId: productId,
            namespace: "waypoint",
            key: "hs_code",
            type: "single_line_text_field",
            value: hsCode,
          },
        ],
      },
    }
  );

  const responseJson = await response.json();
  return json({ data: responseJson.data.metafieldsSet });
}; 