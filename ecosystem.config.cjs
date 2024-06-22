module.exports = {
  apps: [
    {
      script: "npx tsx src/server.ts",
      watch: ".",
      instances: 1,
      ignore_watch: ["[/\\]./", "node_modules", "src/images"],
    },
  ],
};
