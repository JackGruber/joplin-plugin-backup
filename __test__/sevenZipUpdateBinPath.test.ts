import { sevenZip, pathTo7zip } from "../src/sevenZip";
import * as path from "path";
import joplin from "api";

it(`Set bin from joplin`, async () => {
  const pathBevor = pathTo7zip;
  const pathAdd = "addJoplinPath";
  const pathAfter = path.join(pathAdd, "7zip-bin", pathTo7zip);

  jest.spyOn(joplin.plugins, "installationDir").mockImplementation(async () => {
    return pathAdd;
  });

  await sevenZip.updateBinPath();
  expect(pathTo7zip).toBe(pathAfter);
});
