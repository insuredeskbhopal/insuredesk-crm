import os
import json
import re
from pathlib import Path

# Paths
ROOT = Path(r"c:\Users\abhis\insuredesk-crm")
GRAPH_JSON_PATH = ROOT / "graphify-out" / "graph.json"
GRAPH_HTML_PATH = ROOT / "graphify-out" / "graph.html"

def clean_comment(lines):
    cleaned = []
    for line in lines:
        l = line.strip()
        # Remove comment delimiters
        if l.startswith("/**"):
            l = l[3:]
        elif l.startswith("/*"):
            l = l[2:]
        elif l.endswith("*/"):
            l = l[:-2]
        elif l.startswith("*"):
            l = l[1:]
        elif l.startswith("//"):
            l = l[2:]
        elif l.startswith("#"):
            l = l[1:]
        
        l = l.strip()
        if l:
            cleaned.append(l)
    return " ".join(cleaned)

def extract_comments(file_path, line_num):
    if not file_path.exists():
        return ""
    
    try:
        lines = file_path.read_text(encoding="utf-8").splitlines()
    except Exception:
        return ""
        
    if not lines or line_num < 1 or line_num > len(lines):
        return ""
    
    # 0-indexed line of the symbol itself
    idx = line_num - 1
    
    # Check for same-line comment
    same_line = lines[idx]
    if "//" in same_line:
        comment = same_line.split("//", 1)[1].strip()
        if comment:
            return comment
    if "#" in same_line and not same_line.startswith("#"):
        comment = same_line.split("#", 1)[1].strip()
        if comment:
            return comment
            
    # Scan upwards for preceding comments
    collected = []
    curr = idx - 1
    
    # Skip trailing blank lines
    while curr >= 0 and not lines[curr].strip():
        curr -= 1
        
    if curr < 0:
        return ""
        
    # Check if we hit a block comment ending
    if lines[curr].strip().endswith("*/"):
        # Collect lines until we find the start of the block comment
        block_lines = []
        while curr >= 0:
            line_str = lines[curr]
            block_lines.insert(0, line_str)
            if "/*" in line_str:
                break
            curr -= 1
        return clean_comment(block_lines)
        
    # Check if we hit line comments
    if lines[curr].strip().startswith("//") or lines[curr].strip().startswith("#"):
        comment_prefix = "//" if lines[curr].strip().startswith("//") else "#"
        comment_lines = []
        while curr >= 0 and lines[curr].strip().startswith(comment_prefix):
            comment_lines.insert(0, lines[curr])
            curr -= 1
        return clean_comment(comment_lines)
        
    return ""

def clean_route(file_path_str):
    # e.g., src/app/(dashboard)/analytics-reports/[reportId]/page.js -> /analytics-reports/[reportId]
    p = file_path_str.replace("src/app/", "")
    # Remove group directories like (dashboard), (auth), etc.
    p = re.sub(r"\([^)]+\)/", "", p)
    # Remove file endings
    for suffix in ["/page.js", "/page.tsx", "/layout.js", "/layout.tsx", "/route.js", "/route.ts", "/error.js", "/error.tsx", "/loading.js", "/loading.tsx"]:
        if p.endswith(suffix):
            p = p[:-len(suffix)]
            break
    if not p or p == "page.js" or p == "layout.js":
        return "/"
    if not p.startswith("/"):
        p = "/" + p
    return p

