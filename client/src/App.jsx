import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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

const RoleRouter = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'DONOR') return <DonorDashboard />;
  if (user.role === 'NGO') return <NGODashboard />;
  if (user.role === 'AGENT') return <AgentDashboard />;
  if (user.role === 'ADMIN') return <AdminDashboard />;
  return <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<RoleRouter />} />
          <Route path="/donor/create-listing" element={<CreateListing />} />
          <Route path="/ngo/profile" element={<NGOProfile />} />
          <Route path="/agent/profile" element={<AgentProfile />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;