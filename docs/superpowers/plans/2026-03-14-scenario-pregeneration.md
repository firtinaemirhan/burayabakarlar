# Scenario Pre-generation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement background pre-generation of images for next scenario transitions, eliminating 5-10 second loading delays.

**Architecture:** New `useScenarioPregeneration` hook calculates next scenario and triggers background image generation if not cached. Uses deduplication (prevent same scenario generating twice) and silent error handling. Reuses existing `imageCache` from `useIPhoneAd`. Single hook call in `Index.tsx` triggers the system.

**Tech Stack:** React hooks, existing Wiro API layer (`submitImageTask`, `pollTask`), global cache object

---

## Chunk 1: Core Hook Implementation

### Task 1: Create useScenarioPregeneration hook with tests

**Files:**
- Create: `src/hooks/useScenarioPregeneration.ts`
- Create: `src/hooks/__tests__/useScenarioPregeneration.test.ts`

**Dependencies:**
- Must import from `src/hooks/useIPhoneAd.ts` (access `imageCache` and `PROMPTS`)
- Must use existing `submitImageTask` and `pollTask` from `src/lib/wiro.ts`

---

#### Step 1: Write failing test for next scenario calculation

**File:** `src/hooks/__tests__/useScenarioPregeneration.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('useScenarioPregeneration', () => {
  describe('next scenario calculation', () => {
    it('should return 2 (Rival) as next scenario when current is 1 (Whisper)', () => {
      // Test will be implemented after hook is written
      // This is a placeholder to structure the test
      expect(true).toBe(true);
    });

    it('should return 3 (Dictator) as next scenario when current is 2 (Rival)', () => {
      expect(true).toBe(true);
    });

    it('should return null as next scenario when current is 3 (Dictator)', () => {
      expect(true).toBe(true);
    });
  });

  describe('deduplication', () => {
    it('should not start generation twice for same scenario', () => {
      expect(true).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should silently handle generation errors', () => {
      expect(true).toBe(true);
    });
  });
});
```

**Run:** `npm test src/hooks/__tests__/useScenarioPregeneration.test.ts`
**Expected:** Tests skip/placeholder (no hook yet)

---

#### Step 2: Write minimal hook scaffold

**File:** `src/hooks/useScenarioPregeneration.ts`

```typescript
import { useEffect, useRef } from 'react';
import { submitImageTask, pollTask } from '@/lib/wiro';

// Get next scenario based on current scenario
function getNextScenario(current: 1 | 2 | 3): 2 | 3 | null {
  if (current === 1) return 2;
  if (current === 2) return 3;
  return null;
}

// Prompts for each scenario (copied from useIPhoneAd)
const PROMPTS: Record<2 | 3, string> = {
  2: "professional product photography of Apple iPhone 16 Pro, single device floating in empty space, dramatic side lighting with sharp metallic reflections, pure black background, cinematic studio lighting, ultra detailed titanium edges, luxury premium feel, high fashion editorial style, 8k quality",
  3: "wide aerial shot of massive urban crowd all holding Apple iPhones, city street filled with people, warm golden hour lighting, cinematic composition, powerful sense of conformity and unity, everyone scrolling simultaneously, photorealistic crowd scene, billboard scale imagery, vibrant city atmosphere",
};

// Global cache (will be shared with useIPhoneAd)
export const pregenerationCache: Partial<Record<2 | 3, { token?: string; inProgress?: boolean }>> = {};

export function useScenarioPregeneration(currentScenario: 1 | 2 | 3): void {
  const nextScenario = getNextScenario(currentScenario);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!nextScenario) {
      return; // No next scenario to pre-generate
    }

    // Prevent duplicate generation
    if (pregenerationCache[nextScenario]?.inProgress) {
      return;
    }

    pregenerationCache[nextScenario] = { inProgress: true };

    const generateBackground = async () => {
      try {
        const token = await submitImageTask(PROMPTS[nextScenario]);
        pregenerationCache[nextScenario]!.token = token;

        // Start polling
        const poll = async () => {
          if (abortRef.current?.signal.aborted) return;
          try {
            // Import imageCache from useIPhoneAd
            const { imageCache } = await import('@/hooks/useIPhoneAd');
            const url = await pollTask(token);
            if (url) {
              imageCache[nextScenario] = url;
              // Clear in-progress flag
              delete pregenerationCache[nextScenario]?.inProgress;
            } else {
              // Still pending, poll again
              setTimeout(poll, 2000);
            }
          } catch {
            // Silent error handling
          }
        };

        setTimeout(poll, 2000);
      } catch {
        // Silent error on submission
        delete pregenerationCache[nextScenario]?.inProgress;
      }
    };

    generateBackground();

    return () => {
      abortRef.current?.abort();
    };
  }, [currentScenario, nextScenario]);
}
```

