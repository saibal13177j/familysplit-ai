import { useCallback, useEffect, useState } from 'react';
import { getGroupBalances } from '../services/balances/index.js';

export function useBalances(groupId) {
  const [data, setData] = useState({ balances: [], suggestions: [], totalExpenses: 0, expenseCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getGroupBalances(groupId);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load balances.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...data, loading, error, reload };
}
