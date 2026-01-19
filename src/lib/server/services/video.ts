import { nanoid } from "nanoid";
import ffmpeg from "fluent-ffmpeg";
import { join, dirname } from "path";
import { mkdir } from "fs/promises";
import { db, schema } from "../db";
import { eq, and, count, sum } from "drizzle-orm";
import { storage } from "./storage";
import { config } from "../config";

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  codec: string;
  bitrate: number;
}

export interface ProcessingOptions {
  outputFormat?: "mp4" | "webm" | null;
  codec?: "h264" | "h265" | "vp9" | "av1" | null;
  quality?: number | null;
  maxWidth?: number | null;
  maxHeight?: number | null;
  audioCodec?: "aac" | "opus" | "copy" | "none" | null;
  audioBitrate?: number | null;
  generateThumbnail?: boolean;
  thumbnailTime?: number | null;
}

// Get video metadata using ffprobe
export async function getVideoMetadata(
  filePath: string,
): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find(
        (s) => s.codec_type === "video",
      );
      if (!videoStream) {
        reject(new Error("No video stream found"));
        return;
      }

      resolve({
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        duration: metadata.format.duration || 0,
        codec: videoStream.codec_name || "unknown",
        bitrate: metadata.format.bit_rate
          ? parseInt(String(metadata.format.bit_rate))
          : 0,
      });
    });
  });
}

// Generate thumbnail from video
export async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  timeInSeconds: number = 1,
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: [timeInSeconds],
        filename: "thumb.jpg",
        folder: dirname(outputPath),
        size: "320x?",
      })
      .on("end", () => {
        // Rename to correct output path
        const tempPath = join(dirname(outputPath), "thumb.jpg");
        import("fs/promises").then(({ rename }) => {
          rename(tempPath, outputPath).then(resolve).catch(reject);
        });
      })
      .on("error", reject);
  });
}

// Process/transcode video
export async function processVideo(
  inputPath: string,
  outputPath: string,
  options: ProcessingOptions,
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);

    // Video codec
    const codec = options.codec || config.videos.defaultCodec;
    switch (codec) {
      case "h264":
        command = command.videoCodec("libx264");
        break;
      case "h265":
        command = command.videoCodec("libx265");
        break;
      case "vp9":
        command = command.videoCodec("libvpx-vp9");
        break;
      case "av1":
        command = command.videoCodec("libaom-av1");
        break;
    }

    // Quality (CRF)
    const quality = options.quality ?? config.videos.defaultQuality;
    command = command.outputOptions([`-crf ${quality}`]);

    // Resolution scaling
    if (options.maxWidth || options.maxHeight) {
      const scaleFilter = buildScaleFilter(options.maxWidth, options.maxHeight);
      command = command.outputOptions(["-vf", scaleFilter]);
    }

    // Audio
    const audioCodec = options.audioCodec || config.videos.defaultAudioCodec;
    switch (audioCodec) {
      case "aac":
        command = command.audioCodec("aac");
        break;
      case "opus":
        command = command.audioCodec("libopus");
        break;
      case "copy":
        command = command.audioCodec("copy");
        break;
      case "none":
        command = command.noAudio();
        break;
    }

    if (audioCodec !== "none" && audioCodec !== "copy") {
      const audioBitrate =
        options.audioBitrate || config.videos.defaultAudioBitrate;
      command = command.audioBitrate(`${audioBitrate}k`);
    }

    // Output format
    const format = options.outputFormat || "mp4";
    if (format === "mp4") {
      command = command.outputOptions(["-movflags", "+faststart"]);
    }

    command
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

function buildScaleFilter(
  maxWidth?: number | null,
  maxHeight?: number | null,
): string {
  if (maxWidth && maxHeight) {
    return `scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease`;
  } else if (maxWidth) {
    return `scale='min(${maxWidth},iw)':-2`;
  } else if (maxHeight) {
    return `scale=-2:'min(${maxHeight},ih)'`;
  }
  return "scale=iw:ih";
}

