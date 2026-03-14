import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// Mock real session hook
vi.mock('@/hooks/useRealSessionCount', () => {
  return {
    useRealSessionCount: vi.fn(() => ({ count: 1 })),
  };
});

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

// Mock Counter component
vi.mock('@/components/Counter', () => ({
  default: () => <div>Counter</div>,
}));

import Index from '../Index';
import { useScenarioPregeneration } from '@/hooks/useScenarioPregeneration';
import { useRealSessionCount } from '@/hooks/useRealSessionCount';

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

    // Update mock to return count 2
    vi.mocked(useRealSessionCount).mockReturnValue({ count: 2 });

    rerender(<Index />);

    expect(useScenarioPregeneration).toHaveBeenCalledWith(2);
  });
});
