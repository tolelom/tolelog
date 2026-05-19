import { useEffect, useRef } from 'react';

/**
 * 모달이 열릴 때 직전 포커스 요소를 저장하고, 닫힐 때 그 요소로 포커스를 복원한다.
 * isOpen 이 false→true 로 바뀌는 시점의 document.activeElement 가 트리거 버튼인 경우가 일반적이다.
 */
export function useReturnFocus(isOpen: boolean): void {
    const previouslyFocusedRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
        return () => {
            const el = previouslyFocusedRef.current;
            if (el && typeof el.focus === 'function' && document.body.contains(el)) {
                el.focus();
            }
        };
    }, [isOpen]);
}
