
import type { NextApiRequest, NextApiResponse } from 'next';

// Module-level variable to store text for multiple streams
interface TextData {
  text: string;
  stream_id: string;
  timestamp: number;
  finalized?: boolean;
}

interface FinalizedTranscript {
  text: string;
  stream_id: string;
  timestamp: number;
  id: string; // unique identifier for each finalized transcript
  uuid?: string; // UUID from the backend for database tracking
  pending?: boolean; // indicates if transcript is pending database processing
}

let streamTexts: { [streamId: string]: TextData } = {};
let finalizedTranscripts: FinalizedTranscript[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { text, stream_id, timestamp, finalized, uuid } = req.body;
    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'Text must be a string.' });
    }
    const streamId = stream_id || 'default';
    const currentTimestamp = timestamp || Date.now();

    if (finalized) {
      // Store finalized transcript
      const finalizedTranscript: FinalizedTranscript = {
        text,
        stream_id: streamId,
        timestamp: currentTimestamp,
        id: `${streamId}-${currentTimestamp}-${Math.random().toString(36).substr(2, 9)}`,
        uuid: uuid, // Store the UUID from the backend
        pending: true // Initially mark as pending database processing
      };
      finalizedTranscripts.push(finalizedTranscript);

      // Sort by stream_id, then by timestamp
      finalizedTranscripts.sort((a, b) => {
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
      // Get finalized transcripts
      if (stream !== undefined) {
        const streamId = stream as string;
        const streamFinalizedTranscripts = finalizedTranscripts.filter(
          transcript => transcript.stream_id === streamId
        );
        return res.status(200).json({
          transcripts: streamFinalizedTranscripts,
          stream_id: streamId
        });
      } else {
        // Get all finalized transcripts
        return res.status(200).json({
          transcripts: finalizedTranscripts
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

  // PATCH method for updating transcript processing status
  if (req.method === 'PATCH') {
    const { uuid, pending } = req.body;

    if (!uuid) {
      return res.status(400).json({ error: 'UUID is required.' });
    }

    // Find the transcript by UUID and update its pending status
    const transcriptIndex = finalizedTranscripts.findIndex(
      transcript => transcript.uuid === uuid
    );

    if (transcriptIndex === -1) {
      return res.status(404).json({ error: 'Transcript not found.' });
    }

    finalizedTranscripts[transcriptIndex].pending = pending;

    return res.status(200).json({
      success: true,
      transcript: finalizedTranscripts[transcriptIndex]
    });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}