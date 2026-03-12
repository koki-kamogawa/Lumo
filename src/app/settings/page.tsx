import { MobileShell } from "@/components/layout/mobile-shell";
import { SettingsForm } from "@/components/settings/settings-form";
import { getCurrentUser } from "@/lib/auth/user";
import { getSettingsForUser } from "@/lib/data/queries";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const settings = await getSettingsForUser(user.id);

  return (
    <MobileShell>
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">設定</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            返し方、目的、表示テーマ、画面レイアウトをここで調整できます。
          </p>
        </div>
        <SettingsForm initial={settings} />
      </div>
    </MobileShell>
  );
}
