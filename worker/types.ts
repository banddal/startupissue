export type RawSourceItem = {
  externalId?: string;
  url?: string;
  title?: string;
  body?: string;
  publishedAt?: string;
  attachments?: string[];
  payload: unknown;
};

export type NormalizedSourceItem = {
  externalId: string | null;
  canonicalUrl: string | null;
  urlHash: string | null;
  title: string;
  normalizedTitle: string;
  titleHash: string | null;
  bodyText: string;
  contentHash: string;
  publishedAt: Date;
  publishedAtInferred: boolean;
  attachmentUrls: string[];
  rawPayload: unknown;
  bodyTruncated: boolean;
};

export type SourceAdapter = {
  key: string;
  name: string;
  fetch(cursor?: string): Promise<RawSourceItem[]>;
};
