const fs = require("fs");
const path = require("path");

const appDir = path.join(__dirname, "..", "src", "app");

function getRoutes(dir, baseRoute = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let pages = [];
  let apis = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      let segment = entry.name;
      let nextBase = baseRoute;
      if (!segment.startsWith("(") || !segment.endsWith(")")) {
        nextBase = `${baseRoute}/${segment}`;
      }
      const sub = getRoutes(fullPath, nextBase);
      pages = pages.concat(sub.pages);
      apis = apis.concat(sub.apis);
    } else if (entry.isFile()) {
      if (/^page\.(js|jsx|ts|tsx)$/.test(entry.name)) {
        const routePath = baseRoute || "/";
        pages.push({ route: routePath, file: path.relative(path.join(__dirname, ".."), fullPath).replace(/\\/g, "/") });
      } else if (/^route\.(js|jsx|ts|tsx)$/.test(entry.name)) {
        const routePath = baseRoute || "/";
        apis.push({ route: routePath, file: path.relative(path.join(__dirname, ".."), fullPath).replace(/\\/g, "/") });
      }
    }
  }

  return { pages, apis };
}

const { pages, apis } = getRoutes(appDir);
pages.sort((a, b) => a.route.localeCompare(b.route));
apis.sort((a, b) => a.route.localeCompare(b.route));

fs.writeFileSync(
  path.join(__dirname, "routes_inventory.json"),
  JSON.stringify({ pages, apis }, null, 2)
);
console.log(`Saved inventory: ${pages.length} pages, ${apis.length} APIs`);
