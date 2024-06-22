module.exports = {
  apps: [
    {
      script: "src/server.js",
      watch: ".",
      instances: 1,
      ignore_watch: ["[/\\]./", "node_modules", "src/images"],
    },
  ],
};
