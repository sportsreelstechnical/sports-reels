import { db } from "../db";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  type Video,
  type InsertVideo,
  type VideoInsights,
  type InsertVideoInsights,
  type VideoPlayerTag,
  type InsertVideoPlayerTag,
  type SharedVideo,
  type InsertSharedVideo,
  videos,
  videoInsights,
  videoPlayerTags,
  sharedVideos,
} from "@shared/schema";

export const videosRepository = {
  // Core Video CRUD
  async getVideos(playerId?: string): Promise<Video[]> {
    if (playerId) {
      return db
        .select()
        .from(videos)
        .where(eq(videos.playerId, playerId))
        .orderBy(desc(videos.uploadDate));
    }
    return db.select().from(videos).orderBy(desc(videos.uploadDate));
  },

  async getProfileVideos(playerId: string): Promise<Video[]> {
    // Get videos owned by player
    const ownedVideos = await db
      .select()
      .from(videos)
      .where(eq(videos.playerId, playerId));

    // Get videos where player is tagged
    const taggedVideosResult = await db
      .select({ video: videos })
      .from(videoPlayerTags)
      .innerJoin(videos, eq(videos.id, videoPlayerTags.videoId))
      .where(eq(videoPlayerTags.playerId, playerId));

    const taggedVideos = taggedVideosResult.map((r) => r.video);

    // Combine and deduplicate
    const allVideos = [...ownedVideos, ...taggedVideos];
    const uniqueVideosMap = new Map();
    allVideos.forEach((v) => {
      if (v) uniqueVideosMap.set(v.id, v);
    });

    const uniqueVideos = Array.from(uniqueVideosMap.values()) as Video[];

    // Sort by uploadDate descending
    return uniqueVideos.sort((a, b) => {
      const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
      const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
      return dateB - dateA;
    });
  },

  async getVideosByTitle(title: string, teamId?: string): Promise<Video[]> {
    const conditions = [eq(videos.title, title)];

    if (teamId) {
      conditions.push(eq(videos.teamId, teamId));
    }

    return db
      .select()
      .from(videos)
      .where(and(...conditions))
      .orderBy(desc(videos.uploadDate));
  },

  async getVideo(id: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  },

  async createVideo(video: InsertVideo): Promise<Video> {
    const [newVideo] = await db.insert(videos).values(video).returning();
    return newVideo;
  },

  async updateVideo(
    id: string,
    updates: Partial<InsertVideo>,
  ): Promise<Video | undefined> {
    const [video] = await db
      .update(videos)
      .set(updates)
      .where(eq(videos.id, id))
      .returning();
    return video;
  },

  async deleteVideo(id: string): Promise<void> {
    await db.delete(videos).where(eq(videos.id, id));
  },

  // Video Insights
  async getVideoInsights(videoId: string): Promise<VideoInsights | undefined> {
    const [insights] = await db
      .select()
      .from(videoInsights)
      .where(eq(videoInsights.videoId, videoId));
    return insights;
  },

  async createVideoInsights(
    insights: InsertVideoInsights,
  ): Promise<VideoInsights> {
    const [newInsights] = await db
      .insert(videoInsights)
      .values(insights)
      .returning();
    return newInsights;
  },

  // Video Player Tags
  async getVideoPlayerTags(videoId: string): Promise<VideoPlayerTag[]> {
    return db
      .select()
      .from(videoPlayerTags)
      .where(eq(videoPlayerTags.videoId, videoId));
  },

  async getVideoPlayerTagsForPlayer(
    playerId: string,
  ): Promise<Array<VideoPlayerTag & { video: Video | null }>> {
    const tags = await db
      .select()
      .from(videoPlayerTags)
      .where(eq(videoPlayerTags.playerId, playerId));
    const result = await Promise.all(
      tags.map(async (tag) => {
        const [video] = await db
          .select()
          .from(videos)
          .where(eq(videos.id, tag.videoId));
        return { ...tag, video: video || null };
      }),
    );
    return result;
  },

  async getVideoPlayerTag(id: string): Promise<VideoPlayerTag | undefined> {
    const [tag] = await db
      .select()
      .from(videoPlayerTags)
      .where(eq(videoPlayerTags.id, id));
    return tag;
  },

  async createVideoPlayerTag(
    tag: InsertVideoPlayerTag,
  ): Promise<VideoPlayerTag> {
    const [newTag] = await db.insert(videoPlayerTags).values(tag).returning();
    return newTag;
  },

  async updateVideoPlayerTag(
    id: string,
    updates: Partial<InsertVideoPlayerTag>,
  ): Promise<VideoPlayerTag | undefined> {
    const [tag] = await db
      .update(videoPlayerTags)
      .set(updates)
      .where(eq(videoPlayerTags.id, id))
      .returning();
    return tag;
  },

  async deleteVideoPlayerTag(id: string): Promise<void> {
    await db.delete(videoPlayerTags).where(eq(videoPlayerTags.id, id));
  },

  async getPlayerVideoMinutes(playerId: string): Promise<number> {
    const ownedResult = await db
      .select({ total: sql<number>`COALESCE(SUM(${videos.minutesPlayed}), 0)` })
      .from(videos)
      .where(eq(videos.playerId, playerId));

    const taggedResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${videoPlayerTags.minutesPlayed}), 0)`,
      })
      .from(videoPlayerTags)
      .where(eq(videoPlayerTags.playerId, playerId));

    return (
      (Number(ownedResult[0]?.total) || 0) +
      (Number(taggedResult[0]?.total) || 0)
    );
  },

  // Shared Videos
  async shareVideo(share: InsertSharedVideo): Promise<SharedVideo> {
    const [newShare] = await db.insert(sharedVideos).values(share).returning();
    return newShare;
  },

  async getSharedVideos(userId: string): Promise<SharedVideo[]> {
    return db
      .select()
      .from(sharedVideos)
      .where(eq(sharedVideos.sharedWithUserId, userId));
  },
};
