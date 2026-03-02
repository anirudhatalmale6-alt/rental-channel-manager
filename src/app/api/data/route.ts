import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData, CloudData } from '@/lib/github-db';

// GET: Load all data from cloud
export async function GET() {
  try {
    const { data } = await readData();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Save all data to cloud
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { properties, bookings, blockedDates } = body;

    if (!Array.isArray(properties) || !Array.isArray(bookings) || !Array.isArray(blockedDates)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Read current to get SHA
    const { sha } = await readData();

    const data: CloudData = {
      properties,
      bookings,
      blockedDates,
      lastUpdated: new Date().toISOString(),
    };

    await writeData(data, sha);
    return NextResponse.json({ ok: true, lastUpdated: data.lastUpdated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
