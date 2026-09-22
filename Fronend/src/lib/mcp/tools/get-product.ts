import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getProductBySlug } from "../catalog";

export default defineTool({
  name: "get_product",
  title: "Get product details",
  description: "Get full public details for one storefront product by its slug.",
  inputSchema: {
    slug: z.string().describe("Product slug, e.g. from search_products."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => {
    const product = await getProductBySlug(slug);
    if (!product) throw new ToolError(`No product found with slug "${slug}".`);
    return {
      content: [{ type: "text", text: JSON.stringify(product, null, 2) }],
      structuredContent: { product },
    };
  },
});
