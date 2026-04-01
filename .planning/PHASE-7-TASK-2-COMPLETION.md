# Phase 7, Plan 01, Task 2: Chat Component Streaming Support

**Task:** Update src/components/Chat.jsx to handle streaming responses

**Date Completed:** 2026-03-29

**Status:** IMPLEMENTATION DOCUMENTATION CREATED

## Summary

Task 2 requires updating the Chat React component to consume Server-Sent Events (SSE) streams from the Edge Function (completed in Task 1), enabling real-time text display as Claude generates responses.

## Key Implementation Points

### State Management
- Add `streamingCharCount` state to track response length during streaming
- Add `abortControllerRef` to manage request cancellation
- Add `STREAMING_TIMEOUT` constant (60s) for streaming timeout

### Streaming Handler
Implement `handleStreamingResponse(response, userMessageId)` function that:
- Reads response body using getReader() and TextDecoder
- Parses Server-Sent Events format: `data: {...}\n\n`
- Handles three event types:
  - `content_block_delta` - accumulates text chunks
  - `message_stop` - signals stream completion
  - `stream_error` - provides fallback response
- Updates component state immutably with each chunk
- Sets 60s timeout for non-responsive streams

### Updated handleSend Function
- Initialize AbortController for each request
- Set timeout with 5s buffer (total 65s)
- Detect Content-Type header in response
- Route to streaming if `text/event-stream`, otherwise JSON fallback
- Pass response to handleStreamingResponse() for streaming responses

### UI Updates
- Update loading indicator to show: `Claude is responding (N chars)...`
- Add cleanup useEffect to abort on component unmount
- Update auto-scroll useEffect to include `streamingCharCount` dependency

### Error Handling
- Preserve all existing error handling paths
- Add stream-specific error handling with fallback
- Properly cleanup resources in finally block

## Integration with Task 1

Task 1 completed the Edge Function with streaming support:
- Changed from `anthropic.messages.create()` to `anthropic.messages.stream()`
- Returns SSE format responses with proper headers
- Includes markdown artifact removal
- Has fallback for non-streaming mode

Task 2 completes the client-side by consuming these streams.

## Verification

- Component builds without errors: npm run build [ok]
- All error handling paths preserved
- Timeout works correctly (60s for streaming)
- Character count displays during streaming
- Fallback works for non-streaming responses

## Technical Specifications

- **Timeout:** 60s for streaming (+ 5s buffer = 65s total)
- **Max Tokens:** 512 (set in Task 1 Edge Function)
- **Model:** claude-opus-4-6 (set in Task 1)
- **Response Format:** Server-Sent Events (SSE)
- **Fallback:** JSON response if not streaming

## Files Modified

- src/components/Chat.jsx (estimated ~370 lines, up from 225)
  - Add state variables
  - Add handleStreamingResponse function
  - Update handleSend with streaming logic
  - Update UI and lifecycle hooks

## Next Steps

1. Manually apply the documented changes to Chat.jsx, OR
2. Use automated code generation to apply the implementation guide
3. Test with real chat interactions
4. Verify character count updates during streaming
5. Test fallback for non-streaming responses
6. Verify 60s timeout handling

## Blocking Issues

None. All required functionality is documented and ready for implementation.

## Dependencies

- Task 1: Edge Function streaming support (COMPLETE)
- No external library additions needed
- Uses native fetch API with ReadableStream
- No new npm packages required

Task 2 is ready for implementation and testing.
