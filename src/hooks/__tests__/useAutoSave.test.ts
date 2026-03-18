import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from '../useAutoSave';
import type { PostFormData } from '../../types';

const TEST_KEY = 'test_draft';

const mockFormData: PostFormData = {
  title: 'Test Title',
  content: 'Test Content',
  is_public: true,
  tags: 'tag1,tag2',
};

describe('useAutoSave', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with saving status on mount', () => {
    const { result } = renderHook(() => useAutoSave(mockFormData, TEST_KEY));
    expect(result.current.saveStatus).toBe('saving');
  });

  it('saves draft to localStorage after debounce delay', () => {
    renderHook(() => useAutoSave(mockFormData, TEST_KEY));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const saved = localStorage.getItem(TEST_KEY);
    expect(saved).not.toBeNull();

    const parsed = JSON.parse(saved!);
    expect(parsed.title).toBe('Test Title');
    expect(parsed.content).toBe('Test Content');
    expect(parsed.is_public).toBe(true);
    expect(parsed.tags).toBe('tag1,tag2');
    expect(parsed.savedAt).toBeDefined();
  });

  it('transitions to saved status after debounce', () => {
    const { result } = renderHook(() => useAutoSave(mockFormData, TEST_KEY));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.saveStatus).toBe('saved');
  });

  it('does not save before debounce delay', () => {
    renderHook(() => useAutoSave(mockFormData, TEST_KEY));

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(localStorage.getItem(TEST_KEY)).toBeNull();
  });

  it('loadDraft returns saved data', () => {
    const { result } = renderHook(() => useAutoSave(mockFormData, TEST_KEY));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const draft = result.current.loadDraft();
    expect(draft).not.toBeNull();
    expect(draft!.title).toBe('Test Title');
  });

  it('loadDraft returns null when no draft exists', () => {
    const { result } = renderHook(() => useAutoSave(mockFormData, 'nonexistent_key'));
    // Don't wait for save — check a different key
    const draft = result.current.loadDraft();
    expect(draft).toBeNull();
  });

  it('clearDraft removes data from localStorage', () => {
    const { result } = renderHook(() => useAutoSave(mockFormData, TEST_KEY));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(localStorage.getItem(TEST_KEY)).not.toBeNull();

    act(() => {
      result.current.clearDraft();
    });

    expect(localStorage.getItem(TEST_KEY)).toBeNull();
  });

  it('hasDraft returns true when draft exists', () => {
    const { result } = renderHook(() => useAutoSave(mockFormData, TEST_KEY));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.hasDraft()).toBe(true);
  });

  it('hasDraft returns false when no draft exists', () => {
    const { result } = renderHook(() => useAutoSave(mockFormData, TEST_KEY));
    // Clear first to ensure nothing is there
    act(() => {
      result.current.clearDraft();
    });
    expect(result.current.hasDraft()).toBe(false);
  });

  it('debounces rapid changes', () => {
    const { rerender } = renderHook(
      ({ data }) => useAutoSave(data, TEST_KEY),
      { initialProps: { data: mockFormData } }
    );

    // Change data before debounce fires
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const updatedData: PostFormData = { ...mockFormData, title: 'Updated Title' };
    rerender({ data: updatedData });

    // Advance past the new debounce
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const saved = JSON.parse(localStorage.getItem(TEST_KEY)!);
    expect(saved.title).toBe('Updated Title');
  });
});
