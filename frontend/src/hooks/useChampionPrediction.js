import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import api from '../utils/api';
import { computeTeams } from '../utils/aliveTeams';

// Carga el pronóstico de campeón del usuario + los equipos que siguen con vida.
// Devuelve helpers para guardar (una sola vez, no editable).
export function useChampionPrediction(userId) {
  const [loading, setLoading]       = useState(true);
  const [prediction, setPrediction] = useState(null);
  const [aliveTeams, setAliveTeams] = useState([]);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [{ data: pred }, matchesRes] = await Promise.all([
        supabase.from('champion_predictions').select('*').eq('user_id', userId).maybeSingle(),
        api.get('/matches'),
      ]);
      setPrediction(pred || null);
      setAliveTeams(computeTeams(matchesRes.data || []).alive);
    } catch (e) {
      console.error('useChampionPrediction load error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (payload) => {
    const { data, error } = await supabase
      .from('champion_predictions')
      .insert({ user_id: userId, ...payload })
      .select()
      .single();
    if (error) throw error;
    setPrediction(data);
    return data;
  }, [userId]);

  return { loading, prediction, aliveTeams, save, reload: load };
}
