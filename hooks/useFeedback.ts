import { useState, useCallback } from 'react';

interface UseFeedbackReturn {
  submitFeedback: (traceId: string | undefined, reactionType: '👍' | '👎') => Promise<void>;
}

export const useFeedback = (): UseFeedbackReturn => {

  const submitFeedback = useCallback(async (traceId: string | undefined, reactionType: '👍' | '👎') => {
    if (!traceId) {
      console.warn('No trace ID available for feedback - traceId is:', traceId);
      return;
    }

    try {

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weave_call_id: traceId,
          reaction_type: reactionType,
          chatCompletionURL: sessionStorage.getItem('chatCompletionURL') || ''
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('SUCCESS: Feedback submitted successfully:', result);

    } catch (error) {
      console.error('ERROR: Failed to submit feedback:', error);
    }
  }, []);


  return {
    submitFeedback
  };
};
