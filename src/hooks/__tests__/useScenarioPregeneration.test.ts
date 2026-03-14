import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScenarioPregeneration, pregenerationCache } from '../useScenarioPregeneration';
import * as wiro from '@/lib/wiro';
import { imageCache } from '@/hooks/useIPhoneAd';

// Mock the wiro module
vi.mock('@/lib/wiro');

describe('useScenarioPregeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(pregenerationCache).forEach(key => {
      delete pregenerationCache[key as any];
    });
    Object.keys(imageCache).forEach(key => {
      delete imageCache[key as any];
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('next scenario calculation', () => {
    it('should return 2 (Rival) as next scenario when current is 1 (Whisper)', () => {
      const mockSubmit = vi.fn().mockResolvedValue('token-1');
      vi.mocked(wiro.submitImageTask).mockImplementation(mockSubmit);

      renderHook(() => useScenarioPregeneration(1));

      // Advance timers to allow promises to resolve
      vi.advanceTimersByTime(1);

      // Should have called submitImageTask with scenario 2's prompt
      expect(mockSubmit).toHaveBeenCalled();
      const prompt = mockSubmit.mock.calls[0][0];
      expect(prompt).toContain('professional product photography');
    });

    it('should return 3 (Dictator) as next scenario when current is 2 (Rival)', () => {
      const mockSubmit = vi.fn().mockResolvedValue('token-2');
      vi.mocked(wiro.submitImageTask).mockImplementation(mockSubmit);

      renderHook(() => useScenarioPregeneration(2));

      vi.advanceTimersByTime(1);

      expect(mockSubmit).toHaveBeenCalled();
      const prompt = mockSubmit.mock.calls[0][0];
      expect(prompt).toContain('aerial shot');
    });

    it('should return null as next scenario when current is 3 (Dictator)', () => {
      const mockSubmit = vi.fn();
      vi.mocked(wiro.submitImageTask).mockImplementation(mockSubmit);

      renderHook(() => useScenarioPregeneration(3));

      vi.advanceTimersByTime(1);

      // Should not call submitImageTask since there's no next scenario
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('deduplication', () => {
    it('should not start generation twice for same scenario', () => {
      const mockSubmit = vi.fn().mockResolvedValue('token-1');
      vi.mocked(wiro.submitImageTask).mockImplementation(mockSubmit);

      const { rerender } = renderHook(
        ({ scenario }) => useScenarioPregeneration(scenario),
        { initialProps: { scenario: 1 } }
      );

      vi.advanceTimersByTime(1);

      // First call should succeed
      expect(mockSubmit).toHaveBeenCalledTimes(1);

      // Rerender with same scenario
      rerender({ scenario: 1 });

      // Clear the mock to count new calls
      const callsBeforeRerender = mockSubmit.mock.calls.length;

      // Advance timer just in case there's a new call
      vi.advanceTimersByTime(1);

      // Should not have made additional calls due to inProgress flag
      expect(mockSubmit.mock.calls.length - callsBeforeRerender).toBe(0);
    });

    it('should skip generation if image already cached', () => {
      const mockSubmit = vi.fn().mockResolvedValue('token-1');
      vi.mocked(wiro.submitImageTask).mockImplementation(mockSubmit);

      // Pre-cache the image
      imageCache[2] = 'https://example.com/cached.jpg';

      renderHook(() => useScenarioPregeneration(1));

      vi.advanceTimersByTime(1);

      // Should not call submitImageTask if already cached
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should silently handle submitImageTask errors without console output', () => {
      const mockSubmit = vi.fn().mockRejectedValue(new Error('API Error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(wiro.submitImageTask).mockImplementation(mockSubmit);

      renderHook(() => useScenarioPregeneration(1));

      // Advance to let promise rejection be processed
      vi.advanceTimersByTime(1);

      // Should not propagate error to console
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should silently handle pollTask errors', () => {
      const mockSubmit = vi.fn().mockResolvedValue('token-1');
      const mockPoll = vi.fn().mockRejectedValue(new Error('Poll Error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(wiro.submitImageTask).mockImplementation(mockSubmit);
      vi.mocked(wiro.pollTask).mockImplementation(mockPoll);

      renderHook(() => useScenarioPregeneration(1));

      // Advance to first poll attempt (2 seconds to trigger poll, then some for promise)
      vi.advanceTimersByTime(2010);

      // Verify error doesn't leak to console
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should skip polling if no next scenario exists', () => {
      const mockSubmit = vi.fn();
      const mockPoll = vi.fn();
      vi.mocked(wiro.submitImageTask).mockImplementation(mockSubmit);
      vi.mocked(wiro.pollTask).mockImplementation(mockPoll);

      renderHook(() => useScenarioPregeneration(3));

      vi.advanceTimersByTime(1);

      // Neither submit nor poll should be called
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(mockPoll).not.toHaveBeenCalled();
    });
  });

  describe('polling', () => {
    it('should mark scenario as inProgress when starting generation', () => {
      const mockSubmit = vi.fn().mockResolvedValue('token-123');
      vi.mocked(wiro.submitImageTask).mockImplementation(mockSubmit);

      renderHook(() => useScenarioPregeneration(1));

      vi.advanceTimersByTime(1);

      // Verify that submitImageTask was called
      expect(mockSubmit).toHaveBeenCalled();

      // Verify that the scenario is marked as inProgress
      expect(pregenerationCache[2]?.inProgress).toBe(true);
    });

    it('should not call submitImageTask if scenario is already inProgress', () => {
      const mockSubmit = vi.fn().mockResolvedValue('token-1');
      vi.mocked(wiro.submitImageTask).mockImplementation(mockSubmit);

      // Mark scenario 2 as already in progress
      pregenerationCache[2] = { inProgress: true };

      renderHook(() => useScenarioPregeneration(1));

      vi.advanceTimersByTime(1);

      // Verify that submitImageTask was NOT called (already in progress)
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup timers on unmount', () => {
      const mockSubmit = vi.fn().mockResolvedValue('token-1');
      vi.mocked(wiro.submitImageTask).mockImplementation(mockSubmit);

      const { unmount } = renderHook(() => useScenarioPregeneration(1));

      vi.advanceTimersByTime(1);

      // Unmount the hook
      unmount();

      // Advancing timers further should not cause issues
      expect(() => {
        vi.advanceTimersByTime(2000);
      }).not.toThrow();
    });
  });
});