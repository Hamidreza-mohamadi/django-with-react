import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { listCategories } from "../catalog";

export default defineTool({
  name: "list_categories",
  title: "List categories",
  description: "List the public product categories of the storefront.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const categories = await listCategories();
    return {
      content: [{ type: "text", text: JSON.stringify(categories, null, 2) }],
      structuredContent: { count: categories.length, categories },
    };
  },
});
