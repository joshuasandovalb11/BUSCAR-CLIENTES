export default ({ config }) => {
  const IS_DEV = process.env.APP_VARIANT === 'development';

  return {
    ...config,
    name: IS_DEV ? `${config.name} (Dev)` : config.name,
    ios: {
      ...config.ios,
      bundleIdentifier: IS_DEV 
        ? `${config.ios.bundleIdentifier}.dev` 
        : config.ios.bundleIdentifier,
    },
    android: {
      ...config.android,
      package: IS_DEV 
        ? `${config.android.package}.dev` 
        : config.android.package,
    },
  };
};
