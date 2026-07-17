// One-shot demo seed for local testing of the EduTrace ↔ TNT integration.
// Creates: 1 admin (with a known id + apiKey), a set of boxes (consignments)
// with school coordinates, and scan journeys so the Track & Trace UI shows
// live data end-to-end.
//
// Usage (with a Mongo running + STRING_URI set in server/.env):
//   cd tnt/server && node seed-demo.mjs
//
// Then in the frontend .env.local:
//   TNT_API_KEY=edutrace-demo-key
//   NEXT_PUBLIC_TNT_ADMIN_ID=edutrace-demo
//
// Safe to re-run: it upserts the admin and replaces this admin's boxes/scans.

import 'dotenv/config';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import Admin from './models/admins.model.js';
import Box from './models/boxes.model.js';
import Scan from './models/scans.model.js';

const ADMIN_ID = 'edutrace-demo';
const API_KEY = 'edutrace-demo-key';

// A few real-ish Nigerian schools with coordinates (project = TLM campaign).
const SCHOOLS = [
  { project: 'HOPE-EDU TLM 2026', division: 'Oyo', district: 'Ibadan North', zone: 'Ward 3', school: 'Ibadan Grammar School', schoolCode: 'OY-IBN-001', lat: 7.3878, lng: 3.9059 },
  { project: 'HOPE-EDU TLM 2026', division: 'Oyo', district: 'Ogbomosho North', zone: 'Ward 1', school: 'Ogbomosho High School', schoolCode: 'OY-OGB-002', lat: 8.1333, lng: 4.2500 },
  { project: 'HOPE-EDU TLM 2026', division: 'Adamawa', district: 'Yola North', zone: 'Ward 2', school: 'Yola Model School', schoolCode: 'AD-YOL-001', lat: 9.2035, lng: 12.4954 },
  { project: 'HOPE-EDU TLM 2026', division: 'Adamawa', district: 'Mubi North', zone: 'Ward 4', school: 'Mubi Central School', schoolCode: 'AD-MUB-002', lat: 10.2686, lng: 13.2667 },
  { project: 'HOPE-EDU TLM 2026', division: 'Katsina', district: 'Katsina', zone: 'Ward 1', school: 'Katsina Community School', schoolCode: 'KT-KTN-001', lat: 12.9908, lng: 7.6018 },
  { project: 'HOPE-EDU TLM 2026', division: 'Katsina', district: 'Daura', zone: 'Ward 3', school: 'Daura Girls School', schoolCode: 'KT-DAU-002', lat: 13.0300, lng: 8.3175 },
];

const DAY = 24 * 60 * 60 * 1000;
const jitter = (v, d) => v + (Math.random() - 0.5) * d;

async function main() {
  const uri = process.env.STRING_URI;
  if (!uri) {
    console.error('STRING_URI is not set (server/.env). Aborting.');
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log('Connected to Mongo.');

  // 1. Admin
  await Admin.updateOne(
    { id: ADMIN_ID },
    {
      $set: {
        id: ADMIN_ID,
        email: 'demo@edutrace.test',
        password: 'demo',
        apiKey: API_KEY,
        createdAt: new Date(),
        publicInsights: true,
      },
    },
    { upsert: true },
  );

  // Clear this admin's prior demo data
  await Box.deleteMany({ adminId: ADMIN_ID });
  await Scan.deleteMany({ adminId: ADMIN_ID });

  const now = Date.now();
  let boxCount = 0;
  let scanCount = 0;

  for (let i = 0; i < SCHOOLS.length; i++) {
    const s = SCHOOLS[i];
    const boxId = randomUUID();

    // Journey: every box gets 1 "in transit" scan; some get a "received" scan.
    const received = i % 3 !== 0; // ~2/3 received, rest in transit
    const scans = [];

    // in-transit waypoint (far from school)
    scans.push({
      id: randomUUID(),
      boxId,
      adminId: ADMIN_ID,
      operatorId: '+23480' + Math.floor(10000000 + Math.random() * 89999999),
      time: now - (2 * DAY) - i * 3600_000,
      location: { coords: { latitude: jitter(s.lat, 0.25), longitude: jitter(s.lng, 0.25), accuracy: 12 } },
      finalDestination: false,
      markedAsReceived: false,
      comment: 'Departed regional warehouse',
    });

    if (received) {
      scans.push({
        id: randomUUID(),
        boxId,
        adminId: ADMIN_ID,
        operatorId: '+23480' + Math.floor(10000000 + Math.random() * 89999999),
        time: now - DAY + i * 1800_000,
        location: { coords: { latitude: jitter(s.lat, 0.005), longitude: jitter(s.lng, 0.005), accuracy: 5 } },
        finalDestination: true,
        markedAsReceived: true,
        comment: 'Delivered and confirmed by head teacher',
      });
    }

    await Scan.insertMany(scans);
    scanCount += scans.length;

    const lastScan = scans.reduce((a, b) => (b.time > a.time ? b : a));
    await Box.create({
      id: boxId,
      project: s.project,
      division: s.division,
      district: s.district,
      zone: s.zone,
      school: s.school,
      htName: 'Head Teacher',
      htPhone: '+2348000000000',
      schoolCode: s.schoolCode,
      adminId: ADMIN_ID,
      createdAt: new Date(now - 3 * DAY),
      scans,
      schoolLatitude: s.lat,
      schoolLongitude: s.lng,
      progress: received ? 'received' : 'inTransit',
      lastScan,
    });
    boxCount += 1;
  }

  console.log('\n=== TNT DEMO SEED COMPLETE ===');
  console.log(`Admin id:    ${ADMIN_ID}`);
  console.log(`API key:     ${API_KEY}`);
  console.log(`Boxes:       ${boxCount}`);
  console.log(`Scans:       ${scanCount}`);
  console.log('\nSet in frontend .env.local:');
  console.log(`  TNT_API_KEY=${API_KEY}`);
  console.log(`  NEXT_PUBLIC_TNT_ADMIN_ID=${ADMIN_ID}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
