const npm = require('npm');
const tar = require('tar');
const tmp = require('tmp');
const fs = require('fs');
const rimraf = require('rimraf');
const ghPages = require('gh-pages');
const gitBranch = require('git-branch');

const preparePromise = () => (
  new Promise((resolve, reject) => {
    npm.load(() => (
      npm.commands.pack([process.cwd()], { silent: true }, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response[0].filename);
        }
      })
    ));
  })
);

const temporaryDirectoryPromise = () => (
  new Promise((resolve, reject) => {
    tmp.dir({ dir: process.cwd() }, (error, path) => {
      if (error) {
        reject(resolve);
      } else {
        resolve(path);
      }
    });
  })
);

const removePrepareFile = prepareFile => (
  new Promise((resolve, reject) => {
    fs.unlink(prepareFile, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  })
);

const extractPackagePromise = prepareFile => (
  temporaryDirectoryPromise().then(temporaryDirectoryPath => (
    tar.extract({
      file: prepareFile,
      cwd: temporaryDirectoryPath,
    }).then(() => removePrepareFile(prepareFile).then(() => Promise.resolve(temporaryDirectoryPath))).catch(error => removePrepareFile(prepareFile).then(() => Promise.reject(error)).catch(() => Promise.reject(error)))
  ))
);

const removeTemporaryDirectoryPromise = temporaryDirectoryPath => (
  new Promise((resolve, reject) => {
    rimraf(temporaryDirectoryPath, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  })
);

const ghPagesPromise = temporaryDirectoryPath => (
  gitBranch().then(name => (
    ghPages.publish(temporaryDirectoryPath, { branch: `${name}-git-snapshot` }, (error) => {
      if (error) {
        return removeTemporaryDirectoryPromise(temporaryDirectoryPath).then(() => Promise.reject(error)).catch(() => Promise.reject(error));
      }
      return removeTemporaryDirectoryPromise(temporaryDirectoryPath);
    })
  ))
);

const gitSnapshot = () => (
  preparePromise().then(extractPackagePromise).then(ghPagesPromise)
);

module.exports = gitSnapshot;