**Run:** `npm test src/hooks/__tests__/useScenarioPregeneration.test.ts`
**Expected:** Tests can now reference the hook

---

#### Step 3: Implement real tests with mocking

**File:** `src/hooks/__tests__/useScenarioPregeneration.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScenarioPregeneration, pregenerationCache } from '../useScenarioPregeneration';

// Mock the Wiro API
vi.mock('@/lib/wiro', () => ({
  submitImageTask: vi.fn(),
  pollTask: vi.fn(),
}));

// Mock useIPhoneAd's imageCache
vi.mock('@/hooks/useIPhoneAd', () => ({
  imageCache: {},
}));

import { submitImageTask, pollTask } from '@/lib/wiro';

describe('useScenarioPregeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear cache before each test
    Object.keys(pregenerationCache).forEach(key => {
      delete pregenerationCache[key as any];
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('next scenario calculation', () => {
    it('should pre-generate Scenario 2 when current is 1', () => {
      const { rerender } = renderHook(
        ({ scenario }) => useScenarioPregeneration(scenario),
        { initialProps: { scenario: 1 as 1 | 2 | 3 } }
      );

      // Should call submitImageTask for scenario 2
      expect(submitImageTask).toHaveBeenCalledWith(
        expect.stringContaining('iPhone 16 Pro')
      );
    });

    it('should pre-generate Scenario 3 when current is 2', () => {
      renderHook(
        ({ scenario }) => useScenarioPregeneration(scenario),
        { initialProps: { scenario: 2 as 1 | 2 | 3 } }
      );

      // Should call submitImageTask for scenario 3 (crowd)
      expect(submitImageTask).toHaveBeenCalledWith(
        expect.stringContaining('aerial shot')
      );
    });

    it('should NOT pre-generate when current is 3', () => {
      renderHook(
        ({ scenario }) => useScenarioPregeneration(scenario),
        { initialProps: { scenario: 3 as 1 | 2 | 3 } }
      );

      expect(submitImageTask).not.toHaveBeenCalled();
    });
  });

  describe('deduplication', () => {
    it('should not call submitImageTask twice for same scenario', async () => {
      vi.mocked(submitImageTask).mockResolvedValue('token-1');

      const { rerender } = renderHook(
        ({ scenario }) => useScenarioPregeneration(scenario),
        { initialProps: { scenario: 1 as 1 | 2 | 3 } }
      );

      expect(submitImageTask).toHaveBeenCalledTimes(1);

      // Rerender with same scenario
      rerender({ scenario: 1 });

      // Should still be 1 call (deduplication works)
      expect(submitImageTask).toHaveBeenCalledTimes(1);
    });

    it('should mark scenario as in-progress to prevent duplicates', () => {
      vi.mocked(submitImageTask).mockResolvedValue('token-1');

      renderHook(
        ({ scenario }) => useScenarioPregeneration(scenario),
        { initialProps: { scenario: 1 as 1 | 2 | 3 } }
      );

      // Check that scenario 2 is marked as in-progress
      expect(pregenerationCache[2]?.inProgress).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should silently handle submitImageTask errors', () => {
      vi.mocked(submitImageTask).mockRejectedValue(new Error('API Error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderHook(
        ({ scenario }) => useScenarioPregeneration(scenario),
        { initialProps: { scenario: 1 as 1 | 2 | 3 } }
      );

      // Error should be caught silently (no console.error)
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should clear in-progress flag on error', () => {
      vi.mocked(submitImageTask).mockRejectedValue(new Error('API Error'));

      renderHook(
        ({ scenario }) => useScenarioPregeneration(scenario),
        { initialProps: { scenario: 1 as 1 | 2 | 3 } }
      );

      // Should clear the in-progress flag
      expect(pregenerationCache[2]?.inProgress).toBeUndefined();
    });

    it('should silently handle pollTask errors', async () => {
      vi.mocked(submitImageTask).mockResolvedValue('token-1');
      vi.mocked(pollTask).mockRejectedValue(new Error('Poll error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderHook(
        ({ scenario }) => useScenarioPregeneration(scenario),
        { initialProps: { scenario: 1 as 1 | 2 | 3 } }
      );

      // Wait for first polling attempt
      await new Promise(resolve => setTimeout(resolve, 2100));

      // Error should be silent
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('polling', () => {
    it('should poll every 2 seconds until image is ready', async () => {
      vi.useFakeTimers();
      vi.mocked(submitImageTask).mockResolvedValue('token-1');
      vi.mocked(pollTask)
        .mockResolvedValueOnce(null) // First poll: still pending
        .mockResolvedValueOnce(null) // Second poll: still pending
        .mockResolvedValueOnce('https://cdn.example.com/image.png'); // Third poll: done

      renderHook(
        ({ scenario }) => useScenarioPregeneration(scenario),
        { initialProps: { scenario: 1 as 1 | 2 | 3 } }
      );

      // Initial wait before first poll
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
      expect(pollTask).toHaveBeenCalledTimes(1);

      // Second poll
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
      expect(pollTask).toHaveBeenCalledTimes(2);

      // Third poll
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
      expect(pollTask).toHaveBeenCalledTimes(3);

      // Should clear in-progress after success
      expect(pregenerationCache[2]?.inProgress).toBeUndefined();

      vi.useRealTimers();
    });
  });
});
```

