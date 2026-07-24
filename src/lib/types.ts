export type Profile = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: "admin" | "member";
  status: "pending" | "active" | "rejected" | "suspended";
  created_at: string;
};

export type Card = {
  id: string;
  title: string;
  summary: string | null;
  url: string | null;
  source_key: string;
  source_grade: number;
  published_on: string;
  topic: "tech_industry" | "policy_law" | "startup_invest";
  depth: "news" | "tech" | "research" | null;
  ring: number;
  company_id: string | null;
  tags: string[];
  score: number;
  hidden: boolean;
  created_at: string;
};

export type Company = {
  id: string;
  name: string;
  name_norm: string;
  aliases: string[];
  status: "candidate" | "confirmed" | "archived";
  confidence: number;
  tags: string[];
};

export type Bundle = {
  id: string;
  author_id: string;
  title: string;
  body: string | null;
  confidence: "certain" | "estimate" | "question";
  created_at: string;
};

export const TOPIC_LABEL: Record<Card["topic"], string> = {
  tech_industry: "기술 · 산업",
  policy_law: "정책 · 법률",
  startup_invest: "스타트업 · 투자",
};
