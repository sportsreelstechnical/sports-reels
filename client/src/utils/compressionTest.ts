// Compression Test Utility
// Test the compression services and fallback system

export const testCompressionServices = async () => {
    console.log('🧪 Testing compression services...');

    // Test browser support
    const testCanvas = document.createElement('canvas');
    const testGL = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');

    console.log('📊 Browser Support:');
    console.log(`  WebCodecs API: ${typeof VideoEncoder !== 'undefined' ? 'Available' : 'Not Available'}`);
    console.log(`  WebGL: ${testGL ? 'Available' : 'Not Available'}`);
    console.log(`  Canvas: Available`);

    // Test WebCodecs functionality
    if (typeof VideoEncoder !== 'undefined') {
        try {
            const testEncoder = new VideoEncoder({
                output: () => { },
                error: () => { }
            });
            testEncoder.close();
            console.log('✅ WebCodecs: Functional');
        } catch (error) {
            console.log('❌ WebCodecs: Not functional -', error.message);
        }
    }

    // Test MediaRecorder support
    const supportedTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/mp4;codecs=h264',
        'video/webm'
    ];

    console.log('📹 MediaRecorder Support:');
    supportedTypes.forEach(type => {
        const supported = MediaRecorder.isTypeSupported(type);
        console.log(`  ${type}: ${supported ? '✅' : '❌'}`);
    });

    return {
        webCodecs: typeof VideoEncoder !== 'undefined',
        webgl: !!testGL,
        canvas: true,
        mediaRecorder: supportedTypes.some(type => MediaRecorder.isTypeSupported(type))
    };
};

export const createTestVideoFile = (): Promise<File> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d')!;

        // Create a simple test video
        const stream = canvas.captureStream(30);
        const mediaRecorder = new MediaRecorder(stream);

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (event) => {
            chunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const file = new File([blob], 'test-video.webm', { type: 'video/webm' });
            resolve(file);
        };

        // Draw some content
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Arial';
        ctx.fillText('Test Video', 200, 240);

        mediaRecorder.start();

        // Record for 2 seconds
        setTimeout(() => {
            mediaRecorder.stop();
        }, 2000);
    });
};

// Export for use in components
export default { testCompressionServices, createTestVideoFile };
