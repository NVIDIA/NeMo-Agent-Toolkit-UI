# Live Data Streaming

The live data streaming feature enables visualization of real-time text streams and database ingestion tracking for streaming RAG applications. This is designed for scenarios where continuous streams of text (e.g., live ASR transcripts, sensor data) are being processed and stored in a RAG database.

## Architecture Overview

This system is designed for multi-application architectures:

- **Frontend**: This UI application - visualizes live streams and database entries
- **Stream Generator(s)**: Application(s) generating text streams (e.g., ASR service, data processor)
- **Database**: RAG database service (e.g., Milvus via [context-aware-rag](https://github.com/NVIDIA/context-aware-rag))

For a setup where these features are used, see the NVIDIA [Streaming Data to RAG Blueprint](https://build.nvidia.com/nvidia/streaming-data-to-rag), where this project is used as the UI.

### Data Flow

1. **Stream Generator** generates streams of text and sends them to **Database** for processing
2. **Frontend** receives updates either:
   - Directly from **Stream Generator** as streams are generated, OR
   - From **Database** as it processes streams
3. When **Database** decides a chunk of streaming data is ready for storage, it marks it as **finalized** and notifies **Frontend**
4. Once the data is successfully stored in the database, **Database** updates **Frontend** to mark the entry as **ingested** (no longer pending)

## API: `/api/update-data-stream`

This endpoint has two primary purposes:

### 1. Live Stream Visualization (Non-Finalized Data)

Display continuously updating text streams before they're committed to the database.

**Use Case**: Show live ASR transcripts, ongoing data feeds, or any streaming text content.

**Display**: `DataStreamDisplay` component in the chat interface.

### 2. Database Entry Tracking (Finalized Data)

Track text chunks that have been marked for database storage and their ingestion status.

**Use Case**: Monitor which chunks have been sent to the database and whether they've been successfully ingested.

**Display**: Database History page (`/database-updates`).

### Endpoint Details

#### **POST** - Submit stream updates or finalized entries

```javascript
// Live stream update (non-finalized)
POST /api/update-data-stream
{
  "text": "Current streaming text...",
  "stream_id": "stream1",           // Optional, defaults to 'default'
  "timestamp": 1728475200000,       // Optional, defaults to current time
  "finalized": false                // or omit for non-finalized
}

// Finalized entry (ready for database)
POST /api/update-data-stream
{
  "text": "Complete text chunk for database",
  "stream_id": "stream1",
  "timestamp": 1728475200000,
  "finalized": true,                // Marks entry as finalized
  "uuid": "backend-uuid-123"        // Backend UUID for tracking
}
```

**Parameters**:
- `text` (string, required): The text content
- `stream_id` (string, optional): Stream identifier (defaults to 'default')
- `timestamp` (number, optional): Unix timestamp in milliseconds (defaults to current time)
- `finalized` (boolean, optional): `true` = database entry, `false`/omitted = live stream
- `uuid` (string, optional): Backend UUID for database tracking (used with finalized entries)

**Behavior**:
- **Non-finalized**: Updates the live stream text, overwriting previous content for that `stream_id`
- **Finalized**: Creates a new database entry record (does not overwrite). Clears the live stream text for that `stream_id`

#### **GET** - Retrieve stream data or finalized entries

```javascript
// Get all finalized entries (for database history page)
GET /api/update-data-stream?type=finalized

// Get finalized entries for specific stream
GET /api/update-data-stream?type=finalized&stream=stream1

// Get live text for specific stream
GET /api/update-data-stream?stream=stream1

// Get all available streams
GET /api/update-data-stream
```

**Response for finalized entries**:
```javascript
{
  "entries": [
    {
      "text": "Complete text chunk",
      "stream_id": "stream1",
      "timestamp": 1728475200000,
      "id": "stream1-1728475200000-abc123",
      "uuid": "backend-uuid-123",
      "pending": true  // true = waiting for DB ingestion, false = ingested
    }
  ]
}
```

#### **PATCH** - Update database ingestion status

```javascript
// Mark entry as ingested (no longer pending)
PATCH /api/update-data-stream
{
  "uuid": "backend-uuid-123",
  "pending": false
}

// Mark entry as pending (waiting for ingestion)
PATCH /api/update-data-stream
{
  "uuid": "backend-uuid-123",
  "pending": true
}
```

**Use Case**: Called by **Database** (database) after successfully ingesting an entry to update its status from "Database Pending" to "Database Ingested".

## Frontend Components

### Data Stream Display

Located in the chat interface header (toggle: "Data Stream Display").

**Purpose**: Visualize live, continuously updating text streams before they're finalized.

**Features**:
- Updates every 100ms to show real-time stream content
- Displays last database update timestamp for the selected stream
- Stream selector (when multiple streams are active)
- Auto-scrolls to show latest content

**When to use**: Monitoring live ASR transcripts, sensor feeds, or any streaming text data.

### Database History Page

Accessible via "Database Updates" button in chat header (`/database-updates`).

**Purpose**: View all finalized entries and their database ingestion status.

**Features**:
- Lists all finalized entries with timestamps
- Processing status indicators:
  - 🕐 **Database Pending**: Entry marked for database storage, not yet ingested
  - ✓ **Database Ingested**: Entry successfully stored in database
- Filter by stream and processing status
- Sort by newest/oldest
- Auto-refresh every 5 seconds
- Color-coded stream badges

**When to use**: Tracking which text chunks have been sent to the database and verifying successful ingestion.

## Implementation Notes

- **Frontend State**: This API stores data in memory (Node.js process). It does **not** persist to disk or manage an actual database.
- **Database Operations**: Actual database ingestion (e.g., to Milvus) happens via separate backend APIs (like `/add_doc` in context-aware-rag).
- **Stream Management**: Each `stream_id` maintains its own live text buffer and finalized entry list.
- **Clearing Live Text**: When an entry is marked as `finalized`, the live stream text for that `stream_id` is automatically cleared.
- **UUID Tracking**: UUIDs from **Database** (backend) are used to update entry processing status via PATCH requests.