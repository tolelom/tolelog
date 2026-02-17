import { IMAGE_CONSTRAINTS } from './constants';
import { IMAGE_API } from './api';

export const validateImageFile = (file) => {
    if (!IMAGE_CONSTRAINTS.ALLOWED_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: 'JPG, PNG, GIF, WebP 형식만 지원합니다.'
        };
    }

    if (file.size > IMAGE_CONSTRAINTS.MAX_SIZE) {
        return {
            valid: false,
            error: '파일 크기는 5MB 이하여야 합니다.'
        };
    }

    return { valid: true };
};

export const compressImage = async (file, maxWidth = IMAGE_CONSTRAINTS.MAX_WIDTH, quality = IMAGE_CONSTRAINTS.QUALITY) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

export const uploadImageToServer = async (file, token) => {
    const response = await IMAGE_API.upload(file, token);
    if (response.status === 'success') {
        return response.data.url;
    }
    throw new Error('이미지 업로드에 실패했습니다');
};

export const createMarkdownImage = (url, fileName = '이미지') => {
    return `![${fileName}](${url})`;
};