def generate_fallback_rationale(node):
    node_id = node.get("id", "")
    label = node.get("label", "")
    source_file = node.get("source_file", "")
    
    # Configuration Files
    if source_file == "eslint.config.mjs":
        return "Created to configure ESLint linting rules and extensions to ensure code style consistency and prevent common errors."
    if source_file == "next.config.mjs":
        return "Created to configure Next.js application parameters, build environments, redirects, and custom webpack/headers rules."
    if source_file == "postcss.config.js":
        return "Created to configure PostCSS plugins such as TailwindCSS and Autoprefixer for styles compilation."
    if source_file == "tailwind.config.mjs":
        return "Created to extend the default Tailwind CSS styling utilities, theme colors, spacing, and content paths."
    if source_file == "vitest.config.js":
        return "Created to configure Vitest test suites, including environment setup, mock hooks, and coverage reporting."
    if source_file == "global.d.ts":
        return "Provides global TypeScript type definitions to support custom properties, imports, or external API interfaces."
        
    # package.json and packages
    if source_file == "package.json":
        if label == "package.json":
            return "Project manifest declaring NPM metadata, versioning, private flags, and scripts configurations."
        if label in ("dependencies", "devDependencies"):
            return f"Declarations block in package.json containing lists of required external npm packages for {label}."
        if node_id.startswith("package_dependencies_"):
            clean_pkg = label.replace("package_dependencies_", "")
            return f"NPM dependency installed to provide third-party library functionality for '{clean_pkg}'."
        if node_id.startswith("package_devdependencies_"):
            clean_pkg = label.replace("package_devdependencies_", "")
            return f"NPM devDependency installed to support development toolchains and linting for '{clean_pkg}'."
        if node_id.startswith("package_scripts_"):
            clean_script = label.replace("package_scripts_", "")
            return f"NPM script config detailing command configuration for the lifecycle task: '{clean_script}'."
            
    # PowerShell Script
    if source_file.endswith(".ps1"):
        if "backup" in source_file.lower():
            if label.endswith("()"):
                return f"Utility function inside the automated database backup script to support status updates or folder creation."
            return "Automated database backup PowerShell script designed to periodically compress database volumes and output audit logs."
        return "Administrative automation PowerShell script designed to run backend maintenance procedures."
        
    # Prisma Schemas & Seed
    if "prisma/" in source_file:
        if source_file == "prisma/seed.js":
            if label == "main()":
                return "The core database seed entry point executing async inserts to populate initial CRM users and lookups."
            if label == "prisma":
                return "Instantiates the database connection wrapper (Prisma Client) for record seed execution."
            return f"Helper variable or data object '{label}' used to prepare state seeding in database tables."
        return "Database architecture schema and migrations code used to orchestrate ORM models."
        
    # Next.js Pages and App Router Files
    if "src/app/" in source_file:
        route = clean_route(source_file)
        if source_file.endswith("page.js") or source_file.endswith("page.tsx"):
            if label.endswith("()"):
                return f"Main Page React component rendering the CRM interface layout and logical forms for the '{route}' route."
            return f"Next.js App Router Page file routing client requests to the '{route}' screen view."
        if source_file.endswith("layout.js") or source_file.endswith("layout.tsx"):
            if label.endswith("()"):
                return f"Layout React component providing layout shell, navigation components, and context wrappers for route '{route}'."
            return f"Next.js App Router Layout file wrapping child views under route '{route}'."
        if source_file.endswith("route.js") or source_file.endswith("route.ts"):
            return f"API Route Handler executing server-side API requests (GET, POST, DELETE) under route '{route}'."
        if source_file.endswith("error.js") or source_file.endswith("error.tsx"):
            return f"Next.js Error boundary file capturing uncaught exceptions and rendering UI error placeholders under route '{route}'."
        if source_file.endswith("loading.js") or source_file.endswith("loading.tsx"):
            return f"Next.js Loading placeholder file rendering structural skeletons during page transition under route '{route}'."
            
    # Specific Domain Core Modules
    if "src/lib/policies/" in source_file:
        if "parser" in source_file.lower() or "warehouse" in source_file.lower() or "extractor" in source_file.lower():
            carrier = "Insurance Carrier"
            for c in ["Bajaj", "Iffco", "Tata", "ICICI"]:
                if c.lower() in source_file.lower() or c.lower() in label.lower():
                    carrier = c
            if label.endswith("()"):
                return f"Extractor function designed to compile structured fields (policy numbers, dates, premiums) from {carrier} text outputs."
            return f"Policy parsing configuration module defining validation expressions and extraction ranges for {carrier} policy docs."
        return "Policy document management module responsible for PDF ingestion, OCR reading, and parsing coordinates mapping."

    if "src/lib/auth/" in source_file:
        return "Authentication security handler orchestrating JWT creation, session checks, login routes, or credential hashes."
    if "src/lib/db/" in source_file:
        return "Prisma Database initialization client exporting active connection instances across api queries."
    if "src/lib/seo/" in source_file:
        return "Dynamic SEO generation module composing meta tags, site titles, and open-graph properties for index pages."
    if "src/lib/storage/" in source_file:
        return "File storage adapter managing physical files ingestion, local disk mapping, or upload stream pipelines."
    if "src/lib/customer-profiles/" in source_file:
        return "Customer profiling service coordinating customer records indexing, profiling status, and renewals search."
    if "src/lib/endorsements/" in source_file:
        return "Policy endorsement comparison module managing field-level updates tracking, template audits, and reviews database."
    if "src/lib/records/" in source_file:
        return "Bulk records upload audit manager organizing batch inserts pipelines and validation schemas."
    if "src/lib/renewals/" in source_file:
        return "Renewals management pipeline analyzing expiry deadlines, generating notices, and tracking pipelines."

    # General Function or Symbol Heuristics
    if label.endswith("()"):
        clean_lbl = label.replace("()", "")
        if clean_lbl.startswith("use"):
            return f"Custom React Hook '{clean_lbl}' encapsulating stateful UI logic and updates hooks."
        if clean_lbl.startswith("get") or clean_lbl.startswith("fetch"):
            return f"Query helper function '{clean_lbl}' written to fetch or resolve data from files or remote handlers."
        if clean_lbl.startswith("set") or clean_lbl.startswith("update"):
            return f"State mutating handler '{clean_lbl}' executing updates to database states or component values."
        if "handleSubmit" in clean_lbl:
            return "Form submit handler validating inputs and forwarding data requests to server endpoints."
        return f"Function block '{clean_lbl}()' encapsulating business logic to ensure reusability and high cohesion."

    if label.isupper():
        return f"Global constant configuration property '{label}' defining strict constants or dictionary options."
        
    return f"Code definition symbol '{label}' created to implement features in '{source_file}'."

