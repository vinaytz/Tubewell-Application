const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://developervinaytz_db_user:sLhvmVtMW23DCpBh@cluster0.ljz9d1i.mongodb.net/tubewell';

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Mongoose Setup
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

const ClientSchema = new mongoose.Schema({
  _id: String,
  name: String,
  phone: String,
  deleted: { type: Boolean, default: false },
  updatedAt: Date
}, { _id: false });
const Client = mongoose.model('Client', ClientSchema);

const RecordSchema = new mongoose.Schema({
  _id: String,
  clientId: String,
  date: String,
  startTime: String,
  stopTime: String,
  durationHours: Number,
  ratePerHour: Number,
  totalAmount: Number,
  amountPaid: Number,
  cropName: String,
  updatedAt: Date
}, { _id: false });
const Record = mongoose.model('Record', RecordSchema);

const ActiveSessionSchema = new mongoose.Schema({
  _id: String,
  clientId: String,
  cropName: String,
  startTime: String,
  deleted: { type: Boolean, default: false },
  updatedAt: Date
}, { _id: false });
const ActiveSession = mongoose.model('ActiveSession', ActiveSessionSchema);

const SettingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  rupeePerHour: Number,
  updatedAt: Date
}, { _id: false });
const Settings = mongoose.model('Settings', SettingsSchema);

app.post('/api/sync', async (req, res) => {
  try {
    const { lastSyncTime, queue = [] } = req.body;
    const nowISO = new Date().toISOString();

    // Process queue
    if (queue.length > 0) {
      // Sort queue by timestamp
      queue.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      for (const item of queue) {
        const { type, data } = item;
        
        if (type === 'UPSERT_CLIENT' || type === 'UPDATE_CLIENT') {
          const incomingTime = new Date(data.updatedAt || nowISO);
          await Client.findOneAndUpdate(
            { _id: data._id },
            { $set: { ...data, updatedAt: incomingTime } },
            { upsert: true, setDefaultsOnInsert: true }
          );
        }
        else if (type === 'DELETE_CLIENT') {
          const incomingTime = new Date(nowISO);
          await Client.findOneAndUpdate(
            { _id: data._id },
            { $set: { deleted: true, updatedAt: incomingTime } }
          );
        }
        else if (type === 'UPSERT_RECORD') {
          const incomingTime = new Date(data.updatedAt || nowISO);
          await Record.findOneAndUpdate(
            { _id: data._id },
            { $set: { ...data, updatedAt: incomingTime } },
            { upsert: true, setDefaultsOnInsert: true }
          );
        } 
        else if (type === 'UPDATE_SETTINGS') {
          const incomingTime = new Date(data.updatedAt || nowISO);
          await Settings.findOneAndUpdate(
            { _id: 'global' },
            { $set: { ...data, updatedAt: incomingTime } },
            { upsert: true, setDefaultsOnInsert: true }
          );
        }
        else if (type === 'UPSERT_ACTIVE_SESSION') {
          const incomingTime = new Date(data.updatedAt || nowISO);
          await ActiveSession.findOneAndUpdate(
            { _id: data._id },
            { $set: { ...data, deleted: false, updatedAt: incomingTime } },
            { upsert: true, setDefaultsOnInsert: true }
          );
        }
        else if (type === 'DELETE_ACTIVE_SESSION') {
          const incomingTime = new Date(data.updatedAt || nowISO);
          await ActiveSession.findOneAndUpdate(
            { _id: data._id },
            { $set: { deleted: true, updatedAt: incomingTime } },
            { upsert: true, setDefaultsOnInsert: true }
          );
        }
      }
    }

    const clientSyncMillis = lastSyncTime ? new Date(lastSyncTime) : new Date(0);
    
    // Return all updated since last sync
    const updatedClients = await Client.find({ updatedAt: { $gt: clientSyncMillis } }).lean();
    const updatedRecords = await Record.find({ updatedAt: { $gt: clientSyncMillis } }).lean();
    const updatedActiveSessions = await ActiveSession.find({ updatedAt: { $gt: clientSyncMillis } }).lean();
    
    let settings = await Settings.findOne({ _id: 'global' }).lean();
    if (!settings) {
      settings = { rupeePerHour: 150, updatedAt: new Date() };
      await Settings.create({ _id: 'global', ...settings });
    }

    res.json({
      success: true,
      serverTime: nowISO,
      updates: {
        clients: updatedClients,
        records: updatedRecords,
        activeSessions: updatedActiveSessions,
        settings: settings.updatedAt > clientSyncMillis ? settings : null,
      }
    });

  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ success: false, message: 'Sync failed' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
