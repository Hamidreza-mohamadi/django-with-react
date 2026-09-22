import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getArticleBySlug } from "../catalog";

export default defineTool({
  name: "get_article",
  title: "Get article",
  description: "Get the full content of one published public article by its slug.",
  inputSchema: {
    slug: z.string().describe("Article slug, e.g. from search_articles."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => {
    const article = await getArticleBySlug(slug);
    if (!article) throw new ToolError(`No article found with slug "${slug}".`);
    return {
      content: [{ type: "text", text: JSON.stringify(article, null, 2) }],
      structuredContent: { article },
    };
  },
});
