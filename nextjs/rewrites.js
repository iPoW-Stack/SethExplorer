async function rewrites() {
  return [
    { source: '/node-api/proxy/:slug*', destination: '/api/proxy' },
    { source: '/node-api/:slug*', destination: '/api/:slug*' },
    // Serve envs.js from API when static file is missing (e.g. standalone deploy without public copy)
    { source: '/assets/envs.js', destination: '/api/envs-js' },
  ].filter(Boolean);
}

module.exports = rewrites;
