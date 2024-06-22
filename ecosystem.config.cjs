module.exports = {
  apps: [
    {
      script: "npm run server",
      watch: ".",
      instances: 1,
      ignore_watch: ["[/\\]./", "node_modules", "src/images"],
    },
  ],
};
