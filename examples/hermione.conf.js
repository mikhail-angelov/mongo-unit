module.exports = {
  retry: 1,
  sets: {
    desktop: {
      files: './*.e2e.js',
    },
  },

  browsers: {
    chrome: {
      desiredCapabilities: {
        browserName: 'chrome',
      },
    },
  },
}
