import { MobileShell } from "@/components/layout/mobile-shell";
import { RecordClient } from "@/components/record/record-client";

export default function RecordPage() {
  return (
    <MobileShell topAction={null}>
      <div className="pb-4">
        <RecordClient />
      </div>
    </MobileShell>
  );
}
