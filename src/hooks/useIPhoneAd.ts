import { useState, useEffect, useRef } from "react";
import { submitImageTask, pollTask } from "@/lib/wiro";

export type AdStatus = "idle" | "loading" | "done" | "error";

// Her senaryo için farklı psikolojik tema (FLUX.2 için optimize edilmiş)
const PROMPTS: Record<2 | 3, string> = {
  // Rival: kıtlık, rekabet, aciliyet — karanlık zeminde tek cihaz
  2: "professional product photography of Apple iPhone 16 Pro, single device floating in empty space, dramatic side lighting with sharp metallic reflections, pure black background, cinematic studio lighting, ultra detailed titanium edges, luxury premium feel, high fashion editorial style, 8k quality",

  // Dictator: kalabalık, itaat, hepsi aynı — kitle ve iPhone
  3: "wide aerial shot of massive urban crowd all holding Apple iPhones, city street filled with people, warm golden hour lighting, cinematic composition, powerful sense of conformity and unity, everyone scrolling simultaneously, photorealistic crowd scene, billboard scale imagery, vibrant city atmosphere",
};

// Senaryo başına cache — sayfa yenilenmeden tekrar istek atmaz
export const imageCache: Partial<Record<2 | 3, string>> = {};

export function useIPhoneAd(scenario: 2 | 3) {
  const [imageUrl, setImageUrl] = useState<string | null>(imageCache[scenario] ?? null);
  const [status, setStatus] = useState<AdStatus>(imageCache[scenario] ? "done" : "idle");
  const pollingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    // Cache'de varsa tekrar üretme
    if (imageCache[scenario]) {
      setImageUrl(imageCache[scenario]!);
      setStatus("done");
      return;
    }

    cancelled.current = false;
    setStatus("loading");
    setImageUrl(null);

    const generate = async () => {
      try {
        const token = await submitImageTask(PROMPTS[scenario]);

        const poll = async () => {
          if (cancelled.current) return;
          try {
            const url = await pollTask(token);
            if (url) {
              imageCache[scenario] = url;
              setImageUrl(url);
              setStatus("done");
            } else {
              pollingTimer.current = setTimeout(poll, 2000);
            }
          } catch {
            if (!cancelled.current) setStatus("error");
          }
        };

        pollingTimer.current = setTimeout(poll, 2000);
      } catch {
        if (!cancelled.current) setStatus("error");
      }
    };

    generate();

    return () => {
      cancelled.current = true;
      if (pollingTimer.current) clearTimeout(pollingTimer.current);
    };
  }, [scenario]);

  return { imageUrl, status };
}
