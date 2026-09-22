import { defineMcp } from "@lovable.dev/mcp-js";
import searchProducts from "./tools/search-products";
import getProduct from "./tools/get-product";
import listCategories from "./tools/list-categories";
import searchArticles from "./tools/search-articles";
import getArticle from "./tools/get-article";
import getSiteInfo from "./tools/get-site-info";

export default defineMcp({
  name: "django-shopfront",
  title: "Django ShopFront",
  version: "0.1.0",
  instructions:
    "Read-only tools for the Django ShopFront storefront. Use `search_products` and `get_product` for the catalog, `list_categories` for browsing, `search_articles` and `get_article` for the blog, and `get_site_info` for contact/about details. All data is public storefront content; no user accounts, carts or orders are exposed.",
  tools: [
    searchProducts,
    getProduct,
    listCategories,
    searchArticles,
    getArticle,
    getSiteInfo,
  ],
});
