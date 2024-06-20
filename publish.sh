#!/usr/bin/env bash

set -e

npm run build-package
cd build/ol
npm publish
cd ../..
