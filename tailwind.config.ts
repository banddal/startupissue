import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F6F1",
        ink: "#22261F",
        soft: "#6B6F63",
        line: "#E1E0D6",
        accent: "#3D6B9E",
        accentbg: "#EAF1F8",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Pretendard", "Apple SD Gothic Neo", "Segoe UI", "Malgun Gothic", "sans-serif"],
        mono: ["ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
