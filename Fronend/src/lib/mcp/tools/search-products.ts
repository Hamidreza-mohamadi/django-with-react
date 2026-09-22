import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { listProducts } from "../catalog";

export default defineTool({
  name: "search_products",
  title: "Search products",
  description:
    "Search the public storefront catalog. Optionally filter by category slug and free-text query.",
  inputSchema: {
    search: z.string().optional().describe("Free-text query matched against name, description and brand."),
    category: z.string().optional().describe("Category slug to filter by."),
    limit: z.number().int().optional().describe("Max results to return (1-50, default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, category, limit }) => {
    const products = await listProducts({ search, category, limit });
    const rows = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      compare_price: p.compare_price ?? null,
      brand: p.brand ?? null,
      category: p.category?.name ?? null,
      stock: p.stock,
      is_available: p.is_available,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { count: rows.length, products: rows },
    };
  },
});
