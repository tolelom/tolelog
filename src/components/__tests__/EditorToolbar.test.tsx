import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import EditorToolbar from '../EditorToolbar';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

describe('EditorToolbar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('모든 포맷 버튼과 미리보기 버튼이 렌더된다', () => {
        renderWithProviders(
            <EditorToolbar
                onFormat={vi.fn()}
                onImageInsert={vi.fn()}
                onPreview={vi.fn()}
                previewDisabled={false}
            />
        );
        expect(screen.getByTitle(/제목/)).toBeInTheDocument();
        expect(screen.getByTitle(/굵게/)).toBeInTheDocument();
        expect(screen.getByTitle(/기울임/)).toBeInTheDocument();
        expect(screen.getByTitle(/취소선/)).toBeInTheDocument();
        expect(screen.getByTitle(/인라인 코드/)).toBeInTheDocument();
        expect(screen.getByTitle(/링크/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '미리보기' })).toBeInTheDocument();
    });

    it('각 포맷 버튼 클릭이 올바른 type으로 onFormat을 호출한다', () => {
        const onFormat = vi.fn();
        renderWithProviders(
            <EditorToolbar
                onFormat={onFormat}
                onImageInsert={vi.fn()}
                onPreview={vi.fn()}
                previewDisabled={false}
            />
        );
        fireEvent.click(screen.getByTitle(/제목/));
        fireEvent.click(screen.getByTitle(/굵게/));
        fireEvent.click(screen.getByTitle(/기울임/));
        fireEvent.click(screen.getByTitle(/취소선/));
        fireEvent.click(screen.getByTitle(/인라인 코드/));
        fireEvent.click(screen.getByTitle(/링크/));
        expect(onFormat).toHaveBeenNthCalledWith(1, 'heading');
        expect(onFormat).toHaveBeenNthCalledWith(2, 'bold');
        expect(onFormat).toHaveBeenNthCalledWith(3, 'italic');
        expect(onFormat).toHaveBeenNthCalledWith(4, 'strikethrough');
        expect(onFormat).toHaveBeenNthCalledWith(5, 'code');
        expect(onFormat).toHaveBeenNthCalledWith(6, 'link');
    });

    it('previewDisabled=true이면 미리보기 버튼이 비활성화된다', () => {
        renderWithProviders(
            <EditorToolbar
                onFormat={vi.fn()}
                onImageInsert={vi.fn()}
                onPreview={vi.fn()}
                previewDisabled={true}
            />
        );
        expect(screen.getByRole('button', { name: '미리보기' })).toBeDisabled();
    });
});
