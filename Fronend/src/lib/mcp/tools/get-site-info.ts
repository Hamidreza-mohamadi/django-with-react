import { defineTool } from "@lovable.dev/mcp-js";
import { getSiteInfo } from "../catalog";

export default defineTool({
  name: "get_site_info",
  title: "Get site info",
  description:
    "Get the storefront's public contact and about information (name, phone, email, address, about text).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const site = await getSiteInfo();
    return {
      content: [{ type: "text", text: JSON.stringify(site, null, 2) }],
      structuredContent: { site },
    };
  },
});
