import { IMAGE_CONSTRAINTS } from './constants';

export const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

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

export const createMarkdownImage = (base64Data, fileName = '이미지') => {
    return `![${fileName}](${base64Data})`;
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
                        resolve(blob);
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
