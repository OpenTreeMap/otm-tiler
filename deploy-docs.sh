#!/bin/bash

set -o errexit -o nounset

rev=$(git rev-parse --short HEAD)

cd docs

git init
git config user.name "azaveaci"
git config user.email "azaveadev@azavea.com"

git remote add upstream "https://$GH_TOKEN@github.com/OpenTreeMap/otm-tiler.git"
git fetch upstream
git reset upstream/gh-pages

touch .


git add -A .
git commit -m "Rebuild documentation pages at ${rev}"
git push -q upstream HEAD:gh-pages
