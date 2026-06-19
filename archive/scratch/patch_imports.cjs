const fs = require("fs");
const path = require("path");

function patchDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      patchDirectory(fullPath);
    } else if (file.endsWith(".js") || file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".cjs")) {
      let content = fs.readFileSync(fullPath, "utf8");
      let changed = false;

      // Replace requires and imports of '../lib/', '../app/', etc.
      const replacements = [
        // require("...lib/")
        { from: /require\("(\.\.\/\.\.\/\.\.\/)+lib\//g, to: (m) => m.replace("lib/", "src/lib/") },
        { from: /require\("(\.\.\/\.\.\/)+lib\//g, to: (m) => m.replace("lib/", "src/lib/") },
        { from: /require\("(\.\.\/)+lib\//g, to: (m) => m.replace("lib/", "src/lib/") },
        { from: /require\("(\.\/)+lib\//g, to: (m) => m.replace("lib/", "src/lib/") },
        
        { from: /require\('(\.\.\/\.\.\/\.\.\/)+lib\//g, to: (m) => m.replace("lib/", "src/lib/") },
        { from: /require\('(\.\.\/\.\.\/)+lib\//g, to: (m) => m.replace("lib/", "src/lib/") },
        { from: /require\('(\.\.\/)+lib\//g, to: (m) => m.replace("lib/", "src/lib/") },
        { from: /require\('(\.\/)+lib\//g, to: (m) => m.replace("lib/", "src/lib/") },

        // from "...lib/"
        { from: /from\s+"(\.\.\/\.\.\/\.\.\/)+lib\//g, to: (m) => m.replace("lib/", "src/lib/") },
        { from: /from\s+"(\.\.\/\.\.\/)+lib\//g, to: (m) => m.replace("lib/", "src/lib/") },
        { from: /from\s+"(\.\.\/)+lib\//g, to: (m) => m.replace("lib/", "src/lib/") },
        { from: /from\s+"(\.\/)+lib\//g, to: (m) => m.replace("lib/", "src/lib/") },
        
        { from: /from\s+'(\.\.\/\.\.\/\.\.\/)+lib\//g, to: (m) => m.replace("lib/", "src/lib/") },
        { from: /from\s+'(\.\.\/\.\.\/)+lib\//g, to: (m) => m.replace("lib/", "src/lib/") },
        { from: /from\s+'(\.\.\/)+lib\//g, to: (m) => m.replace("lib/", "src/lib/") },
        { from: /from\s+'(\.\/)+lib\//g, to: (m) => m.replace("lib/", "src/lib/") },

        // require("...app/")
        { from: /require\("(\.\.\/\.\.\/\.\.\/)+app\//g, to: (m) => m.replace("app/", "src/app/") },
        { from: /require\("(\.\.\/\.\.\/)+app\//g, to: (m) => m.replace("app/", "src/app/") },
        { from: /require\("(\.\.\/)+app\//g, to: (m) => m.replace("app/", "src/app/") },
        { from: /require\("(\.\/)+app\//g, to: (m) => m.replace("app/", "src/app/") },
        
        { from: /require\('(\.\.\/\.\.\/\.\.\/)+app\//g, to: (m) => m.replace("app/", "src/app/") },
        { from: /require\('(\.\.\/\.\.\/)+app\//g, to: (m) => m.replace("app/", "src/app/") },
        { from: /require\('(\.\.\/)+app\//g, to: (m) => m.replace("app/", "src/app/") },
        { from: /require\('(\.\/)+app\//g, to: (m) => m.replace("app/", "src/app/") },

        // from "...app/"
        { from: /from\s+"(\.\.\/\.\.\/\.\.\/)+app\//g, to: (m) => m.replace("app/", "src/app/") },
        { from: /from\s+"(\.\.\/\.\.\/)+app\//g, to: (m) => m.replace("app/", "src/app/") },
        { from: /from\s+"(\.\.\/)+app\//g, to: (m) => m.replace("app/", "src/app/") },
        { from: /from\s+"(\.\/)+app\//g, to: (m) => m.replace("app/", "src/app/") },
        
        { from: /from\s+'(\.\.\/\.\.\/\.\.\/)+app\//g, to: (m) => m.replace("app/", "src/app/") },
        { from: /from\s+'(\.\.\/\.\.\/)+app\//g, to: (m) => m.replace("app/", "src/app/") },
        { from: /from\s+'(\.\.\/)+app\//g, to: (m) => m.replace("app/", "src/app/") },
        { from: /from\s+'(\.\/)+app\//g, to: (m) => m.replace("app/", "src/app/") }
      ];

      for (const rep of replacements) {
        if (rep.from.test(content)) {
          content = content.replace(rep.from, rep.to);
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, "utf8");
        console.log(`Patched imports in: ${fullPath}`);
      }
    }
  }
}

const root = path.resolve(__dirname, "..");
patchDirectory(path.join(root, "tests"));
patchDirectory(path.join(root, "scripts"));
console.log("Imports patching complete!");
