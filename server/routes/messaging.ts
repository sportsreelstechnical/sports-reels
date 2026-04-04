import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";

export function registerMessagingRoutes(app: Express): void {
  app.get(
    "/api/conversations",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const conversations = await storage.getConversations(userId);
        res.json(conversations);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  app.post(
    "/api/conversations",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const { title, participantIds, type } = req.body;

        const conversation = await storage.createConversation({
          title,
          type: type || "direct",
        });

        await storage.addConversationParticipant({
          conversationId: conversation.id,
          userId: userId,
          role: req.session.userRole || "user",
        });

        if (participantIds && Array.isArray(participantIds)) {
          for (const participantId of participantIds) {
            await storage.addConversationParticipant({
              conversationId: conversation.id,
              userId: participantId,
              role: "user",
            });
          }
        }

        res.json(conversation);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(400).json({ error: message });
      }
    },
  );

  app.get(
    "/api/conversations/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const conversation = await storage.getConversation(req.params.id);
        if (!conversation) {
          return res.status(404).json({ error: "Conversation not found" });
        }

        const messages = await storage.getMessages(req.params.id);
        const participants = await storage.getConversationParticipants(
          req.params.id,
        );

        res.json({ conversation, messages, participants });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  app.post(
    "/api/conversations/:id/messages",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const { content, attachmentUrl } = req.body;

        const message = await storage.createMessage({
          conversationId: req.params.id,
          senderId: userId,
          senderRole: req.session.userRole || "user",
          content,
          attachmentUrls: attachmentUrl ? [attachmentUrl] : undefined,
        });

        res.json(message);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(400).json({ error: message });
      }
    },
  );

  app.post(
    "/api/conversations/:id/invite",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { participantId, participantType } = req.body;

        await storage.addConversationParticipant({
          conversationId: req.params.id,
          userId: participantId,
          role: participantType || "user",
        });

        res.json({ success: true });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(400).json({ error: message });
      }
    },
  );
}