**Run:** `npm test src/hooks/__tests__/useScenarioPregeneration.test.ts`
**Expected:** All tests FAIL (hook implementation incomplete)

---

#### Step 4: Complete hook implementation to pass tests

**File:** `src/hooks/useScenarioPregeneration.ts` (REWRITE)

```typescript
import { useEffect, useRef } from 'react';
import { submitImageTask, pollTask } from '@/lib/wiro';
import { imageCache } from '@/hooks/useIPhoneAd';

// Get next scenario based on current scenario
function getNextScenario(current: 1 | 2 | 3): 2 | 3 | null {
  if (current === 1) return 2;
  if (current === 2) return 3;
  return null;
}

// Prompts for each scenario (must match useIPhoneAd)
const PROMPTS: Record<2 | 3, string> = {
  2: "professional product photography of Apple iPhone 16 Pro, single device floating in empty space, dramatic side lighting with sharp metallic reflections, pure black background, cinematic studio lighting, ultra detailed titanium edges, luxury premium feel, high fashion editorial style, 8k quality",
  3: "wide aerial shot of massive urban crowd all holding Apple iPhones, city street filled with people, warm golden hour lighting, cinematic composition, powerful sense of conformity and unity, everyone scrolling simultaneously, photorealistic crowd scene, billboard scale imagery, vibrant city atmosphere",
};

// Track which scenarios are currently pre-generating
export const pregenerationCache: Partial<Record<2 | 3, { inProgress?: boolean }>> = {};

export function useScenarioPregeneration(currentScenario: 1 | 2 | 3): void {
  const nextScenario = getNextScenario(currentScenario);
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!nextScenario) {
      return; // No next scenario to pre-generate
    }

    // If already cached or in-progress, skip
    if (imageCache[nextScenario] || pregenerationCache[nextScenario]?.inProgress) {
      return;
    }

    // Mark as in-progress
    pregenerationCache[nextScenario] = { inProgress: true };
    abortRef.current = false;

    const generateBackground = async () => {
      try {
        const token = await submitImageTask(PROMPTS[nextScenario]);

        // Start polling
        const poll = async () => {
          if (abortRef.current) return;

          try {
            const url = await pollTask(token);
            if (url) {
              // Image ready, cache it
              imageCache[nextScenario] = url;
              // Clear in-progress flag
              delete pregenerationCache[nextScenario]?.inProgress;
            } else {
              // Still pending, poll again in 2 seconds
              pollingTimerRef.current = setTimeout(poll, 2000);
            }
          } catch {
            // Silent error on polling (continue polling anyway)
            if (!abortRef.current) {
              pollingTimerRef.current = setTimeout(poll, 2000);
            }
          }
        };

        // Start polling after 2 second delay
        pollingTimerRef.current = setTimeout(poll, 2000);
      } catch {
        // Silent error on submission
        delete pregenerationCache[nextScenario]?.inProgress;
      }
    };

    generateBackground();

    return () => {
      abortRef.current = true;
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, [currentScenario, nextScenario]);
}
```

