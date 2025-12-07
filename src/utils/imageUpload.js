/**
 * 이미지를 Base64로 변환하는 유틸
 * localStorage에 저장할 수 있도록 처리
 */
export const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * 이미지 파일 유효성 검사
 */
export const validateImageFile = (file) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'JPG, PNG, GIF, WebP 형식만 지원합니다.'
        };
    }

    if (file.size > maxSize) {
        return {
            valid: false,
            error: '파일 크기는 5MB 이하여야 합니다.'
        };
    }

    return { valid: true };
};

/**
 * 마크다운 이미지 문법 생성
 */
export const createMarkdownImage = (base64Data, fileName = '이미지') => {
    return `![${fileName}](${base64Data})`;
};

/**
 * 이미지 압축 (선택적)
 */
export const compressImage = async (file, maxWidth = 1200, quality = 0.8) => {
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
