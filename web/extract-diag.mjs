import fs from "fs";
const html = fs.readFileSync("index.html", "utf8");
const start = html.indexOf('<script type="module">') + '<script type="module">'.length;
const end = html.indexOf("</script>", start);
fs.writeFileSync("_diag.mjs", html.slice(start, end));