**Run:** `npm test src/hooks/__tests__/useScenarioPregeneration.test.ts`
**Expected:** All tests PASS

---

#### Step 5: Run all hook tests to verify

**Run:** `npm test src/hooks/__tests__/useScenarioPregeneration.test.ts -v`
**Expected:**
```
✓ next scenario calculation
  ✓ should pre-generate Scenario 2 when current is 1
  ✓ should pre-generate Scenario 3 when current is 2
  ✓ should NOT pre-generate when current is 3
✓ deduplication
  ✓ should not call submitImageTask twice for same scenario
  ✓ should mark scenario as in-progress to prevent duplicates
✓ error handling
  ✓ should silently handle submitImageTask errors
  ✓ should clear in-progress flag on error
  ✓ should silently handle pollTask errors
✓ polling
  ✓ should poll every 2 seconds until image is ready

11 passed
```

---

#### Step 6: Commit hook implementation

**Run:**
```bash
git add src/hooks/useScenarioPregeneration.ts src/hooks/__tests__/useScenarioPregeneration.test.ts
git commit -m "feat: add useScenarioPregeneration hook for background image generation"
```

---

## Chunk 2: Integration and Testing

### Task 2: Integrate hook into Index.tsx

**Files:**
- Modify: `src/pages/Index.tsx`

---

#### Step 1: Write integration test for Index.tsx

**File:** `src/pages/__tests__/Index.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Index from '../Index';

// Mock real session hook
vi.mock('@/hooks/useRealSessionCount', () => ({
  useRealSessionCount: vi.fn(() => ({ count: 1 })),
}));

// Mock scenario pre-generation
vi.mock('@/hooks/useScenarioPregeneration', () => ({
  useScenarioPregeneration: vi.fn(),
}));

// Mock scenario components
vi.mock('@/components/ScenarioWhisper', () => ({
  default: () => <div>Whisper</div>,
}));
vi.mock('@/components/ScenarioRival', () => ({
  default: ({ count }: any) => <div>Rival: {count}</div>,
}));
vi.mock('@/components/ScenarioDictator', () => ({
  default: ({ count }: any) => <div>Dictator: {count}</div>,
}));

import { useScenarioPregeneration } from '@/hooks/useScenarioPregeneration';

describe('Index - Pre-generation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call useScenarioPregeneration with current scenario', () => {
    render(<Index />);

    expect(useScenarioPregeneration).toHaveBeenCalledWith(1);
  });

  it('should call useScenarioPregeneration when count changes', () => {
    const { rerender } = render(<Index />);

    expect(useScenarioPregeneration).toHaveBeenCalledWith(1);

    // Mock hook to return count 2
    vi.mocked(useRealSessionCount).mockReturnValue({ count: 2 } as any);

    rerender(<Index />);

    expect(useScenarioPregeneration).toHaveBeenCalledWith(2);
  });
});
```

**Run:** `npm test src/pages/__tests__/Index.test.tsx`
**Expected:** Tests FAIL (integration not added yet)

---

#### Step 2: Add hook call to Index.tsx

**File:** `src/pages/Index.tsx` (MODIFY)

**Current code (around line 1-20):**
```typescript
import { useMemo } from "react";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import Counter from "@/components/Counter";
import ScenarioWhisper from "@/components/ScenarioWhisper";
import ScenarioRival from "@/components/ScenarioRival";
import ScenarioDictator from "@/components/ScenarioDictator";
import { useRealSessionCount } from "@/hooks/useRealSessionCount";

type Scenario = 1 | 2 | 3;

const getScenario = (count: number): Scenario => {
  if (count <= 1) return 1;
  if (count <= 6) return 2;
  return 3;
};

const Index = () => {
  const { count: viewerCount } = useRealSessionCount();
  const scenario = useMemo(() => getScenario(viewerCount), [viewerCount]);
```

