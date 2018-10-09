const tar = require('tar');
const tmp = require('tmp');
const fs = require('fs');
const ghPages = require('gh-pages');
const gitBranch = require('git-branch');
const path = require('path');
const { exec } = require('child_process');

const preparePromise = () => (
  new Promise((resolve, reject) => {
    exec('npm install --loglevel=silent --progress=false', { cwd: process.cwd() }, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  }).then(() => new Promise((resolve, reject) => {
    exec('npm pack --loglevel=silent --progress=false', { cwd: process.cwd() }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout.trim());
      }
    });
  }))
);

const temporaryDirectoryPromise = () => (
  new Promise((resolve, reject) => {
    tmp.dir({ unsafeCleanup: true }, (error, temporaryDirectoryPath) => {
      if (error) {
        reject(error);
      } else {
        resolve(temporaryDirectoryPath);
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

const modifyPackageJsonPromise = (temporaryDirectoryPath) => {
  const packageJsonPath = path.join(temporaryDirectoryPath, 'package.json');
  return () => new Promise((resolve, reject) => {
    fs.readFile(packageJsonPath, (error, content) => {
      if (error) {
        reject(error);
      } else {
        resolve(content);
      }
    });
  }).then(content => (
    new Promise((resolve, reject) => {
      const jsonContent = JSON.parse(content);
      if (jsonContent.scripts && jsonContent.scripts.prepare) {
        jsonContent.scripts.prepare = undefined;
      }
      jsonContent.devDependencies = undefined;
      fs.writeFile(packageJsonPath, JSON.stringify(jsonContent, null, 2), (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    })
  ));
};

const extractPackagePromise = prepareFile => (
  temporaryDirectoryPromise().then(temporaryDirectoryPath => (
    tar.extract({ file: prepareFile, cwd: temporaryDirectoryPath, strip: 1 })
      .then(modifyPackageJsonPromise(temporaryDirectoryPath))
      .then(() => (
        removePrepareFile(prepareFile).then(() => (
          Promise.resolve(temporaryDirectoryPath)
        ))
      ))
      .catch(error => (
        removePrepareFile(prepareFile).then(() => (
          Promise.reject(error)
        )).catch(() => (
          Promise.reject(error)
        ))
      ))
  ))
);

const ghPagesPromise = temporaryDirectoryPath => (
  new Promise((resolve, reject) => {
    exec('npm pack --loglevel=silent --progress=false', { cwd: temporaryDirectoryPath }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout.trim());
      }
    });
  }).then(gitBranch).then(name => (
    new Promise((resolve, reject) => (
      ghPages.publish(temporaryDirectoryPath, { src: '*.tgz', branch: `${name}-git-snapshot` }, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      })
    ))
  ))
);

const gitSnapshot = () => (
  preparePromise().then(extractPackagePromise).then(ghPagesPromise)
);

module.exports = gitSnapshot;
