import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Chat } from '@/pages/Chat';
import { Explore } from '@/pages/Explore';
import { Insights } from '@/pages/Insights';
import { Home } from '@/pages/Home';

// Create React Query client with optimized defaults for perceived performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale-while-revalidate: show cached data immediately
      staleTime: 60 * 1000, // 60 seconds
      // Keep previous data when refetching - no loading states!
      placeholderData: (previousData) => previousData,
      // Don't refetch on every window focus
      refetchOnWindowFocus: false,
      // Retry with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/settings" element={<Home />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
