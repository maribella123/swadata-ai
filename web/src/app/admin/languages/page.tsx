import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ActionButton, ActionForm } from "@/components/admin/controls";
import { addVariety, createLanguage, toggleVariety, updateLanguage } from "../actions";

export const metadata: Metadata = { title: "Languages" };

export default async function AdminLanguages() {
  const supabase = await createClient();
  const { data: langs } = await supabase.from("languages").select("*, language_varieties(id, code, name, region, is_active)").order("sort_order");
  const active = (langs ?? []).filter((l) => l.is_active);
  return (
    <>
      <PageHeader eyebrow="Content" title="Languages & varieties" description="Activate languages from the registry when reviewer capacity exists. Identifiers follow BCP-47 and ISO 639-3." />
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
        <Table>
          <THead><TR><TH>Language</TH><TH>Codes</TH><TH>Family</TH><TH>Varieties</TH><TH>Status</TH><TH /></TR></THead>
          <TBody>
            {(langs ?? []).map((l) => (
              <TR key={l.id}>
                <TD><p className="font-medium text-navy-900">{l.name}</p><p className="text-xs text-slate-500">{l.native_name}</p></TD>
                <TD className="font-mono text-xs">{l.code} · {l.iso639_3}</TD>
                <TD className="text-xs text-slate-600">{l.family}</TD>
                <TD className="text-xs">
                  {(l.language_varieties ?? []).map((v) => (
                    <span key={v.id} className="mb-1 mr-1 inline-flex items-center gap-1">
                      <Badge tone={v.is_active ? "success" : "neutral"}>{v.name}</Badge>
                      <ActionButton variant="link" size="sm" className="h-auto text-xs" action={toggleVariety.bind(null, v.id, !v.is_active)} success="Variety updated">{v.is_active ? "hide" : "show"}</ActionButton>
                    </span>
                  ))}
                </TD>
                <TD className="space-x-1">{l.is_active ? <Badge tone="success">Active</Badge> : <Badge>Registry</Badge>}{l.is_priority && <Badge tone="gold">Priority</Badge>}</TD>
                <TD className="space-x-1 whitespace-nowrap text-right">
                  <ActionButton size="sm" variant={l.is_active ? "outline" : "primary"} action={updateLanguage.bind(null, l.id, { is_active: !l.is_active })} success={l.is_active ? "Language deactivated" : "Language activated"} confirmText={l.is_active ? `Deactivate ${l.name}? Contributors will no longer be able to submit in it.` : undefined}>{l.is_active ? "Deactivate" : "Activate"}</ActionButton>
                  <ActionButton size="sm" variant="ghost" action={updateLanguage.bind(null, l.id, { is_priority: !l.is_priority })} success="Priority updated">{l.is_priority ? "Unset priority" : "Set priority"}</ActionButton>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Register a new language</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={createLanguage} success="Language registered (inactive)" className="grid gap-3 sm:grid-cols-2">
              <Input name="name" placeholder="Name (e.g. Kiswahili)" required aria-label="Name" />
              <Input name="native_name" placeholder="Native name" required aria-label="Native name" />
              <Input name="code" placeholder="BCP-47 code (e.g. sw)" required aria-label="BCP-47 code" />
              <Input name="iso639_3" placeholder="ISO 639-3 (e.g. swa)" required aria-label="ISO 639-3" />
              <Input name="family" placeholder="Family" aria-label="Family" />
              <Input name="region" placeholder="Region" aria-label="Region" />
              <Button type="submit" className="sm:col-span-2">Register language</Button>
            </ActionForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Add a language variety</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={addVariety} success="Variety added" className="grid gap-3 sm:grid-cols-2">
              <Select name="language_id" required aria-label="Language" className="sm:col-span-2">{active.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
              <Input name="code" placeholder="Code (e.g. ss-ZA-x-hhohho)" required aria-label="Variety code" />
              <Input name="name" placeholder="Name" required aria-label="Variety name" />
              <Input name="region" placeholder="Region" aria-label="Region" className="sm:col-span-2" />
              <Button type="submit" className="sm:col-span-2">Add variety</Button>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
