import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlarmProvider, useAlarm } from './context/AlarmContext';
import { Header } from './components/Navigation/Header';
import { Sidebar } from './components/Navigation/Sidebar';
import { BottomNav } from './components/Navigation/BottomNav';
import { TriggerModal } from './components/Alarm/TriggerModal';
import { DemoModePanel } from './components/Alarm/DemoModePanel';
import { OnboardingModal } from './components/Common/OnboardingModal';

// Pages
import { Home } from './pages/Home';
import { CreateAlarm } from './pages/CreateAlarm';
import { ActiveAlarm } from './pages/ActiveAlarm';
import { SavedPlaces } from './pages/SavedPlaces';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { getUserSettings } from './utils/storage';

const MainContent: React.FC = () => {
  const {
    activePage,
    isArrivedModalOpen,
    activeAlarm,
    stopAlarm,
    snoozeAlarm,
    keepTracking,
  } = useAlarm();

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  useEffect(() => {
    const settings = getUserSettings();
    if (!settings.onboardingCompleted) {
      setIsOnboardingOpen(true);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-white relative overflow-x-hidden">
      {/* Subtle grid texture overlay */}
      <div className="fixed inset-0 bg-subtle-grid pointer-events-none -z-10" />

      {/* Floating Header */}
      <Header />

      {/* Main Page Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-12">
        <Sidebar />

        <main className="w-full">
          {activePage === 'home' && <Home />}
          {activePage === 'create' && <CreateAlarm />}
          {activePage === 'active' && <ActiveAlarm />}
          {activePage === 'saved' && <SavedPlaces />}
          {activePage === 'history' && <History />}
          {activePage === 'settings' && <Settings />}
        </main>
      </div>

      <BottomNav />

      {/* Arrival Trigger Overlay Modal */}
      <TriggerModal
        isOpen={isArrivedModalOpen}
        alarm={activeAlarm}
        onStop={stopAlarm}
        onSnooze={snoozeAlarm}
        onKeepTracking={keepTracking}
      />

      {/* Developer Demo GPS Simulator Panel */}
      <DemoModePanel />

      {/* First-time onboarding modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
};

/**
 * AuthGate: Shows login/register when not authenticated,
 * or the main app when authenticated.
 */
const AuthGate: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  // Show loading spinner during initial auth check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — show auth pages
  if (!isAuthenticated) {
    if (authView === 'register') {
      return <RegisterPage onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onSwitchToRegister={() => setAuthView('register')} />;
  }

  // Authenticated — show the app
  return (
    <AlarmProvider>
      <MainContent />
    </AlarmProvider>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
