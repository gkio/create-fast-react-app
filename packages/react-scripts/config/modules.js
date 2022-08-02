// @remove-on-eject-begin
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// @remove-on-eject-end
'use strict';

const fs = require('fs');
const path = require('path');
const paths = require('./paths');
const chalk = require('react-dev-utils/chalk');
const resolve = require('resolve');

/**
 * Get additional module paths based on the baseUrl of a compilerOptions object.
 *
 * @param {Object} options
 */
function getAdditionalModulePaths(options = {}) {
  const baseUrl = options.baseUrl;

  if (!baseUrl) {
    return '';
  }

  const baseUrlResolved = path.resolve(paths.appPath, baseUrl);

  // We don't need to do anything if `baseUrl` is set to `node_modules`. This is
  // the default behavior.
  if (path.relative(paths.appNodeModules, baseUrlResolved) === '') {
    return null;
  }

  // Allow the user set the `baseUrl` to `appSrc`.
  if (path.relative(paths.appSrc, baseUrlResolved) === '') {
    return [paths.appSrc];
  }

  // If the path is equal to the root directory we ignore it here.
  // We don't want to allow importing from the root directly as source files are
  // not transpiled outside of `src`. We do allow importing them with the
  // absolute path (e.g. `src/Components/Button.js`) but we set that up with
  // an alias.
  if (path.relative(paths.appPath, baseUrlResolved) === '') {
    return null;
  }

  // Otherwise, throw an error.
  throw new Error(
    chalk.red.bold(
      "Your project's `baseUrl` can only be set to `src` or `node_modules`." +
        ' Create React App does not support other values at this time.'
    )
  );
}

/**
 * Get webpack aliases based on the baseUrl of a compilerOptions object.
 *
 * @param {*} options
 */
function getWebpackAliases(options = {}) {
  const { baseUrl, paths } = options;

  if (!baseUrl && paths) {
    return paths
  }

  if (!baseUrl) {
    return {};
  }

  const baseUrlResolved = path.resolve(paths.appPath, baseUrl);

  if (path.relative(paths.appPath, baseUrlResolved) === '') {
    return {
      src: paths.appSrc,
      ...paths,
    };
  }
}

/**
 * Get jest aliases based on the baseUrl of a compilerOptions object.
 *
 * @param {*} options
 */
function getJestAliases(options = {}) {
  const baseUrl = options.baseUrl;

  if (!baseUrl) {
    return {};
  }

  const baseUrlResolved = path.resolve(paths.appPath, baseUrl);

  if (path.relative(paths.appPath, baseUrlResolved) === '') {
    return {
      '^src/(.*)$': '<rootDir>/src/$1',
    };
  }
}


function configPathsRaw(conf) {
  const confPaths =
    conf.compilerOptions && conf.compilerOptions.paths
      ? conf.compilerOptions.paths
      : {};

  const ext = conf.extends || {};
  const extPaths =
    ext.compilerOptions && ext.compilerOptions.paths
      ? ext.compilerOptions.paths
      : {};

  if (typeof confPaths !== 'object')
    {throw Error(
      `create-react-app:configPathsRaw: compilerOptions.paths must be object`
    );}
  if (typeof extPaths !== 'object')
    {throw Error(
      `create-react-app:configPathsRaw: compilerOptions.extends->compilerOptions.paths must be object`
    );}

  return {
    ...confPaths,
    ...extPaths,
  };
}

function readConfig(conf, configDir) {
  if (!conf)
    {throw Error(
      'create-react-app:readConfig: there is no [ts|js]config file found'
    );}

  const confdir = path.dirname(configDir);
  const config = { ...conf };

  const extUrl = conf.extends;
  const extPath = extUrl ? path.resolve(confdir, extUrl) : '';
  config.extends = extUrl ? require(extPath) : {};

  const resolve = path.resolve
  
  const pathsRaw = configPathsRaw(config);

  const aliasMap = Object.keys(pathsRaw).reduce((a, path) => {
    const value = pathsRaw[path];
    const target = Array.isArray(value) ? value[0] : value;
    a[path.replace(/\/\*$/, '')] = resolve(paths.appPath, target.replace(/\/\*$/, ''));
    return a;
  }, {});

  return {
    ...config,
    compilerOptions: {
      ...config.compilerOptions,
      paths: {
        ...config.compilerOptions.paths,
        ...aliasMap
      },
    },
  };
}

function getModules() {
  // Check if TypeScript is setup
  const hasTsConfig = fs.existsSync(paths.appTsConfig);
  const hasJsConfig = fs.existsSync(paths.appJsConfig);

  if (hasTsConfig && hasJsConfig) {
    throw new Error(
      'You have both a tsconfig.json and a jsconfig.json. If you are using TypeScript please remove your jsconfig.json file.'
    );
  }

  let config;

  // If there's a tsconfig.json we assume it's a
  // TypeScript project and set up the config
  // based on tsconfig.json
  if (hasTsConfig) {
    const ts = require(resolve.sync('typescript', {
      basedir: paths.appNodeModules,
    }));
    config = ts.readConfigFile(paths.appTsConfig, ts.sys.readFile).config;
    const hasExtends = config.extends;

    if (hasExtends) {
      config = readConfig(config, paths.appTsConfig);
    }
    // Otherwise we'll check if there is jsconfig.json
    // for non TS projects.
  } else if (hasJsConfig) {
    config = require(paths.appJsConfig);
    const hasExtends = config.extends;

    if (hasExtends) {
      config = readConfig(config, paths.appJsConfig);
    }
  }

  config = config || {};

  const options = config.compilerOptions || {};

  const additionalModulePaths = getAdditionalModulePaths(options);

  return {
    additionalModulePaths: additionalModulePaths,
    webpackAliases: getWebpackAliases(options),
    jestAliases: getJestAliases(options),
    hasTsConfig,
  };
}

module.exports = getModules();
