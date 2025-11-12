import { useCallback } from 'react';

export const useFeedback = () => {
  const submitFeedback = useCallback(async (traceId: string, reactionType: '👍' | '👎') => {
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          weave_call_id: traceId,
          reaction_type: reactionType,
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw error;
    }
  }, []);

  return {
    submitFeedback
  };
};