def main():
    print("Reading graph.json...")
    with open(GRAPH_JSON_PATH, "r", encoding="utf-8") as f:
        graph = json.load(f)
        
    nodes = graph.get("nodes", [])
    print(f"Loaded {len(nodes)} nodes from graph.json.")
    
    enriched_nodes_count = 0
    comment_hits = 0
    heuristic_hits = 0
    
    for node in nodes:
        source_file = node.get("source_file", "")
        source_location = node.get("source_location", "")
        
        rationale = ""
        # 1. Try to extract comments
        if source_file and source_location.startswith("L"):
            try:
                line_num = int(source_location[1:])
                file_path = ROOT / source_file
                extracted = extract_comments(file_path, line_num)
                if extracted:
                    rationale = f"Code Comment: {extracted}"
                    comment_hits += 1
            except Exception as e:
                pass
                
        # 2. Fall back to heuristic generation
        if not rationale:
            rationale = generate_fallback_rationale(node)
            heuristic_hits += 1
            
        node["rationale"] = rationale
        enriched_nodes_count += 1
        
    # Write updated graph.json
    print(f"Updating graph.json with enriched nodes...")
    with open(GRAPH_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(graph, f, indent=2, ensure_ascii=False)
        
    print(f"graph.json successfully updated! Rationale sources: {comment_hits} comments, {heuristic_hits} heuristics.")

    # Now update graph.html
    if GRAPH_HTML_PATH.exists():
        print("Reading graph.html to inject node rationales...")
        html_content = GRAPH_HTML_PATH.read_text(encoding="utf-8")
        
        # We need to extract the vis_nodes data structure inside RAW_NODES
        # In graph.html, we have: const RAW_NODES = [{...}, {...}];
        # We will parse out this line, update the objects inside it, and replace it.
        # Let's locate 'const RAW_NODES = '
        match = re.search(r"const RAW_NODES = (\[.*?\]);", html_content)
        if match:
            print("Found RAW_NODES array inside graph.html. Rebuilding with rationale...")
            raw_nodes_str = match.group(1)
            raw_nodes = json.loads(raw_nodes_str)
            
            # Map rationale to each raw node
            nodes_by_id = {n["id"]: n for n in nodes}
            for rn in raw_nodes:
                nid = rn.get("id")
                if nid in nodes_by_id:
                    rn["rationale"] = nodes_by_id[nid]["rationale"]
                    
            # Serialize back
            new_raw_nodes_str = json.dumps(raw_nodes, ensure_ascii=False)
            
            # Escape script tags
            new_raw_nodes_str = new_raw_nodes_str.replace("</", "<\\/")
            
            # Replace in html content
            start_idx, end_idx = match.span(1)
            html_content = html_content[:start_idx] + new_raw_nodes_str + html_content[end_idx:]
            
            # Also patch the DataSet initialization in HTML:
            # We need to ensure that DataSet maps the _rationale property
            # Let's find:
            # const nodesDS = new vis.DataSet(RAW_NODES.map(n => ({
            #   id: n.id, label: n.label, color: n.color, size: n.size,
            #   font: n.font, title: n.title,
            #   _community: n.community, _community_name: n.community_name,
            #   _source_file: n.source_file, _file_type: n.file_type, _degree: n.degree,
            # })));
            # We want to replace it to include _rationale
            ds_pattern = r"_degree: n.degree,\s*\}\)\)\);"
            ds_replacement = "_degree: n.degree,\n  _rationale: n.rationale || 'No description available',\n})));"
            html_content = re.sub(ds_pattern, ds_replacement, html_content)
            
            # Also modify showInfo function in graph.html:
            # Let's find showInfo innerHTML injection:
            #     <div class="field">Degree: ${n._degree}</div>
            #     ${neighborIds.length ? ...}
            # We want to insert the Why Created block right after Degree.
            info_pattern = r'<div class="field">Degree: \$\{n\._degree\}<\/div>'
            info_replacement = '<div class="field">Degree: ${n._degree}</div>\n    <div class="field" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #2a2a4e;"><b>Why Created:</b><div style="margin-top: 4px; color: #b9bbbe; line-height: 1.4; font-style: italic;">${esc(n._rationale)}</div></div>'
            html_content = re.sub(info_pattern, info_replacement, html_content)
            
            # Write back
            GRAPH_HTML_PATH.write_text(html_content, encoding="utf-8")
            print("graph.html updated successfully with node rationales and UI display updates!")
        else:
            print("WARNING: Could not find RAW_NODES pattern in graph.html!")
    else:
        print("WARNING: graph.html does not exist at graphify-out/graph.html!")

if __name__ == "__main__":
    main()
