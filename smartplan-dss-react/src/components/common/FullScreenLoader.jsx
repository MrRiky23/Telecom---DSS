export default function FullScreenLoader({ mensaje = 'Cargando SmartPlan...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F8FAFC' }}>
      <div style={{ width: '50px', height: '50px', border: '5px solid #E2E8F0', borderTop: '5px solid #3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <p style={{ marginTop: '16px', color: '#475569', fontWeight: '500' }}>{mensaje}</p>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
