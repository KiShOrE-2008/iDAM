import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { BackNavigationProvider } from '@/context/BackNavigationContext';
import { CapacitorBackButtonHandler } from '@/components/shared/CapacitorBackButtonHandler';

// Page Components
import HomePage from '@/app/page';
import ExplorePage from '@/app/explore/page';
import DashboardPage from '@/app/dashboard/page';
import MyBookingsPage from '@/app/my-bookings/page';
import ListYourSpacePage from '@/app/list-your-space/page';
import LoginPage from '@/app/login/page';
import SignupPage from '@/app/signup/page';
import ForgotPasswordPage from '@/app/forgot-password/page';
import OwnerPage from '@/app/owner/page';
import AboutPage from '@/app/about/page';
import ContactPage from '@/app/contact/page';
import HelpPage from '@/app/help/page';
import ReportIssuePage from '@/app/report-issue/page';
import TermsPage from '@/app/terms/page';
import PrivacyPage from '@/app/privacy/page';
import RefundPolicyPage from '@/app/refund-policy/page';
import OwnerPolicyPage from '@/app/owner-policy/page';
import UserRulesPage from '@/app/user-rules/page';
import FeaturesPage from '@/app/features/page';
import HowItWorksPage from '@/app/how-it-works/page';
import OwnersPage from '@/app/owners/page';
import FaqPage from '@/app/faq/page';
import PrivacyPolicyPage from '@/app/privacy-policy/page';
import CancellationRefundPage from '@/app/cancellation-refund/page';
import AccountDeletionPage from '@/app/account-deletion/page';
import CookiePolicyPage from '@/app/cookie-policy/page';
import AccessibilityPage from '@/app/accessibility/page';
import SecurityPage from '@/app/security/page';
import PrivacyRequestsPage from '@/app/privacy-requests/page';
import { DigitalPassClient } from '@/components/web/DigitalPassClient';
import { NotFoundPage } from '@/components/web/NotFoundPage';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { NetworkStatus } from '@/components/shared/NetworkStatus';
import { useParams } from 'react-router-dom';

function PassRouteWrapper() {
  const { id } = useParams<{ id: string }>();
  return <DigitalPassClient passId={id || ''} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BackNavigationProvider>
          <CapacitorBackButtonHandler />
          <NetworkStatus />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/list-your-space" element={<ListYourSpacePage />} />
            <Route path="/pass/:id" element={<PassRouteWrapper />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/owner" element={<OwnerPage />} />
            <Route path="/owners" element={<OwnersPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/report-issue" element={<ReportIssuePage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/cancellation-refund" element={<CancellationRefundPage />} />
            <Route path="/refund-policy" element={<CancellationRefundPage />} />
            <Route path="/account-deletion" element={<AccountDeletionPage />} />
            <Route path="/cookie-policy" element={<CookiePolicyPage />} />
            <Route path="/accessibility" element={<AccessibilityPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/privacy-requests" element={<PrivacyRequestsPage />} />
            <Route path="/owner-policy" element={<OwnerPolicyPage />} />
            <Route path="/user-rules" element={<UserRulesPage />} />
            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BackNavigationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
