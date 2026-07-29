export type StoryMediaType = "image" | "video";

export type Story = {
  id: string;
  title: string | null;
  caption: string | null;

  media_url: string;
  storage_path: string;
  media_type: StoryMediaType;

  mime_type: string | null;
  file_size: number | null;

  link_url: string | null;
  link_text: string | null;

  published: boolean;
  created_at: string;
  expires_at: string;
};

export type StoriesResponse = {
  ok: boolean;
  items: Story[];
  error?: string;
};