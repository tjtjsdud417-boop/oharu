const fs = require("fs");
const path = require("path");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;

  const executable = path.join(context.appOutDir, "Oharu.exe");
  const icon = path.join(__dirname, "build", "icon.ico");
  if (!fs.existsSync(executable)) throw new Error(`Missing packaged executable: ${executable}`);
  if (!fs.existsSync(icon)) throw new Error(`Missing Windows icon: ${icon}`);

  const { rcedit } = await import("rcedit");
  await rcedit(executable, { icon });
  console.log(`Embedded icon patched: ${executable}`);
};
