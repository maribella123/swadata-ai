"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/admin/controls";
import { updateSetting } from "../actions";

export function SettingRow({ settingKey, value }: { settingKey: string; value: string }) {
  const [v, setV] = useState(value);
  return (
    <div className="flex gap-2">
      <Input value={v} onChange={(e) => setV(e.target.value)} className="font-mono" aria-label={settingKey} />
      <ActionButton variant="outline" disabled={v === value} action={() => updateSetting(settingKey, v)} success="Setting saved">Save</ActionButton>
    </div>
  );
}
