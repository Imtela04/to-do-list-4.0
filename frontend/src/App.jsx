import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Dashboard from './pages/home'
import Login from './pages/login'
import Register from './pages/register'

function PrivateRoute({ children }) {
    const token = localStorage.getItem("authToken");
    if (!token) return <Navigate to="/login" />;
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp * 1000 < Date.now()) {
            localStorage.removeItem("authToken");
            return <Navigate to="/login" />;
        }
    } catch {
        return <Navigate to="/login" />;
    }
    return children;
}

export default function App(){
  return(
    <AppProvider>
      <Routes>
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  );     
}

