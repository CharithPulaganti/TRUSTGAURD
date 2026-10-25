import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Shell } from '@/components/shell';
import {
  AboutPage, AnalyzeChooserPage, AnalyzerPage, DigitalArrestPage, HistoryPage, HomePage,
  HowItWorksPage, PrivacyPage, ResultsPage, SettingsPage,
} from '@/pages/pages';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

const MessageAnalyzer = () => <AnalyzerPage kind="message" />;
const UrlAnalyzer = () => <AnalyzerPage kind="url" />;
const DocumentAnalyzer = () => <AnalyzerPage kind="document" />;
const QrAnalyzer = () => <AnalyzerPage kind="qr" />;
const VoiceAnalyzer = () => <AnalyzerPage kind="voice" />;

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Shell>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/analyze" component={AnalyzeChooserPage} />
          <Route path="/analyze/message" component={MessageAnalyzer} />
          <Route path="/analyze/url" component={UrlAnalyzer} />
          <Route path="/analyze/document" component={DocumentAnalyzer} />
          <Route path="/analyze/qr" component={QrAnalyzer} />
          <Route path="/analyze/voice" component={VoiceAnalyzer} />
          <Route path="/digital-arrest" component={DigitalArrestPage} />
          <Route path="/results/:analysisId" component={ResultsPage} />
          <Route path="/history" component={HistoryPage} />
          <Route path="/how-it-works" component={HowItWorksPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
