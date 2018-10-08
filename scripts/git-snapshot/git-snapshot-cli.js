const commander = require('commander');
const packageJson = require('../../package.json');
const gitSnapshot = require('./git-snapshot');

commander
  .version(packageJson.version)
  .parse(process.argv);

gitSnapshot()
  .then((result) => {
    // eslint-disable-next-line no-console
    console.log('Successfully snapshotted', result);
  })
  .catch((error) => {
    process.exitCode = 1;
    // eslint-disable-next-line no-console
    console.error('Failure to snapshot', error.stack);
  });
