import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [criterios, setCriterios] = useState(null);
  const [rol, setRol] = useState('usuario');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("La aplicación requiere conexión a Supabase (Modo Demo deshabilitado).");
      setLoading(false);
      return;
    }

    const loadData = async (userId) => {
      // Load role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('rol')
        .eq('user_id', userId)
        .single();
      if (roleData) setRol(roleData.rol);

      // Load profile
      let profileData = null;
      const { data: pData } = await supabase
        .from('perfilusuario')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      profileData = pData;

      if (!profileData) {
        const { data: newProfile, error: pErr } = await supabase
          .from('perfilusuario')
          .insert({ 
            user_id: userId, 
            idperfil: crypto.randomUUID(), 
            ubicacion: 'Bolivia', 
            presupuestomax: 300, 
            tipousos: ['streaming'] 
          })
          .select()
          .single();
        if (pErr) console.error("Error al crear perfil por defecto:", pErr);
        profileData = newProfile;
      }

      setPerfil(profileData);

      if (profileData) {
        // Load criteria
        const { data: cData } = await supabase
          .from('criterioponderacion')
          .select('*')
          .eq('idperfil', profileData.idperfil)
          .maybeSingle();
        
        if (cData) {
          setCriterios(cData);
        } else {
          const { data: newCriterios, error: cErr } = await supabase
            .from('criterioponderacion')
            .insert({ 
              idperfil: profileData.idperfil, 
              criteriosseleccionados: ['precio', 'velocidad', 'cobertura'], 
              pesoprecio: 0.61, 
              pesovelocidad: 0.28, 
              pesocobertura: 0.11, 
              pesoestabilidad: 0.00 
            })
            .select()
            .single();
          if (cErr) console.error("Error al crear criterios por defecto:", cErr);
          setCriterios(newCriterios);
        }
      }
    };

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadData(session.user.id);
        }
      } catch (err) {
        console.error("Auth init error", err);
      } finally {
        setLoading(false);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await loadData(newSession.user.id);
        } else {
          setPerfil(null);
          setCriterios(null);
          setRol('usuario');
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    };

    initializeAuth();
  }, []);

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) throw new Error("Supabase no configurado");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email, password) => {
    if (!isSupabaseConfigured) throw new Error("Supabase no configurado");
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { emailRedirectTo: window.location.origin } 
    });
    return { error };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  };

  const resetPassword = async (email) => {
    if (!isSupabaseConfigured) throw new Error("Supabase no configurado");
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const updatePerfil = async (data) => {
    if (!isSupabaseConfigured || !user) throw new Error("No autenticado o DB no configurada");
    const updateData = { ...perfil, ...data, user_id: user.id };
    const { data: updated, error } = await supabase
      .from('perfilusuario')
      .upsert(updateData)
      .select()
      .single();
    if (error) throw error;
    if (!updated) throw new Error('La base de datos no devolvió el perfil actualizado');
    setPerfil(updated);
  };

  const updateCriterios = async (data) => {
    if (!isSupabaseConfigured || !perfil) throw new Error("No autenticado o DB no configurada");
    const updateData = { ...criterios, ...data, idperfil: perfil.idperfil };
    const { data: updated, error } = await supabase
      .from('criterioponderacion')
      .upsert(updateData)
      .select()
      .single();
    if (error) throw error;
    if (!updated) throw new Error('La base de datos no devolvió los criterios actualizados');
    setCriterios(updated);
  };

  if (error) {
    return <div className="p-8 text-red-500 font-bold bg-black min-h-screen">{error}</div>;
  }

  return (
    <AuthContext.Provider value={{
      session, user, perfil, criterios, rol, loading,
      signIn, signUp, signOut, resetPassword, updatePerfil, updateCriterios
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
