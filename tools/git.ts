import { execCommand } from "./execCommand";

interface GithubInfo {
  owner: string;
  repo: string;
}

export async function nothingUncomitted() {
  console.log("Check git status");
  const status = await execCommand("git status --porcelain", {
    showOutput: true,
    showInput: false,
  });

  if (status.trim() === "") return true;
  else return false;
}

export async function getBranch() {
  return await execCommand("git rev-parse --abbrev-ref HEAD", {
    showOutput: false,
    showInput: false,
  });
}
export async function getInfo(): Promise<GithubInfo> {
  const dataStr = await execCommand("git remote -v", {
    showOutput: false,
    showInput: false,
  });

  for (const str of dataStr.split("\n")) {
    if (
      str.slice(0, 6) === "origin" &&
      str.slice(str.length - 5, str.length - 1) === "push"
    ) {
      const tmp = str.split(/[\:/.]/);

      const owner = tmp[tmp.length - 3];
      const repo = tmp[tmp.length - 2];
      return { owner: owner, repo: repo };
    }
  }

  return null;
}
