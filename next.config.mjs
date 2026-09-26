/** @type {import('next').NextConfig} */
export default {
  serverExternalPackages: ["@googleapis/drive", "@googleapis/gmail", "xlsx", "@libsql/client", "libsql"],
  outputFileTracingIncludes: { "/api/setup/seed": ["./kb/**/*"] },
};
