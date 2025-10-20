
import type { NextApiRequest, NextApiResponse } from 'next';
import { HTTP_METHOD_POST, HTTP_METHOD_GET } from '@/constants';

/**
 * Update Data Stream API Endpoint
 *
 * Purpose: Manages live text streams and database ingestion tracking for streaming RAG applications.
 * This endpoint serves as the central data hub for continuous text streams (e.g., ASR transcripts, sensor
 * data) that are being processed in real-time and eventually stored in a vector database.
 *
 * Key Responsibilities:
 * - Stores and serves live, non-finalized streaming text (continuously updating)
 * - Tracks finalized entries marked for database storage
 * - Manages ingestion status updates from database backend
 * - Auto-discovers available streams dynamically
 * - Maintains separate state for live text vs finalized entries
 *
 * Data Types Managed:
 *
 * 1. Live Stream Text (Non-Finalized):
 *    - Continuously updated text that hasn't been committed to database
 *    - Each stream_id has ONE current text value (overwrites on each POST)
 *    - Stored in: streamTexts object
 *    - Displayed in: DataStreamDisplay component
 *    - Cleared when marked as finalized
 *
 * 2. Finalized Entries (Database-Bound):
 *    - Text chunks ready for database storage
 *    - Each POST creates a NEW entry (doesn't overwrite)
 *    - Tracked with UUID from backend for status updates
 *    - Stored in: finalizedEntries array
 *    - Displayed in: /database-updates page
 *    - Marked as pending until database confirms ingestion
 *
 * HTTP Methods:
 *
 * POST - Submit stream updates or finalized entries
 *   Body: { text, stream_id?, timestamp?, finalized?, uuid? }
 *   - If finalized=false/omitted: Updates live stream text (overwrites existing)
 *   - If finalized=true: Creates new database entry record (appends to list)
 *   Use Cases:
 *   - Stream generators sending live text updates
 *   - Backend marking chunks as ready for database storage
 *
 * GET - Retrieve stream data or finalized entries
 *   Query params: stream?, type?
 *   - No params: Returns all available stream IDs and live text
 *   - ?stream={id}: Returns live text for specific stream
 *   - ?type=finalized: Returns all finalized entries
 *   - ?type=finalized&stream={id}: Returns finalized entries for specific stream
 *   Use Cases:
 *   - DataStreamManager discovering available streams
 *   - DataStreamDisplay polling for live text updates
 *   - Database Updates page fetching finalized entries
 *
 * PATCH - Update database ingestion status
 *   Body: { uuid, pending }
 *   - uuid: Backend UUID identifying the entry
 *   - pending: true = waiting for DB, false = successfully ingested
 *   Use Cases:
 *   - Database backend confirming successful ingestion
 *   - Updating UI from "Database Pending" to "Database Ingested"
 *
 * Data Storage:
 * - Module-level variables (in-memory, Node.js process)
 * - Does NOT persist to disk or actual database
 * - Lost on server restart
 * - streamTexts: Map of stream_id -> current live text
 * - finalizedEntries: Array of all finalized entries with metadata
 *
 * Data Flow Example:
 * 1. ASR service: POST { text: "hello", stream_id: "mic1" } (live update)
 * 2. Frontend polls: GET ?stream=mic1 -> returns "hello"
 * 3. ASR service: POST { text: "hello world", stream_id: "mic1" } (overwrites)
 * 4. Frontend polls: GET ?stream=mic1 -> returns "hello world"
 * 5. Backend decides chunk is ready: POST { text: "hello world", stream_id: "mic1", finalized: true, uuid: "abc123" }
 * 6. Creates finalized entry with pending=true, clears live text for mic1
 * 7. Database ingests chunk: PATCH { uuid: "abc123", pending: false }
 * 8. Entry marked as successfully ingested
 *
 * Related Components:
 * - DataStreamDisplay.tsx - Polls for live stream text (100ms interval)
 * - DataStreamManager.tsx - Discovers available streams (2s interval)
 * - /database-updates page - Displays finalized entries and their status
 * - DataStreamControls.tsx - UI controls for toggling display
 *
 * For detailed architecture, API examples, and usage patterns, see DATA_STREAMING.md
 */

