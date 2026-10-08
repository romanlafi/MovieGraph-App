import {existsSync} from "node:fs";
import {delimiter, dirname, resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

if (process.env.WORKERS_CI === "1" || process.argv.includes("--force")) {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const candidates = process.env.MOVIEGRAPH_BUILD_PYTHON
        ? [process.env.MOVIEGRAPH_BUILD_PYTHON]
        : ["python3", "python"];
    const candidate = candidates.find(candidate =>
        spawnSync(candidate, ["--version"], {stdio: "ignore"}).status === 0);
    if (!candidate) throw new Error("Python is required to package the MovieGraph Worker.");
    const interpreter = spawnSync(candidate, ["-c", "import sys; print(sys.executable)"], {encoding: "utf8"});
    if (interpreter.status !== 0) throw new Error("Could not locate the build interpreter.");
    const python = interpreter.stdout.trim();
    const environment = {...process.env, PATH: `${dirname(python)}${delimiter}${process.env.PATH ?? ""}`};

    const run = args => {
        const result = spawnSync(python, args, {cwd: root, stdio: "inherit", env: environment});
        if (result.error) throw result.error;
        if (result.status !== 0) process.exit(result.status ?? 1);
    };
    const uv = spawnSync(python, ["-m", "uv", "--version"], {encoding: "utf8"});
    if (uv.status !== 0 || !uv.stdout.trim().startsWith("uv 0.12.23")) {
        run(["-m", "pip", "install", "uv==0.12.23"]);
    }
    console.log("Preparing Python Worker dependencies for Cloudflare...");
    run(["-m", "uv", "python", "install", "3.14.2"]);
    const workerPython = spawnSync(python, ["-m", "uv", "python", "find", "3.14.2"], {
        encoding: "utf8", env: environment,
    });
    if (workerPython.status !== 0) throw new Error("Could not locate the Worker build interpreter.");
    environment.PATH = `${dirname(workerPython.stdout.trim())}${delimiter}${environment.PATH}`;
    const buildEnvironment = resolve(root, ".wrangler", "worker-build");
    run(["-m", "uv", "venv", "--python", "3.14.2", buildEnvironment]);
    const buildPython = resolve(buildEnvironment, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
    run(["-m", "uv", "pip", "install", "--python", buildPython, "workers-py==1.17.7"]);
    const sync = spawnSync(buildPython, ["-m", "pywrangler", "sync"], {
        cwd: root, stdio: "inherit", env: environment,
    });
    if (sync.error) throw sync.error;
    if (sync.status !== 0) process.exit(sync.status ?? 1);
    for (const dependency of ["workers", "fastapi", "sqlalchemy", "pg8000"]) {
        if (!existsSync(resolve(root, "python_modules", dependency, "__init__.py"))) {
            throw new Error(`Worker dependency was not packaged: ${dependency}`);
        }
    }
}
