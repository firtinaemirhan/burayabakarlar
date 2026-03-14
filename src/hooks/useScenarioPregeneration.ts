import { useEffect, useRef } from 'react';
import { submitImageTask, pollTask } from '@/lib/wiro';
import { imageCache } from '@/hooks/useIPhoneAd';

function getNextScenario(current: 1 | 2 | 3): 2 | 3 | null {
  if (current === 1) return 2;
  if (current === 2) return 3;
  return null;
}

const PROMPTS: Record<2 | 3, string> = {
  2: "professional product photography of Apple iPhone 16 Pro, single device floating in empty space, dramatic side lighting with sharp metallic reflections, pure black background, cinematic studio lighting, ultra detailed titanium edges, luxury premium feel, high fashion editorial style, 8k quality",
  3: "wide aerial shot of massive urban crowd all holding Apple iPhones, city street filled with people, warm golden hour lighting, cinematic composition, powerful sense of conformity and unity, everyone scrolling simultaneously, photorealistic crowd scene, billboard scale imagery, vibrant city atmosphere",
};

const MAX_RETRIES = 30; // ~1 minute at 2s intervals

export const pregenerationCache: Partial<Record<2 | 3, { inProgress?: boolean }>> = {};

export function useScenarioPregeneration(currentScenario: 1 | 2 | 3): void {
  const nextScenario = getNextScenario(currentScenario);
  const abortRef = useRef(new AbortController()); // FIXED: Initialize properly
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    if (!nextScenario) {
      return; // No next scenario to pre-generate
    }

    // If already cached or in-progress, skip
    if (imageCache[nextScenario] || pregenerationCache[nextScenario]?.inProgress) {
      return;
    }

    // Reset abort controller for this effect
    abortRef.current = new AbortController();
    retryCountRef.current = 0;

    // Mark as in-progress
    pregenerationCache[nextScenario] = { inProgress: true };

    const generateBackground = async () => {
      try {
        const token = await submitImageTask(PROMPTS[nextScenario]);

        // Start polling
        const poll = async () => {
          // Check if effect was cleaned up
          if (abortRef.current.signal.aborted) return;

          // Check retry limit
          if (retryCountRef.current >= MAX_RETRIES) {
            // Max retries exceeded, give up gracefully
            delete pregenerationCache[nextScenario];
            return;
          }

          try {
            const url = await pollTask(token);
            if (url) {
              // Image ready, cache it
              imageCache[nextScenario] = url;
              // Clean up cache entry
              delete pregenerationCache[nextScenario];
            } else {
              // Still pending, poll again in 2 seconds
              retryCountRef.current++;
              pollingTimerRef.current = setTimeout(poll, 2000);
            }
          } catch {
            // Task cancellation and transient failures are expected
            // Keep retrying unless max retries exceeded
            retryCountRef.current++;
            if (retryCountRef.current < MAX_RETRIES) {
              pollingTimerRef.current = setTimeout(poll, 2000);
            } else {
              // Max retries exceeded
              delete pregenerationCache[nextScenario];
            }
          }
        };

        // Start polling after 2 second delay
        pollingTimerRef.current = setTimeout(poll, 2000);
      } catch {
        // Silent error on submission (expected if API is down or overloaded)
        // On-demand generation will handle it when user transitions
        delete pregenerationCache[nextScenario];
      }
    };

    generateBackground();

    return () => {
      // Cleanup: abort controller, clear timers, clear cache
      abortRef.current.abort();
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
      // Optional: remove from cache on unmount (depends on desired behavior)
      // Keeping cache allows other instances to skip if already started
    };
  }, [currentScenario, nextScenario]);
}
