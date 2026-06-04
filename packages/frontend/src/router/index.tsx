import { createBrowserRouter } from 'react-router-dom';
import { AdminRoute } from '../auth/AdminRoute';
import { HomeRoute } from '../auth/HomeRoute';
import { OidcCallback } from '../auth/OidcCallback';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { PageShell } from '../components/PageShell';
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { InvoiceList } from '../pages/invoices/InvoiceList';
import { InvoiceForm } from '../pages/invoices/InvoiceForm';
import { InvoicePdfPreview } from '../pages/invoices/InvoicePdfPreview';
import { Unauthorized } from '../pages/Unauthorized';

export const router = createBrowserRouter([
  {
    path: '/auth/callback',
    element: <OidcCallback />,
  },
  {
    path: '/unauthorized',
    element: <Unauthorized />,
  },
  {
    path: '/',
    element: <HomeRoute />,
  },
  {
    path: '/invoices',
    element: (
      <ProtectedRoute>
        <PageShell>
          <InvoiceList />
        </PageShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/invoices/new',
    element: (
      <ProtectedRoute>
        <PageShell>
          <InvoiceForm />
        </PageShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/invoices/:id',
    element: (
      <ProtectedRoute>
        <PageShell>
          <InvoiceForm />
        </PageShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/invoices/:id/pdf',
    element: (
      <ProtectedRoute>
        <PageShell>
          <InvoicePdfPreview />
        </PageShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <PageShell>
          <AdminDashboard />
        </PageShell>
      </AdminRoute>
    ),
  },
  {
    path: '/admin/*',
    element: (
      <AdminRoute>
        <PageShell>
          <AdminDashboard />
        </PageShell>
      </AdminRoute>
    ),
  },
]);
