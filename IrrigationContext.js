import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IrrigationContext = createContext(null);

const STORAGE_KEYS = {
  CLIENTS: '@tubewell:clients',
  RECORDS: '@tubewell:records',
  SETTINGS: '@tubewell:settings',
  SYNC_QUEUE: '@tubewell:sync_queue',
  LAST_SYNC_TIME: '@tubewell:last_sync_time',
  ACTIVE_SESSIONS: '@tubewell:active_sessions',
  THEME: '@tubewell:theme',
};

const generateId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const IrrigationProvider = ({ children }) => {
  const [clients, setClients] = useState([]);
  const [records, setRecords] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]); // Running sessions
  const [settings, setSettings] = useState({
    rupeePerHour: 150,
    serverUrl: 'http://localhost:3000',
  });
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  const [syncQueue, setSyncQueue] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data from AsyncStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedClients = await AsyncStorage.getItem(STORAGE_KEYS.CLIENTS);
        const storedRecords = await AsyncStorage.getItem(STORAGE_KEYS.RECORDS);
        const storedSessions = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSIONS);
        const storedSettings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
        const storedTheme = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
        const storedQueue = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
        const storedSyncTime = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);

        if (storedClients) setClients(JSON.parse(storedClients));
        if (storedRecords) setRecords(JSON.parse(storedRecords));
        if (storedSessions) setActiveSessions(JSON.parse(storedSessions));
        if (storedSettings) setSettings(JSON.parse(storedSettings));
        if (storedTheme) setTheme(storedTheme);
        if (storedQueue) setSyncQueue(JSON.parse(storedQueue));
        if (storedSyncTime) setLastSyncTime(storedSyncTime);
      } catch (e) {
        console.error('Failed to load local database:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Sync data with the backend
  const syncData = async (forcedUrl = null) => {
    const activeUrl = forcedUrl || settings.serverUrl;
    if (!isOnline) {
      console.log('Sync skipped: Client is offline.');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      console.log('Syncing starting...', { lastSyncTime, queueLength: syncQueue.length });
      
      const response = await fetch(`${activeUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastSyncTime,
          queue: syncQueue,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync server responded with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const { clients: serverClients, records: serverRecords, activeSessions: serverSessions, settings: serverSettings } = result.updates;
        const nowISO = result.serverTime;

        // Merge Clients
        setClients((prev) => {
          const updated = [...prev];
          serverClients.forEach((serverItem) => {
            const idx = updated.findIndex((c) => c._id === serverItem._id);
            if (idx === -1) {
              updated.push(serverItem);
            } else {
              const current = updated[idx];
              if (new Date(serverItem.updatedAt) > new Date(current.updatedAt || 0)) {
                updated[idx] = serverItem;
              }
            }
          });
          AsyncStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(updated));
          return updated;
        });

        // Merge Records
        setRecords((prev) => {
          const updated = [...prev];
          serverRecords.forEach((serverItem) => {
            const idx = updated.findIndex((r) => r._id === serverItem._id);
            if (idx === -1) {
              updated.push(serverItem);
            } else {
              const current = updated[idx];
              if (new Date(serverItem.updatedAt) > new Date(current.updatedAt || 0)) {
                updated[idx] = serverItem;
              }
            }
          });
          AsyncStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updated));
          return updated;
        });

        // Merge Active Sessions (handle soft deletions)
        if (serverSessions) {
          setActiveSessions((prev) => {
            let updated = [...prev];
            serverSessions.forEach((serverItem) => {
              const idx = updated.findIndex((s) => s._id === serverItem._id);
              if (serverItem.deleted) {
                // Remove if soft-deleted
                updated = updated.filter((s) => s._id !== serverItem._id);
              } else {
                if (idx === -1) {
                  updated.push(serverItem);
                } else {
                  const current = updated[idx];
                  if (new Date(serverItem.updatedAt) > new Date(current.updatedAt || 0)) {
                    updated[idx] = serverItem;
                  }
                }
              }
            });
            AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSIONS, JSON.stringify(updated));
            return updated;
          });
        }

        // Merge Settings
        if (serverSettings) {
          setSettings((prev) => {
            const updated = { ...prev, ...serverSettings };
            AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
            return updated;
          });
        }

        // Clean sync queue
        setSyncQueue([]);
        await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify([]));

        // Save last sync time
        setLastSyncTime(nowISO);
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, nowISO);
        
        console.log('Sync completed successfully at:', nowISO);
      } else {
        throw new Error(result.error || 'Unknown sync error');
      }
    } catch (err) {
      console.warn('Sync Failed:', err.message);
      setSyncError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isOnline && !isLoading) {
      syncData();
    }
  }, [isOnline, isLoading]);

  // Toggle Theme Switch
  const toggleTheme = async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, nextTheme);
  };

  // Create Client
  const addClient = async (name, phone) => {
    const nowISO = new Date().toISOString();
    const newClient = {
      _id: generateId('client'),
      name,
      phone,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    const updatedClients = [...clients, newClient];
    setClients(updatedClients);

    const newOp = { type: 'UPSERT_CLIENT', data: newClient, timestamp: Date.now() };
    const updatedQueue = [...syncQueue, newOp];
    setSyncQueue(updatedQueue);

    await AsyncStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(updatedClients));
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(updatedQueue));

    syncData();
    return newClient;
  };

  // Update Client
  const updateClient = async (clientId, updates) => {
    const nowISO = new Date().toISOString();
    let updatedClient = null;

    const updatedClients = clients.map((c) => {
      if (c._id === clientId) {
        updatedClient = { ...c, ...updates, updatedAt: nowISO };
        return updatedClient;
      }
      return c;
    });

    if (updatedClient) {
      setClients(updatedClients);

      const newOp = { type: 'UPDATE_CLIENT', data: updatedClient, timestamp: Date.now() };
      const updatedQueue = [...syncQueue, newOp];
      setSyncQueue(updatedQueue);

      await AsyncStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(updatedClients));
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(updatedQueue));

      syncData();
    }
    return updatedClient;
  };

  // Delete Client (Soft Delete)
  const deleteClient = async (clientId) => {
    const nowISO = new Date().toISOString();
    let deletedClient = null;

    const updatedClients = clients.map((c) => {
      if (c._id === clientId) {
        deletedClient = { ...c, deleted: true, updatedAt: nowISO };
        return deletedClient;
      }
      return c;
    });

    if (deletedClient) {
      setClients(updatedClients);

      const newOp = { type: 'DELETE_CLIENT', data: { _id: clientId }, timestamp: Date.now() };
      const updatedQueue = [...syncQueue, newOp];
      setSyncQueue(updatedQueue);

      await AsyncStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(updatedClients));
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(updatedQueue));

      syncData();
    }
  };

  // Create Irrigation Log (Supports amountPaid V2 field)
  const addRecord = async (clientId, cropName, date, startTime, stopTime, durationHours, optionalAmountPaid = 0) => {
    const nowISO = new Date().toISOString();
    const rate = settings.rupeePerHour;
    const amount = parseFloat(durationHours) * rate;

    const newRecord = {
      _id: generateId('rec'),
      clientId,
      cropName,
      date,
      startTime,
      stopTime,
      durationHours: parseFloat(durationHours),
      ratePerHour: rate,
      totalAmount: amount,
      amountPaid: parseFloat(optionalAmountPaid) || 0,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);

    const newOp = { type: 'UPSERT_RECORD', data: newRecord, timestamp: Date.now() };
    const updatedQueue = [...syncQueue, newOp];
    setSyncQueue(updatedQueue);

    await AsyncStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updatedRecords));
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(updatedQueue));

    syncData();
    return newRecord;
  };

  // Toggle record status between fully paid and unpaid
  const toggleRecordPaidStatus = async (recordId) => {
    const nowISO = new Date().toISOString();
    let updatedRecord = null;
    
    const updatedRecords = records.map((r) => {
      if (r._id === recordId) {
        const isPaid = r.amountPaid >= r.totalAmount;
        updatedRecord = {
          ...r,
          amountPaid: isPaid ? 0 : r.totalAmount, // Flip to fully paid or completely unpaid
          updatedAt: nowISO,
        };
        return updatedRecord;
      }
      return r;
    });

    if (!updatedRecord) return;

    setRecords(updatedRecords);

    const newOp = { type: 'UPSERT_RECORD', data: updatedRecord, timestamp: Date.now() };
    const updatedQueue = [...syncQueue, newOp];
    setSyncQueue(updatedQueue);

    await AsyncStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updatedRecords));
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(updatedQueue));

    syncData();
  };

  // V2 FEATURE: Log general payment and allocate oldest-first
  const logClientPayment = async (clientId, paymentAmount) => {
    let amountLeft = parseFloat(paymentAmount) || 0;
    if (amountLeft <= 0) return;

    const nowISO = new Date().toISOString();
    const ops = [];

    // Filter unpaid records for this client and sort by date oldest first
    const clientRecords = records
      .filter((r) => r.clientId === clientId && (r.amountPaid || 0) < r.totalAmount)
      .sort((a, b) => a.date.localeCompare(b.date));

    const updatedRecords = records.map((r) => {
      // Find matching item in records list to update
      const targetIndex = clientRecords.findIndex((cr) => cr._id === r._id);
      if (targetIndex !== -1 && amountLeft > 0) {
        const remaining = r.totalAmount - (r.amountPaid || 0);
        let updatedPaid = r.amountPaid || 0;

        if (amountLeft >= remaining) {
          updatedPaid = r.totalAmount;
          amountLeft -= remaining;
        } else {
          updatedPaid += amountLeft;
          amountLeft = 0;
        }

        const updated = {
          ...r,
          amountPaid: updatedPaid,
          updatedAt: nowISO,
        };
        ops.push({ type: 'UPSERT_RECORD', data: updated, timestamp: Date.now() });
        return updated;
      }
      return r;
    });

    setRecords(updatedRecords);

    const updatedQueue = [...syncQueue, ...ops];
    setSyncQueue(updatedQueue);

    await AsyncStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updatedRecords));
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(updatedQueue));

    syncData();
  };

  // Mark all records of a client as paid
  const markClientAllRecordsPaid = async (clientId) => {
    const nowISO = new Date().toISOString();
    const ops = [];
    
    const updatedRecords = records.map((r) => {
      if (r.clientId === clientId && (r.amountPaid || 0) < r.totalAmount) {
        const updatedRecord = { ...r, amountPaid: r.totalAmount, updatedAt: nowISO };
        ops.push({ type: 'UPSERT_RECORD', data: updatedRecord, timestamp: Date.now() });
        return updatedRecord;
      }
      return r;
    });

    if (ops.length === 0) return;

    setRecords(updatedRecords);

    const updatedQueue = [...syncQueue, ...ops];
    setSyncQueue(updatedQueue);

    await AsyncStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updatedRecords));
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(updatedQueue));

    syncData();
  };

  // V2 FEATURE: Start Active Session
  const startActiveSession = async (clientId, cropName, date, startTime) => {
    const nowISO = new Date().toISOString();
    const newSession = {
      _id: generateId('sess'),
      clientId,
      cropName,
      date,
      startTime,
      updatedAt: nowISO,
      deleted: false,
    };

    const updatedSessions = [...activeSessions, newSession];
    setActiveSessions(updatedSessions);

    const newOp = { type: 'UPSERT_ACTIVE_SESSION', data: newSession, timestamp: Date.now() };
    const updatedQueue = [...syncQueue, newOp];
    setSyncQueue(updatedQueue);

    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSIONS, JSON.stringify(updatedSessions));
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(updatedQueue));

    syncData();
    return newSession;
  };

  // V2 FEATURE: Stop Active Session and save finalized record
  const stopActiveSession = async (sessionId, stopTime, durationVal = null) => {
    const nowISO = new Date().toISOString();
    const session = activeSessions.find((s) => s._id === sessionId);
    if (!session) return;

    // 1. Calculate duration
    let duration = 0;
    if (durationVal !== null) {
      duration = parseFloat(durationVal) || 0;
    } else {
      const partsStart = session.startTime.split(':');
      const partsStop = stopTime.split(':');
      if (partsStart.length === 2 && partsStop.length === 2) {
        const hStart = parseInt(partsStart[0], 10) + parseInt(partsStart[1], 10) / 60;
        const hStop = parseInt(partsStop[0], 10) + parseInt(partsStop[1], 10) / 60;
        duration = hStop >= hStart ? hStop - hStart : (24 - hStart) + hStop;
      }
    }

    // 2. Add finalized record
    const rate = settings.rupeePerHour;
    const amount = duration * rate;
    const newRecord = {
      _id: generateId('rec'),
      clientId: session.clientId,
      cropName: session.cropName,
      date: session.date,
      startTime: session.startTime,
      stopTime: stopTime || 'Stopped',
      durationHours: duration,
      ratePerHour: rate,
      totalAmount: amount,
      amountPaid: 0,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);

    // 3. Soft-delete active session locally
    const updatedSessions = activeSessions.filter((s) => s._id !== sessionId);
    setActiveSessions(updatedSessions);

    // 4. Update sync queue
    const ops = [
      { type: 'UPSERT_RECORD', data: newRecord, timestamp: Date.now() },
      { type: 'DELETE_ACTIVE_SESSION', data: { _id: sessionId }, timestamp: Date.now() }
    ];
    const updatedQueue = [...syncQueue, ...ops];
    setSyncQueue(updatedQueue);

    // 5. Persist
    await AsyncStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updatedRecords));
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSIONS, JSON.stringify(updatedSessions));
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(updatedQueue));

    syncData();
  };

  // Save Settings
  const updateSettings = async (newSettings) => {
    const nowISO = new Date().toISOString();
    const updatedSettings = {
      ...settings,
      ...newSettings,
      updatedAt: nowISO,
    };

    setSettings(updatedSettings);

    const newOp = { type: 'UPDATE_SETTINGS', data: updatedSettings, timestamp: Date.now() };
    const updatedQueue = [...syncQueue, newOp];
    setSyncQueue(updatedQueue);

    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(updatedQueue));

    syncData(updatedSettings.serverUrl);
  };

  // Clear App Cache & Reset local database to empty state
  const resetLocalData = async () => {
    await AsyncStorage.clear();
    setClients([]);
    setRecords([]);
    setActiveSessions([]);
    setSyncQueue([]);
    setLastSyncTime(null);
    setSettings({ rupeePerHour: 150, serverUrl: 'http://localhost:3000' });
    setTheme('dark');
    setSyncError(null);
  };

  return (
    <IrrigationContext.Provider
      value={{
        clients,
        records,
        activeSessions,
        settings,
        theme,
        syncQueue,
        lastSyncTime,
        isOnline,
        isSyncing,
        syncError,
        isLoading,
        setIsOnline,
        toggleTheme,
        addClient,
        updateClient,
        deleteClient,
        addRecord,
        toggleRecordPaidStatus,
        logClientPayment,
        markClientAllRecordsPaid,
        startActiveSession,
        stopActiveSession,
        updateSettings,
        syncData,
        resetLocalData,
      }}
    >
      {children}
    </IrrigationContext.Provider>
  );
};

export const useIrrigation = () => {
  const context = useContext(IrrigationContext);
  if (!context) {
    throw new Error('useIrrigation must be used within an IrrigationProvider');
  }
  return context;
};
