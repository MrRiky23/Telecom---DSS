import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [criterios, setCriterios] = useState(null);
  const [rol, setRol] = useState('usuario');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Demo mode
      setSession({ access_token: 'demo' });
      setUser({ id: 'demo-user-id', email: 'demo@smartplan.com' });
      setRol('admin');
      setPerfil({ idperfil: 'demo-perfil', ubicacion: 'Demo City', presupuestomax: 1000, tipousos: ['Gaming'] });
      setCriterios({ criteriosseleccionados: ['Precio', 'Velocidad'], pesoprecio: 0.5, pesovelocidad: 0.5, pesocobertura: 0, pesoestabilidad: 0 });
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
        // create default satisfying CHECK (presupuestomax BETWEEN 1 AND 10000)
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
          // create default satisfying CHECK (ROUND(suma, 2) = 1.00)
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
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadData(session.user.id);
      }
      setLoading(false);

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
    if (!isSupabaseConfigured) return { error: null };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email, password) => {
    if (!isSupabaseConfigured) return { error: null };
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { emailRedirectTo: window.location.origin } 
    });
    return { error };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
  };

  const resetPassword = async (email) => {
    if (!isSupabaseConfigured) return { error: null };
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const updatePerfil = async (data) => {
    if (!isSupabaseConfigured || !user) {
      setPerfil(prev => ({ ...prev, ...data }));
      return;
    }
    const updateData = { ...perfil, ...data, user_id: user.id };
    const { data: updated, error } = await supabase
      .from('perfilusuario')
      .upsert(updateData)
      .select()
      .single();
    if (!error && updated) setPerfil(updated);
  };

  const updateCriterios = async (data) => {
    if (!isSupabaseConfigured || !perfil) {
      setCriterios(prev => ({ ...prev, ...data }));
      return;
    }
    const updateData = { ...criterios, ...data, idperfil: perfil.idperfil };
    const { data: updated, error } = await supabase
      .from('criterioponderacion')
      .upsert(updateData)
      .select()
      .single();
    if (!error && updated) setCriterios(updated);
  };

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
