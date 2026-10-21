
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';

import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';

import DonorDashboard from './pages/donor/DonorDashboard';
import CreateListing from './pages/donor/CreateListing';

import NGODashboard from './pages/ngo/NGODashboard';
import NGOProfile from './pages/ngo/NGOProfile';

import AgentDashboard from './pages/agent/AgentDashboard';
import AgentProfile from './pages/agent/AgentProfile';

import AdminDashboard from './pages/admin/AdminDashboard';
import ImpactPage from './pages/impactPage';

const RoleRouter = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'DONOR') return <DonorDashboard />;
  if (user.role === 'NGO') return <NGODashboard />;
  if (user.role === 'AGENT') return <AgentDashboard />;
  if (user.role === 'ADMIN') return <AdminDashboard />;

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ThemeToggle />

          <Routes>
            {/* Public pages */}
            <Route path="/" element={<Landing />} />
            <Route path="/impact" element={<ImpactPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Dashboard routing by user role */}
            <Route path="/dashboard" element={<RoleRouter />} />

            {/* Existing role-specific pages */}
            <Route
              path="/donor/create-listing"
              element={<CreateListing />}
            />
            <Route path="/donor/profile" element={<DonorDashboard />} />
            <Route path="/ngo/profile" element={<NGOProfile />} />
            <Route path="/agent/profile" element={<AgentProfile />} />

            {/* Unknown URLs */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
