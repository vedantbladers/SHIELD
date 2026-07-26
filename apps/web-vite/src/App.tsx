import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";

// Pages
import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Onboard from "@/pages/Onboard";
import Marketplace from "@/pages/Marketplace";
import VendorProfile from "@/pages/VendorProfile";
import DashboardRedirect from "@/pages/DashboardRedirect";

// Buyer Pages
import BuyerDashboard from "@/pages/buyer/BuyerDashboard";
import BuyerDeals from "@/pages/buyer/BuyerDeals";
import BuyerDealDetail from "@/pages/buyer/BuyerDealDetail";
import BuyerMarketplace from "@/pages/buyer/BuyerMarketplace";
import BuyerMessages from "@/pages/buyer/BuyerMessages";
import BuyerPostRequirement from "@/pages/buyer/BuyerPostRequirement";
import BuyerProposals from "@/pages/buyer/BuyerProposals";
import BuyerRequirements from "@/pages/buyer/BuyerRequirements";
import BuyerRequirementDetail from "@/pages/buyer/BuyerRequirementDetail";
import BuyerRequirementEdit from "@/pages/buyer/BuyerRequirementEdit";

// Vendor Pages
import VendorDashboard from "@/pages/vendor/VendorDashboard";
import VendorCertifications from "@/pages/vendor/VendorCertifications";
import VendorDeals from "@/pages/vendor/VendorDeals";
import VendorDealDetail from "@/pages/vendor/VendorDealDetail";
import VendorMessages from "@/pages/vendor/VendorMessages";
import VendorOpportunities from "@/pages/vendor/VendorOpportunities";
import VendorProposals from "@/pages/vendor/VendorProposals";
import VendorTrust from "@/pages/vendor/VendorTrust";

// Moderator Pages
import ModeratorDashboard from "@/pages/moderator/ModeratorDashboard";
import ModeratorActions from "@/pages/moderator/ModeratorActions";
import ModeratorAuditLog from "@/pages/moderator/ModeratorAuditLog";
import ModeratorCertifications from "@/pages/moderator/ModeratorCertifications";
import ModeratorDisputes from "@/pages/moderator/ModeratorDisputes";
import ModeratorUsers from "@/pages/moderator/ModeratorUsers";

// Deal Chat Page
import DealChat from "@/pages/deal/DealChat";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/vendor/:alias" element={<VendorProfile />} />

        {/* Protected Redirect */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          }
        />

        {/* Protected Onboarding */}
        <Route
          path="/onboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Onboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Buyer Routes */}
        <Route
          path="/dashboard/buyer"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <DashboardLayout>
                <BuyerDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/buyer/deals"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <DashboardLayout>
                <BuyerDeals />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/buyer/deals/:id"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <DashboardLayout>
                <BuyerDealDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/buyer/marketplace"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <DashboardLayout>
                <BuyerMarketplace />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/buyer/messages"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <DashboardLayout>
                <BuyerMessages />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/buyer/post-requirement"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <DashboardLayout>
                <BuyerPostRequirement />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/buyer/proposals"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <DashboardLayout>
                <BuyerProposals />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/buyer/requirements"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <DashboardLayout>
                <BuyerRequirements />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/buyer/requirements/:id"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <DashboardLayout>
                <BuyerRequirementDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/buyer/requirements/:id/edit"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <DashboardLayout>
                <BuyerRequirementEdit />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Vendor Routes */}
        <Route
          path="/dashboard/vendor"
          element={
            <ProtectedRoute allowedRoles={["vendor"]}>
              <DashboardLayout>
                <VendorDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/vendor/certifications"
          element={
            <ProtectedRoute allowedRoles={["vendor"]}>
              <DashboardLayout>
                <VendorCertifications />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/vendor/deals"
          element={
            <ProtectedRoute allowedRoles={["vendor"]}>
              <DashboardLayout>
                <VendorDeals />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/vendor/deals/:id"
          element={
            <ProtectedRoute allowedRoles={["vendor"]}>
              <DashboardLayout>
                <VendorDealDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/vendor/messages"
          element={
            <ProtectedRoute allowedRoles={["vendor"]}>
              <DashboardLayout>
                <VendorMessages />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/vendor/opportunities"
          element={
            <ProtectedRoute allowedRoles={["vendor"]}>
              <DashboardLayout>
                <VendorOpportunities />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/vendor/proposals"
          element={
            <ProtectedRoute allowedRoles={["vendor"]}>
              <DashboardLayout>
                <VendorProposals />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/vendor/trust"
          element={
            <ProtectedRoute allowedRoles={["vendor"]}>
              <DashboardLayout>
                <VendorTrust />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Moderator Routes */}
        <Route
          path="/dashboard/moderator"
          element={
            <ProtectedRoute allowedRoles={["moderator"]}>
              <DashboardLayout>
                <ModeratorDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/moderator/actions"
          element={
            <ProtectedRoute allowedRoles={["moderator"]}>
              <DashboardLayout>
                <ModeratorActions />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/moderator/audit-log"
          element={
            <ProtectedRoute allowedRoles={["moderator"]}>
              <DashboardLayout>
                <ModeratorAuditLog />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/moderator/certifications"
          element={
            <ProtectedRoute allowedRoles={["moderator"]}>
              <DashboardLayout>
                <ModeratorCertifications />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/moderator/disputes"
          element={
            <ProtectedRoute allowedRoles={["moderator"]}>
              <DashboardLayout>
                <ModeratorDisputes />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/moderator/users"
          element={
            <ProtectedRoute allowedRoles={["moderator"]}>
              <DashboardLayout>
                <ModeratorUsers />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Deal Chat (Protected to all roles) */}
        <Route
          path="/deal/:id/chat"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DealChat />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
