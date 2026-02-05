import { client } from './youbase';

const QUEUE_KEY = 'sentinel_offline_queue';
const CACHE_PREFIX = 'sentinel_cache_';

export interface OfflineAction {
  id: string;
  type: 'ISSUE_INFRACTION' | 'SUBMIT_EXPLANATION' | 'RESOLVE_INFRACTION';
  payload: any;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
}

export const offlineManager = {
  isOnline: () => navigator.onLine,

  // Queue Management
  getQueue: (): OfflineAction[] => {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  },

  addToQueue: (type: OfflineAction['type'], payload: any) => {
    const queue = offlineManager.getQueue();
    const action: OfflineAction = {
      id: crypto.randomUUID(),
      type,
      payload,
      timestamp: Date.now(),
      status: 'pending'
    };
    queue.push(action);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return action;
  },

  removeFromQueue: (id: string) => {
    const queue = offlineManager.getQueue().filter(a => a.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  // Data Caching
  cacheData: (key: string, data: any) => {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
        timestamp: Date.now(),
        data
      }));
    } catch (e) {
      console.warn('Failed to cache data', e);
    }
  },

  getCachedData: (key: string) => {
    try {
      const item = localStorage.getItem(CACHE_PREFIX + key);
      if (!item) return null;
      return JSON.parse(item).data;
    } catch {
      return null;
    }
  },

  // Sync Logic
  sync: async () => {
    if (!navigator.onLine) return;

    const queue = offlineManager.getQueue();
    if (queue.length === 0) return;

    for (const action of queue) {
      try {
        if (action.type === 'ISSUE_INFRACTION') {
          await client.api.fetch('/api/infractions', {
            method: 'POST',
            body: JSON.stringify(action.payload)
          });
        } else if (action.type === 'SUBMIT_EXPLANATION') {
          await client.api.fetch(`/api/infractions/${action.payload.infractionId}/explanation`, {
            method: 'POST',
            body: JSON.stringify({ explanation: action.payload.explanation })
          });
        } else if (action.type === 'RESOLVE_INFRACTION') {
          await client.api.fetch(`/api/infractions/${action.payload.infractionId}/resolve`, {
            method: 'PATCH'
          });
        }
        
        offlineManager.removeFromQueue(action.id);
      } catch (err) {
        console.error(`Failed to sync action ${action.id}`, err);
        // Keep in queue to retry later? Or mark as failed?
        // For now, we keep it.
      }
    }
  }
};
