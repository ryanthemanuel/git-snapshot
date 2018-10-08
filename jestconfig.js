module.exports = {
  collectCoverageFrom: [
    'src/*.js',
  ],
  testMatch: [
    '**/jest/**/(*.)(spec|test).js?(x)',
  ],
  roots: [process.cwd()],
};
