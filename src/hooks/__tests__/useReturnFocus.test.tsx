import { describe, it, expect, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useState } from 'react';
import { useReturnFocus } from '../useReturnFocus';

afterEach(() => {
    document.body.innerHTML = '';
});

function Harness({ initialOpen = false }: { initialOpen?: boolean }) {
    const [open, setOpen] = useState(initialOpen);
    useReturnFocus(open);
    return (
        <div>
            <button data-testid="trigger" onClick={() => setOpen(true)}>Open</button>
            {open && (
                <div role="dialog" data-testid="modal">
                    <button data-testid="close" onClick={() => setOpen(false)}>Close</button>
                </div>
            )}
        </div>
    );
}

describe('useReturnFocus', () => {
    it('restores focus to the trigger when the modal closes', () => {
        const { getByTestId } = render(<Harness />);
        const trigger = getByTestId('trigger') as HTMLButtonElement;

        // 트리거 버튼이 포커스를 잡은 상태에서 모달 열기
        act(() => trigger.focus());
        expect(document.activeElement).toBe(trigger);

        act(() => trigger.click());
        const close = getByTestId('close') as HTMLButtonElement;
        // 닫기 버튼이 트리거를 포커스 stealing 한 상황을 시뮬레이션
        act(() => close.focus());
        expect(document.activeElement).toBe(close);

        // 모달 닫으면 트리거로 포커스 복원
        act(() => close.click());
        expect(document.activeElement).toBe(trigger);
    });

    it('does nothing when isOpen stays false', () => {
        const { getByTestId } = render(<Harness />);
        const trigger = getByTestId('trigger');
        act(() => (trigger as HTMLElement).focus());
        // unmount 가 일어나지 않으면 cleanup 호출 안 됨 — 포커스 그대로
        expect(document.activeElement).toBe(trigger);
    });

    it('does not throw when previously focused element is removed', () => {
        function H() {
            const [open, setOpen] = useState(false);
            const [showTrigger, setShowTrigger] = useState(true);
            useReturnFocus(open);
            return (
                <>
                    {showTrigger && (
                        <button
                            data-testid="t"
                            onClick={() => {
                                setOpen(true);
                                setShowTrigger(false); // 모달 열림과 동시에 트리거 DOM에서 제거
                            }}
                        >open</button>
                    )}
                    {open && (
                        <button data-testid="c" onClick={() => setOpen(false)}>close</button>
                    )}
                </>
            );
        }
        const { getByTestId } = render(<H />);
        const t = getByTestId('t') as HTMLButtonElement;
        act(() => t.focus());
        act(() => t.click());
        // 트리거는 DOM 에서 사라졌지만 클로즈가 정상 동작해야 한다
        const c = getByTestId('c') as HTMLButtonElement;
        expect(() => act(() => c.click())).not.toThrow();
    });
});
