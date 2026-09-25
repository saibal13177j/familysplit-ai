import { useCallback, useEffect, useState } from 'react';
import * as groupsApi from '../services/groups.js';
import { useAuth } from './useAuth.jsx';

export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await groupsApi.listMyGroups();
      setGroups(data);
    } catch (err) {
      setError(err.message || 'Failed to load groups.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createGroup = useCallback(
    async ({ name, description }) => {
      const group = await groupsApi.createGroup({ name, description, userId: user.id });
      await reload();
      return group;
    },
    [user, reload]
  );

  const leaveGroup = useCallback(
    async (groupId) => {
      await groupsApi.leaveGroup(groupId, user.id);
      await reload();
    },
    [user, reload]
  );

  return { groups, loading, error, reload, createGroup, leaveGroup };
}