**Replace with:**
```typescript
import { useMemo } from "react";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import Counter from "@/components/Counter";
import ScenarioWhisper from "@/components/ScenarioWhisper";
import ScenarioRival from "@/components/ScenarioRival";
import ScenarioDictator from "@/components/ScenarioDictator";
import { useRealSessionCount } from "@/hooks/useRealSessionCount";
import { useScenarioPregeneration } from "@/hooks/useScenarioPregeneration";

type Scenario = 1 | 2 | 3;

const getScenario = (count: number): Scenario => {
  if (count <= 1) return 1;
  if (count <= 6) return 2;
  return 3;
};

const Index = () => {
  const { count: viewerCount } = useRealSessionCount();
  const scenario = useMemo(() => getScenario(viewerCount), [viewerCount]);

  // Pre-generate next scenario's image
  useScenarioPregeneration(scenario);
```

**Run:** `npm test src/pages/__tests__/Index.test.tsx`
**Expected:** Integration tests PASS

---

#### Step 3: Run full test suite to ensure no regressions

**Run:** `npm test`
**Expected:** All existing tests pass + new tests pass

---

#### Step 4: Manually test scenario transition

**Test steps:**
1. `npm run dev:full` (start frontend + session server)
2. Open browser to `http://localhost:5173`
3. Open DevTools Console
4. Wait ~10 seconds (Rival image pre-generating in background)
5. Open new browser tab to app
6. Verify: **Second tab shows Rival image instantly** (no loading screen)

**Expected:** Scenario 2 transition is instant, no loading delay

---

#### Step 5: Test Dictator transition

**Test steps:**
1. Keep both tabs from previous test open
2. Open 5 more tabs (total 7, triggers Dictator scenario)
3. Watch one of the first tabs
4. Verify: **Scene transitions to Dictator image instantly** (no loading screen)

**Expected:** Scenario 3 transition is instant

---

#### Step 6: Test error handling

**Test steps:**
1. Break API temporarily: modify `.env` to invalid API key
2. Open app, wait for pre-generation to fail silently
3. Restore API key
4. Open new tab (transition to Rival)
5. Verify: **Rival image generates on-demand** (shows loading screen briefly, then image)

**Expected:** Error doesn't crash app, fallback to on-demand generation works

---

#### Step 7: Commit integration

**Run:**
```bash
git add src/pages/Index.tsx src/pages/__tests__/Index.test.tsx
git commit -m "feat: integrate useScenarioPregeneration into Index.tsx"
```

---

## Chunk 3: Documentation and Finalization

### Task 3: Add documentation

**Files:**
- Modify: `docs/superpowers/specs/2026-03-14-scenario-pregeneration-design.md` (already complete)
- Create: `IMPLEMENTATION_NOTES.md` (optional, for developers)

---

#### Step 1: Verify design spec matches implementation

Check that implemented behavior matches spec:
- ✅ Pre-generates next scenario's image
- ✅ Deduplication prevents duplicate API calls
- ✅ Silent error handling
- ✅ Cache reuses imageCache from useIPhoneAd
- ✅ Index.tsx has minimal change (1 hook call)
- ✅ Existing components unchanged

**Run:** `grep -n "useScenarioPregeneration" src/pages/Index.tsx`
**Expected:** 2 matches (import + hook call)

---

#### Step 2: Final test run

**Run:** `npm test`
**Expected:** All tests pass (100% coverage ideal)

**Run:** `npm run build`
**Expected:** Build succeeds with no errors

---

#### Step 3: Final commit

**Run:**
```bash
git add -A
git commit -m "docs: finalize scenario pre-generation implementation

- useScenarioPregeneration hook with deduplication
- Background polling for image generation
- Silent error handling
- Integration into Index.tsx with zero breaking changes
- Comprehensive test coverage for all edge cases"
```

---

## Summary

| Step | File | Lines | Action |
|------|------|-------|--------|
| 1-6 | `src/hooks/useScenarioPregeneration.ts` | ~120 | NEW: Hook + tests |
| 2 | `src/pages/Index.tsx` | +2 | ADD: Hook call + import |
| Total | | ~122 | **Complete implementation** |

**Timeline:**
- Tests: ~15 min
- Hook implementation: ~10 min
- Integration: ~5 min
- Manual testing: ~10 min
- **Total: ~40 minutes**

**Success criteria:**
✅ Scenario transitions are instant (no loading delay)
✅ All tests pass
✅ No regressions in existing functionality
✅ Error handling is silent and graceful
✅ Build succeeds
