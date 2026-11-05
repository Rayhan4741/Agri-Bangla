import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Spinner } from '@/components/common/ui';
import HomePage from '@/pages/HomePage';
import { ServerProvider, useServer } from '@/context/ServerContext';

// HashRouter keeps every route working on any static host (no server rewrites needed).
const AssistantPage = lazy(() => import('@/pages/AssistantPage'));
const CropsPage = lazy(() => import('@/pages/CropsPage'));
const CropDetailPage = lazy(() => import('@/pages/CropDetailPage'));
const DiseasesPage = lazy(() => import('@/pages/DiseasesPage'));
const FertilizerPage = lazy(() => import('@/pages/FertilizerPage'));
const WeatherPage = lazy(() => import('@/pages/WeatherPage'));
const LivestockPage = lazy(() => import('@/pages/LivestockPage'));
const FisheriesPage = lazy(() => import('@/pages/FisheriesPage'));
const MarketPage = lazy(() => import('@/pages/MarketPage'));
const CalculatorPage = lazy(() => import('@/pages/CalculatorPage'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const ResourcesPage = lazy(() => import('@/pages/ResourcesPage'));
const LearnPage = lazy(() => import('@/pages/LearnPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));

function PageLoader() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-cream pt-24">
      <Spinner />
    </div>
  );
}

function AppRoutes() {
  // remount pages once if live content from the server differs from the bundled copy
  const { contentVersion } = useServer();
  return (
    <Routes key={contentVersion}>
      <Route path="/" element={<HomePage />} />
      <Route path="/ai-assistant" element={<AssistantPage />} />
      <Route path="/crops" element={<CropsPage />} />
      <Route path="/crops/:slug" element={<CropDetailPage />} />
      <Route path="/diseases" element={<DiseasesPage />} />
      <Route path="/fertilizer" element={<FertilizerPage />} />
      <Route path="/weather" element={<WeatherPage />} />
      <Route path="/livestock" element={<LivestockPage />} />
      <Route path="/fisheries" element={<FisheriesPage />} />
      <Route path="/market" element={<MarketPage />} />
      <Route path="/calculator" element={<CalculatorPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/resources" element={<ResourcesPage />} />
      <Route path="/learn" element={<LearnPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ServerProvider>
      <HashRouter>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <AppRoutes />
          </Suspense>
        </Layout>
      </HashRouter>
    </ServerProvider>
  );
}
