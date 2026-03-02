// Server-side module for reading/writing data to GitHub repo
// Used by API routes only (not client-side)

const REPO = process.env.DATA_REPO || 'anirudhatalmale6-alt/kerlaret-rentals-data';
const TOKEN = process.env.GITHUB_DATA_TOKEN || '';
const FILE_PATH = 'data.json';
const API_BASE = 'https://api.github.com';

export interface CloudData {
  properties: unknown[];
  bookings: unknown[];
  blockedDates: unknown[];
  lastUpdated: string;
}

interface GitHubFileResponse {
  content: string;
  sha: string;
  encoding: string;
}

export async function readData(): Promise<{ data: CloudData; sha: string }> {
  const res = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}`, {
    headers: {
      'Authorization': `token ${TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`GitHub read failed: ${res.status}`);
  }

  const file: GitHubFileResponse = await res.json();
  const content = Buffer.from(file.content, 'base64').toString('utf-8');
  const data: CloudData = JSON.parse(content);
  return { data, sha: file.sha };
}

export async function writeData(data: CloudData, sha: string): Promise<void> {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

  const res = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      message: `Sync data ${new Date().toISOString()}`,
      content,
      sha,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub write failed: ${res.status} ${err}`);
  }
}
