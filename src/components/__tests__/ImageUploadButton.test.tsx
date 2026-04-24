import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ImageUploadButton from '../ImageUploadButton';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import * as imageUpload from '../../utils/imageUpload';

vi.mock('../../utils/imageUpload', () => ({
    validateImageFile: vi.fn(() => ({ valid: true })),
    compressImage: vi.fn(async (f: File) => f),
    uploadImageToServer: vi.fn(),
}));

function makeFile(): File {
    return new File(['(binary)'], 'pic.png', { type: 'image/png' });
}

describe('ImageUploadButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(imageUpload.validateImageFile).mockReturnValue({ valid: true });
        vi.mocked(imageUpload.compressImage).mockImplementation(async (f: File) => f);
    });

    it('업로드 실패 시 인라인 에러를 표시하고 onImageInsert는 호출되지 않는다', async () => {
        vi.mocked(imageUpload.uploadImageToServer).mockRejectedValueOnce(new Error('서버 오류'));
        const onImageInsert = vi.fn();

        const { container } = renderWithProviders(
            <ImageUploadButton onImageInsert={onImageInsert} />,
            { authValue: { token: 'T' } }
        );
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(input, { target: { files: [makeFile()] } });

        expect(await screen.findByText('서버 오류')).toBeInTheDocument();
        expect(onImageInsert).not.toHaveBeenCalled();
    });

    it('업로드 성공 시 onImageInsert를 fullUrl과 파일명으로 호출한다', async () => {
        vi.mocked(imageUpload.uploadImageToServer).mockResolvedValueOnce('/uploads/abc.png');
        const onImageInsert = vi.fn();

        const { container } = renderWithProviders(
            <ImageUploadButton onImageInsert={onImageInsert} />,
            { authValue: { token: 'T' } }
        );
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(input, { target: { files: [makeFile()] } });

        await waitFor(() => expect(onImageInsert).toHaveBeenCalled());
        const [fullUrl, fileName] = onImageInsert.mock.calls[0];
        expect(fullUrl.endsWith('/uploads/abc.png')).toBe(true);
        expect(fileName).toBe('pic.png');
    });
});
