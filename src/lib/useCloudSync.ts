'use client';
import { useEffect, useState } from 'react';
import { loadFromCloud } from './cloud-sync';
import { getProperties, getBookings, getBlockedDates, loadCloudData } from './store';
import { Property, Booking, BlockedDate } from '@/types';

// Session-level singleton: cloud sync only runs once per app session
let sessionSynced = false;
let sessionCloudStatus: 'loading' | 'synced' | 'offline' | 'local' = 'loading';

export function useCloudSync() {
  const [loaded, setLoaded] = useState(sessionSynced);
  const [cloudStatus, setCloudStatus] = useState(sessionCloudStatus);

  useEffect(() => {
    // If already synced this session, just read from localStorage
    if (sessionSynced) {
      setLoaded(true);
      setCloudStatus(sessionCloudStatus);
      return;
    }

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
          // Cloud has data — merge with local edits
          const mergedBookings = mergeBookings(
            cloud.bookings as Booking[],
            localBookings
          );
          loadCloudData(
            cloud.properties as Property[],
            mergedBookings,
            cloud.blockedDates as BlockedDate[]
          );
          sessionCloudStatus = 'synced';
        } else if (localHasData) {
          // Cloud is empty but local has data — push local to cloud
          const { pushToCloud } = await import('./cloud-sync');
          await pushToCloud(localProps, localBookings, localBlocked);
          sessionCloudStatus = 'synced';
        } else {
          sessionCloudStatus = 'synced';
        }
      } else {
        sessionCloudStatus = localProps.length > 0 ? 'offline' : 'local';
      }

      sessionSynced = true;
      setCloudStatus(sessionCloudStatus);
      setLoaded(true);
    }

    init();
    return () => { cancelled = true; };
  }, []);

  return { loaded, cloudStatus };
}

// Merge cloud bookings with local edits (guest name, income, checklist, etc.)
function mergeBookings(cloudBookings: Booking[], localBookings: Booking[]): Booking[] {
  const localByKey = new Map<string, Booking>();
  for (const local of localBookings) {
    if (local.uid) localByKey.set(`uid:${local.uid}`, local);
    if (local.id) localByKey.set(`id:${local.id}`, local);
  }

  const merged = cloudBookings.map(cloud => {
    const local = localByKey.get(`uid:${cloud.uid}`) || localByKey.get(`id:${cloud.id}`);
    if (!local) return cloud;

    const result = { ...cloud };

    // Preserve guest name: prefer local if it's a real name
    const defaultNames = ['guest', 'reserved', 'not available', 'blocked', ''];
    const localNameLower = (local.guestName || '').toLowerCase().trim();
    const cloudNameLower = (cloud.guestName || '').toLowerCase().trim();
    if (!defaultNames.includes(localNameLower)) {
      result.guestName = local.guestName;
    }

    // Preserve income: prefer whichever has a value (local wins ties)
    if (local.income > 0) {
      result.income = local.income;
    }

    // Preserve adults/children
    if (local.adults > 0) {
      result.adults = local.adults;
    }
    if (local.children > 0) {
      result.children = local.children;
    }

    // Preserve checklist
    if (local.checklist && local.checklist.length > 0) {
      result.checklist = local.checklist;
    }

    // Preserve email and phone
    if (local.email) result.email = local.email;
    if (local.phone) result.phone = local.phone;

    return result;
  });

  // Also include any local-only bookings not in cloud
  const cloudUids = new Set(cloudBookings.map(b => b.uid));
  const cloudIds = new Set(cloudBookings.map(b => b.id));
  for (const local of localBookings) {
    if (!cloudUids.has(local.uid) && !cloudIds.has(local.id)) {
      merged.push(local);
    }
  }

  return merged;
}
