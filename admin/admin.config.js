module.exports = {
  webpack: (config, webpack) => {
    // Add your variable using the DefinePlugin
    config.plugins.push(
      new webpack.DefinePlugin({
        //All your custom ENVs that you want to use in frontend
        CUSTOM_VARIABLES: {
          OSS_ACCESS_KEY_ID: JSON.stringify(process.env.OSS_ACCESS_KEY_ID),
          OSS_ACCESS_KEY_SECRET: JSON.stringify(process.env.OSS_ACCESS_KEY_SECRET),
          VOD_REGION: JSON.stringify(process.env.VOD_REGION)
        },
      })
    );
    // Important: return the modified config
    return config;
  },
};
