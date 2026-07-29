// backend/src/routes/storyRoutes.ts

import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { getSupabase } from "../supabaseClient.js";

const router = Router();

const STORIES_BUCKET = "stories";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

type StoryMediaType = "image" | "video";

type StoryRow = {
  id: string;
  title: string | null;
  caption: string | null;
  media_url: string;
  storage_path: string;
  media_type: StoryMediaType;
  mime_type: string | null;
  file_size: number | null;
  published: boolean;
  created_at: string;
  expires_at: string;
};

function sendError(
  res: Response,
  status: number,
  message: string,
  details?: unknown,
) {
  return res.status(status).json({
    ok: false,
    error: message,
    ...(details ? { details } : {}),
  });
}

function requireAdmin(
  req: Request,
  res: Response,
  next: () => void,
) {
  const expectedKey = process.env.STORIES_ADMIN_KEY;
  const providedKey = req.header("x-admin-key");

  if (!expectedKey) {
    return sendError(
      res,
      500,
      "STORIES_ADMIN_KEY is not configured on the server",
    );
  }

  if (!providedKey || providedKey !== expectedKey) {
    return sendError(res, 401, "Unauthorized");
  }

  next();
}

function getMediaType(mimeType: string): StoryMediaType | null {
  if (ALLOWED_IMAGE_TYPES.has(mimeType)) {
    return "image";
  }

  if (ALLOWED_VIDEO_TYPES.has(mimeType)) {
    return "video";
  }

  return null;
}

function cleanFileName(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();

  const safeExtension = extension.replace(/[^a-z0-9.]/g, "");

  return `${crypto.randomUUID()}${safeExtension}`;
}

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },

  fileFilter: (_req, file, callback) => {
    const mediaType = getMediaType(file.mimetype);

    if (!mediaType) {
      return callback(
        new Error(
          "Unsupported file type. Upload an image or supported video.",
        ),
      );
    }

    callback(null, true);
  },
});

/**
 * GET /api/content/stories
 *
 * يعيد الستوريات المنشورة التي لم تنتهِ بعد فقط.
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();

const { data, error } = await supabase
  .from("stories")
  .select(`
    id,
    title,
    caption,
    media_url,
    storage_path,
    media_type,
    mime_type,
    file_size,
    link_url,
    link_text,
    published,
    created_at,
    expires_at
  `)
      .eq("published", true)
      .gt("expires_at", now)
      .order("created_at", { ascending: true });

    if (error) {
      return sendError(res, 500, error.message);
    }

    res.setHeader("Cache-Control", "no-store");

    return res.json({
      ok: true,
      items: (data ?? []) as StoryRow[],
    });
  } catch (error) {
    console.error("GET stories error:", error);

    return sendError(
      res,
      500,
      error instanceof Error
        ? error.message
        : "Failed to load stories",
    );
  }
});

/**
 * GET /api/content/stories/admin/all
 *
 * يعيد جميع الستوريات، بما فيها المنتهية وغير المنشورة.
 */
router.get(
  "/admin/all",
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      const supabase = getSupabase();

const { data, error } = await supabase
  .from("stories")
  .select(`
    id,
    title,
    caption,
    media_url,
    storage_path,
    media_type,
    mime_type,
    file_size,
    link_url,
    link_text,
    published,
    created_at,
    expires_at
  `)
        .order("created_at", { ascending: false });

      if (error) {
        return sendError(res, 500, error.message);
      }

      res.setHeader("Cache-Control", "no-store");

      return res.json({
        ok: true,
        items: (data ?? []) as StoryRow[],
      });
    } catch (error) {
      console.error("GET admin stories error:", error);

      return sendError(
        res,
        500,
        error instanceof Error
          ? error.message
          : "Failed to load stories",
      );
    }
  },
);

/**
 * POST /api/content/stories
 *
 * multipart/form-data:
 * file      required
 * title     optional
 * caption   optional
 * hours     optional, default 24
 */
