import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/links/*/transcription": ["./vendor/yt-dlp"],
  },
};

export default nextConfig;
