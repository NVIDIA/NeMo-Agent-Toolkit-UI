# Live Data Streaming

The live data streaming feature allows visualization of real-time text updates across multiple streams. This is useful for monitoring ongoing processes or displaying live transcription or streaming data.

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

## Database Watcher

Database entries are created when data is submitted to the `/api/update-data-stream` endpoint with the `finalized` field set to `true`. These entries represent completed or processed data that should be persisted to a database system.

NOTE: This API just provides visualization and does not manage a database itself. The assumption is that the user is using this API when manually updating a database.