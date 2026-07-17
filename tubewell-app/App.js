import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  Clock,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  Phone,
  Search,
  Plus,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Wifi,
  WifiOff,
  User,
  Trash2,
  Check,
  Sun,
  Moon,
  Play,
  Square,
  FileText,
  X,
  HelpCircle,
} from 'lucide-react-native';
import { IrrigationProvider, useIrrigation } from './IrrigationContext';

function IrrigationAppContent() {
  const {
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
  } = useIrrigation();

  const [activeTab, setActiveTab] = useState('home');

  // Dynamic Theme Colors
  const colors = {
    bg: theme === 'dark' ? '#0F0F12' : '#F6F6F9',
    card: theme === 'dark' ? '#141419' : '#FFFFFF',
    border: theme === 'dark' ? '#22222E' : '#E4E4E7',
    textMain: theme === 'dark' ? '#FFFFFF' : '#1F2937',
    textMuted: theme === 'dark' ? '#888888' : '#6B7280',
    inputBg: theme === 'dark' ? '#0F0F12' : '#F9F9FB',
    inputBorder: theme === 'dark' ? '#262633' : '#E5E7EB',
    tabBarBg: theme === 'dark' ? '#0A0A0F' : '#FFFFFF',
    accent: '#10B981',
  };

  // Form input modes
  const [inputMethod, setInputMethod] = useState('times');

  // Input states for New Entry Form (Tab 1)
  const [selectedClientId, setSelectedClientId] = useState('');
  const [cropName, setCropName] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [stopTime, setStopTime] = useState('11:00');
  const [durationInput, setDurationInput] = useState('3.0');
  const [entryError, setEntryError] = useState('');
  const [showClientPicker, setShowClientPicker] = useState(false);

  // Stop Active Session Modal State
  const [sessionToStop, setSessionToStop] = useState(null);
  const [sessionStopTime, setSessionStopTime] = useState('');
  const [sessionDurationInput, setSessionDurationInput] = useState('');
  const [sessionStopMethod, setSessionStopMethod] = useState('times');
  const [sessionStopError, setSessionStopError] = useState('');

  // States for Adding New Client (Tab 2 Modal)
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [clientError, setClientError] = useState('');
  const [editingClientId, setEditingClientId] = useState(null);

  // States for Clients Search & Filter (Tab 2)
  const [clientSearch, setClientSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [clientSort, setClientSort] = useState('name');
  const [selectedClientDetail, setSelectedClientDetail] = useState(null);
  const [paymentInput, setPaymentInput] = useState('');

  // Custom Confirmation Modal Configuration (V3 Protection feature)
  const [confirmConfig, setConfirmConfig] = useState(null); // { title, message, onConfirm }

  // Exporter generation state
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  // Helper: Format currency
  const formatRupee = (value) => {
    const val = parseFloat(value) || 0;
    return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  // Helper: Time Parser
  const formatDuration = (decimalHours) => {
    if (isNaN(decimalHours) || decimalHours == null) return '0hr 0min';
    const hrs = Math.floor(decimalHours);
    const mins = Math.round((decimalHours - hrs) * 60);
    if (hrs === 0) return `${mins}min`;
    if (mins === 0) return `${hrs}hr`;
    return `${hrs}hr ${mins}min`;
  };

  // Helper: Time Parser
  const parseTimeToDecimal = (timeStr) => {
    const parts = timeStr.split(':');
    if (parts.length !== 2) return null;
    const hrs = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);
    if (isNaN(hrs) || isNaN(mins)) return null;
    return hrs + mins / 60;
  };

  // Calculate Form Duration
  let duration = 0;
  if (inputMethod === 'duration') {
    duration = parseFloat(durationInput) || 0;
  } else {
    const startDec = parseTimeToDecimal(startTime);
    const stopDec = parseTimeToDecimal(stopTime);
    if (startDec !== null && stopDec !== null) {
      duration = stopDec >= startDec ? stopDec - startDec : (24 - startDec) + stopDec;
    }
  }

  const estimatedAmount = duration * settings.rupeePerHour;

  // V3 Live calculations inside Stop Active Session modal
  let modalDuration = 0;
  if (sessionToStop) {
    if (sessionStopMethod === 'duration') {
      modalDuration = parseFloat(sessionDurationInput) || 0;
    } else {
      const partsStart = sessionToStop.startTime.split(':');
      const partsStop = sessionStopTime.split(':');
      if (partsStart.length === 2 && partsStop.length === 2) {
        const startDec = parseInt(partsStart[0], 10) + parseInt(partsStart[1], 10) / 60;
        const stopDec = parseInt(partsStop[0], 10) + parseInt(partsStop[1], 10) / 60;
        modalDuration = stopDec >= startDec ? stopDec - startDec : (24 - startDec) + stopDec;
      }
    }
  }
  const modalEstimatedAmount = modalDuration * settings.rupeePerHour;

  // V3 Dynamic Crop Suggestions from History
  const existingCrops = Array.from(new Set(records.map(r => r.cropName).filter(Boolean)));
  const cropSuggestions = cropName.trim()
    ? existingCrops.filter(c => c.toLowerCase().startsWith(cropName.toLowerCase().trim()) && c.toLowerCase() !== cropName.toLowerCase().trim())
    : [];

  // Handle Save Completed Record
  const handleSaveRecord = async () => {
    if (!selectedClientId) {
      setEntryError('Please select a client.');
      return;
    }
    if (!cropName.trim()) {
      setEntryError('Please enter crop name.');
      return;
    }
    if (duration <= 0) {
      setEntryError('Duration must be greater than 0.');
      return;
    }

    try {
      const finalStart = inputMethod === 'duration' ? 'Manual' : startTime;
      const finalStop = inputMethod === 'duration' ? 'Manual' : stopTime;
      
      await addRecord(selectedClientId, cropName.trim(), dateStr, finalStart, finalStop, duration);
      setStopTime('');
      setEntryError('');
    } catch (e) {
      setEntryError('Failed to save record.');
    }
  };

  // Handle Start Live Session
  const handleStartSession = async () => {
    if (!selectedClientId) {
      setEntryError('Select a client to start live irrigation.');
      return;
    }
    if (!cropName.trim()) {
      setEntryError('Enter crop name for live session.');
      return;
    }
    
    try {
      const formattedTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
      await startActiveSession(selectedClientId, cropName.trim(), dateStr, formattedTime);
      setEntryError('');
    } catch (e) {
      setEntryError('Failed to start session.');
    }
  };

  // Handle Stop Live Session Confirm Action
  const triggerStopSessionModal = (session) => {
    const formattedTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    setSessionToStop(session);
    setSessionStopTime(formattedTime);
    setSessionDurationInput('');
    setSessionStopMethod('times');
    setSessionStopError('');
  };

  const handleConfirmStopSession = () => {
    if (!sessionToStop) return;

    let durationVal = null;
    if (sessionStopMethod === 'duration') {
      durationVal = parseFloat(sessionDurationInput);
      if (isNaN(durationVal) || durationVal <= 0) {
        setSessionStopError('Please enter valid hours.');
        return;
      }
    } else {
      if (!sessionStopTime.trim()) {
        setSessionStopError('Please specify stop time.');
        return;
      }
    }

    // V3 CONFIRMATION BEFORE STOPPING
    const client = clients.find(c => c._id === sessionToStop.clientId);
    const clientName = client ? client.name : 'Client';
    setConfirmConfig({
      title: 'Stop & Save Irrigation',
      message: `Stop the live session for ${clientName} (${sessionToStop.cropName})? This will create a completed record of ${formatDuration(modalDuration)} costing ${formatRupee(modalEstimatedAmount)}.`,
      onConfirm: async () => {
        try {
          await stopActiveSession(sessionToStop._id, sessionStopTime, durationVal);
          setSessionToStop(null);
          setSessionStopError('');
        } catch (e) {
          setSessionStopError('Failed to finalize session.');
        }
      }
    });
  };

  // V3 CONFIRMATION Toggles payment status
  const triggerTogglePaidStatus = (recordId, currentPaid, totalAmt) => {
    const isPaid = currentPaid >= totalAmt;
    setConfirmConfig({
      title: isPaid ? 'Mark Record as Unpaid' : 'Mark Record as Fully Paid',
      message: isPaid 
        ? `Are you sure you want to change the status of this record back to Unpaid? This will clear all payment data on this item.`
        : `Are you sure you want to mark this irrigation log as fully paid? This will set amount paid to ${formatRupee(totalAmt)}.`,
      onConfirm: () => toggleRecordPaidStatus(recordId)
    });
  };

  // V3 CONFIRMATION Log Client Payment Receipt
  const triggerLogPayment = () => {
    const amt = parseFloat(paymentInput);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    setConfirmConfig({
      title: 'Log Payment Receipt',
      message: `Log a cash receipt of ${formatRupee(amt)} for ${selectedClientDetail.name}? This will allocate the money to their oldest outstanding dues first.`,
      onConfirm: async () => {
        try {
          await logClientPayment(selectedClientDetail._id, amt);
          setPaymentInput('');
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  // Save Client Account
  const handleSaveClient = async () => {
    if (!newClientName.trim()) {
      setClientError('Enter client name.');
      return;
    }
    if (!newClientPhone.trim() || newClientPhone.length < 10) {
      setClientError('Enter valid 10-digit number.');
      return;
    }

    try {
      if (editingClientId) {
        await updateClient(editingClientId, { name: newClientName.trim(), phone: newClientPhone.trim() });
        if (selectedClientDetail && selectedClientDetail._id === editingClientId) {
          setSelectedClientDetail(prev => ({ ...prev, name: newClientName.trim(), phone: newClientPhone.trim() }));
        }
      } else {
        const created = await addClient(newClientName.trim(), newClientPhone.trim());
        setSelectedClientId(created._id);
      }
      setShowAddClientModal(false);
      setNewClientName('');
      setNewClientPhone('');
      setEditingClientId(null);
      setClientError('');
    } catch (e) {
      setClientError('Failed to save client.');
    }
  };

  const handleDeleteClient = () => {
    if (!selectedClientDetail) return;
    setConfirmConfig({
      title: 'Delete Client',
      message: `Are you sure you want to delete ${selectedClientDetail.name}? This will remove them from the active list.`,
      onConfirm: async () => {
        try {
          await deleteClient(selectedClientDetail._id);
          if (selectedClientId === selectedClientDetail._id) setSelectedClientId('');
          setSelectedClientDetail(null);
        } catch (e) {
          alert('Failed to delete client');
        }
      }
    });
  };

  const openEditClientModal = (client) => {
    setEditingClientId(client._id);
    setNewClientName(client.name);
    setNewClientPhone(client.phone);
    setShowAddClientModal(true);
  };


  // V3 FEATURE: Format Ledger Report Exporter (HTML Exporter)
  const handleGenerateReport = async () => {
    setIsExporting(true);
    setExportMessage('');

    try {
      // Compile stats
      const totalCollected = records.reduce((sum, r) => sum + (r.amountPaid || 0), 0);
      const totalPending = records.reduce((sum, r) => sum + (r.totalAmount - (r.amountPaid || 0)), 0);
      const totalBill = records.reduce((sum, r) => sum + r.totalAmount, 0);

      // Build Clients balances rows
      let clientsRows = '';
      activeClients.forEach((c) => {
        const u = getClientUnpaidBalance(c._id);
        const p = getClientTotalPaid(c._id);
        const t = u + p;
        clientsRows += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: 500;">${c.name}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${c.phone}</td>
            <td style="padding: 8px; border: 1px solid #ddd; color: #10b981; font-weight: bold;">₹${p.toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; color: #ef4444; font-weight: bold;">₹${u.toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">₹${t.toFixed(2)}</td>
          </tr>
        `;
      });

      // Build Records logs rows
      let recordsRows = '';
      records.forEach((r) => {
        const client = clients.find(c => c._id === r.clientId);
        const clientName = client ? client.name : 'Unknown';
        const remaining = r.totalAmount - (r.amountPaid || 0);
        const isPaid = remaining <= 0;
        const statusText = isPaid ? '<span style="color: #10b981; font-weight: bold;">Paid</span>' : remaining < r.totalAmount ? `<span style="color: #f59e0b; font-weight: bold;">Part Paid (₹${remaining.toFixed(0)} due)</span>` : '<span style="color: #ef4444; font-weight: bold;">Unpaid</span>';
        
        recordsRows += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${r.date}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: 500;">${clientName}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${r.cropName}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${r.durationHours} hrs (${r.startTime}-${r.stopTime})</td>
            <td style="padding: 8px; border: 1px solid #ddd;">₹${r.ratePerHour}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">₹${r.totalAmount.toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; color: #10b981;">₹${(r.amountPaid || 0).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; color: #ef4444;">₹${remaining.toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${statusText}</td>
          </tr>
        `;
      });

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tubewell Irrigation Account Ledger Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #f9f9fb; color: #1f2937; margin: 0; padding: 40px; }
    .container { max-width: 1000px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 12px; border: 1px solid #e4e4e7; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
    .title { font-size: 26px; font-weight: 800; color: #111827; margin: 0 0 5px 0; }
    .subtitle { font-size: 14px; color: #6b7280; margin: 0; }
    .stats-grid { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 15px; }
    .stat-card { flex: 1; padding: 15px; background: #f3f4f6; border-radius: 8px; border: 1px solid #e5e7eb; }
    .stat-label { font-size: 10px; font-weight: 800; color: #6b7280; text-transform: uppercase; margin-bottom: 5px; }
    .stat-val { font-size: 20px; font-weight: 800; color: #111827; }
    .section-title { font-size: 18px; font-weight: 700; margin: 30px 0 15px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; color: #111827; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; text-align: left; }
    th { padding: 10px 8px; border: 1px solid #ddd; background: #f9f9fb; color: #374151; font-weight: bold; }
    .footer { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
    @media print {
      body { background-color: #fff; padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">🚰 Tubewell Pro Account Ledger</h1>
      <p class="subtitle">Report Generated on: ${new Date().toLocaleString('en-IN')}</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Billing Invoice</div>
        <div class="stat-val">₹${totalBill.toFixed(2)}</div>
      </div>
      <div class="stat-card" style="border-left: 3px solid #10b981;">
        <div class="stat-label" style="color: #10b981;">Cash Collected</div>
        <div class="stat-val" style="color: #10b981;">₹${totalCollected.toFixed(2)}</div>
      </div>
      <div class="stat-card" style="border-left: 3px solid #ef4444;">
        <div class="stat-label" style="color: #ef4444;">Outstanding Dues</div>
        <div class="stat-val" style="color: #ef4444;">₹${totalPending.toFixed(2)}</div>
      </div>
    </div>

    <h2 class="section-title">Client Receivables Balance</h2>
    <table>
      <thead>
        <tr>
          <th>Client Name</th>
          <th>Phone Number</th>
          <th>Total Paid</th>
          <th>Total Outstanding</th>
          <th>Total Bookings</th>
        </tr>
      </thead>
      <tbody>
        ${clientsRows}
      </tbody>
    </table>

    <h2 class="section-title">Irrigation Audit History</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Client</th>
          <th>Crop</th>
          <th>Duration / Times</th>
          <th>Rate/hr</th>
          <th>Billing Total</th>
          <th>Amount Paid</th>
          <th>Outstanding</th>
          <th>Dues Status</th>
        </tr>
      </thead>
      <tbody>
        ${recordsRows}
      </tbody>
    </table>

    <div class="footer">
      Generated automatically by Tubewell Pro. All calculations are synced offline-first.
    </div>
  </div>
</body>
</html>
      `;

      // 1. Write the file inside the local workspace on the server via Express API
      const serverResponse = await fetch(`${settings.serverUrl}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlContent })
      });

      if (!serverResponse.ok) {
        throw new Error('Sync server failed to write report file.');
      }
      
      const serverResult = await serverResponse.json();

      // 2. Trigger browser download anchor link if running in Web context
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const downloadUrl = URL.createObjectURL(blob);
      const anchorElement = document.createElement('a');
      anchorElement.href = downloadUrl;
      anchorElement.download = 'accounting_report.html';
      document.body.appendChild(anchorElement);
      anchorElement.click();
      document.body.removeChild(anchorElement);
      URL.revokeObjectURL(downloadUrl);

      setExportMessage(`Successfully generated report! File saved to: ${serverResult.path} and downloaded in your browser.`);
    } catch (err) {
      console.warn('Report generation failed:', err.message);
      setExportMessage(`Report compiled, but could not write to local server folder. Downloading file in browser directly.`);
      
      // Fallback: browser download anyway
      try {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const downloadUrl = URL.createObjectURL(blob);
        const anchorElement = document.createElement('a');
        anchorElement.href = downloadUrl;
        anchorElement.download = 'accounting_report.html';
        document.body.appendChild(anchorElement);
        anchorElement.click();
        document.body.removeChild(anchorElement);
        URL.revokeObjectURL(downloadUrl);
      } catch (innerErr) {
        setExportMessage(`Failed to export: ${err.message}`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Filter out deleted clients
  const activeClients = useMemo(() => clients.filter(c => !c.deleted), [clients]);

  // Calculations for outstanding balance per client
  const getClientUnpaidBalance = useCallback((clientId) => {
    return records
      .filter((r) => r.clientId === clientId)
      .reduce((sum, r) => sum + (r.totalAmount - (r.amountPaid || 0)), 0);
  }, [records]);

  const getClientTotalPaid = useCallback((clientId) => {
    return records
      .filter((r) => r.clientId === clientId)
      .reduce((sum, r) => sum + (r.amountPaid || 0), 0);
  }, [records]);

  const getClientUnpaidBalanceCount = useCallback((clientId) => {
    return records.filter((r) => r.clientId === clientId && (r.totalAmount - (r.amountPaid || 0)) > 0).length;
  }, [records]);

  // Stats Computations
  const stats = useMemo(() => {
    const totalEarnings = records.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalPaidEarnings = records.reduce((sum, r) => sum + (r.amountPaid || 0), 0);
    const totalUnpaidDues = records.reduce((sum, r) => sum + (r.totalAmount - (r.amountPaid || 0)), 0);

    const currentMonthStr = new Date().toISOString().substring(0, 7);
    const thisMonthEarnings = records
      .filter((r) => r.date.startsWith(currentMonthStr))
      .reduce((sum, r) => sum + r.totalAmount, 0);

    const clientRevenueMap = {};
    activeClients.forEach((c) => {
      clientRevenueMap[c._id] = { name: c.name, total: getClientTotalPaid(c._id) };
    });
    let highestPayingClient = { name: 'None', total: 0 };
    Object.values(clientRevenueMap).forEach((c) => {
      if (c.total > highestPayingClient.total) highestPayingClient = c;
    });

    const clientOutstandingMap = {};
    activeClients.forEach((c) => {
      clientOutstandingMap[c._id] = { name: c.name, total: getClientUnpaidBalance(c._id) };
    });
    let biggestDefaulter = { name: 'None', total: 0 };
    Object.values(clientOutstandingMap).forEach((c) => {
      if (c.total > biggestDefaulter.total) biggestDefaulter = c;
    });

    const cropDurationMap = {};
    records.forEach((r) => {
      cropDurationMap[r.cropName] = (cropDurationMap[r.cropName] || 0) + r.durationHours;
    });
    const totalCropHours = Object.values(cropDurationMap).reduce((sum, h) => sum + h, 0);
    const cropBreakdowns = Object.entries(cropDurationMap).map(([crop, hours]) => ({
      crop,
      hours,
      percentage: totalCropHours > 0 ? (hours / totalCropHours) * 100 : 0,
    })).sort((a, b) => b.hours - a.hours);

    const getPastMonths = () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        months.push({ label: d.toLocaleString('default', { month: 'short' }), key: d.toISOString().substring(0, 7) });
      }
      return months;
    };
    const pastMonths = getPastMonths();
    const monthlyTrendsData = pastMonths.map((m) => {
      const hours = records.filter((r) => r.date.startsWith(m.key)).reduce((sum, r) => sum + r.durationHours, 0);
      const revenue = records.filter((r) => r.date.startsWith(m.key)).reduce((sum, r) => sum + r.totalAmount, 0);
      return { label: m.label, hours, revenue };
    });
    const maxTrendRevenue = Math.max(...monthlyTrendsData.map((d) => d.revenue), 1);

    return {
      totalEarnings, totalPaidEarnings, totalUnpaidDues, thisMonthEarnings,
      highestPayingClient, biggestDefaulter, cropBreakdowns, monthlyTrendsData, maxTrendRevenue
    };
  }, [records, activeClients, getClientTotalPaid, getClientUnpaidBalance]);

  // ---------------- VIEW ROUTING RENDERS ----------------

  const renderHomeTab = () => {
    const selectedClient = activeClients.find((c) => c._id === selectedClientId);
    const selectedClientName = selectedClient ? selectedClient.name : 'Choose Client';
    
    return (
      <ScrollView style={[styles.tabContent, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
        {/* Sync Indicator Banner */}
        <View style={[styles.bannerRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.networkIndicator}>
            {isOnline ? (
              <View style={[styles.networkDot, styles.onlineDot]} />
            ) : (
              <View style={[styles.networkDot, styles.offlineDot]} />
            )}
            <Text style={[styles.bannerText, { color: colors.textMuted }]}>
              {isOnline ? 'Network Online (Cloud Synced)' : 'Network Offline (Queue Active)'}
            </Text>
          </View>
          {syncQueue.length > 0 && (
            <View style={styles.syncBadge}>
              <Text style={styles.syncBadgeText}>{syncQueue.length} pending</Text>
            </View>
          )}
        </View>

        {/* ACTIVE RUNNING SESSIONS BANNER SECTION (V2 sync showcase) */}
        {activeSessions.filter(s => !s.deleted).length > 0 && (
          <View style={[styles.activeSessionsContainer, { borderColor: colors.accent }]}>
            <Text style={[styles.activeHeaderLabel, { color: colors.accent }]}>⏳ LIVE IRRIGATION SESSIONS</Text>
            {activeSessions.filter(s => !s.deleted).map((session) => {
              const client = clients.find(c => c._id === session.clientId);
              return (
                <View key={session._id} style={[styles.activeSessionRow, { backgroundColor: colors.card }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.activeSessionClient, { color: colors.textMain }]}>{client ? client.name : 'Unknown'}</Text>
                    <Text style={[styles.activeSessionMeta, { color: colors.textMuted }]}>
                      Crop: {session.cropName} • Started: {session.startTime} ({session.date})
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.stopActiveBtn}
                    onPress={() => triggerStopSessionModal(session)}
                  >
                    <Square size={12} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.stopActiveText}>Stop</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Logging Form Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Layers size={18} color="#10B981" />
            <Text style={[styles.cardTitle, { color: colors.textMain }]}>Create Logging Entry</Text>
          </View>

          {/* Form input toggle: times vs duration V2 */}
          <View style={styles.formToggleHeader}>
            <TouchableOpacity
              style={[styles.formToggleBtn, inputMethod === 'times' && styles.formToggleBtnActive]}
              onPress={() => setInputMethod('times')}
            >
              <Text style={[styles.formToggleBtnText, inputMethod === 'times' && { color: '#FFF' }]}>
                By Clock Times
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formToggleBtn, inputMethod === 'duration' && styles.formToggleBtnActive]}
              onPress={() => setInputMethod('duration')}
            >
              <Text style={[styles.formToggleBtnText, inputMethod === 'duration' && { color: '#FFF' }]}>
                By Total Hours
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGrid}>
            {/* Field: Date */}
            <View style={styles.formFieldFull}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Irrigation Date</Text>
              <View style={styles.inputIconWrapper}>
                <Calendar size={15} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textMain }]}
                  placeholder="YYYY-MM-DD"
                  value={dateStr}
                  onChangeText={setDateStr}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* Field: Client Select */}
            <View style={styles.formFieldFull}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Client Name</Text>
              <TouchableOpacity
                style={[styles.pickerSelector, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                onPress={() => setShowClientPicker(true)}
              >
                <User size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
                <Text style={[styles.pickerSelectorText, { color: selectedClientId ? colors.textMain : colors.textMuted }]}>
                  {selectedClientName}
                </Text>
                <Plus size={15} color="#10B981" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>

            {/* Field: Crop */}
            <View style={styles.formFieldFull}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Crop Type</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textMain }]}
                placeholder="e.g. Wheat, Sugarcane, Rice"
                value={cropName}
                onChangeText={setCropName}
                placeholderTextColor={colors.textMuted}
              />
              
              {/* Dynamic Crop suggestions pills V3 */}
              {cropSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {cropSuggestions.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[styles.suggestionPill, { backgroundColor: theme === 'dark' ? '#1E1E26' : '#E5E7EB' }]}
                      onPress={() => setCropName(item)}
                    >
                      <Text style={[styles.suggestionText, { color: colors.accent }]}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Conditional inputs */}
            {inputMethod === 'times' ? (
              <>
                <View style={styles.formFieldHalf}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Start Time</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textMain }]}
                    placeholder="08:00"
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.formFieldHalf}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Stop Time</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textMain }]}
                    placeholder="11:30"
                    value={stopTime}
                    onChangeText={setStopTime}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </>
            ) : (
              <View style={styles.formFieldFull}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Total Duration (Hours)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textMain }]}
                  placeholder="e.g. 3.5, 5"
                  keyboardType="numeric"
                  value={durationInput}
                  onChangeText={setDurationInput}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            )}
          </View>

          {/* Dynamic Estimate Card */}
          <View style={[styles.liveCalculationBanner, { backgroundColor: theme === 'dark' ? '#161620' : '#F3F4F6', borderColor: colors.border }]}>
            <View style={styles.calcRow}>
              <Clock size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.calcText, { color: colors.textMuted }]}>
                Duration: <Text style={{ color: colors.textMain, fontWeight: 'bold' }}>{formatDuration(duration)}</Text>
              </Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={[styles.calcText, { color: colors.textMuted }]}>
                Rate: <Text style={{ color: colors.textMain, fontWeight: 'bold' }}>{formatRupee(settings.rupeePerHour)}/hr</Text>
              </Text>
            </View>
            <View style={styles.amountIndicator}>
              <Text style={styles.amountIndicatorText}>{formatRupee(estimatedAmount)}</Text>
            </View>
          </View>

          {/* V3 PLACEMENT: Error message directly above save/log button */}
          {entryError ? <Text style={[styles.errorText, { marginBottom: 14 }]}>{entryError}</Text> : null}

          {/* Core logger actions */}
          <View style={styles.formActionsRow}>
            {/* Start Live button V2 */}
            <TouchableOpacity style={styles.secondaryFormBtn} onPress={handleStartSession}>
              <Play size={14} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={styles.secondaryFormBtnText}>Start Live</Text>
            </TouchableOpacity>

            {/* Save Completed button */}
            <TouchableOpacity style={[styles.primaryButton, { flex: 1.2 }]} onPress={handleSaveRecord}>
              <Check size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryButtonText}>Save Completed</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent logs */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textMain }]}>Irrigation Ledger Book</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{records.length} logs</Text>
        </View>

        {records.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AlertCircle size={24} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No accounting entries logged yet.</Text>
          </View>
        ) : (
          records.map((item) => {
            const client = activeClients.find((c) => c._id === item.clientId);
            const clientName = client ? client.name : 'Unknown Client';
            
            // Dues V2
            const isFullyPaid = (item.amountPaid || 0) >= item.totalAmount;
            const isPartiallyPaid = (item.amountPaid || 0) > 0 && !isFullyPaid;
            const remainingDues = item.totalAmount - (item.amountPaid || 0);

            return (
              <View key={item._id} style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.logCardMain}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.logClientName, { color: colors.textMain }]}>{clientName}</Text>
                    <View style={styles.logMetaRow}>
                      <Calendar size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                      <Text style={[styles.logMetaText, { color: colors.textMuted }]}>{item.date}</Text>
                      <View style={styles.metaDivider} />
                      <Layers size={12} color={colors.textMuted} style={{ marginRight: 4, marginLeft: 4 }} />
                      <Text style={[styles.logMetaText, { color: colors.textMuted }]}>{item.cropName}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.logAmount, { color: colors.textMain }]}>{formatRupee(item.totalAmount)}</Text>
                    <Text style={styles.logDurationText}>{item.durationHours} hrs</Text>
                  </View>
                </View>
                
                <View style={styles.logFooter}>
                  <Text style={[styles.logTimeSpan, { color: colors.textMuted }]}>
                    Time: {item.startTime} - {item.stopTime} ({formatRupee(item.ratePerHour)}/hr)
                  </Text>
                  
                  {/* V3 Confirmation Wrapper applied on click */}
                  <TouchableOpacity
                    style={[
                      styles.statusToggleBtn, 
                      isFullyPaid ? styles.paidBtn : isPartiallyPaid ? styles.partialBtn : styles.unpaidBtn
                    ]}
                    onPress={() => triggerTogglePaidStatus(item._id, item.amountPaid || 0, item.totalAmount)}
                  >
                    {isFullyPaid ? (
                      <>
                        <CheckCircle2 size={12} color="#10B981" style={{ marginRight: 4 }} />
                        <Text style={styles.paidBtnText}>Paid</Text>
                      </>
                    ) : isPartiallyPaid ? (
                      <>
                        <AlertCircle size={12} color="#F59E0B" style={{ marginRight: 4 }} />
                        <Text style={styles.partialBtnText}>{formatRupee(item.amountPaid)} Paid</Text>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={12} color="#EF4444" style={{ marginRight: 4 }} />
                        <Text style={styles.unpaidBtnText}>Unpaid</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderClientsTab = () => {
    let filteredClients = activeClients.filter((c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.phone.includes(clientSearch)
    );

    if (clientFilter === 'unpaid') {
      filteredClients = filteredClients.filter((c) => getClientUnpaidBalance(c._id) > 0);
    }

    filteredClients.sort((a, b) => {
      if (clientSort === 'balance') {
        return getClientUnpaidBalance(b._id) - getClientUnpaidBalance(a._id);
      }
      return a.name.localeCompare(b.name);
    });

    return (
      <ScrollView style={[styles.tabContent, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Search size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.textMain }]}
              placeholder="Search clients..."
              value={clientSearch}
              onChangeText={setClientSearch}
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <TouchableOpacity
            style={styles.addClientBtn}
            onPress={() => { setEditingClientId(null); setNewClientName(''); setNewClientPhone(''); setShowAddClientModal(true); }}
          >
            <Plus size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterPill, clientFilter === 'all' && { backgroundColor: theme === 'dark' ? '#1E1E26' : '#E5E7EB' }]}
            onPress={() => setClientFilter('all')}
          >
            <Text style={[styles.filterPillText, clientFilter === 'all' && { color: colors.accent }]}>
              All Clients
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, clientFilter === 'unpaid' && { backgroundColor: theme === 'dark' ? '#1E1E26' : '#E5E7EB' }]}
            onPress={() => setClientFilter('unpaid')}
          >
            <Text style={[styles.filterPillText, clientFilter === 'unpaid' && { color: colors.accent }]}>
              With Dues
            </Text>
          </TouchableOpacity>

          <View style={[styles.sortSelector, { backgroundColor: theme === 'dark' ? '#161622' : '#E5E7EB' }]}>
            <TouchableOpacity
              style={[styles.sortPill, clientSort === 'name' && { backgroundColor: theme === 'dark' ? '#2A2A3A' : '#FFFFFF' }]}
              onPress={() => setClientSort('name')}
            >
              <Text style={[styles.sortPillText, { color: colors.textMain }]}>Name</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortPill, clientSort === 'balance' && { backgroundColor: theme === 'dark' ? '#2A2A3A' : '#FFFFFF' }]}
              onPress={() => setClientSort('balance')}
            >
              <Text style={[styles.sortPillText, { color: colors.textMain }]}>Dues</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Catalog */}
        {filteredClients.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Users size={24} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No clients catalogued.</Text>
          </View>
        ) : (
          filteredClients.map((c) => {
            const unpaid = getClientUnpaidBalance(c._id);
            const totalPaid = getClientTotalPaid(c._id);
            
            return (
              <TouchableOpacity
                key={c._id}
                style={[styles.clientCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setSelectedClientDetail(c)}
              >
                <View style={styles.clientDetails}>
                  <Text style={[styles.clientName, { color: colors.textMain }]}>{c.name}</Text>
                  <Text style={[styles.clientPhone, { color: colors.textMuted }]}>{c.phone}</Text>
                  <Text style={styles.clientTotalPaid}>Paid: {formatRupee(totalPaid)}</Text>
                </View>
                <View style={styles.clientActionCol}>
                  <Text style={[styles.clientBalance, unpaid > 0 ? styles.balanceDues : { color: colors.textMuted }]}>
                    {unpaid > 0 ? `${formatRupee(unpaid)} due` : 'Settled'}
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.phoneCircle}
                    onPress={() => handleCall(c.phone)}
                  >
                    <Phone size={14} color="#10B981" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderStatsTab = () => {
    const {
      totalEarnings, totalPaidEarnings, totalUnpaidDues, thisMonthEarnings,
      highestPayingClient, biggestDefaulter, cropBreakdowns, monthlyTrendsData, maxTrendRevenue
    } = stats;
    return (
      <ScrollView style={[styles.tabContent, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
        {/* Metric Boxes Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <DollarSign size={16} color="#10B981" />
            <Text style={[styles.statBoxVal, { color: colors.textMain }]}>{formatRupee(totalEarnings)}</Text>
            <Text style={styles.statBoxLabel}>Total Revenue</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <CheckCircle2 size={16} color="#34D399" />
            <Text style={[styles.statBoxVal, { color: '#34D399' }]}>{formatRupee(totalPaidEarnings)}</Text>
            <Text style={styles.statBoxLabel}>Total Collected</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AlertCircle size={16} color="#EF4444" />
            <Text style={[styles.statBoxVal, { color: '#F87171' }]}>{formatRupee(totalUnpaidDues)}</Text>
            <Text style={styles.statBoxLabel}>Pending Dues</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TrendingUp size={16} color="#3B82F6" />
            <Text style={[styles.statBoxVal, { color: '#60A5FA' }]}>{formatRupee(thisMonthEarnings)}</Text>
            <Text style={styles.statBoxLabel}>This Month</Text>
          </View>
        </View>

        {/* Insights cards */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <TrendingUp size={18} color="#10B981" />
            <Text style={[styles.cardTitle, { color: colors.textMain }]}>Client Performance</Text>
          </View>
          
          <View style={styles.insightRow}>
            <View style={styles.insightCol}>
              <Text style={styles.insightSub}>TOP PAYING CLIENT</Text>
              <Text style={[styles.insightMainVal, { color: colors.textMain }]}>{highestPayingClient.name}</Text>
              <Text style={[styles.insightDesc, { color: colors.textMuted }]}>Paid {formatRupee(highestPayingClient.total)} total</Text>
            </View>
            <View style={[styles.insightDivider, { backgroundColor: colors.border }]} />
            <View style={styles.insightCol}>
              <Text style={styles.insightSub}>LARGEST DEBTOR</Text>
              <Text style={[styles.insightMainVal, { color: '#F87171' }]}>{biggestDefaulter.name}</Text>
              <Text style={[styles.insightDesc, { color: colors.textMuted }]}>Owes {formatRupee(biggestDefaulter.total)} dues</Text>
            </View>
          </View>
        </View>

        {/* Revenue trends chart */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <BarChart3 size={18} color="#10B981" />
            <Text style={[styles.cardTitle, { color: colors.textMain }]}>Monthly Revenues</Text>
          </View>
          
          <View style={styles.chartContainer}>
            {monthlyTrendsData.map((m, index) => {
              const pct = (m.revenue / maxTrendRevenue) * 80 + 10;
              return (
                <View key={index} style={styles.chartCol}>
                  <View style={styles.chartBarWrapper}>
                    <Text style={[styles.chartValText, { color: colors.textMain }]}>{formatRupee(m.revenue)}</Text>
                    <View style={[styles.chartBar, { height: `${pct}%` }]} />
                  </View>
                  <Text style={[styles.chartLabelText, { color: colors.textMuted }]}>{m.label}</Text>
                  <Text style={styles.chartHoursText}>{formatDuration(m.hours)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Crops shares */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Layers size={18} color="#10B981" />
            <Text style={[styles.cardTitle, { color: colors.textMain }]}>Crop Shares</Text>
          </View>

          {cropBreakdowns.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No logs to display crop insights.</Text>
          ) : (
            cropBreakdowns.map((crop) => (
              <View key={crop.crop} style={styles.cropProgressRow}>
                <View style={styles.cropLabelRow}>
                  <Text style={[styles.cropText, { color: colors.textMain }]}>{crop.crop}</Text>
                  <Text style={[styles.cropHours, { color: colors.textMuted }]}>
                    {formatDuration(crop.hours)} ({crop.percentage.toFixed(0)}%)
                  </Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: theme === 'dark' ? '#161620' : '#E5E7EB' }]}>
                  <View style={[styles.progressBarFill, { width: `${crop.percentage}%` }]} />
                </View>
              </View>
            ))
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderSettingsTab = () => {
    return (
      <ScrollView style={[styles.tabContent, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
        {/* V3 Exporter Button Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <FileText size={18} color="#10B981" />
            <Text style={[styles.cardTitle, { color: colors.textMain }]}>Export Ledger Book</Text>
          </View>
          <Text style={[styles.cardHelp, { color: colors.textMuted, marginBottom: 12 }]}>
            Generate and download a beautifully formatted HTML report containing all outstanding balances, client cards, and irrigation audit histories.
          </Text>

          {exportMessage ? (
            <Text style={[styles.exportMessageText, { color: colors.textMain, backgroundColor: theme === 'dark' ? '#1E1E26' : '#E5E7EB' }]}>
              {exportMessage}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryButton, isExporting && { opacity: 0.6 }]}
            onPress={handleGenerateReport}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <FileText size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryButtonText}>Generate Accounting Ledger Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Rupee rate */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <SettingsIcon size={18} color="#10B981" />
            <Text style={[styles.cardTitle, { color: colors.textMain }]}>Default Billing Rate</Text>
          </View>
          
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Rate per hour (Rupees)</Text>
          <View style={styles.rateEditorRow}>
            <TextInput
              style={[styles.textInput, { flex: 1, marginRight: 12, fontSize: 18, color: '#10B981', fontWeight: 'bold', backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
              value={String(settings.rupeePerHour)}
              keyboardType="numeric"
              onChangeText={(val) => {
                const parsed = parseInt(val, 10) || 0;
                updateSettings({ rupeePerHour: parsed });
              }}
            />
            <Text style={styles.currencySuffix}>₹ / hour</Text>
          </View>
        </View>

        {/* Sync panel */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Wifi size={18} color="#10B981" />
            <Text style={[styles.cardTitle, { color: colors.textMain }]}>Cloud Database Sync</Text>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Server URL / IP Address</Text>
          <TextInput
            style={[styles.textInput, { marginBottom: 16, backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textMain }]}
            placeholder="http://localhost:3000"
            value={settings.serverUrl}
            onChangeText={(val) => updateSettings({ serverUrl: val })}
            placeholderTextColor={colors.textMuted}
          />

          <View style={[styles.settingSwitchRow, { borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchLabel, { color: colors.textMain }]}>Network Connectivity State</Text>
              <Text style={[styles.cardHelp, { color: colors.textMuted }]}>Simulate device connectivity drops to test local caching.</Text>
            </View>
            <TouchableOpacity
              style={[styles.networkToggleBtn, isOnline ? styles.networkToggleOn : styles.networkToggleOff]}
              onPress={() => setIsOnline(!isOnline)}
            >
              {isOnline ? (
                <>
                  <Wifi size={14} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={styles.networkToggleText}>Online</Text>
                </>
              ) : (
                <>
                  <WifiOff size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.networkToggleText, { color: colors.textMuted }]}>Offline</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.statusBoxRow}>
            <View style={[styles.statusBoxMini, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={[styles.statusBoxMiniVal, { color: colors.textMain }]}>{syncQueue.length}</Text>
              <Text style={[styles.statusBoxMiniLabel, { color: colors.textMuted }]}>Queue Size</Text>
            </View>
            <View style={[styles.statusBoxMini, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={[styles.statusBoxMiniVal, { color: colors.textMain }]}>{lastSyncTime ? 'Active' : 'Never'}</Text>
              <Text style={[styles.statusBoxMiniLabel, { color: colors.textMuted }]}>Last Sync</Text>
            </View>
          </View>

          {syncError && <Text style={[styles.errorText, { marginTop: 12 }]}>Sync Error: {syncError}</Text>}

          <TouchableOpacity
            style={[styles.outlineButton, { borderColor: '#10B981' }, (isSyncing || !isOnline) && { opacity: 0.5 }]}
            onPress={() => syncData()}
            disabled={isSyncing || !isOnline}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <Text style={styles.outlineButtonText}>Force Sync Now</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Dev settings */}
        <View style={[styles.card, { borderColor: '#7F1D1D', backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: '#EF4444', marginBottom: 8 }]}>Developer Zone</Text>
          <Text style={[styles.cardHelp, { color: colors.textMuted }]}>Clears all AsyncStorage state and seeds templates.</Text>
          
          <TouchableOpacity style={styles.dangerButton} onPress={resetLocalData}>
            <Trash2 size={15} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.dangerButtonText}>Reset Cache Data</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // V3 Client picker alphabetical sort
  const sortedClients = [...clients].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={styles.headerSub}>Irrigation Accounting V3</Text>
          <Text style={[styles.headerTitle, { color: colors.textMain }]}>🚰 Tubewell Pro</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Theme Switch */}
          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.themeCircle, { backgroundColor: theme === 'dark' ? '#161620' : '#E5E7EB', marginRight: 8 }]}
          >
            {theme === 'dark' ? (
              <Sun size={16} color="#FBBF24" />
            ) : (
              <Moon size={16} color="#4B5563" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => syncData()}
            style={[styles.syncCircle, { backgroundColor: theme === 'dark' ? '#161620' : '#E5E7EB' }]}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <CheckCircle2 size={20} color={isOnline ? '#10B981' : colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Router */}
      <View style={{ flex: 1 }}>
        {activeTab === 'home' && renderHomeTab()}
        {activeTab === 'clients' && renderClientsTab()}
        {activeTab === 'stats' && renderStatsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </View>

      {/* Segmented Bottom Tab Bar */}
      <View style={[styles.tabBarContainer, { backgroundColor: colors.tabBarBg, borderTopColor: colors.border }]}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'home' && styles.tabItemActive]}
            onPress={() => setActiveTab('home')}
          >
            <Layers size={18} color={activeTab === 'home' ? '#10B981' : colors.textMuted} />
            <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>Logs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'clients' && styles.tabItemActive]}
            onPress={() => setActiveTab('clients')}
          >
            <Users size={18} color={activeTab === 'clients' ? '#10B981' : colors.textMuted} />
            <Text style={[styles.tabLabel, activeTab === 'clients' && styles.tabLabelActive]}>Clients</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'stats' && styles.tabItemActive]}
            onPress={() => setActiveTab('stats')}
          >
            <BarChart3 size={18} color={activeTab === 'stats' ? '#10B981' : colors.textMuted} />
            <Text style={[styles.tabLabel, activeTab === 'stats' && styles.tabLabelActive]}>Stats</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'settings' && styles.tabItemActive]}
            onPress={() => setActiveTab('settings')}
          >
            <SettingsIcon size={18} color={activeTab === 'settings' ? '#10B981' : colors.textMuted} />
            <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabLabelActive]}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal 1: Client Picker Modal (With inline Add Client button V3) */}
      <Modal visible={showClientPicker} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.pickerModalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textMain }]}>Choose Client</Text>
              <TouchableOpacity
                onPress={() => setShowClientPicker(false)}
                style={styles.closeModalBtn}
              >
                <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>

            {/* V3: Inline Add Client button at top of list */}
            <TouchableOpacity
              style={styles.pickerAddClientBtn}
              onPress={() => {
                setShowClientPicker(false);
                setShowAddClientModal(true);
              }}
            >
              <Plus size={16} color="#FFF" style={{ marginRight: 6 }} strokeWidth={3} />
              <Text style={styles.pickerAddClientText}>Create New Client</Text>
            </TouchableOpacity>

            <ScrollView style={{ flex: 1, marginTop: 6 }}>
              {sortedClients.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted, marginBottom: 12 }}>No clients catalogued yet.</Text>
                </View>
              ) : (
                sortedClients.map((c) => (
                  <TouchableOpacity
                    key={c._id}
                    style={[styles.pickerItem, selectedClientId === c._id && styles.pickerItemActive, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setSelectedClientId(c._id);
                      setShowClientPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, { color: colors.textMain }]}>{c.name}</Text>
                    <Text style={styles.pickerItemPhone}>{c.phone}</Text>
                    {selectedClientId === c._id && <Check size={16} color="#10B981" />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Add Client Modal */}
      <Modal visible={showAddClientModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.pickerModalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textMain }]}>{editingClientId ? 'Edit Client' : 'Add New Client'}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddClientModal(false);
                  setClientError('');
                }}
                style={styles.closeModalBtn}
              >
                <Text style={{ color: colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 16 }}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Client Name</Text>
              <TextInput
                style={[styles.textInput, { marginBottom: 16, backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textMain }]}
                placeholder="Full Name"
                value={newClientName}
                onChangeText={setNewClientName}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Phone Number</Text>
              <TextInput
                style={[styles.textInput, { marginBottom: 20, backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textMain }]}
                placeholder="10 digit number"
                keyboardType="phone-pad"
                value={newClientPhone}
                onChangeText={setNewClientPhone}
                maxLength={10}
                placeholderTextColor={colors.textMuted}
              />

              {/* V3: Error message directly above saving button */}
              {clientError ? <Text style={[styles.errorText, { marginBottom: 14 }]}>{clientError}</Text> : null}

              <TouchableOpacity style={styles.primaryButton} onPress={handleSaveClient}>
                <Check size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryButtonText}>Save Client</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 3: Client Details Ledger Modal */}
      <Modal visible={!!selectedClientDetail} animationType="slide" transparent>
        <View style={styles.modalBg}>
          {selectedClientDetail && (
            <View style={[styles.pickerModalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: colors.textMain }]}>{selectedClientDetail.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>Phone: {selectedClientDetail.phone}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    <TouchableOpacity onPress={() => openEditClientModal(selectedClientDetail)} style={{ marginRight: 15, padding: 5, backgroundColor: '#3B82F6', borderRadius: 4 }}>
                      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDeleteClient} style={{ padding: 5, backgroundColor: '#EF4444', borderRadius: 4 }}>
                      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedClientDetail(null)}
                  style={styles.closeModalBtn}
                >
                  <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Close</Text>
                </TouchableOpacity>
              </View>

              {/* Outstanding dues header */}
              <View style={[styles.modalBalanceHighlight, { backgroundColor: theme === 'dark' ? '#1C1C26' : '#F3F4F6', borderColor: colors.border }]}>
                <Text style={styles.modalBalanceLabel}>Outstanding Balance</Text>
                <Text style={[styles.modalBalanceVal, getClientUnpaidBalance(selectedClientDetail._id) > 0 ? { color: '#EF4444' } : { color: '#10B981' }]}>
                  {formatRupee(getClientUnpaidBalance(selectedClientDetail._id))}
                </Text>
              </View>

              {/* V2/V3: Log payment component */}
              {getClientUnpaidBalance(selectedClientDetail._id) > 0 && (
                <View style={[styles.paymentReceiptCard, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted, marginBottom: 8 }]}>Log Payment Receipt</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TextInput
                      style={[styles.textInput, { flex: 1, marginRight: 8, paddingVertical: 6, backgroundColor: colors.card, borderColor: colors.inputBorder, color: colors.textMain }]}
                      placeholder="Amount in Rupees"
                      keyboardType="numeric"
                      value={paymentInput}
                      onChangeText={setPaymentInput}
                      placeholderTextColor={colors.textMuted}
                    />
                    
                    {/* V3 Confirmation modal wrapped payment */}
                    <TouchableOpacity style={styles.applyPaymentBtn} onPress={triggerLogPayment}>
                      <Check size={14} color="#FFF" style={{ marginRight: 4 }} />
                      <Text style={styles.applyPaymentBtnText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <Text style={[styles.fieldLabel, { marginTop: 16, marginBottom: 8, color: colors.textMuted }]}>Irrigation Sessions Book</Text>
              <ScrollView style={{ flex: 1 }}>
                {records.filter(r => r.clientId === selectedClientDetail._id).length === 0 ? (
                  <Text style={{ color: colors.textMuted, textAlign: 'center', padding: 20 }}>No logs recorded for this client.</Text>
                ) : (
                  records
                    .filter((r) => r.clientId === selectedClientDetail._id)
                    .map((item) => {
                      const isPaid = (item.amountPaid || 0) >= item.totalAmount;
                      const remainingDues = item.totalAmount - (item.amountPaid || 0);
                      
                      return (
                        <View key={item._id} style={[styles.ledgerRow, { borderBottomColor: colors.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.ledgerDate, { color: colors.textMain }]}>{item.date} • {item.cropName}</Text>
                            <Text style={[styles.ledgerHours, { color: colors.textMuted }]}>
                              {item.durationHours} hrs ({item.startTime} - {item.stopTime})
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.ledgerAmount, { color: colors.textMain }]}>{formatRupee(item.totalAmount)}</Text>
                            
                            {isPaid ? (
                              <Text style={styles.paidBtnText}>Paid</Text>
                            ) : (
                              <Text style={styles.unpaidBtnText}>
                                {remainingDues !== item.totalAmount ? `${formatRupee(remainingDues)} due` : 'Unpaid'}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {/* Modal 4: Stop Live Session modal (With V3 invoice preview & live calculation details) */}
      <Modal visible={!!sessionToStop} animationType="slide" transparent>
        <View style={styles.modalBg}>
          {sessionToStop && (
            <View style={[styles.pickerModalContent, { height: '70%', backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.textMain }]}>Stop & Finalize Session</Text>
                <TouchableOpacity
                  onPress={() => setSessionToStop(null)}
                  style={styles.closeModalBtn}
                >
                  <Text style={{ color: colors.textMuted }}>Cancel</Text>
                </TouchableOpacity>
              </View>

              {/* Stop input toggler */}
              <View style={[styles.formToggleHeader, { marginTop: 16 }]}>
                <TouchableOpacity
                  style={[styles.formToggleBtn, sessionStopMethod === 'times' && styles.formToggleBtnActive]}
                  onPress={() => setSessionStopMethod('times')}
                >
                  <Text style={[styles.formToggleBtnText, sessionStopMethod === 'times' && { color: '#FFF' }]}>
                    By Stop Time
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formToggleBtn, sessionStopMethod === 'duration' && styles.formToggleBtnActive]}
                  onPress={() => setSessionStopMethod('duration')}
                >
                  <Text style={[styles.formToggleBtnText, sessionStopMethod === 'duration' && { color: '#FFF' }]}>
                    By Total Hours
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 16 }}>
                {sessionStopMethod === 'times' ? (
                  <>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Stop Clock Time</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textMain }]}
                      placeholder="e.g. 11:30"
                      value={sessionStopTime}
                      onChangeText={setSessionStopTime}
                      placeholderTextColor={colors.textMuted}
                    />
                  </>
                ) : (
                  <>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Total Duration in Hours</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textMain }]}
                      placeholder="e.g. 4.5"
                      keyboardType="numeric"
                      value={sessionDurationInput}
                      onChangeText={setSessionDurationInput}
                      placeholderTextColor={colors.textMuted}
                    />
                  </>
                )}

                {/* V3: Live calculation details inside Stop active session modal */}
                <View style={[styles.liveCalculationBanner, { backgroundColor: theme === 'dark' ? '#161620' : '#F3F4F6', borderColor: colors.border, marginTop: 16, marginBottom: 12 }]}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    Calculated Time: <Text style={{ color: colors.textMain, fontWeight: 'bold' }}>{formatDuration(modalDuration)}</Text>
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    Invoice Sum: <Text style={{ color: colors.accent, fontWeight: 'bold' }}>{formatRupee(modalEstimatedAmount)}</Text>
                  </Text>
                </View>

                {/* V3: Stop error message directly above saving button */}
                {sessionStopError ? <Text style={[styles.errorText, { marginBottom: 14 }]}>{sessionStopError}</Text> : null}

                <TouchableOpacity style={styles.primaryButton} onPress={handleConfirmStopSession}>
                  <CheckCircle2 size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryButtonText}>Stop & Save Record</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Modal 5: V3 Reusable Apple-styled Confirmation Modal */}
      <Modal visible={!!confirmConfig} transparent animationType="fade">
        <View style={styles.confirmModalBg}>
          {confirmConfig && (
            <View style={[styles.confirmModalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.confirmHeader}>
                <HelpCircle size={22} color="#F59E0B" />
                <Text style={[styles.confirmTitle, { color: colors.textMain }]}>{confirmConfig.title}</Text>
              </View>
              
              <Text style={[styles.confirmMessage, { color: colors.textMuted }]}>{confirmConfig.message}</Text>
              
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={[styles.confirmBtn, styles.confirmCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setConfirmConfig(null)}
                >
                  <Text style={[styles.confirmCancelText, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmBtn, styles.confirmOkBtn]}
                  onPress={() => {
                    confirmConfig.onConfirm();
                    setConfirmConfig(null);
                  }}
                >
                  <Text style={styles.confirmOkText}>Yes, Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <IrrigationProvider>
      <IrrigationAppContent />
    </IrrigationProvider>
  );
}

// ---------------- STYLES ----------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  headerSub: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  themeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  networkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  onlineDot: {
    backgroundColor: '#10B981',
  },
  offlineDot: {
    backgroundColor: '#888',
  },
  bannerText: {
    fontSize: 12,
  },
  syncBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  syncBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cardHelp: {
    fontSize: 11,
    marginTop: 6,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    padding: 8,
    borderRadius: 6,
    textAlign: 'center',
  },
  formToggleHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  formToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  formToggleBtnActive: {
    backgroundColor: '#10B981',
  },
  formToggleBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10B981',
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  formFieldFull: {
    width: '100%',
    marginBottom: 14,
  },
  formFieldHalf: {
    width: '48%',
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 'bold',
  },
  textInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputIconWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    top: 13,
    zIndex: 1,
  },
  pickerSelector: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerSelectorText: {
    fontSize: 14,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  suggestionPill: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 6,
  },
  suggestionText: {
    fontSize: 11,
  },
  liveCalculationBanner: {
    flexDirection: 'row',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 16,
  },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calcText: {
    fontSize: 12,
  },
  amountIndicator: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderColor: '#10B981',
    borderWidth: 1,
  },
  amountIndicatorText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 14,
  },
  formActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryFormBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  secondaryFormBtnText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  outlineButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  outlineButtonText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: 'bold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 11,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  logCard: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    padding: 12,
  },
  logCardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 10,
  },
  logClientName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  logMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  logMetaText: {
    fontSize: 11,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#888',
    marginHorizontal: 8,
  },
  logAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logDurationText: {
    fontSize: 11,
    color: '#10B981',
    marginTop: 2,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  logTimeSpan: {
    fontSize: 11,
  },
  statusToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  paidBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  paidBtnText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  partialBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  partialBtnText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: 'bold',
  },
  unpaidBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  unpaidBtnText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // CLIENTS
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  searchInput: {
    fontSize: 14,
    flex: 1,
    padding: 0,
    borderWidth: 0,
    outlineStyle: 'none',
  },
  addClientBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#10B981',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 6,
  },
  filterPillText: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sortSelector: {
    marginLeft: 'auto',
    flexDirection: 'row',
    borderRadius: 6,
    padding: 2,
  },
  sortPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sortPillText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  clientCard: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  clientPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  clientTotalPaid: {
    color: '#888',
    fontSize: 10,
    marginTop: 4,
  },
  clientActionCol: {
    alignItems: 'flex-end',
  },
  clientBalance: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  balanceDues: {
    color: '#EF4444',
  },
  phoneCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
  },

  // STATS
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statBox: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  statBoxVal: {
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statBoxLabel: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  insightCol: {
    flex: 1,
  },
  insightDivider: {
    width: 1,
    marginHorizontal: 12,
  },
  insightSub: {
    fontSize: 9,
    color: '#888',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  insightMainVal: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 6,
  },
  insightDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 160,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarWrapper: {
    width: '60%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBar: {
    width: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  chartValText: {
    fontSize: 9,
    marginBottom: 4,
  },
  chartLabelText: {
    fontSize: 10,
    marginTop: 8,
    fontWeight: 'bold',
  },
  chartHoursText: {
    color: '#888',
    fontSize: 8,
    marginTop: 2,
  },
  cropProgressRow: {
    marginBottom: 12,
  },
  cropLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cropText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  cropHours: {
    fontSize: 11,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#10B981',
    borderRadius: 3,
  },

  // SETTINGS
  rateEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  currencySuffix: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 14,
  },
  settingSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 14,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  networkToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  networkToggleOn: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  networkToggleOff: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderColor: '#CCC',
  },
  networkToggleText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  statusBoxMini: {
    width: '48%',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
  },
  statusBoxMiniVal: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBoxMiniLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  dangerButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 12,
  },
  dangerButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // TABS
  tabBarContainer: {
    borderTopWidth: 1,
    paddingBottom: 24,
    paddingTop: 8,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  tabItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: 'bold',
  },
  tabLabelActive: {
    color: '#10B981',
  },

  // MODALS
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    height: '75%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeModalBtn: {
    padding: 4,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pickerItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.02)',
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  pickerItemPhone: {
    color: '#888',
    fontSize: 12,
    marginRight: 12,
  },
  modalBalanceHighlight: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 12,
  },
  modalBalanceLabel: {
    color: '#888',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  modalBalanceVal: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  ledgerDate: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  ledgerHours: {
    fontSize: 11,
    marginTop: 4,
  },
  ledgerAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  // ACTIVE SESSIONS
  activeSessionsContainer: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.02)',
  },
  activeHeaderLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  activeSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  activeSessionClient: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  activeSessionMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  stopActiveBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopActiveText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  paymentReceiptCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  applyPaymentBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  applyPaymentBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // V3 ADDITIONS
  pickerAddClientBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  pickerAddClientText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  exportMessageText: {
    fontSize: 12,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
    marginBottom: 12,
    lineHeight: 16,
  },
  
  // Custom Confirmation Modal Styles
  confirmModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  confirmModalBox: {
    width: '90%',
    maxWidth: 340,
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  confirmMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  confirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 10,
  },
  confirmCancelBtn: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  confirmCancelText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  confirmOkBtn: {
    backgroundColor: '#10B981',
  },
  confirmOkText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
