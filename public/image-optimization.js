/**
 * Image Optimization for Monomyth VTT
 * Automatically resizes and converts ALL images to WebP format
 * WebP provides 25-35% better compression than JPEG at equivalent quality
 */

// Configuration - Optimized for WebP
const IMAGE_LIMITS = {
    sceneImage: {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.82, // WebP quality (slightly higher since WebP is more efficient)
        maxFileSize: 1 * 1024 * 1024, // 1MB target (WebP is smaller)
        backgroundColor: '#000000' // Black background for scenes
    },
    avatar: {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.87, // WebP quality for avatars
        maxFileSize: 200 * 1024, // 200KB target (WebP is much smaller)
        backgroundColor: '#1a1a1a' // Dark gray for avatars
    },
    token: {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.87, // WebP quality for tokens
        maxFileSize: 200 * 1024, // 200KB target
        backgroundColor: '#1a1a1a' // Dark gray for tokens
    }
};

/**
 * Optimizes an image file for network transmission
 * @param {File} file - The image file to optimize
 * @param {string} type - Image type: 'sceneImage', 'avatar', or 'token'
 * @returns {Promise<string>} - Optimized base64 data URL
 */
async function optimizeImage(file, type = 'sceneImage') {
    const limits = IMAGE_LIMITS[type];
    
    console.log(`📤 Processing ${type}: ${file.name} (${file.type})`);
    
    // Check file size first
    if (file.size > 10 * 1024 * 1024) { // 10MB absolute max
        throw new Error(`Image too large! Maximum file size is 10MB. Your image: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        
        reader.onerror = () => reject(new Error('Failed to read image file'));
        
        img.onload = () => {
            try {
                // Calculate new dimensions maintaining aspect ratio
                let width = img.width;
                let height = img.height;
                
                if (width > limits.maxWidth || height > limits.maxHeight) {
                    const ratio = Math.min(
                        limits.maxWidth / width,
                        limits.maxHeight / height
                    );
                    width = Math.floor(width * ratio);
                    height = Math.floor(height * ratio);
                    
                    console.log(`📏 Resizing ${type} from ${img.width}x${img.height} to ${width}x${height}`);
                }
                
                // Create canvas and draw resized image
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                
                // Fill background color (handles PNG transparency)
                ctx.fillStyle = limits.backgroundColor;
                ctx.fillRect(0, 0, width, height);
                
                // Draw image with high quality
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to WebP for superior compression
                // WebP gives 25-35% better compression than JPEG at equivalent quality
                const optimizedDataUrl = canvas.toDataURL('image/webp', limits.quality);
                
                // Calculate compression ratio
                const finalSize = Math.round((optimizedDataUrl.length * 3) / 4);
                const compressionRatio = ((1 - finalSize / file.size) * 100).toFixed(1);
                
                console.log(`✅ Optimized ${type} (WebP): ${(finalSize / 1024).toFixed(2)}KB (original: ${(file.size / 1024).toFixed(2)}KB) - ${compressionRatio}% smaller`);
                
                if (finalSize > limits.maxFileSize) {
                    console.warn(`⚠️ Optimized image still large: ${(finalSize / 1024).toFixed(2)}KB (target: ${(limits.maxFileSize / 1024).toFixed(2)}KB)`);
                }
                
                resolve(optimizedDataUrl);
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        
        reader.readAsDataURL(file);
    });
}

/**
 * Shows a progress/status message to user
 */
function showImageStatus(message, type = 'info') {
    console.log(`[Image Upload] ${message}`);
    // Could add visual toast notification here
}

// Export for use in main app
if (typeof window !== 'undefined') {
    window.optimizeImage = optimizeImage;
    window.showImageStatus = showImageStatus;
}
