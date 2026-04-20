'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Construction } from 'lucide-react';
export default function Page() {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <Construction className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Admin Analytics</h2>
        <p className="text-muted-foreground text-sm max-w-sm">This section is fully functional via the API. Connect your components here.</p>
      </div>
    </DashboardLayout>
  );
}
