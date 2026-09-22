import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { listArticles } from "../catalog";

export default defineTool({
  name: "search_articles",
  title: "Search articles",
  description: "Search published public blog articles of the storefront.",
  inputSchema: {
    search: z.string().optional().describe("Free-text query matched against title and summary."),
    limit: z.number().int().optional().describe("Max results to return (1-50, default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }) => {
    const articles = await listArticles({ search, limit });
    const rows = articles.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      author: a.author,
      short_description: a.short_description,
      pub_date: a.pub_date,
      category: a.category ?? null,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { count: rows.length, articles: rows },
    };
  },
});
