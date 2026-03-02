'use client';
import { useEffect, useState } from 'react';
import { loadFromCloud } from './cloud-sync';
import { getProperties, getBookings, getBlockedDates, loadCloudData } from './store';
import { Property, Booking, BlockedDate } from '@/types';

export function useCloudSync() {
  const [loaded, setLoaded] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'loading' | 'synced' | 'offline' | 'local'>('loading');

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // First, load from localStorage (instant)
      const localProps = getProperties();
      const localBookings = getBookings();
      const localBlocked = getBlockedDates();

      // Then try to load from cloud
      const cloud = await loadFromCloud();

      if (cancelled) return;

      if (cloud) {
        const cloudHasData = cloud.properties.length > 0;
        const localHasData = localProps.length > 0;

        if (cloudHasData) {
          // Cloud has data — use it (cloud is source of truth)
          // But preserve any local guest name edits that aren't in cloud
          const mergedBookings = mergeBookings(
            cloud.bookings as Booking[],
            localBookings
          );
          loadCloudData(
            cloud.properties as Property[],
            mergedBookings,
            cloud.blockedDates as BlockedDate[]
          );
          setCloudStatus('synced');
        } else if (localHasData) {
          // Cloud is empty but local has data — push local to cloud (first-time sync)
          const { pushToCloud } = await import('./cloud-sync');
          await pushToCloud(localProps, localBookings, localBlocked);
          setCloudStatus('synced');
        } else {
          // Both empty — nothing to do
          setCloudStatus('synced');
        }
      } else {
        // Cloud unavailable — use local data
        setCloudStatus(localProps.length > 0 ? 'offline' : 'local');
      }

      setLoaded(true);
    }

    init();
    return () => { cancelled = true; };
  }, []);

  return { loaded, cloudStatus };
}

// Merge cloud bookings with local edits (e.g., guest name changes)
function mergeBookings(cloudBookings: Booking[], localBookings: Booking[]): Booking[] {
  const merged = [...cloudBookings];

  // For each local booking, check if it has a different guestName than the cloud version
  for (const local of localBookings) {
    const cloudIdx = merged.findIndex(b => b.uid === local.uid || b.id === local.id);
    if (cloudIdx >= 0) {
      // If local has a custom guest name (edited by user), prefer it
      if (local.guestName && local.guestName !== 'Guest' && local.guestName !== 'Reserved' &&
          local.guestName !== merged[cloudIdx].guestName) {
        merged[cloudIdx].guestName = local.guestName;
      }
    }
  }

  return merged;
}
