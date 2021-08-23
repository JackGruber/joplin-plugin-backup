// https://docs.github.com/en/rest/reference/repos

import axios from "axios";
import * as FormData from "form-data";
import * as fs from "fs-extra";
import * as mime from "mime";

const apiRoot = "https://api.github.com";

export interface AssetOptions {
  asset: string;
  token: string;
  uploadUrl: string;
  label: string;
  name: string;
}

export interface ReleaseOptions {
  name: string;
  owner: string;
  repo: string;
  tag: string;
  body: string;
  prerelease: boolean;
  token: string;
}

export interface ReproOptions {
  owner: string;
  repo: string;
  token?: string;
}

export async function checkAuth(options: ReproOptions): Promise<boolean> {
  const url = `${apiRoot}/repos/${options.owner}/${options.repo}/releases`;
  const headers = {
    Authorization: `token ${options.token}`,
    accept: `application/vnd.github.v3+json`,
  };

  const response = await axios.get(url, { headers });

  if (response.status === 200 && response.statusText === "OK") {
    return true;
  } else {
    return false;
  }
}

export async function githubRelease(options: ReleaseOptions): Promise<any> {
  const url = `${apiRoot}/repos/${options.owner}/${options.repo}/releases`;
  const body = {
    tag_name: options.tag,
    name: options.name,
    body: options.body,
    prerelease: options.prerelease,
  };
  const headers = {
    Authorization: `token ${options.token}`,
    accept: `application/vnd.github.v3+json`,
  };
  const response = await axios.post(url, body, { headers });
  if (response.status !== 201) {
    console.error(response);
    throw new Error("github release error");
  }
  return response.data;
}

export async function githubAsset(info: AssetOptions): Promise<any> {
  const cleanUrl = info.uploadUrl.replace("{?name,label}", "");
  const form = new FormData();
  form.append("file", fs.createReadStream(info.asset));
  const state = fs.statSync(info.asset);
  const headers = {
    Authorization: `token ${info.token}`,
    "Content-Type": mime.getType(info.asset),
    "Content-Length": state.size,
    accept: `application/vnd.github.v3+json`,
  };

  const response = await axios.post(
    `${cleanUrl}?label=${info.label}&name=${info.name}`,
    form,
    { headers }
  );

  if (response.status !== 201) {
    console.error(response);
    throw new Error("github asset upload error");
  }

  if (response.data.state !== "uploaded") {
    console.error(response);
    throw new Error("github asset upload error");
  }

  return response.data;
}