router.post(
  "/",
  requireAdmin,
  upload.single("file"),
  async (req: Request, res: Response) => {
    const file = req.file;

    if (!file) {
      return sendError(res, 400, "File is required");
    }

    const mediaType = getMediaType(file.mimetype);

    if (!mediaType) {
      return sendError(res, 400, "Unsupported media type");
    }

    const title =
      typeof req.body.title === "string"
        ? req.body.title.trim() || null
        : null;

    const caption =
      typeof req.body.caption === "string"
        ? req.body.caption.trim() || null
        : null;

    const requestedHours = Number(req.body.hours ?? 24);

    const hours =
      Number.isFinite(requestedHours) &&
      requestedHours > 0 &&
      requestedHours <= 168
        ? requestedHours
        : 24;

    const expiresAt = new Date(
      Date.now() + hours * 60 * 60 * 1000,
    ).toISOString();

    const fileName = cleanFileName(file.originalname);

    const dateFolder = new Date()
      .toISOString()
      .slice(0, 10);

    const storagePath = `${dateFolder}/${fileName}`;

    const supabase = getSupabase();

    try {
      const { error: uploadError } = await supabase.storage
        .from(STORIES_BUCKET)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        return sendError(
          res,
          500,
          `Storage upload failed: ${uploadError.message}`,
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from(STORIES_BUCKET)
        .getPublicUrl(storagePath);

      const { data: insertedStory, error: insertError } =
        await supabase
          .from("stories")
          .insert({
            title,
            caption,
            media_url: publicUrl,
            storage_path: storagePath,
            media_type: mediaType,
            mime_type: file.mimetype,
            file_size: file.size,
            published: true,
            expires_at: expiresAt,
          })
          .select(`
            id,
            title,
            caption,
            media_url,
            storage_path,
            media_type,
            mime_type,
            file_size,
            published,
            created_at,
            expires_at
          `)
          .single();

      if (insertError) {
        // إذا فشل حفظ السطر، نحذف الملف حتى لا يبقى يتيمًا.
        await supabase.storage
          .from(STORIES_BUCKET)
          .remove([storagePath]);

        return sendError(
          res,
          500,
          `Database insert failed: ${insertError.message}`,
        );
      }

      return res.status(201).json({
        ok: true,
        item: insertedStory as StoryRow,
      });
    } catch (error) {
      console.error("POST story error:", error);

      return sendError(
        res,
        500,
        error instanceof Error
          ? error.message
          : "Failed to create story",
      );
    }
  },
);

/**
 * PATCH /api/content/stories/:id/published
 *
 * body:
 * {
 *   "published": true
 * }
 */
router.patch(
  "/:id/published",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const published = req.body.published;

      if (typeof published !== "boolean") {
        return sendError(
          res,
          400,
          "published must be true or false",
        );
      }

      const supabase = getSupabase();

const { data, error } = await supabase
  .from("stories")
  .select(`
    id,
    title,
    caption,
    media_url,
    storage_path,
    media_type,
    mime_type,
    file_size,
    link_url,
    link_text,
    published,
    created_at,
    expires_at
  `)
        .single();

      if (error) {
        return sendError(res, 500, error.message);
      }

      return res.json({
        ok: true,
        item: data as StoryRow,
      });
    } catch (error) {
      console.error("PATCH story error:", error);

      return sendError(
        res,
        500,
        error instanceof Error
          ? error.message
          : "Failed to update story",
      );
    }
  },
);

/**
 * DELETE /api/content/stories/:id
 *
 * يحذف السطر والملف من Storage.
 */
router.delete(
  "/:id",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const supabase = getSupabase();

      const { data: story, error: findError } = await supabase
        .from("stories")
        .select("id, storage_path")
        .eq("id", id)
        .maybeSingle();

      if (findError) {
        return sendError(res, 500, findError.message);
      }

      if (!story) {
        return sendError(res, 404, "Story not found");
      }

      const { error: storageError } = await supabase.storage
        .from(STORIES_BUCKET)
        .remove([story.storage_path]);

      if (storageError) {
        return sendError(
          res,
          500,
          `Storage delete failed: ${storageError.message}`,
        );
      }

      const { error: deleteError } = await supabase
        .from("stories")
        .delete()
        .eq("id", id);

      if (deleteError) {
        return sendError(res, 500, deleteError.message);
      }

      return res.json({
        ok: true,
        deletedId: id,
      });
    } catch (error) {
      console.error("DELETE story error:", error);

      return sendError(
        res,
        500,
        error instanceof Error
          ? error.message
          : "Failed to delete story",
      );
    }
  },
);

/**
 * Express error handler خاص بـ multer.
 */
router.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    next: (error?: unknown) => void,
  ) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return sendError(
          res,
          413,
          "File is too large. Maximum size is 50 MB.",
        );
      }

      return sendError(res, 400, error.message);
    }

    if (error instanceof Error) {
      return sendError(res, 400, error.message);
    }

    next(error);
  },
);

export default router;