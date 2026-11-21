import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Plus, Tags, Trash2 } from "lucide-react";
import { createArticleCategory, createArticleTag, deleteArticleCategory, deleteArticleTag, getArticleCategories, getArticleTags, getArticleCmsCapabilities } from "@/lib/shop/api";

export const Route = createFileRoute("/_authenticated/admin-taxonomies")({ component: TaxonomyManagementPage });

const normalize = (value: string) => value.trim().toLocaleLowerCase();

function TaxonomyManagementPage() {
  const queryClient = useQueryClient();
  const [categorySearch, setCategorySearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [message, setMessage] = useState("");
  const capabilities = useQuery({ queryKey: ["cms", "capabilities"], queryFn: () => getArticleCmsCapabilities() });
  const categories = useQuery({ queryKey: ["cms", "categories"], queryFn: () => getArticleCategories() });
  const tags = useQuery({ queryKey: ["cms", "tags"], queryFn: () => getArticleTags() });
  const canCreate = !!capabilities.data?.permissions.create;
  const canDelete = !!capabilities.data?.permissions.delete;
  const categoryExists = useMemo(() => !!categorySearch.trim() && categories.data?.some((item) => normalize(item.title) === normalize(categorySearch)), [categories.data, categorySearch]);
  const tagExists = useMemo(() => !!tagSearch.trim() && tags.data?.some((item) => normalize(item.title) === normalize(tagSearch)), [tags.data, tagSearch]);

  async function createCategory() {
    if (!categorySearch.trim() || categoryExists) return;
    try { await createArticleCategory({ data: { title: categorySearch.trim() } }); setCategorySearch(""); setMessage("دسته‌بندی ایجاد شد."); await queryClient.invalidateQueries({ queryKey: ["cms", "categories"] }); }
    catch (error) { setMessage(error instanceof Error ? error.message : "ایجاد دسته‌بندی ناموفق بود."); }
  }
  async function createTag() {
    if (!tagSearch.trim() || tagExists) return;
    try { await createArticleTag({ data: { title: tagSearch.trim() } }); setTagSearch(""); setMessage("برچسب ایجاد شد."); await queryClient.invalidateQueries({ queryKey: ["cms", "tags"] }); }
    catch (error) { setMessage(error instanceof Error ? error.message : "ایجاد برچسب ناموفق بود."); }
  }
  async function removeCategory(id: number, title: string) {
    if (!window.confirm(`دسته‌بندی «${title}» حذف شود؟ ارتباطش با مقاله‌ها حذف می‌شود؛ خود مقاله‌ها باقی می‌مانند. اگر زیر‌دسته داشته باشد، ابتدا باید آن‌ها را منتقل کنید.`)) return;
    try { await deleteArticleCategory({ data: { categoryId: id } }); setMessage("دسته‌بندی حذف شد."); await queryClient.invalidateQueries({ queryKey: ["cms", "categories"] }); }
    catch (error) { setMessage(error instanceof Error ? error.message : "حذف دسته‌بندی ممکن نشد؛ ممکن است هنوز به مقاله‌ای متصل باشد."); }
  }
  async function removeTag(id: number, title: string) {
    if (!window.confirm(`برچسب «${title}» حذف شود؟ ارتباطش با مقاله‌ها حذف می‌شود؛ خود مقاله‌ها باقی می‌مانند.`)) return;
    try { await deleteArticleTag({ data: { tagId: id } }); setMessage("برچسب حذف شد."); await queryClient.invalidateQueries({ queryKey: ["cms", "tags"] }); }
    catch (error) { setMessage(error instanceof Error ? error.message : "حذف برچسب ممکن نشد؛ ممکن است هنوز به مقاله‌ای متصل باشد."); }
  }

  return <main dir="rtl" className="min-h-screen bg-muted/30">
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link to="/admin-articles" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowRight className="h-4 w-4" /> بازگشت به داشبورد مقاله‌ها</Link>
      <div className="mb-6"><h1 className="text-2xl font-bold">مدیریت دسته‌بندی و برچسب</h1><p className="mt-2 text-sm text-muted-foreground">ایجاد، جست‌وجو و حذف موارد استفاده‌شده در مقاله‌ها</p></div>
      {message && <p role="status" className="mb-5 rounded-xl border border-border bg-card p-3 text-sm">{message}</p>}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><Tags className="h-4 w-4" /> دسته‌بندی‌ها</h2>
          {canCreate && <div className="mb-4 flex gap-2"><input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void createCategory(); }} placeholder="جست‌وجو یا ایجاد دسته‌بندی…" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" /><button onClick={() => void createCategory()} disabled={!categorySearch.trim() || !!categoryExists} title={categoryExists ? "این دسته‌بندی از قبل وجود دارد" : "ایجاد دسته‌بندی"} className="rounded-lg bg-primary px-3 text-primary-foreground disabled:opacity-40"><Plus className="h-4 w-4" /></button></div>}
          <div className="max-h-[480px] space-y-2 overflow-y-auto">{categories.data?.filter((item) => item.title.toLocaleLowerCase().includes(categorySearch.toLocaleLowerCase())).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.is_active ? "فعال" : "غیرفعال"}</p></div>{canDelete && <button onClick={() => void removeCategory(item.id, item.title)} title="حذف دسته‌بندی" className="rounded-md p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>}</div>)}</div>
          {categories.isLoading && <p className="text-sm text-muted-foreground">در حال دریافت…</p>}
          {categories.data?.length === 0 && <p className="text-sm text-muted-foreground">دسته‌بندی‌ای ثبت نشده است.</p>}
          <Link to="/admin-taxonomies" className="mt-4 inline-flex text-xs text-primary hover:underline">مدیریت دسته‌بندی‌ها و برچسب‌ها</Link>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><Tags className="h-4 w-4" /> برچسب‌ها</h2>
          {canCreate && <div className="mb-4 flex gap-2"><input value={tagSearch} onChange={(event) => setTagSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void createTag(); }} placeholder="جست‌وجو یا ایجاد برچسب…" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" /><button onClick={() => void createTag()} disabled={!tagSearch.trim() || !!tagExists} title={tagExists ? "این برچسب از قبل وجود دارد" : "ایجاد برچسب"} className="rounded-lg bg-primary px-3 text-primary-foreground disabled:opacity-40"><Plus className="h-4 w-4" /></button></div>}
          <div className="max-h-[480px] space-y-2 overflow-y-auto">{tags.data?.filter((item) => item.title.toLocaleLowerCase().includes(tagSearch.toLocaleLowerCase())).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.is_active ? "فعال" : "غیرفعال"}</p></div>{canDelete && <button onClick={() => void removeTag(item.id, item.title)} title="حذف برچسب" className="rounded-md p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>}</div>)}</div>
          {tags.isLoading && <p className="text-sm text-muted-foreground">در حال دریافت…</p>}
          {tags.data?.length === 0 && <p className="text-sm text-muted-foreground">برچسبی ثبت نشده است.</p>}
          <Link to="/admin-taxonomies" className="mt-4 inline-flex text-xs text-primary hover:underline">مدیریت دسته‌بندی‌ها و برچسب‌ها</Link>
        </section>
      </div>
      {!canDelete && capabilities.data && <p className="mt-5 text-xs text-muted-foreground">حذف دسته‌بندی و برچسب فقط برای نقش‌های دارای مجوز حذف مقاله فعال است.</p>}
    </div>
  </main>;
}
