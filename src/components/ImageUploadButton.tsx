import React, { useRef, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { validateImageFile, compressImage, uploadImageToServer } from '../utils/imageUpload';
import { API_BASE_URL } from '../utils/constants';
import './ImageUploadButton.css';

interface ImageUploadButtonProps {
    onImageInsert?: (url: string, fileName: string) => void;
}

export default function ImageUploadButton({ onImageInsert }: ImageUploadButtonProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const { token } = useContext(AuthContext);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');
        setIsLoading(true);

        try {
            const validation = validateImageFile(file);
            if (!validation.valid) {
                setError(validation.error ?? '유효하지 않은 이미지입니다.');
                setIsLoading(false);
                return;
            }

            // 이미지 압축
            const compressedFile = await compressImage(file);

            // 서버에 업로드
            if (!token) {
                setError('로그인이 필요합니다.');
                setIsLoading(false);
                return;
            }
            const imageUrl = await uploadImageToServer(compressedFile, token);

            // API_BASE_URL에서 /api/v1 부분을 제거하여 서버 origin 추출
            const serverOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
            const fullUrl = `${serverOrigin}${imageUrl}`;

            if (onImageInsert) {
                onImageInsert(fullUrl, file.name);
            }

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : '이미지 업로드 중 오류가 발생했습니다.';
            setError(message);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="image-upload-button">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />
            <button
                type="button"
                className="image-btn"
                onClick={handleClick}
                disabled={isLoading}
                title="이미지 업로드 (Ctrl+G / ⌘+G)"
            >
                {isLoading ? (
                    <>
                        <span className="spinner-small"></span>
                        업로드중...
                    </>
                ) : (
                    <>
                        {"🖼 이미지 추가"}
                    </>
                )}
            </button>
            {error && <div className="image-error">{error}</div>}
        </div>
    );
}
