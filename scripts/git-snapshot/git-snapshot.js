const npm = require('npm');
const tar = require('tar');
const tmp = require('tmp');
const fs = require('fs');
const rimraf = require('rimraf');
const ghPages = require('gh-pages');
const gitBranch = require('git-branch');
const path = require('path');

const preparePromise = () => (
  new Promise((resolve, reject) => {
    npm.load({ loglevel: 'silent', progress: false }, () => (
      npm.commands.install([process.cwd()], (installError) => {
        if (installError) {
          reject(installError);
        }
        npm.commands.pack([process.cwd()], (packError, packResponse) => {
          if (packError) {
            reject(packError);
          } else {
            resolve(packResponse[0].filename);
          }
        });
      })
    ));
  })
);

const temporaryDirectoryPromise = () => (
  new Promise((resolve, reject) => {
    tmp.dir({ unsafeCleanup: true }, (error, temporaryDirectoryPath) => {
      if (error) {
        reject(error);
      } else {
        console.log(temporaryDirectoryPath);
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

const removeTemporaryDirectoryPromise = temporaryDirectoryPath => (
  console.log(temporaryDirectoryPath)
  // new Promise((resolve, reject) => {
  //   rimraf(temporaryDirectoryPath, (error) => {
  //     if (error) {
  //       reject(error);
  //     } else {
  //       resolve();
  //     }
  //   });
  // })
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