// Module-level variable to store text for multiple streams
interface TextData {
  text: string;
  stream_id: string;
  timestamp: number;
  finalized?: boolean;
}

interface FinalizedDataEntry {
  text: string;
  stream_id: string;
  timestamp: number | string;
  id: string; // unique identifier for each finalized entry
  uuid?: string; // UUID from the backend for database tracking
  pending?: boolean; // indicates if entry is pending database processing
}

let streamTexts: { [streamId: string]: TextData } = {};
let finalizedEntries: FinalizedDataEntry[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === HTTP_METHOD_POST) {
    const { text, stream_id, timestamp, finalized, uuid } = req.body;
    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'Text must be a string.' });
    }
    const streamId = stream_id || 'default';
    const currentTimestamp = timestamp || Date.now();

    if (finalized) {
      // Store finalized entry
      const finalizedEntry: FinalizedDataEntry = {
        text,
        stream_id: streamId,
        timestamp: currentTimestamp,
        id: `${streamId}-${currentTimestamp}-${Math.random().toString(36).substring(2, 11)}`,
        uuid: uuid, // Store the UUID from the backend
        pending: true // Initially mark as pending database processing
      };
      finalizedEntries.push(finalizedEntry);

      // Sort by stream_id, then by timestamp
      finalizedEntries.sort((a, b) => {
        if (a.stream_id !== b.stream_id) {
          return a.stream_id.localeCompare(b.stream_id);
        }
        const timestampA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
        const timestampB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
        return timestampA - timestampB;
      });

      // Clear the live text for this stream since it's now finalized
      if (streamTexts[streamId]) {
        streamTexts[streamId].text = '';
      }
    } else {
      // Store live text
      streamTexts[streamId] = {
        text,
        stream_id: streamId,
        timestamp: currentTimestamp,
        finalized: false
      };
    }

    return res.status(200).json({ success: true });
  }

  if (req.method === HTTP_METHOD_GET) {
    const { stream, type } = req.query;

    if (type === 'finalized') {
      // Get finalized entries
      if (stream !== undefined) {
        const streamId = stream as string;
        const streamFinalizedEntries = finalizedEntries.filter(
          entry => entry.stream_id === streamId
        );
        return res.status(200).json({
          entries: streamFinalizedEntries,
          stream_id: streamId
        });
      } else {
        // Get all finalized entries
        return res.status(200).json({
          entries: finalizedEntries
        });
      }
    }

    if (stream !== undefined) {
      // Get live text for specific stream
      const streamId = stream as string;
      const streamData = streamTexts[streamId];
      return res.status(200).json({
        text: streamData?.text || '',
        stream_id: streamId
      });
    } else {
      // Get all available streams with live text
      const streams = Object.keys(streamTexts);
      return res.status(200).json({
        streams,
        texts: streamTexts
      });
    }
  }

  // PATCH method for updating entry processing status
  if (req.method === 'PATCH') {
    const { uuid, pending } = req.body;

    if (!uuid) {
      return res.status(400).json({ error: 'UUID is required.' });
    }

    if (typeof pending !== 'boolean') {
      return res.status(400).json({ error: 'Pending must be a boolean.' });
    }

    // Find the entry by UUID and update its pending status
    const entryIndex = finalizedEntries.findIndex(
      entry => entry.uuid === uuid
    );

    if (entryIndex === -1) {
      return res.status(404).json({ error: 'Entry not found.' });
    }

    finalizedEntries[entryIndex].pending = pending;

    return res.status(200).json({
      success: true,
      entry: finalizedEntries[entryIndex]
    });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}