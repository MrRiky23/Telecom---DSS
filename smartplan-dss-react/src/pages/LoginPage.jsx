import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login', 'register', 'recover'
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const lockoutUntil = localStorage.getItem('lockout_until');
    if (lockoutUntil && Date.now() < parseInt(lockoutUntil, 10)) {
      const remainingMin = Math.ceil((parseInt(lockoutUntil, 10) - Date.now()) / 60000);
      setError(`Usuario inexistente, contraseña incorrecta o cuenta bloqueada (intenta en ${remainingMin} min).`);
      return;
    }

    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    
    if (err) {
      let attempts = parseInt(localStorage.getItem('login_attempts') || '0', 10) + 1;
      if (attempts >= 5) {
        localStorage.setItem('lockout_until', (Date.now() + 15 * 60 * 1000).toString());
        localStorage.setItem('login_attempts', '0');
        setError('Usuario inexistente, contraseña incorrecta o cuenta bloqueada (intenta en 15 min).');
      } else {
        localStorage.setItem('login_attempts', attempts.toString());
        setError('Usuario inexistente, contraseña incorrecta o cuenta bloqueada');
      }
    } else {
      localStorage.removeItem('login_attempts');
      localStorage.removeItem('lockout_until');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    const { error: err } = await signUp(email, password);
    setLoading(false);
    if (err) {
      setError(err.message || 'Error al registrar usuario');
    } else {
      setMessage('Registro exitoso. Si "Confirm email" está desactivado en Supabase, ya puedes iniciar sesión.');
    }
  };

  const handleRecover = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    await resetPassword(email);
    setLoading(false);
    setMessage('Si el correo existe, recibirás un enlace de recuperación');
  };

  return (
    <div className="login-page-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div className="bubble bubble-1"></div>
      <div className="bubble bubble-2"></div>
      <div className="bubble bubble-3"></div>

      <div className="login-card" style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 'var(--radius-lg, 16px)',
        padding: '2rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        zIndex: 1,
        color: 'white'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, color: 'var(--primary-500, #C85A2A)', fontSize: '2rem', fontWeight: 'bold' }}>
            SmartPlan DSS
          </h1>
          <p style={{ margin: '0.5rem 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
            Plataforma de Decisión Inteligente
          </p>
        </div>

        <div className="tabs" style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <button 
            style={tabStyle(activeTab === 'login')} 
            onClick={() => {setActiveTab('login'); setMessage(''); setError('');}}
          >Iniciar sesión</button>
          <button 
            style={tabStyle(activeTab === 'register')} 
            onClick={() => {setActiveTab('register'); setMessage(''); setError('');}}
          >Registrarse</button>
          <button 
            style={tabStyle(activeTab === 'recover')} 
            onClick={() => {setActiveTab('recover'); setMessage(''); setError('');}}
          >Recuperar</button>
        </div>

        {error && <div style={{ background: 'rgba(255, 0, 0, 0.2)', color: '#ff8a8a', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}
        {message && <div style={{ background: 'rgba(0, 255, 0, 0.1)', color: '#a5ffb0', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>{message}</div>}

        {activeTab === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label style={labelStyle}>Email</label>
              <input 
                id="login-email" 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                style={inputStyle} 
              />
            </div>
            <div className="input-group" style={{ position: 'relative' }}>
              <label style={labelStyle}>Contraseña</label>
              <input 
                id="login-password" 
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                style={inputStyle} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '10px', top: '34px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', outline: 'none'
                }}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <button id="btn-login" type="submit" disabled={loading} style={btnStyle}>
              {loading ? 'Cargando...' : 'Iniciar Sesión'}
            </button>
          </form>
        )}

        {activeTab === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label style={labelStyle}>Email</label>
              <input 
                id="reg-email" 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                style={inputStyle} 
              />
            </div>
            <div className="input-group" title="Mínimo 8 caracteres">
              <label style={labelStyle}>Contraseña (Mínimo 8 caracteres)</label>
              <input 
                id="reg-password" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                minLength={8}
                style={inputStyle} 
              />
            </div>
            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? 'Cargando...' : 'Crear Cuenta'}
            </button>
          </form>
        )}

        {activeTab === 'recover' && (
          <form onSubmit={handleRecover} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label style={labelStyle}>Email</label>
              <input 
                id="reset-email" 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                style={inputStyle} 
              />
            </div>
            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? 'Cargando...' : 'Enviar enlace'}
            </button>
          </form>
        )}

      </div>
      <style>{`
        .bubble {
          position: absolute;
          border-radius: 50%;
          background: rgba(200, 90, 42, 0.15);
          filter: blur(40px);
          animation: float 10s infinite ease-in-out;
        }
        .bubble-1 { width: 300px; height: 300px; top: -100px; left: -100px; }
        .bubble-2 { width: 400px; height: 400px; bottom: -150px; right: -150px; animation-delay: -3s; }
        .bubble-3 { width: 200px; height: 200px; bottom: 20%; left: 15%; animation-delay: -6s; background: rgba(15, 52, 96, 0.4); }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }

        .login-card {
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
}

const tabStyle = (isActive) => ({
  flex: 1,
  padding: '0.75rem 0',
  background: 'none',
  border: 'none',
  borderBottom: isActive ? '2px solid var(--primary-500, #C85A2A)' : '2px solid transparent',
  color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
  cursor: 'pointer',
  fontSize: '0.9rem',
  fontWeight: isActive ? '600' : '400',
  transition: 'all 0.2s ease',
  outline: 'none'
});

const labelStyle = {
  display: 'block',
  marginBottom: '0.5rem',
  fontSize: '0.875rem',
  color: 'rgba(255,255,255,0.8)'
};

const inputStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  color: 'white',
  fontSize: '1rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease'
};

const btnStyle = {
  width: '100%',
  padding: '0.75rem',
  background: 'var(--primary-500, #C85A2A)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: '600',
  cursor: 'pointer',
  marginTop: '0.5rem',
  transition: 'background 0.2s ease, transform 0.1s ease',
};
