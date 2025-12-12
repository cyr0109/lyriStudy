import { useState, useEffect } from 'react'
import axios from 'axios'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { History } from './pages/History'
import { SongDetail } from './pages/SongDetail'
import { Vocabulary } from './pages/Vocabulary'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Toaster } from './components/ui/sonner'

// Setup axios default if token exists on load
const token = localStorage.getItem('auth_token');
if (token) {
  axios.defaults.headers.common['x-auth-token'] = token;
}

// Set base URL from env if available (for separate deployment), otherwise default to relative path (for proxy)
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

// Private Route Component
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('auth_token');
  const location = useLocation();

  if (!token) {
    // Redirect to login page but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

import { AnalysisProvider } from './context/AnalysisContext'

function App() {
  return (
    <Router>
      <AnalysisProvider>
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
          {/* Only show Navbar if authenticated (optional, but keeps login clean) */}
          {/* Or we can just show it always. Let's make Navbar somewhat conditional or just let it be. 
              For simplicity, we wrap Navbar inside the protected layout or just let it render. 
              Let's keep it simple: Navbar is always there, but links might not work if backend rejects them.
              Actually, let's wrap the protected pages in a layout that has the Navbar.
          */}
          
          <Routes>
            <Route path="/login" element={
              <div className="flex-1 p-4 sm:p-8">
                 <Login />
              </div>
            } />
            
            <Route path="/register" element={
              <div className="flex-1 p-4 sm:p-8">
                 <Register />
              </div>
            } />
            
            <Route path="/*" element={
              <PrivateRoute>
                <>
                  <Navbar />
                  <main className="flex-1 p-4 sm:p-8">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/history" element={<History />} />
                      <Route path="/song/:id" element={<SongDetail />} />
                      <Route path="/vocabulary" element={<Vocabulary />} />
                    </Routes>
                  </main>
                </>
              </PrivateRoute>
            } />
          </Routes>
          <Toaster />
        </div>
      </AnalysisProvider>
    </Router>
  )
}

export default App