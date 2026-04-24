// Note: spec referenced ref.insertImage but the component exposes image insertion via onImageInsert callback, tested in ImageUploadButton integration.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useRef } from 'react';
import BlockEditor, { type BlockEditorHandle } from '../BlockEditor';

function Harness({
    content,
    onChange,
    expose,
}: {
    content: string;
    onChange: (v: string) => void;
    expose?: (ref: React.RefObject<BlockEditorHandle | null>) => void;
}) {
    const ref = useRef<BlockEditorHandle | null>(null);
    if (expose) expose(ref);
    return <BlockEditor ref={ref} content={content} onChange={onChange} token={null} />;
}

describe('BlockEditor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('초기 content를 여러 블록(div)으로 렌더한다', () => {
        const { container } = render(<Harness content={'# A\n\n# B'} onChange={() => {}} />);
        // Blocks render as .block-rendered divs when inactive
        const blockDivs = container.querySelectorAll('.block-rendered');
        expect(blockDivs.length).toBeGreaterThanOrEqual(2);
    });

    it('블록을 클릭해 활성화하면 textarea가 나타나고, 값을 바꾸면 onChange가 호출된다', () => {
        const onChange = vi.fn();
        const { container } = render(<Harness content="hello" onChange={onChange} />);
        // Click the block to activate it (renders as div initially)
        const blockDiv = container.querySelector('.block-rendered') as HTMLElement;
        fireEvent.click(blockDiv);
        // Now it should be a textarea
        const ta = container.querySelector('textarea') as HTMLTextAreaElement;
        expect(ta).toBeTruthy();
        fireEvent.change(ta, { target: { value: 'world' } });
        expect(onChange).toHaveBeenCalled();
        const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
        expect(lastArg).toContain('world');
    });

    it('textarea에 Enter를 누르면 블록이 분할되고 onChange가 호출된다', () => {
        const onChange = vi.fn();
        const { container } = render(<Harness content="one" onChange={onChange} />);
        // Click the block to activate it
        const blockDiv = container.querySelector('.block-rendered') as HTMLElement;
        fireEvent.click(blockDiv);
        const ta = container.querySelector('textarea') as HTMLTextAreaElement;
        expect(ta).toBeTruthy();
        fireEvent.keyDown(ta, { key: 'Enter' });
        expect(onChange).toHaveBeenCalled();
    });

    it('ref.wrapSelection이 onChange를 새 content로 호출한다 (selection 없는 커서 삽입)', async () => {
        const onChange = vi.fn();
        let capturedRef: React.RefObject<BlockEditorHandle | null> | null = null;
        const { container } = render(
            <Harness content="hi" onChange={onChange} expose={(r) => { capturedRef = r; }} />
        );
        // Click the block to activate it (sets activeIndex) and flush state
        const blockDiv = container.querySelector('.block-rendered') as HTMLElement;
        await act(async () => {
            fireEvent.click(blockDiv);
        });
        const ta = container.querySelector('textarea') as HTMLTextAreaElement;
        expect(ta).toBeTruthy();
        // Focus and set selection within act to ensure ref + state are synced
        await act(async () => {
            fireEvent.focus(ta);
            ta.setSelectionRange(0, 0);
        });
        onChange.mockClear();
        act(() => {
            capturedRef!.current!.wrapSelection('**', '**');
        });
        expect(onChange).toHaveBeenCalled();
        const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
        expect(lastArg).toMatch(/\*\*/);
    });

    it('초기 content가 비어 있어도 에러 없이 렌더된다', () => {
        expect(() => render(<Harness content="" onChange={() => {}} />)).not.toThrow();
        // Empty content renders a single empty block as a div (not a textarea, since not active)
        // The block-empty-area click target is also present
        const { container } = render(<Harness content="" onChange={() => {}} />);
        expect(container.querySelector('.block-editor')).toBeTruthy();
    });
});
