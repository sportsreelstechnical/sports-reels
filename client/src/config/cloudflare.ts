// Cloudflare R2 Configuration
export const CLOUDFLARE_CONFIG = {
    // Your Cloudflare Account ID
    accountId: '31ad0bcfb7e2c3a8bab2566eeabf1f4c',

    // R2 Access Keys (from your R2 dashboard)
    accessKeyId: '3273ac17ec3ae48a772292d23a0475d3',
    secretAccessKey: 'a69fbcb07331f7232ba245dc5378fb11ac6f861bb68503b4d9f3e6fb3ab0d47c',

    // R2 Bucket Name
    bucketName: 'testsports',

    // Optional: Custom public URL if you have a custom domain
    publicUrl: undefined, // e.g., 'https://videos.yourdomain.com'

    // R2 Endpoint (automatically constructed)
    endpoint: 'https://31ad0bcfb7e2c3a8bab2566eeabf1f4c.r2.cloudflarestorage.com',
};

// Environment-specific configuration
export const getCloudflareConfig = () => {
    // Use import.meta.env for Vite environment variables in the browser
    return {
        accountId: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID || CLOUDFLARE_CONFIG.accountId,
        accessKeyId: import.meta.env.VITE_CLOUDFLARE_ACCESS_KEY_ID || CLOUDFLARE_CONFIG.accessKeyId,
        secretAccessKey: import.meta.env.VITE_CLOUDFLARE_SECRET_ACCESS_KEY || CLOUDFLARE_CONFIG.secretAccessKey,
        bucketName: import.meta.env.VITE_CLOUDFLARE_BUCKET_NAME || CLOUDFLARE_CONFIG.bucketName,
        publicUrl: import.meta.env.VITE_CLOUDFLARE_PUBLIC_URL || CLOUDFLARE_CONFIG.publicUrl,
    };
};
