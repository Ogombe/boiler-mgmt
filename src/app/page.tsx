'use client';

import { Sidebar, MobileNav } from '@/components/boiler/Sidebar';
import { Dashboard } from '@/components/boiler/Dashboard';
import { ExecutiveDashboard } from '@/components/boiler/ExecutiveDashboard';
import { DailyReportPage } from '@/components/boiler/DailyReport';
import { OperationLogs } from '@/components/boiler/OperationLogs';
import { BoilerCalculations } from '@/components/boiler/BoilerCalculations';
import { WaterChemistry } from '@/components/boiler/WaterChemistry';
import { MaintenanceLogs } from '@/components/boiler/MaintenanceLogs';
import { InspectionRecords } from '@/components/boiler/InspectionRecords';
import { Reports } from '@/components/boiler/Reports';
import { FuelStockPage } from '@/components/boiler/FuelStockPage';
import { AIInsights } from '@/components/boiler/AIInsights';
import { AIAssistant } from '@/components/boiler/AIAssistant';
import { FactoryManagement } from '@/components/boiler/FactoryManagement';
import { BoilerManagement } from '@/components/boiler/BoilerManagement';
import { SettingsPage } from '@/components/boiler/Settings';
import { LoginPage } from '@/components/boiler/LoginPage';
import { useAppStore } from '@/lib/store';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

export default function Home() {
  const { currentPage, showLogin, currentFactoryId, setCurrentPage, hydrate } = useAppStore();

  // Rehydrate auth state from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Show login page if not authenticated
  if (showLogin) {
    return <LoginPage />;
  }

  // Show factory selection if no factory selected
  if (!currentFactoryId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-forest/[0.07]">
            <Building2 className="h-10 w-10 text-forest" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Select a Factory</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              Choose a factory from the dropdown in the sidebar to view its boiler data, or create a new factory from the Factories & Users page.
            </p>
          </div>
          <Button onClick={() => setCurrentPage('factories')} className="bg-forest hover:bg-forest">
            Go to Factory Management
          </Button>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'executive-dashboard': return <ExecutiveDashboard />;
      case 'daily-reports': return <DailyReportPage />;
      case 'operation-logs': return <OperationLogs />;
      case 'boilers': return <BoilerManagement />;
      case 'calculations': return <BoilerCalculations />;
      case 'water-chemistry': return <WaterChemistry />;
      case 'maintenance': return <MaintenanceLogs />;
      case 'inspections': return <InspectionRecords />;
      case 'ai-insights': return <AIInsights />;
      case 'ai-assistant': return <AIAssistant />;
      case 'reports': return <Reports />;
      case 'fuel-stock': return <FuelStockPage />;
      case 'factories': return <FactoryManagement />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav />
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
        <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground mt-auto">
          Boiler Management System — Multi-Factory Operations & Maintenance Tracker
        </footer>
      </div>
    </div>
  );
}