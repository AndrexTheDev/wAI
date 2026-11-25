#!/usr/bin/env node
/**
 * wAI — single entry point for every repeatable task.
 *
 *   node tools/wai.mjs <command>
 *
 * The point of this file is that no future session has to rediscover how the
 * repository works. Each command is a thin, documented wrapper around tooling
 * that already lives in the repo (`tools/*.sh`, Gradle, npm scripts), plus a few
 * orchestration shortcuts.
 *
 *   doctor        what works here, what to do next            (no side effects)
 *   verify        typecheck + unit tests + render smoke + android checks
 *   build:web     app demo + landing page into packages/<pkg>/dist
 *   android       local APK/AAB build (needs JDK 21 + SDK 36)
 *   ci:android    trigger the GitHub Actions APK build
 *   ci:status     latest workflow runs
 *   ci:logs       failing step annotations of the newest run
 *   release       bump version, tag, push (CI builds + publishes)
 *   status        one-screen project status
 *
 * Every command prints a short "what happened / what next" line so the output is
 * useful on its own.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const REPO = 'AndrexTheDev/wAI';

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};
const step = (msg) => console.log(`\n${c.bold(`▶ ${msg}`)}`);
const done = (msg) => console.log(`${c.green('✔')} ${msg}`);

function sh(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? ROOT,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
  });
  if (options.capture) return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  if (result.status !== 0) process.exit(result.status ?? 1);
  return { status: 0 };
}

const gh = (args) => sh('gh', args, { capture: true });
const ghJson = (args) => {
  const { status, stdout } = gh(args);
  if (status !== 0) return null;
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
};

// ────────────────────────────────────────────────────────────────────────────
const commands = {
  doctor() {
    sh('node', [path.join(ROOT, 'tools/doctor.mjs'), ...process.argv.slice(3)]);
  },

  verify() {
    step('verify: typecheck, unit tests, render smoke, android checks');
    const t0 = Date.now();
    sh('npm', ['run', 'verify']);
    done(`all checks passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  },

  'build:web'() {
    step('build: app demo → landing page → dist');
    sh('npm', ['run', 'build']);
    const appDist = path.join(ROOT, 'packages/app/dist');
    const landingDist = path.join(ROOT, 'packages/landing/dist');
    done(`app ${sizeOf(appDist)} · landing ${sizeOf(landingDist)}`);
    console.log(c.dim('  next: push to main to deploy the site, or tag a release for the APK'));
  },

  android() {
    const args = process.argv.slice(3);
    step('android: local APK/AAB build');
    if (!existsSync('/usr/lib/jvm') && !process.env.JAVA_HOME && sh('which', ['java'], { capture: true }).status !== 0) {
      console.log(c.red('  ✖ no JDK found in this environment.'));
      console.log('    Local build:  install JDK 21 + Android SDK 36, then rerun');
      console.log('    CI build:     node tools/wai.mjs ci:android');
      process.exit(1);
    }
    sh('bash', [path.join(ROOT, 'tools/build-android.sh'), ...args]);
  },

  'ci:android'() {
    step('ci: trigger the Android APK/AAB workflow');
    const branch = currentBranch();
    const { status, stderr } = gh(['workflow', 'run', 'android.yml', '--ref', branch, '-f', 'release=true']);
    if (status !== 0) {
      console.log(c.red(`  ✖ could not start the workflow: ${stderr.trim()}`));
      process.exit(1);
    }
    done(`workflow started on ${branch}`);
    console.log(c.dim('  watch: node tools/wai.mjs ci:status   ·   logs: node tools/wai.mjs ci:logs'));
  },

  'ci:status'() {
    step('ci: latest runs');
    const runs = ghJson(['run', 'list', '--repo', REPO, '--limit', '8', '--json', 'workflowName,status,conclusion,headBranch,databaseId,createdAt']);
    if (!runs) {
      console.log(c.red('  ✖ gh not available or not authenticated'));
      process.exit(1);
    }
    for (const run of runs) {
      const mark =
        run.conclusion === 'success' ? c.green('✔') : run.conclusion === 'failure' ? c.red('✖') : run.status === 'in_progress' ? c.yellow('…') : c.dim('·');
      console.log(
        `  ${mark} ${run.workflowName.padEnd(17)} ${String(run.headBranch).padEnd(22)} ${String(run.conclusion ?? run.status).padEnd(10)} ${run.databaseId}`,
      );
    }
  },

  'ci:logs'() {
    step('ci: failure annotations of the newest run');
    const runs = ghJson(['run', 'list', '--repo', REPO, '--limit', '5', '--json', 'databaseId,conclusion,workflowName']);
    const run = runs?.find((r) => r.conclusion === 'failure') ?? runs?.[0];
    if (!run) {
      console.log('  no runs found');
      return;
    }
    const job = ghJson(['run', 'view', String(run.databaseId), '--repo', REPO, '--json', 'jobs']);
    const jobId = job?.jobs?.[0]?.databaseId;
    if (!jobId) {
      console.log(`  no job found for run ${run.databaseId}`);
      return;
    }
    const annotations = ghJson(['api', `repos/${REPO}/check-runs/${jobId}/annotations`]);
    if (!annotations?.length) {
      console.log(`  ${run.workflowName} #${run.databaseId}: no annotations`);
      return;
    }
    for (const a of annotations) {
      if (!a.title && /Node\.js 20 is deprecated/.test(a.message ?? '')) continue;
      const colour = a.annotation_level === 'failure' ? c.red : a.annotation_level === 'warning' ? c.yellow : c.cyan;
      console.log(`  ${colour(a.title || a.annotation_level)} ${a.message.slice(0, 400)}`);
    }
  },

  release() {
    const bump = process.argv[3] ?? 'patch';
    step(`release: ${bump}`);
    sh('bash', [path.join(ROOT, 'tools/release.sh'), bump, process.argv.slice(4).join(' ')]);
  },

  'make-keystore'() {
    step('keystore: create the upload key');
    sh('bash', [path.join(ROOT, 'tools/make-keystore.sh')]);
  },

  status() {
    step('wAI status');
    const appPkg = JSON.parse(readFileSync(path.join(ROOT, 'packages/app/package.json'), 'utf8'));
    const gradle = readFileSync(path.join(ROOT, 'packages/app/android/app/build.gradle'), 'utf8');
    console.log(`  version        ${c.bold(appPkg.version)} (versionCode ${gradle.match(/versionCode (\d+)/)?.[1]})`);
    console.log(`  branch         ${currentBranch()}`);
    const dirty = sh('git', ['status', '--porcelain'], { capture: true }).stdout.trim();
    console.log(`  working tree   ${dirty ? c.yellow(`${dirty.split('\n').length} changed file(s)`) : c.green('clean')}`);

    // Code size
    const counts = countLines(path.join(ROOT, 'packages'));
    console.log(`  code           ${counts.files} source files, ${counts.lines.toLocaleString('de-DE')} lines`);
    console.log(`  tests          ${readFileSync(path.join(ROOT, 'README.md'), 'utf8').match(/(\d+) unit tests/)?.[1] ?? '?'} unit tests + render smoke`);

    // Release state
    const release = ghJson(['release', 'view', '--repo', REPO, '--json', 'tagName,assets,isPrerelease']);
    if (release) {
      const apk = release.assets.find((a) => a.name.endsWith('.apk'));
      console.log(`  latest release ${c.bold(release.tagName)}${apk ? ` · APK ${(apk.size / 1024 / 1024).toFixed(1)} MB` : ''}`);
    }

    // Secrets / pages are not readable with this token; report what we know.
    const runs = ghJson(['run', 'list', '--repo', REPO, '--limit', '20', '--json', 'conclusion,workflowName']);
    if (runs) {
      const androidRuns = runs.filter((r) => r.workflowName === 'Android build');
      const lastOk = androidRuns.find((r) => r.conclusion === 'success');
      console.log(`  last APK build ${lastOk ? c.green('success') : c.red('none yet')}`);
    }

    step('open items for launch');
    const open = [];
    const keystore = path.join(process.env.HOME ?? '', '.wai/wai-release.jks');
    if (!existsSync(keystore)) open.push('release keystore + 4 WAI_* repo secrets  →  node tools/wai.mjs make-keystore');
    open.push('enable GitHub Pages (Settings → Pages → GitHub Actions) for the live site');
    open.push('lawyer review per docs/LEGAL_REVIEW.md');
    open.push('test the APK on a real device in airplane mode');
    for (const item of open) console.log(`  ${c.yellow('•')} ${item}`);
  },

  help() {
    console.log(`
${c.bold('wAI toolchain')}

  node tools/wai.mjs doctor          what works in this environment (no side effects)
  node tools/wai.mjs verify          typecheck + 28 tests + render smoke + android checks
  node tools/wai.mjs build:web       app demo + landing page builds
  node tools/wai.mjs android         local APK/AAB build (needs JDK 21 + SDK 36)
  node tools/wai.mjs ci:android      trigger the APK build on GitHub Actions
  node tools/wai.mjs ci:status       latest workflow runs
  node tools/wai.mjs ci:logs         why the newest run failed
  node tools/wai.mjs release patch   bump version, tag, push → CI builds + releases
  node tools/wai.mjs make-keystore   create the upload key + print the secrets to set
  node tools/wai.mjs status          versions, code size, release state, open items

${c.dim('Rule of thumb: run verify while developing, build:web when the UI changed,')}
${c.dim('and let CI build the APK. Local Android builds are the exception.')}
`);
  },
};

function currentBranch() {
  return sh('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { capture: true }).stdout.trim();
}

function sizeOf(dir) {
  if (!existsSync(dir)) return 'missing';
  let bytes = 0;
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else bytes += statSync(full).size;
    }
  };
  walk(dir);
  return `${(bytes / 1024).toFixed(0)} kB`;
}

function countLines(dir, acc = { files: 0, lines: 0 }) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'build', 'android', 'test'].includes(entry.name)) continue;
      countLines(full, acc);
    } else if (/\.(ts|tsx|mjs|css)$/.test(entry.name)) {
      acc.files += 1;
      acc.lines += readFileSync(full, 'utf8').split('\n').length;
    }
  }
  return acc;
}

const command = process.argv[2] ?? 'help';
const handler = commands[command];
if (!handler) {
  console.log(c.red(`unknown command: ${command}`));
  commands.help();
  process.exit(2);
}
handler();
