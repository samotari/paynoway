#!/usr/bin/env sh

GIT_REMOTE="origin"
INITIAL_BRANCH="$(git branch | grep \* | cut -d ' ' -f2)"
cleanup() {
	# undo any changes made to local files tracked by git
	git checkout .
	# return to initial branch
	git checkout $INITIAL_BRANCH
}

# update the local git repo with the latest tags from remote
echo "Fetching latest tags from remote..."
git fetch $GIT_REMOTE

# list version tags
echo ""
echo "Version tags:"
echo "-------------"
git tag | grep --color="never" -E "^v[0-9]*"
echo "-------------"
echo ""

read -p "Which version tag would you like to use for this release? " VERSION
if [ -z "$VERSION" ]; then
	echo "Version tag is required. Exiting..."
	exit 1
fi

if ! git tag | grep -E "^${VERSION}" > /dev/null; then
	echo "\"$VERSION\" did not match an existing version tag. Exiting..."
	exit 1
fi

# fdroid version tag name is prefixed with "fdroid-"
FDROID_VERSION="fdroid-$VERSION"

# check if this version has already been published for fdroid
if git rev-parse -q --verify "refs/tags/$FDROID_VERSION" > /dev/null; then
	echo "Version number \"$VERSION\" of this project has already been published for fdroid. Exiting..."
	exit 1
fi

read -p "You are about to publish version \"$VERSION\" for fdroid. Do you want to continue? (y/n) " ANSWER
if [ "$ANSWER" != "y" ]; then
	echo "Canceled"
	exit
fi

# delete fdroid local branch if it already exists
git branch -D fdroid 2>/dev/null

# abort on errors
set -e

# checkout the version tag to a new branch
git checkout tags/$VERSION -b fdroid

PROJECT_DIR=".."
PROJECT_DIR="$( cd "$( dirname "$0" )" && pwd )/$PROJECT_DIR"
BIN="$PROJECT_DIR/node_modules/.bin"
PLATFORMS="$PROJECT_DIR/platforms"
PLUGINS="$PROJECT_DIR/plugins"

# delete existing cordova files
rm -rf $PLATFORMS $PLUGINS

# install dependencies
echo "Installing project dependencies..."
npm ci

# build
echo "Running project build..."
npm run build:clean

# ensure that cordova exists
if [ ! -f $BIN/cordova ]; then
	npm install cordova@10
fi

# prepare android platform files
echo "Preparing android platform files..."
$BIN/cordova prepare android

# add files required by fdroid
git add -f 	$PLATFORMS/android/

read -p "Ready to commit changes to fdroid branch? (y/n) " ANSWER
if [ "$ANSWER" != "y" ]; then
	echo "Canceled"
	exit
fi

# commit
git commit -m "fdroid release $VERSION"

# (force) push changes to remote fdroid branch
echo "Pushing changes to fdroid remote branch..."
# git push -f -u $GIT_REMOTE fdroid

# create fdroid release tag
echo "Creating fdroid release tag..."
git tag -a $FDROID_VERSION -m "fdroid release $VERSION"
# git push $GIT_REMOTE $FDROID_VERSION

cleanup
echo "Done!"
