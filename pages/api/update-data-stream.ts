
import type { NextApiRequest, NextApiResponse } from 'next';

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
  timestamp: number;
  id: string; // unique identifier for each finalized entry
  uuid?: string; // UUID from the backend for database tracking
  pending?: boolean; // indicates if entry is pending database processing
}

const streamTexts: { [streamId: string]: TextData } = {};
const finalizedEntries: FinalizedDataEntry[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
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
        id: `${streamId}-${currentTimestamp}-${Math.random().toString(36).substr(2, 9)}`,
        uuid: uuid, // Store the UUID from the backend
        pending: true // Initially mark as pending database processing
      };
      finalizedEntries.push(finalizedEntry);

      // Sort by stream_id, then by timestamp
      finalizedEntries.sort((a, b) => {
        if (a.stream_id !== b.stream_id) {
          return a.stream_id.localeCompare(b.stream_id);
        }
        return a.timestamp - b.timestamp;
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

  if (req.method === 'GET') {
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