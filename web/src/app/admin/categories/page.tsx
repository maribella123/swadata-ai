import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { ActionButton, ActionForm } from "@/components/admin/controls";
import { TYPE_LABELS } from "@/lib/constants";
import { truncate } from "@/lib/utils";
import { createCategory, createSource, toggleCategory, toggleSource } from "../actions";

export const metadata: Metadata = { title: "Categories & tasks" };

export default async function CategoriesPage() {
  const supabase = await createClient();
  const [{ data: cats }, { data: sources }, { data: langs }] = await Promise.all([
    supabase.from("content_categories").select("*").order("sort_order"),
    supabase.from("translation_sources").select("id, text, domain, is_active, languages(name)").order("created_at", { ascending: false }).limit(200),
    supabase.from("languages").select("id, name").eq("is_active", true).order("sort_order"),
  ]);
  return (
    <>
      <PageHeader eyebrow="Content" title="Categories & contribution tasks" description="Manage content categories and the source sentences offered to translators." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Content categories</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ul className="divide-y divide-line">
              {(cats ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span><span className={c.is_active ? "font-medium text-navy-900" : "text-slate-400 line-through"}>{c.name}</span><span className="ml-2 text-xs text-slate-400">{c.applies_to.map((t: string) => TYPE_LABELS[t as keyof typeof TYPE_LABELS]).join(", ")}</span></span>
                  <ActionButton size="sm" variant="ghost" action={toggleCategory.bind(null, c.id, !c.is_active)} success="Category updated">{c.is_active ? "Disable" : "Enable"}</ActionButton>
                </li>
              ))}
            </ul>
            <ActionForm action={createCategory} success="Category added" className="space-y-3 rounded-xl bg-mist p-3">
              <div className="grid gap-3 sm:grid-cols-2"><Input name="key" placeholder="key (e.g. sports)" required aria-label="Key" /><Input name="name" placeholder="Name" required aria-label="Name" /></div>
              <Input name="description" placeholder="Description" aria-label="Description" />
              <div className="flex flex-wrap gap-3 text-sm">{Object.entries(TYPE_LABELS).map(([k, v]) => <label key={k} className="flex items-center gap-1.5"><input type="checkbox" name="applies_to" value={k} className="accent-forest-700" /> {v}</label>)}</div>
              <Button type="submit" size="sm">Add category</Button>
            </ActionForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Translation tasks (source sentences)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ActionForm action={createSource} success="Sentences added" className="space-y-3 rounded-xl bg-mist p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select name="language_id" aria-label="Source language">{(langs ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
                <Input name="domain" placeholder="Domain (e.g. health)" aria-label="Domain" />
              </div>
              <Textarea name="text" rows={4} placeholder="One sentence per line. Use human-written source text only." aria-label="Sentences" />
              <Button type="submit" size="sm">Add sentences</Button>
            </ActionForm>
            <ul className="max-h-[28rem] divide-y divide-line overflow-y-auto">
              {(sources ?? []).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className={s.is_active ? "" : "text-slate-400 line-through"}>{truncate(s.text, 70)} <Badge className="ml-1">{s.languages?.name}</Badge></span>
                  <ActionButton size="sm" variant="ghost" action={toggleSource.bind(null, s.id, !s.is_active)} success="Task updated">{s.is_active ? "Retire" : "Restore"}</ActionButton>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
