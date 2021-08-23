// Source copied from Joplin
// https://github.com/laurent22/joplin/blob/5b1a9700448efb6aff423bda1889936c92393cbf/packages/tools/tool-utils.ts#L159-L164

import * as execa from "execa";

interface ExecCommandOptions {
  showInput?: boolean;
  showOutput?: boolean;
  quiet?: boolean;
}

export async function execCommand(
  command: string | string[],
  options: ExecCommandOptions = null
): Promise<string> {
  options = {
    showInput: true,
    showOutput: true,
    quiet: false,
    ...options,
  };

  if (options.quiet) {
    options.showInput = false;
    options.showOutput = false;
  }

  if (options.showInput) {
    if (typeof command === "string") {
      console.info(`> ${command}`);
    } else {
      console.info(`> ${commandToString(command[0], command.slice(1))}`);
    }
  }

  const args: string[] =
    typeof command === "string"
      ? splitCommandString(command)
      : (command as string[]);
  const executableName = args[0];
  args.splice(0, 1);
  const promise = execa(executableName, args);
  if (options.showOutput) promise.stdout.pipe(process.stdout);
  const result = await promise;
  return result.stdout.trim();
}

function commandToString(commandName: string, args: string[] = []) {
  const output = [quotePath(commandName)];

  for (const arg of args) {
    output.push(quotePath(arg));
  }

  return output.join(" ");
}

function quotePath(path: string) {
  if (!path) return "";
  if (path.indexOf('"') < 0 && path.indexOf(" ") < 0) return path;
  path = path.replace(/"/, '\\"');
  return `"${path}"`;
}

function splitCommandString(command, options = null) {
  options = options || {};
  if (!("handleEscape" in options)) {
    options.handleEscape = true;
  }

  const args = [];
  let state = "start";
  let current = "";
  let quote = '"';
  let escapeNext = false;
  for (let i = 0; i < command.length; i++) {
    const c = command[i];

    if (state == "quotes") {
      if (c != quote) {
        current += c;
      } else {
        args.push(current);
        current = "";
        state = "start";
      }
      continue;
    }

    if (escapeNext) {
      current += c;
      escapeNext = false;
      continue;
    }

    if (c == "\\" && options.handleEscape) {
      escapeNext = true;
      continue;
    }

    if (c == '"' || c == "'") {
      state = "quotes";
      quote = c;
      continue;
    }

    if (state == "arg") {
      if (c == " " || c == "\t") {
        args.push(current);
        current = "";
        state = "start";
      } else {
        current += c;
      }
      continue;
    }

    if (c != " " && c != "\t") {
      state = "arg";
      current += c;
    }
  }

  if (state == "quotes") {
    throw new Error(`Unclosed quote in command line: ${command}`);
  }

  if (current != "") {
    args.push(current);
  }

  if (args.length <= 0) {
    throw new Error("Empty command line");
  }

  return args;
}
