import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { VacanciesPage } from '@/pages/VacanciesPage'
import { InterviewPage } from '@/pages/InterviewPage'
import { ReportPage } from '@/pages/ReportPage'
import { LoginPage } from '@/pages/LoginPage'
import { VerifyEmailPage } from '@/pages/VerifyEmailPage'
import { VerifyEmailChangePage } from '@/pages/VerifyEmailChangePage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { AccountPage } from '@/pages/AccountPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { GuestRoute } from '@/components/auth/GuestRoute'
import { AdminPage } from '@/pages/AdminPage'
import { ProviderAccessPage } from '@/pages/ProviderAccessPage'
import { TopicsPage } from '@/pages/TopicsPage'
import { TopicPage } from '@/pages/TopicPage'
import { HomeRedirect } from '@/components/auth/HomeRedirect'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-email-change" element={<VerifyEmailChangePage />} />

        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomeRedirect />} />
          {/* Без провайдера: мок-вакансії */}
          <Route path="/vacancies" element={<VacanciesPage />} />
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="/provider/:slug/vacancies" element={<VacanciesPage />} />
          <Route path="/provider/:slug/interview" element={<InterviewPage />} />
          <Route path="/topics" element={<TopicsPage />} />
          <Route path="/provider/:slug/topics" element={<TopicsPage />} />
          <Route path="/provider/:slug/topics/:id" element={<TopicPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['super_admin']} />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['super_admin', 'provider_admin']} />}>
          <Route path="/provider/:slug/access" element={<ProviderAccessPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
