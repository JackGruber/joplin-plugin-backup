import * as path from "path";
import { getBranch, getInfo, nothingUncomitted } from "./git";
import {
  runNpmVersion,
  setPluginVersion,
  updateChangelog,
  getJPLFileName,
  getChangelog,
} from "./utils";
import {
  githubRelease,
  ReleaseOptions,
  AssetOptions,
  githubAsset,
  checkAuth,
  ReproOptions,
} from "./github";
import * as dotenv from "dotenv";
import { execCommand } from "./execCommand";

async function createRelease(preRelease: boolean) {
  console.log(`Create GitHub ${preRelease ? "pre-" : ""}release`);

  const info = await getInfo();

  const manifestFile = path.resolve(
    path.join(__dirname, "../src/manifest.json")
  );
  const manifest = require(manifestFile);

  const log = await getChangelog(manifest.version);
  console.log(log);

  const releaseOptions: ReleaseOptions = {
    owner: info.owner,
    repo: info.repo,
    tag: `v${manifest.version}`,
    name: `v${manifest.version}`,
    prerelease: preRelease,
    token: process.env.GITHUB_TOKEN,
    body: log,
  };

  console.log("githubRelease");
  const releaseResult = await githubRelease(releaseOptions);

  const jpl = await getJPLFileName();

  const releaseAssetOptions: AssetOptions = {
    token: process.env.GITHUB_TOKEN,
    asset: path.resolve(path.join(__dirname, "..", "publish", jpl)),
    name: jpl,
    label: jpl,
    uploadUrl: releaseResult.upload_url,
  };

  console.log("githubAsset");
  await githubAsset(releaseAssetOptions);
}

async function main() {
  dotenv.config();

  if (
    process.env.GITHUB_TOKEN === undefined ||
    process.env.GITHUB_TOKEN === ""
  ) {
    throw new Error("No GITHUB_TOKEN in env");
  }
  const argv = require("yargs").argv;

  const preRelease = argv.prerelease ? true : false;

  let type: string;
  if (argv.upload) {
    await createRelease(preRelease);
    process.exit(0);
  } else if (argv.patch) type = "patch";
  else if (argv.minor) type = "minor";
  else if (argv.major) type = "major";
  else throw new Error("--patch, --minor or --major not provided");
  if (!(await nothingUncomitted())) {
    throw new Error("Not a clean git status");
  }

  if ((await getBranch()) !== "develop") {
    throw new Error("not in develop branch");
  }

  const info = await getInfo();
  console.log(info);

  const reproOptions: ReproOptions = {
    owner: info.owner,
    repo: info.repo,
    token: process.env.GITHUB_TOKEN,
  };
  if (!(await checkAuth(reproOptions))) {
    throw new Error("Github auth error");
  }
  console.log("Create release");
  await runNpmVersion(type);
  const versionNumber = require(path.resolve(
    path.join(__dirname, "../package.json")
  )).version;
  const version = `v${versionNumber}`;
  console.log("new version " + version);
  await setPluginVersion(versionNumber);
  await updateChangelog(versionNumber, preRelease);

  await execCommand(
    "git add src/manifest.json CHANGELOG.md package-lock.json package.json"
  );

  await execCommand(`git commit -m "bump version ${versionNumber}"`);
  await execCommand(`git checkout master`);
  if ((await getBranch()) !== "master") {
    throw new Error("not in master branch");
  }

  await execCommand(`git merge develop --no-ff`);
  await execCommand(`git tag ${version}`);

  console.log("Execute the following commands:");
  console.log(`git push`);
  console.log(`git push --tag`);
  if (!preRelease) {
    console.log(`npm publish`);
    console.log(`npm run gitRelease`);
  } else {
    console.log(`npm run gitPreRelease`);
  }
}

main().catch((error) => {
  console.error("Fatal error");
  console.error(error);
  process.exit(1);
});