// Upload and process video
export async function uploadVideo(
  galleryId: string,
  file: File,
  gallery: schema.Gallery,
): Promise<{ success: boolean; error?: string; video?: schema.Video }> {
  const videoId = nanoid();
  const originalFilename = file.name;
  const ext = originalFilename.split(".").pop()?.toLowerCase() || "mp4";

  // Check file size
  const maxSize = gallery.videoMaxSize || config.videos.maxUploadSize;
  if (file.size > maxSize) {
    return {
      success: false,
      error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  // Save original file temporarily
  const tempDir = join(config.storage.localPath, "temp");
  await mkdir(tempDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await storage.save(`temp/${videoId}_original.${ext}`, buffer);

  try {
    // Get video metadata
    const fullTempPath = join(
      config.storage.localPath,
      `temp/${videoId}_original.${ext}`,
    );
    const metadata = await getVideoMetadata(fullTempPath);

    // Check duration
    const maxDuration = gallery.videoMaxDuration || config.videos.maxDuration;
    if (metadata.duration > maxDuration) {
      await storage.delete(`temp/${videoId}_original.${ext}`);
      return {
        success: false,
        error: `Video too long. Maximum duration is ${Math.round(maxDuration / 60)} minutes`,
      };
    }

    // Determine storage paths
    const storagePath = `videos/${galleryId}/${videoId}.${ext}`;
    let processedPath: string | null = null;
    let thumbnailPath: string | null = null;

    // Move original to final location
    await storage.save(storagePath, buffer);
    await storage.delete(`temp/${videoId}_original.${ext}`);

    // Process video if needed
    const needsProcessing =
      gallery.videoOutputFormat ||
      gallery.videoCodec ||
      gallery.videoMaxWidth ||
      gallery.videoMaxHeight;

    if (needsProcessing) {
      const outputExt = gallery.videoOutputFormat === "webm" ? "webm" : "mp4";
      processedPath = `videos/${galleryId}/${videoId}_processed.${outputExt}`;
      const fullProcessedPath = join(config.storage.localPath, processedPath);
      const fullStoragePath = join(config.storage.localPath, storagePath);

      await processVideo(fullStoragePath, fullProcessedPath, {
        outputFormat:
          gallery.videoOutputFormat === "original"
            ? null
            : gallery.videoOutputFormat,
        codec: gallery.videoCodec,
        quality: gallery.videoQuality,
        maxWidth: gallery.videoMaxWidth,
        maxHeight: gallery.videoMaxHeight,
        audioCodec: gallery.videoAudioCodec,
        audioBitrate: gallery.videoAudioBitrate,
      });
    }

    // Generate thumbnail if enabled
    if (gallery.videoGenerateThumbnail !== false) {
      thumbnailPath = `videos/${galleryId}/${videoId}_thumb.jpg`;
      const fullThumbnailPath = join(config.storage.localPath, thumbnailPath);
      const sourcePath = processedPath
        ? join(config.storage.localPath, processedPath)
        : join(config.storage.localPath, storagePath);

      try {
        await generateThumbnail(
          sourcePath,
          fullThumbnailPath,
          gallery.videoThumbnailTime || config.videos.thumbnailTime,
        );
      } catch {
        // Thumbnail generation failed, continue without it
        thumbnailPath = null;
      }
    }

    // Create database entry
    const video: schema.Video = {
      id: videoId,
      galleryId,
      filename: `${videoId}.${ext}`,
      originalFilename,
      mimeType: file.type,
      sizeBytes: file.size,
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
      storagePath,
      thumbnailPath,
      processedPath,
      processingStatus: "completed",
      processingError: null,
      latitude: null,
      longitude: null,
      locationName: null,
      takenAt: null,
      createdAt: new Date(),
    };

    await db.insert(schema.videos).values(video);

    return { success: true, video };
  } catch (error) {
    // Cleanup on error
    await storage.delete(`temp/${videoId}_original.${ext}`).catch(() => {});
    return {
      success: false,
      error: error instanceof Error ? error.message : "Video processing failed",
    };
  }
}

// Get video by ID
export async function getVideo(videoId: string): Promise<schema.Video | null> {
  const video = await db
    .select()
    .from(schema.videos)
    .where(eq(schema.videos.id, videoId))
    .get();

  return video ?? null;
}

// Get videos for gallery
export async function getGalleryVideos(
  galleryId: string,
  page: number = 1,
  perPage: number = 50,
): Promise<{ videos: schema.Video[]; total: number }> {
  const offset = (page - 1) * perPage;

  const [videos, totalResult] = await Promise.all([
    db
      .select()
      .from(schema.videos)
      .where(eq(schema.videos.galleryId, galleryId))
      .limit(perPage)
      .offset(offset)
      .all(),
    db
      .select({ count: count() })
      .from(schema.videos)
      .where(eq(schema.videos.galleryId, galleryId))
      .get(),
  ]);

  return {
    videos,
    total: totalResult?.count ?? 0,
  };
}

// Delete video
export async function deleteVideo(
  videoId: string,
  galleryId: string,
): Promise<{ success: boolean; error?: string }> {
  const video = await db
    .select()
    .from(schema.videos)
    .where(
      and(
        eq(schema.videos.id, videoId),
        eq(schema.videos.galleryId, galleryId),
      ),
    )
    .get();

  if (!video) {
    return { success: false, error: "Video not found" };
  }

  // Delete files
  await storage.delete(video.storagePath).catch(() => {});
  if (video.processedPath) {
    await storage.delete(video.processedPath).catch(() => {});
  }
  if (video.thumbnailPath) {
    await storage.delete(video.thumbnailPath).catch(() => {});
  }

  // Delete database entry
  await db.delete(schema.videos).where(eq(schema.videos.id, videoId));

  return { success: true };
}

// Get video buffer for streaming
export async function getVideoBuffer(
  videoId: string,
  useProcessed: boolean = true,
): Promise<{
  buffer: Buffer;
  mimeType: string;
  size: number;
} | null> {
  const video = await getVideo(videoId);
  if (!video) return null;

  const path =
    useProcessed && video.processedPath
      ? video.processedPath
      : video.storagePath;

  try {
    const buffer = await storage.read(path);
    const mimeType =
      video.processedPath && useProcessed
        ? path.endsWith(".webm")
          ? "video/webm"
          : "video/mp4"
        : video.mimeType;

    return {
      buffer,
      mimeType,
      size: buffer.length,
    };
  } catch {
    return null;
  }
}

// Get video stats for gallery
export async function getGalleryVideoStats(galleryId: string): Promise<{
  videoCount: number;
  totalSize: number;
  totalDuration: number;
}> {
  const result = await db
    .select({
      count: count(),
      totalSize: sum(schema.videos.sizeBytes),
      totalDuration: sum(schema.videos.duration),
    })
    .from(schema.videos)
    .where(eq(schema.videos.galleryId, galleryId))
    .get();

  return {
    videoCount: result?.count ?? 0,
    totalSize: Number(result?.totalSize) || 0,
    totalDuration: Number(result?.totalDuration) || 0,
  };
}
