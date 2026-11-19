import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { ArrowRight, Bold, Eye, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Loader2, Save, Strikethrough, Underline as UnderlineIcon, X } from "lucide-react";
import {
  createManagedArticle, getArticleCategories, getArticleTags, getManagedArticle,
  updateManagedArticle, uploadManagedArticleImage, getArticleCmsCapabilities,\n  submitArticleForReview, decideArticleReview, publishManagedArticle,
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
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const coverImageInput = useRef<HTMLInputElement>(null);
  const capabilities = useQuery({ queryKey: ["cms", "capabilities"], queryFn: () => getArticleCmsCapabilities() });\n  const permissions = capabilities.data?.permissions;\n  const article = useQuery({
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
  const previewEditor = useEditor({
    extensions,
    content: form.content_json,
    editable: false,
    immediatelyRender: false,
    editorProps: { attributes: { dir: "rtl", class: "prose prose-lg max-w-none text-right leading-9" } },
  });
  useEffect(() => {
    if (previewOpen && previewEditor) {
      previewEditor.commands.setContent((editor?.getJSON() ?? form.content_json) as never);
    }
  }, [previewOpen, previewEditor, editor, form.content_json]);
  useEffect(() => {
    if (editor && article.data?.content_json) {
      const content = mapImageSources(article.data.content_json, (src) => src.startsWith("http") ? src : `${MEDIA_BASE_URL}${src}`);
      editor.commands.setContent(content as never);
    }
  }, [editor, article.data]);

  const workflowMutation = useMutation({\n    mutationFn: async (action: "submit" | "approve" | "reject" | "publish") => {\n      if (!articleKey) throw new Error("ابتدا مقاله را ذخیره کنید.");\n      if (action === "submit") return submitArticleForReview({ data: { articleId: articleKey } });\n      if (action === "approve" || action === "reject") return decideArticleReview({ data: { articleId: articleKey, decision: action } });\n      return publishManagedArticle({ data: { articleId: articleKey } });\n    },\n    onSuccess: async (saved) => {\n      setMessage("وضعیت مقاله با موفقیت تغییر کرد.");\n      await queryClient.invalidateQueries({ queryKey: ["cms"] });\n      setArticleKey(saved.id);\n      if (saved.status !== "draft") navigate({ to: "/admin-articles" });\n    },\n    onError: (error) => setMessage(error.message || "تغییر وضعیت مقاله ناموفق بود."),\n  });\n\n  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: ManagedArticleInput = {
        title: form.title.trim(), short_description: form.short_description,
        content: form.content, content_json: mapImageSources(editor?.getJSON() ?? form.content_json, (src) => src.startsWith(MEDIA_BASE_URL) ? src.slice(MEDIA_BASE_URL.length) : src) as Record<string, unknown>,
        category: form.category, tags: form.tags,
        meta_title: form.meta_title, meta_description: form.meta_description, image_alt: form.image_alt,
      };
      if (articleKey) return updateManagedArticle({ data: { ...payload, articleId: articleKey } });
      return createManagedArticle({ data: payload });
    },
    onSuccess: async (saved) => {
      setArticleKey(saved.id);
      setMessage("پیش‌نویس با موفقیت ذخیره شد.");
      await queryClient.invalidateQueries({ queryKey: ["cms", "my-articles"] });
      if (isNew) navigate({ to: "/admin-article-editor/$articleId", params: { articleId: String(saved.id) }, replace: true });
    },
    onError: (error) => setMessage(error.message || "ذخیره مقاله ناموفق بود."),
  });

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
  if (!isNew && article.isLoading) return <main dir="rtl" className="mx-auto max-w-5xl p-8 text-center text-muted-foreground">در حال دریافت مقاله…</main>;
  if (!isNew && article.isError) return <main dir="rtl" className="mx-auto max-w-5xl p-8"><p className="text-destructive">{article.error.message}</p><Link to="/admin-articles" className="mt-4 inline-block text-primary">بازگشت به فهرست</Link></main>;
  if (!isNew && article.data && article.data.status !== "draft") return <main dir="rtl" className="mx-auto max-w-5xl p-8"><h1 className="text-xl font-bold">این مقاله قابل ویرایش نیست</h1><p className="mt-2 text-muted-foreground">فقط مقاله‌های پیش‌نویس از این بخش قابل ویرایش هستند.</p><Link to="/admin-articles" className="mt-4 inline-block text-primary">بازگشت</Link></main>;

  return <main dir="rtl" className="min-h-screen bg-muted/30">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><Link to="/admin-articles" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowRight className="h-4 w-4" /> بازگشت به داشبورد مقاله‌ها</Link><h1 className="text-2xl font-bold">{isNew ? "ایجاد مقاله جدید" : "ویرایش مقاله"}</h1><p className="mt-1 text-sm text-muted-foreground">محتوا را بنویسید و به‌صورت پیش‌نویس ذخیره کنید.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setPreviewOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted"><Eye className="h-4 w-4" /> پیش‌نمایش در سایت</button>
          <button disabled={saveMutation.isPending || !form.title.trim() || (isNew ? !permissions?.create : !permissions?.edit_own)} onClick={() => { setMessage(""); saveMutation.mutate(); }} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} ذخیره پیش‌نویس</button>\n          {!isNew && article.data?.status === "draft" && permissions?.edit_own && <button type="button" disabled={workflowMutation.isPending} onClick={() => workflowMutation.mutate("submit")} className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted disabled:opacity-50">ارسال برای بررسی</button>}\n          {!isNew && article.data?.status === "review" && permissions?.review && <><button type="button" disabled={workflowMutation.isPending} onClick={() => workflowMutation.mutate("approve")} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">تأیید مقاله</button><button type="button" disabled={workflowMutation.isPending} onClick={() => workflowMutation.mutate("reject")} className="rounded-xl border border-destructive/40 px-4 py-3 text-sm font-semibold text-destructive disabled:opacity-50">رد و بازگشت به پیش‌نویس</button></>}\n          {!isNew && article.data?.status === "approved" && permissions?.publish && <button type="button" disabled={workflowMutation.isPending} onClick={() => workflowMutation.mutate("publish")} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">انتشار مقاله</button>}
        </div>
      </div>
      {message && <p role="status" className={`mb-4 rounded-xl border p-3 text-sm ${message.includes("موفقیت") || message.includes("اضافه شد") ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-800"}`}>{message}</p>}
      {previewOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-background" dir="rtl">
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 shadow-sm backdrop-blur">
            <div><p className="font-semibold">پیش‌نمایش مقاله در قالب سایت</p><p className="text-xs text-muted-foreground">این نمایش فقط برای بررسی است و مقاله را منتشر نمی‌کند.</p></div>
            <button type="button" onClick={() => setPreviewOpen(false)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"><X className="h-4 w-4" /> بستن پیش‌نمایش</button>
          </div>
          <header className="border-b border-border bg-secondary/40">
            <div className="container-shop py-8">
              <div className={coverImageUrl ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center" : "max-w-4xl"}>
                <div>
                  <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">پیش‌نویس مقاله</span>
                  <h1 className="mt-4 text-3xl font-bold leading-tight text-foreground md:text-4xl">{form.title || "عنوان مقاله"}</h1>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">{form.short_description || "خلاصه مقاله در این قسمت نمایش داده می‌شود."}</p>
                </div>
                {coverImageUrl && <div className="overflow-hidden rounded-2xl border border-border bg-secondary"><img src={coverImageUrl} alt={form.image_alt || form.title} className="aspect-[16/10] w-full object-cover" /></div>}
              </div>
            </div>
          </header>
          <main className="container-shop py-10">
            <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
              {previewEditor ? <EditorContent editor={previewEditor} /> : <p className="text-muted-foreground">در حال آماده‌سازی پیش‌نمایش…</p>}
            </div>
          </main>
        </div>
      )}
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
            {categories.isError ? <p className="text-sm text-destructive">{categories.error.message}</p> : categories.data?.filter((item) => item.is_active).map((item) => <label key={item.id} className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.category.includes(item.id)} onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.checked ? [...previous.category, item.id] : previous.category.filter((id) => id !== item.id) }))} />{item.title}</label>)}
            {categories.data?.length === 0 && <p className="text-xs text-muted-foreground">دسته‌بندی فعالی ثبت نشده است.</p>}
          </section>
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">برچسب‌ها</h2>
            {tags.isError ? <p className="text-sm text-destructive">{tags.error.message}</p> : tags.data?.filter((item) => item.is_active).map((item) => <label key={item.id} className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.tags.includes(item.id)} onChange={(event) => setForm((previous) => ({ ...previous, tags: event.target.checked ? [...previous.tags, item.id] : previous.tags.filter((id) => id !== item.id) }))} />{item.title}</label>)}
            {tags.data?.length === 0 && <p className="text-xs text-muted-foreground">برچسب فعالی ثبت نشده است.</p>}
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
    </div>
  </main>;
}
