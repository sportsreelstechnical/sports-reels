
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

export class VideoCompressionService {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;

  async initialize(): Promise<void> {
    if (this.isLoaded) return;

    this.ffmpeg = new FFmpeg();
    
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.isLoaded = true;
  }

  async compressVideo(
    file: File,
    targetSizeMB: number = 10,
    onProgress?: (progress: number) => void
  ): Promise<{
    compressedFile: File;
    originalSizeMB: number;
    compressedSizeMB: number;
    compressionRatio: number;
  }> {
    if (!this.ffmpeg) await this.initialize();
    if (!this.ffmpeg) throw new Error('FFmpeg not initialized');

    const originalSizeMB = file.size / (1024 * 1024);
    
    // If file is already under target size, return as is
    if (originalSizeMB <= targetSizeMB) {
      return {
        compressedFile: file,
        originalSizeMB,
        compressedSizeMB: originalSizeMB,
        compressionRatio: 1
      };
    }

    const inputName = 'input.mp4';
    const outputName = 'output.mp4';

    // Write file to FFmpeg filesystem
    await this.ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

    // Calculate compression parameters
    const targetBitrate = Math.floor((targetSizeMB * 8 * 1024) / (file.size / (1024 * 1024 * 8)) * 0.8); // 80% of calculated to be safe
    
    // Set up progress monitoring
    this.ffmpeg.on('progress', ({ progress }) => {
      if (onProgress) {
        onProgress(Math.round(progress * 100));
      }
    });

    // Compress video with optimized settings
    await this.ffmpeg.exec([
      '-i', inputName,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '28',
      '-maxrate', `${targetBitrate}k`,
      '-bufsize', `${targetBitrate * 2}k`,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y',
      outputName
    ]);

    // Read compressed file
    const compressedData = await this.ffmpeg.readFile(outputName);
    const compressedBlob = new Blob([compressedData], { type: 'video/mp4' });
    const compressedSizeMB = compressedBlob.size / (1024 * 1024);
    
    const compressedFile = new File([compressedBlob], file.name, {
      type: 'video/mp4',
      lastModified: Date.now()
    });

    // Clean up
    await this.ffmpeg.deleteFile(inputName);
    await this.ffmpeg.deleteFile(outputName);

    return {
      compressedFile,
      originalSizeMB,
      compressedSizeMB,
      compressionRatio: originalSizeMB / compressedSizeMB
    };
  }

  async generateThumbnail(file: File, timestampSeconds: number = 5): Promise<Blob> {
    if (!this.ffmpeg) await this.initialize();
    if (!this.ffmpeg) throw new Error('FFmpeg not initialized');

    const inputName = 'video.mp4';
    const outputName = 'thumbnail.jpg';

    await this.ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

    await this.ffmpeg.exec([
      '-i', inputName,
      '-ss', timestampSeconds.toString(),
      '-vframes', '1',
      '-vf', 'scale=640:360',
      '-y',
      outputName
    ]);

    const thumbnailData = await this.ffmpeg.readFile(outputName);
    const thumbnailBlob = new Blob([thumbnailData], { type: 'image/jpeg' });

    await this.ffmpeg.deleteFile(inputName);
    await this.ffmpeg.deleteFile(outputName);

    return thumbnailBlob;
  }

  async generateVideoSnapshots(file: File, timestamps: number[]): Promise<Blob[]> {
    if (!this.ffmpeg) await this.initialize();
    if (!this.ffmpeg) throw new Error('FFmpeg not initialized');

    const snapshots: Blob[] = [];
    const inputName = 'video.mp4';

    await this.ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

    for (let i = 0; i < timestamps.length; i++) {
      const outputName = `snapshot_${i}.jpg`;
      
      await this.ffmpeg.exec([
        '-i', inputName,
        '-ss', timestamps[i].toString(),
        '-vframes', '1',
        '-vf', 'scale=1280:720',
        '-q:v', '2',
        '-y',
        outputName
      ]);

      const snapshotData = await this.ffmpeg.readFile(outputName);
      const snapshotBlob = new Blob([snapshotData], { type: 'image/jpeg' });
      snapshots.push(snapshotBlob);

      await this.ffmpeg.deleteFile(outputName);
    }

    await this.ffmpeg.deleteFile(inputName);
    return snapshots;
  }
}
