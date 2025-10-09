# Live Data Streaming

The live data streaming feature allows visualization of real-time text updates across multiple streams from any source. This feature is most commonly used when streaming in text that will be ingested by context-aware RAG (https://github.com/NVIDIA/context-aware-rag), but is not limited to that use case.

## API

The `/api/update-data-stream` endpoint provides functionality for managing live text streams and finalized data entries:

- **POST**: Submit live text updates or finalized entries
  - `text`: The text content to stream
  - `stream_id`: Identifier for the data stream (defaults to 'default')
  - `timestamp`: Unix timestamp (defaults to current time)
  - `finalized`: Boolean flag to mark entry as finalized
  - `uuid`: Backend UUID for database tracking

- **GET**: Retrieve live or finalized data
  - Query `?type=finalized` for processed entries
  - Query `?stream=<stream_id>` for specific stream data
  - No query parameters returns all live streams

- **PATCH**: Update entry processing status using UUID

## Data Stream Display

The chat interface includes a "Data Stream Display" toggle in the header menu that enables real-time visualization of streaming data alongside chat conversations. This feature is particularly useful for monitoring live transcription feeds or processing status updates.

The Data Stream Display component shows:
- Real-time streaming text for the selected stream (updated every 100ms)
- Last database update timestamp for the selected stream
- Multiple stream selection when more than one stream is available

## Database Watcher

The "Database Updates" button in the chat header provides a visual indicator for users to follow along as entries from different data streams are added to a database. Clicking this button opens the Database History page (`/database-updates`), which displays all finalized entries.

**Important:** The frontend does not track database updates directly; it simply offers a UI element for users to observe the process. Finalized entries are retrieved via the `/api/update-data-stream?type=finalized` endpoint, which returns entries that have been marked as complete.

The Database History page displays:
- All finalized entries with their stream IDs and timestamps
- Processing status (Database Pending or Database Ingested)
- Filtering options by stream and processing status
- Sorting options (newest/oldest first)
- Auto-refresh every 5 seconds

**Note:** The `/api/update-data-stream` endpoint only provides visualization and does not manage a database itself. Actual database ingestion (e.g., to Milvus via context-aware-rag) happens through separate backend APIs like `/add_doc`.