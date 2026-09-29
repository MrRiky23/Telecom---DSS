import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, rolRequerido }) {
  const { session, loading, rol } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#1A1A2E' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(255,255,255,0.1)',
          borderTopColor: 'var(--primary-500, #C85A2A)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (rolRequerido) {
    const isAuthorized = Array.isArray(rolRequerido) 
      ? rolRequerido.includes(rol) 
      : rol === rolRequerido;
      
    if (!isAuthorized) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ff6b6b' }}>
          <h2>403 - Acceso no autorizado para tu rol</h2>
          <p>Tu rol actual es: {rol}</p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
