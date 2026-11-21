import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { ArrowRight, Bold, Eye, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Loader2, Save, Strikethrough, Underline as UnderlineIcon } from "lucide-react";
import {
  createManagedArticle, createArticleCategory, createArticleTag, getArticleCategories, getArticleTags, getManagedArticle,
  updateManagedArticle, uploadManagedArticleImage, getArticleCmsCapabilities,
  publishManagedArticle,
  unpublishManagedArticle, deleteManagedArticle, updateManagedArticleWorkflow,
  type ManagedArticleInput,
} from "@/lib/shop/api";

export const Route = createFileRoute("/_authenticated/admin-article-editor/$articleId")({
  component: ArticleEditorPage,
});

const emptyDoc = { type: "doc", content: [{ type: "paragraph" }] };
type EditorState = {
  title: string; short_description: string; content: string; content_json: Record<string, unknown>;
  category: number[]; tags: number[]; meta_title: string; meta_description: string; image_alt: string;
};
const MEDIA_BASE_URL = (import.meta.env.VITE_MEDIA_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

function mapImageSources(value: unknown, mapSource: (source: string) => string): unknown {
  if (Array.isArray(value)) return value.map((item) => mapImageSources(item, mapSource));
  if (!value || typeof value !== "object") return value;
  const node = value as Record<string, unknown>;
  const mapped = Object.fromEntries(Object.entries(node).map(([key, item]) => [key, mapImageSources(item, mapSource)]));
  if (mapped.type === "image" && mapped.attrs && typeof mapped.attrs === "object") {
    const attrs = mapped.attrs as Record<string, unknown>;
    if (typeof attrs.src === "string") mapped.attrs = { ...attrs, src: mapSource(attrs.src) };
  }
  return mapped;
}

const blank: EditorState = {
  title: "", short_description: "", content: "", content_json: emptyDoc,
  category: [], tags: [], meta_title: "", meta_description: "", image_alt: "",
};

function ToolButton({ label, onClick, active = false, children }: { label: string; onClick: () => void; active?: boolean; children: ReactNode }) {
  return <button type="button" title={label} aria-label={label} onClick={onClick} className={`rounded-lg border p-2 transition ${active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"}`}>{children}</button>;
}

function ArticleEditorPage() {
  const { articleId } = Route.useParams();
  const isNew = articleId === "new";
  const id = Number(articleId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EditorState>(blank);
  const [articleKey, setArticleKey] = useState<number | null>(isNew ? null : id);
  const [message, setMessage] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [slug, setSlug] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const coverImageInput = useRef<HTMLInputElement>(null);
  const publishingNewArticle = useRef(false);
  const capabilities = useQuery({ queryKey: ["cms", "capabilities"], queryFn: () => getArticleCmsCapabilities() });
  const permissions = capabilities.data?.permissions;
  const article = useQuery({
    queryKey: ["cms", "article", id],
    queryFn: () => getManagedArticle({ data: { articleId: id } }),
    enabled: !isNew && Number.isInteger(id) && id > 0,
  });
  const categories = useQuery({ queryKey: ["cms", "categories"], queryFn: () => getArticleCategories() });
  const tags = useQuery({ queryKey: ["cms", "tags"], queryFn: () => getArticleTags() });

  useEffect(() => {
    if (article.data) {
      const value = article.data;
      setForm({
        title: value.title ?? "", short_description: value.short_description ?? "",
        content: value.content ?? "", content_json: value.content_json ?? emptyDoc,
        category: value.category ?? [], tags: value.tags ?? [],
        meta_title: value.meta_title ?? "", meta_description: value.meta_description ?? "",
        image_alt: value.image_alt ?? "",
        });
      setSlug(value.slug ?? "");
      setCoverImageUrl(value.image ?? null);
      setArticleKey(value.id);
    }
  }, [article.data]);



  const extensions = useMemo(() => [
    StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false } }),
    Image.configure({ inline: false, allowBase64: false }),
  ], []);
  const editor = useEditor({
    extensions,
    content: form.content_json,
    immediatelyRender: false,
    editorProps: { attributes: { dir: "rtl", class: "prose prose-sm max-w-none min-h-[360px] px-5 py-4 text-right outline-none focus:outline-none" } },
    onUpdate: ({ editor: current }) => setForm((previous) => ({ ...previous, content_json: current.getJSON() as Record<string, unknown> })),
  });
  useEffect(() => {
    if (editor && article.data?.content_json) {
      const content = mapImageSources(article.data.content_json, (src) => src.startsWith("http") ? src : `${MEDIA_BASE_URL}${src}`);
      editor.commands.setContent(content as never);
    }
  }, [editor, article.data]);

  const workflowMutation = useMutation({
    mutationFn: async () => {
      if (!articleKey) throw new Error("ابتدا مقاله را ذخیره کنید.");
      return publishManagedArticle({ data: {
        articleId: articleKey,
        ...(scheduledAt ? { scheduled_at: new Date(scheduledAt).toISOString() } : {}),
      } });
    },
    onSuccess: async (saved) => {
      setMessage("مقاله با موفقیت منتشر یا زمان‌بندی شد.");
      await queryClient.invalidateQueries({ queryKey: ["cms"] });
      setArticleKey(saved.id);
      if (saved.status !== "draft") navigate({ to: "/admin-articles" });
    },
    onError: (error) => setMessage(error.message || "تغییر وضعیت مقاله ناموفق بود."),
  });

  const statusMutation = useMutation({
    mutationFn: (action: "save_draft" | "submit_review" | "approve" | "reject") => {
      if (!articleKey) throw new Error("ابتدا مقاله را ذخیره کنید.");
      return updateManagedArticleWorkflow({ data: { articleId: articleKey, action } });
    },
    onSuccess: async (saved, action) => {
      const messages = {
        save_draft: "مقاله به‌صورت پیش‌نویس ذخیره شد.",
        submit_review: "مقاله برای بررسی ویراستار ارسال شد.",
        approve: "مقاله تأیید شد.",
        reject: "مقاله رد شد و به پیش‌نویس برگشت."
      };
      setMessage(messages[action]);
      setArticleKey(saved.id);
      await queryClient.invalidateQueries({ queryKey: ["cms"] });
      if (!isNew) await article.refetch();
    },
    onError: (error) => setMessage(error.message || "تغییر وضعیت مقاله ناموفق بود."),
  });

  async function handleStatusAction(action: "save_draft" | "submit_review" | "approve" | "reject") {
    publishingNewArticle.current = true;
    try {
      const saved = await saveMutation.mutateAsync();
      setArticleKey(saved.id);
      await statusMutation.mutateAsync(action);
      if (isNew) navigate({ to: "/admin-article-editor/$articleId", params: { articleId: String(saved.id) }, replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ذخیره یا تغییر وضعیت مقاله ناموفق بود.");
    } finally {
      publishingNewArticle.current = false;
    }
  }

  const unpublishMutation = useMutation({
    mutationFn: () => {
      if (!articleKey) throw new Error("شناسه مقاله در دسترس نیست.");
      return unpublishManagedArticle({ data: { articleId: articleKey } });
    },
    onSuccess: async () => {
      setMessage("انتشار مقاله لغو شد.");
      await queryClient.invalidateQueries({ queryKey: ["cms"] });
      await article.refetch();
    },
    onError: (error) => setMessage(error.message || "لغو انتشار ناموفق بود."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!articleKey) throw new Error("شناسه مقاله در دسترس نیست.");
      return deleteManagedArticle({ data: { articleId: articleKey } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cms"] });
      navigate({ to: "/admin-articles" });
    },
    onError: (error) => setMessage(error.message || "حذف مقاله ناموفق بود."),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: ManagedArticleInput = {
        title: form.title.trim(), short_description: form.short_description,
        content: form.content, content_json: mapImageSources(editor?.getJSON() ?? form.content_json, (src) => src.startsWith(MEDIA_BASE_URL) ? src.slice(MEDIA_BASE_URL.length) : src) as Record<string, unknown>,
        category: form.category, tags: form.tags,
        ...(permissions?.manage_roles ? { slug: slug.trim() } : {}),
        meta_title: form.meta_title, meta_description: form.meta_description, image_alt: form.image_alt,
      };
      if (articleKey) return updateManagedArticle({ data: { ...payload, articleId: articleKey } });
      return createManagedArticle({ data: payload });
    },
    onSuccess: async (saved) => {
      setArticleKey(saved.id);
      setMessage("مقاله با موفقیت ذخیره شد.");
      await queryClient.invalidateQueries({ queryKey: ["cms", "my-articles"] });
      if (isNew && !publishingNewArticle.current) navigate({ to: "/admin-article-editor/$articleId", params: { articleId: String(saved.id) }, replace: true });
    },
    onError: (error) => setMessage(error.message || "ذخیره مقاله ناموفق بود."),
  });

  async function handlePublish() {
    if (isNew && !articleKey) {
      publishingNewArticle.current = true;
      try {
        const saved = await saveMutation.mutateAsync();
        await publishManagedArticle({ data: {
          articleId: saved.id,
          ...(scheduledAt ? { scheduled_at: new Date(scheduledAt).toISOString() } : {}),
        } });
        setMessage(scheduledAt ? "مقاله برای انتشار زمان‌بندی شد." : "مقاله مستقیماً منتشر شد.");
        await queryClient.invalidateQueries({ queryKey: ["cms"] });
        navigate({ to: "/admin-articles" });
        return;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "انتشار مقاله ناموفق بود.");
      } finally {
        publishingNewArticle.current = false;
      }
      return;
    }
    workflowMutation.mutate();
  }

  async function handleImage(file?: File, isCover = false) {
    if (!file) return;
    let targetArticleId = articleKey;
    if (!targetArticleId) {
      if (!form.title.trim()) {
        setMessage("برای بارگذاری تصویر، ابتدا عنوان مقاله را وارد کنید.");
        return;
      }
      try {
        const saved = await saveMutation.mutateAsync();
        targetArticleId = saved.id;
      } catch {
        return;
      }
    }
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setMessage("فقط تصویر با حجم حداکثر ۵ مگابایت مجاز است.");
      return;
    }
    setUploading(true); setMessage("");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = ""; bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
      const uploaded = await uploadManagedArticleImage({ data: {
        articleId: targetArticleId, fileName: file.name, mimeType: file.type,
        base64: btoa(binary), altText: form.image_alt, isCover,
      } });
      const src = uploaded.url.startsWith("http") ? uploaded.url : `${MEDIA_BASE_URL}${uploaded.url}`;
      if (isCover) {
        setCoverImageUrl(src);
        setMessage("تصویر اصلی مقاله ذخیره شد.");
      } else {
        editor?.chain().focus().setImage({ src, alt: form.image_alt }).run();
        setMessage("تصویر بارگذاری و به متن اضافه شد.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "بارگذاری تصویر ناموفق بود.");
    } finally { setUploading(false); }
  }

  const field = (key: keyof EditorState, value: string) => setForm((previous) => ({ ...previous, [key]: value }));
  async function openArticlePreview() {
    const previewTab = window.open("about:blank", "_blank");
    if (!previewTab) { setMessage("مرورگر اجازه باز کردن زبانه جدید را نداد؛ پنجره‌های بازشو را فعال کنید."); return; }
    previewTab.document.write("<p dir='rtl' style='font-family:sans-serif;padding:2rem'>در حال آماده‌سازی پیش‌نمایش مقاله…</p>");
    try { const saved = await saveMutation.mutateAsync(); previewTab.location.href = `/articles/${encodeURIComponent(saved.slug || `preview-${saved.id}`)}?previewId=${saved.id}`; }
    catch { previewTab.close(); }
  }

  if (!isNew && article.isLoading) return <main dir="rtl" className="mx-auto max-w-5xl p-8 text-center text-muted-foreground">در حال دریافت مقاله…</main>;
  if (!isNew && article.isError) return <main dir="rtl" className="mx-auto max-w-5xl p-8"><p className="text-destructive">{article.error.message}</p><Link to="/admin-articles" className="mt-4 inline-block text-primary">بازگشت به فهرست</Link></main>;


  return <main dir="rtl" className="min-h-screen bg-muted/30">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><Link to="/admin-articles" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowRight className="h-4 w-4" /> بازگشت به داشبورد مقاله‌ها</Link><h1 className="text-2xl font-bold">{isNew ? "ایجاد مقاله جدید" : "ویرایش مقاله"}</h1><p className="mt-1 text-sm text-muted-foreground">محتوا را بنویسید، ذخیره کنید یا در صورت داشتن مجوز مستقیماً منتشر کنید.</p></div>
        <button type="button" onClick={() => void openArticlePreview()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted"><Eye className="h-4 w-4" /> پیش‌نمایش در سایت</button>
      </div>
      {message && <p role="status" className={`mb-4 rounded-xl border p-3 text-sm ${message.includes("موفقیت") || message.includes("اضافه شد") ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-800"}`}>{message}</p>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <label className="mb-2 block text-sm font-medium">عنوان مقاله</label>
            <input value={form.title} onChange={(event) => field("title", event.target.value)} maxLength={80} placeholder="عنوان مقاله را وارد کنید" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-lg font-semibold outline-none focus:border-primary" />
            <label className="mb-2 mt-5 block text-sm font-medium">خلاصه مقاله</label>
            <textarea value={form.short_description} onChange={(event) => field("short_description", event.target.value)} rows={3} className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary" placeholder="خلاصه‌ای کوتاه برای معرفی مقاله…" />
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap gap-2 border-b border-border p-3">
              <ToolButton label="متن ضخیم" active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolButton>
              <ToolButton label="ایتالیک" active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolButton>
              <ToolButton label="زیرخط" active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></ToolButton>
              <ToolButton label="خط‌خورده" active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolButton>
              <span className="mx-1 w-px bg-border" />
              <ToolButton label="تیتر ۲" active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolButton>
              <ToolButton label="تیتر ۳" active={editor?.isActive("heading", { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></ToolButton>
              <ToolButton label="فهرست نشانه‌دار" onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolButton>
              <ToolButton label="فهرست شماره‌دار" onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolButton>
              <ToolButton label="افزودن لینک" onClick={() => { const href = window.prompt("نشانی لینک را وارد کنید"); if (href) editor?.chain().focus().setLink({ href }).run(); }}><Link2 className="h-4 w-4" /></ToolButton>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted"><ImagePlus className="h-4 w-4" /> {uploading ? "در حال بارگذاری…" : "تصویر"}<input type="file" accept="image/*" className="hidden" disabled={uploading || saveMutation.isPending} onChange={(event) => { void handleImage(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
            </div>
            <EditorContent editor={editor} />
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">تنظیمات سئو</h2>
            <label className="mb-2 block text-sm font-medium">عنوان سئو <span className="text-muted-foreground">({form.meta_title.length}/70)</span></label>
            <input value={form.meta_title} maxLength={70} onChange={(event) => field("meta_title", event.target.value)} className="mb-4 w-full rounded-xl border border-border bg-background px-3 py-2.5" placeholder="عنوان نمایش در موتورهای جست‌وجو" />
            <label className="mb-2 block text-sm font-medium">توضیحات سئو <span className="text-muted-foreground">({form.meta_description.length}/160)</span></label>
            <textarea value={form.meta_description} maxLength={160} rows={3} onChange={(event) => field("meta_description", event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5" placeholder="توضیح کوتاه برای نتایج جست‌وجو" />
          </div>
        </section>
        <aside className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">دسته‌بندی‌ها</h2>
            <div className="flex gap-2"><input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="جست‌وجو یا ایجاد دسته‌بندی…" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" /><button type="button" disabled={!categorySearch.trim() || !!categories.data?.some((item) => item.is_active && (item.title.trim().toLocaleLowerCase() === categorySearch.trim().toLocaleLowerCase()))} onClick={async () => { try { const item = await createArticleCategory({ data: { title: categorySearch.trim() } }); await queryClient.invalidateQueries({ queryKey: ["cms", "categories"] }); setForm((p) => ({ ...p, category: [...new Set([...p.category, item.id])] })); setCategorySearch(""); } catch (err) { setMessage(err instanceof Error ? err.message : "ایجاد دسته‌بندی ناموفق بود."); } }} className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-40">+</button></div>
            {categories.data?.some((item) => item.is_active && (item.title.toLocaleLowerCase().startsWith(categorySearch.trim().toLocaleLowerCase()) || categorySearch.trim().toLocaleLowerCase().startsWith(item.title.toLocaleLowerCase()))) && categorySearch.trim() && <p className="mt-2 text-xs text-amber-600">از قبل وجود دارد؛ از فهرست انتخاب کنید.</p>}
            <div className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-lg border border-border p-3">{categories.data?.filter((item) => item.is_active && (item.title.toLocaleLowerCase().startsWith(categorySearch.trim().toLocaleLowerCase()) || categorySearch.trim().toLocaleLowerCase().startsWith(item.title.toLocaleLowerCase()))).map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={form.category.includes(item.id)} onChange={(event) => setForm((p) => ({ ...p, category: event.target.checked ? [...p.category, item.id] : p.category.filter((id) => id !== item.id) }))} />{item.title}</label>)}</div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">برچسب‌ها</h2>
            <div className="flex gap-2"><input value={tagSearch} onChange={(event) => setTagSearch(event.target.value)} placeholder="جست‌وجو یا ایجاد برچسب…" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" /><button type="button" disabled={!tagSearch.trim() || !!tags.data?.some((item) => item.is_active && (item.title.trim().toLocaleLowerCase() === tagSearch.trim().toLocaleLowerCase()))} onClick={async () => { try { const item = await createArticleTag({ data: { title: tagSearch.trim() } }); await queryClient.invalidateQueries({ queryKey: ["cms", "tags"] }); setForm((p) => ({ ...p, tags: [...new Set([...p.tags, item.id])] })); setTagSearch(""); } catch (err) { setMessage(err instanceof Error ? err.message : "ایجاد برچسب ناموفق بود."); } }} className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-40">+</button></div>
            {tags.data?.some((item) => item.is_active && (item.title.toLocaleLowerCase().startsWith(tagSearch.trim().toLocaleLowerCase()) || tagSearch.trim().toLocaleLowerCase().startsWith(item.title.toLocaleLowerCase()))) && tagSearch.trim() && <p className="mt-2 text-xs text-amber-600">از قبل وجود دارد؛ از فهرست انتخاب کنید.</p>}
            <div className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-lg border border-border p-3">{tags.data?.filter((item) => item.is_active && (item.title.toLocaleLowerCase().startsWith(tagSearch.trim().toLocaleLowerCase()) || tagSearch.trim().toLocaleLowerCase().startsWith(item.title.toLocaleLowerCase()))).map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={form.tags.includes(item.id)} onChange={(event) => setForm((p) => ({ ...p, tags: event.target.checked ? [...p.tags, item.id] : p.tags.filter((id) => id !== item.id) }))} />{item.title}</label>)}</div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">اطلاعات مقاله</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">تاریخ انتشار</dt><dd className="text-left">{article.data?.published_at ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(article.data.published_at)) : "هنوز منتشر نشده"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">آخرین ویرایش</dt><dd className="text-left">{article.data?.updated_at ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(article.data.updated_at)) : "پس از ذخیره"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">بازدید</dt><dd className="text-left">آمار ثبت نمی‌شود</dd></div>
            </dl>
            <label className="mb-2 mt-4 block text-sm font-medium">عنوان در URL (Slug)</label>
            <input value={slug} onChange={(event) => setSlug(event.target.value)} disabled={!permissions?.manage_roles} dir="ltr" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-sm disabled:opacity-70" placeholder="article-url-title" />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{permissions?.manage_roles ? "فقط مدیر محتوا می‌تواند این آدرس را تغییر دهد. برای تولید خودکار، خالی بگذارید." : "این آدرس فقط‌خواندنی است و توسط مدیر محتوا قابل ویرایش است."}</p>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">تصویر اصلی مقاله</h2>
            {coverImageUrl && <img src={coverImageUrl} alt="پیش‌نمایش تصویر اصلی مقاله" className="mb-3 aspect-video w-full rounded-lg object-cover" />}
            <input ref={coverImageInput} type="file" accept="image/*" className="hidden" disabled={uploading || saveMutation.isPending} onChange={(event) => { void handleImage(event.target.files?.[0], true); event.currentTarget.value = ""; }} />
            <button type="button" onClick={() => coverImageInput.current?.click()} disabled={uploading || saveMutation.isPending} className="w-full rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50">{uploading ? "در حال بارگذاری…" : coverImageUrl ? "تغییر تصویر اصلی" : "انتخاب تصویر اصلی"}</button>
            <label className="mb-2 mt-4 block text-sm font-medium">متن جایگزین تصویر</label>
            <input value={form.image_alt} onChange={(event) => field("image_alt", event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" placeholder="توضیح تصویر برای دسترس‌پذیری و سئو" />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">تصویر اصلی به‌عنوان کاور مقاله استفاده می‌شود. حداکثر حجم تصویر ۵ مگابایت است.</p>
          </section>
        </aside>
      </div>
      <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">عملیات مقاله</h2>
        <div className="flex flex-wrap items-end justify-start gap-3">
          {(isNew ? permissions?.create : permissions?.edit_own) && <button type="button" disabled={saveMutation.isPending || statusMutation.isPending || !form.title.trim()} onClick={() => void handleStatusAction("save_draft")} title="مقاله را به‌صورت پیش‌نویس ذخیره می‌کند و منتشر نمی‌کند." aria-label="ذخیره به‌عنوان پیش‌نویس" className="inline-flex items-center gap-2 rounded-xl border border-primary bg-primary/10 px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">{saveMutation.isPending || statusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} ذخیره به‌عنوان پیش‌نویس</button>}
          {(isNew || article.data?.status !== "review") && (isNew ? permissions?.create : permissions?.edit_own) && <button type="button" disabled={saveMutation.isPending || statusMutation.isPending || !form.title.trim()} onClick={() => void handleStatusAction("submit_review")} className="rounded-xl border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-sm font-semibold text-sky-700 transition-colors hover:border-sky-500/60 hover:bg-sky-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50" title="مقاله را برای بررسی و تصمیم ویراستار به وضعیت در انتظار بررسی می‌برد." aria-label="ارسال برای بررسی">ارسال برای بررسی</button>}
          {!isNew && article.data?.status === "review" && permissions?.review && <>
            <button type="button" disabled={saveMutation.isPending || statusMutation.isPending} onClick={() => void handleStatusAction("approve")} title="بررسی مقاله را تأیید می‌کند و آن را برای انتشار آماده می‌سازد." aria-label="تأیید مقاله" className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50">تأیید مقاله</button>
            <button type="button" disabled={saveMutation.isPending || statusMutation.isPending} onClick={() => void handleStatusAction("reject")} title="مقاله را رد می‌کند و برای اصلاح به پیش‌نویس برمی‌گرداند." aria-label="رد مقاله" className="rounded-xl border border-destructive/40 px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50">رد مقاله</button>
          </>}
          {!isNew && article.data?.status === "published" && permissions?.publish && <button type="button" disabled={unpublishMutation.isPending} onClick={() => { if (window.confirm("انتشار این مقاله لغو شود؟")) unpublishMutation.mutate(); }} title="نمایش عمومی مقاله را متوقف می‌کند؛ مقاله حذف نمی‌شود." aria-label="لغو انتشار" className="rounded-xl border border-amber-500/40 px-4 py-3 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50">لغو انتشار</button>}
          {!isNew && (permissions?.delete || (article.data?.status === "draft" && permissions?.edit_own)) && <button type="button" disabled={deleteMutation.isPending} onClick={() => { if (window.confirm("این مقاله برای همیشه حذف شود؟")) deleteMutation.mutate(); }} title="مقاله را برای همیشه حذف می‌کند." aria-label="حذف مقاله" className="rounded-xl border border-destructive/40 px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50">حذف مقاله</button>}
          {permissions?.publish && (isNew || article.data?.status !== "published") && <>
            <label className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 text-xs font-medium text-muted-foreground">
              زمان انتشار (اختیاری)
              <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </label>
            <button type="button" disabled={workflowMutation.isPending || saveMutation.isPending || statusMutation.isPending} onClick={() => void handlePublish()} title={scheduledAt ? "مقاله را در زمان انتخاب‌شده منتشر می‌کند." : "مقاله را همین حالا منتشر می‌کند."} aria-label={scheduledAt ? "زمان‌بندی انتشار" : "منتشر کردن"} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">{scheduledAt ? "زمان‌بندی انتشار" : "منتشر کردن"}</button>
          </>}
          {!permissions?.create && !permissions?.edit_own && !permissions?.publish && <p className="text-sm text-muted-foreground">نقش شما دسترسی ویرایش یا انتشار مقاله را ندارد.</p>}
        </div>
      </section>
    </div>
  </main>;
}
