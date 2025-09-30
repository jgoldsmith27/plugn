import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import RootLayout from './components/layout/RootLayout';
import FlowsListPage from './routes/FlowsListPage';
import FlowEditorPage from './routes/FlowEditorPage';
import ConnectionsPage from './routes/ConnectionsPage';
import ModelsPage from './routes/ModelsPage';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/flows" replace /> },
      { path: 'flows', element: <FlowsListPage /> },
      { path: 'flows/:id/editor', element: <FlowEditorPage /> },
      { path: 'connections', element: <ConnectionsPage /> },
      { path: 'models', element: <ModelsPage /> }
    ]
  }
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
    </QueryClientProvider>
  );
}
