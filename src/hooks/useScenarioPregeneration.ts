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

export const pregenerationCache: Partial<Record<2 | 3, { token?: string; inProgress?: boolean }>> = {};

export function useScenarioPregeneration(currentScenario: 1 | 2 | 3): void {
  const nextScenario = getNextScenario(currentScenario);
  const abortRef = useRef<AbortController | null>(null);
  const pollingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!nextScenario) {
      return;
    }

    // Check if already cached
    if (imageCache[nextScenario]) {
      return;
    }

    // Check if already in progress
    if (pregenerationCache[nextScenario]?.inProgress) {
      return;
    }

    pregenerationCache[nextScenario] = { inProgress: true };

    const generateBackground = async () => {
      try {
        const token = await submitImageTask(PROMPTS[nextScenario]);
        pregenerationCache[nextScenario]!.token = token;

        const poll = async () => {
          if (abortRef.current?.signal.aborted) return;
          try {
            const url = await pollTask(token);
            if (url) {
              imageCache[nextScenario] = url;
              delete pregenerationCache[nextScenario]?.inProgress;
            } else {
              const timer = setTimeout(poll, 2000);
              pollingTimersRef.current.push(timer);
            }
          } catch {
            // silent - keep polling
            const timer = setTimeout(poll, 2000);
            pollingTimersRef.current.push(timer);
          }
        };

        const timer = setTimeout(poll, 2000);
        pollingTimersRef.current.push(timer);
      } catch {
        delete pregenerationCache[nextScenario]?.inProgress;
      }
    };

    generateBackground();

    return () => {
      abortRef.current?.abort();
      pollingTimersRef.current.forEach(timer => clearTimeout(timer));
      pollingTimersRef.current = [];
    };
  }, [currentScenario, nextScenario]);
}
