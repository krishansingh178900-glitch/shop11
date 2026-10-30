import fs from "fs";
import path from "path";

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.name === "route.ts") {
      let content = fs.readFileSync(fullPath, "utf8");
      if (!content.includes('export const dynamic = "force-dynamic"')) {
        // Add export const dynamic = "force-dynamic"; right after the imports
        const lines = content.split("\n");
        let lastImportIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith("import ")) {
            lastImportIndex = i;
          }
        }
        if (lastImportIndex !== -1) {
          lines.splice(lastImportIndex + 1, 0, '\nexport const dynamic = "force-dynamic";');
          content = lines.join("\n");
        } else {
          content = 'export const dynamic = "force-dynamic";\n\n' + content;
        }
        fs.writeFileSync(fullPath, content, "utf8");
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory("src/app/api");
console.log("Done updating API routes for dynamic export.");
