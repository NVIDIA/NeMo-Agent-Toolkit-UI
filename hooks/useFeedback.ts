import { useCallback } from 'react';
import toast from 'react-hot-toast';

export const useFeedback = () => {
  const submitFeedback = useCallback(async (traceId: string, reactionType: '👍' | '👎') => {
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          observability_trace_id: traceId,
          reaction_type: reactionType,
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
      toast(`Feedback submitted successfully`, {icon: reactionType});
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback');
      throw error;
    }
  }, []);

  return {
    submitFeedback
  };
};
