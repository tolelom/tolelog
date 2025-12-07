import { useRef, useState } from 'react';
import { validateImageFile, fileToBase64, compressImage } from '../utils/imageUpload';
import './ImageUploadButton.css';

export default function ImageUploadButton({ onImageInsert }) {
    const fileInputRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');
        setIsLoading(true);

        try {
            // 파일 유효성 검사
            const validation = validateImageFile(file);
            if (!validation.valid) {
                setError(validation.error);
                setIsLoading(false);
                return;
            }

            // 이미지 압축 (단차 처리)
            const compressedFile = await compressImage(file);
            
            // Base64로 변환
            const base64Data = await fileToBase64(compressedFile);
            
            // 편집기에 마크다운 주입
            if (onImageInsert) {
                onImageInsert(base64Data, file.name);
            }

            // 입력 초기화
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err) {
            setError('이미지 처리 중 오류가 발생했습니다.');
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
                title="을른 딩 또는 날드로 Ctrl+G / ⌘+G"
            >
                {isLoading ? (
                    <>
                        <span className="spinner-small"></span>
                        로드중...
                    </>
                ) : (
                    <>
                        🖼﻿ 이미지 추가
                    </>
                )}
            </button>
            {error && <div className="image-error">{error}</div>}
        </div>
    );
}
