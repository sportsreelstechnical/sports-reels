import { getUncachableGitHubClient } from '../server/github';
import * as fs from 'fs';
import * as path from 'path';

const REPO_NAME = 'sports-reels';
const REPO_DESCRIPTION = 'Sports Reels - Comprehensive compliance and visa eligibility platform for football clubs';

const IGNORED_PATHS = [
  'node_modules',
  '.git',
  '.replit',
  '.upm',
  '.cache',
  '.config',
  'dist',
  '.npm',
  'replit.nix',
  '.breakpoints',
  'generated-icon.png',
  'tsconfig.tsbuildinfo',
  'attached_assets',
  'package-lock.json'
];

function shouldIgnore(filePath: string): boolean {
  return IGNORED_PATHS.some(ignored => filePath.includes(ignored));
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (shouldIgnore(fullPath)) return;
    
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

async function pushToGitHub() {
  console.log('Getting GitHub client...');
  const octokit = await getUncachableGitHubClient();
  
  const { data: user } = await octokit.users.getAuthenticated();
  console.log(`Authenticated as: ${user.login}`);
  
  let repo;
  
  try {
    await octokit.repos.delete({
      owner: user.login,
      repo: REPO_NAME
    });
    console.log('Deleted existing empty repository');
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (e) {
  }
  
  try {
    const { data: existingRepo } = await octokit.repos.get({
      owner: user.login,
      repo: REPO_NAME
    });
    repo = existingRepo;
    console.log(`Repository ${REPO_NAME} exists at ${repo.html_url}`);
  } catch (error: any) {
    if (error.status === 404) {
      console.log(`Creating repository: ${REPO_NAME}`);
      const { data: newRepo } = await octokit.repos.createForAuthenticatedUser({
        name: REPO_NAME,
        description: REPO_DESCRIPTION,
        private: false,
        auto_init: true
      });
      repo = newRepo;
      console.log(`Repository created: ${repo.html_url}`);
      console.log('Waiting for repository initialization...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      throw error;
    }
  }

  console.log('Collecting files...');
  const files = getAllFiles('.');
  console.log(`Found ${files.length} files to upload`);

  let uploaded = 0;
  let failed = 0;

  for (const filePath of files) {
    const relativePath = filePath.startsWith('./') ? filePath.slice(2) : filePath;
    
    try {
      const content = fs.readFileSync(filePath);
      const base64Content = content.toString('base64');
      
      let sha: string | undefined;
      try {
        const { data: existingFile } = await octokit.repos.getContent({
          owner: user.login,
          repo: REPO_NAME,
          path: relativePath
        });
        if ('sha' in existingFile) {
          sha = existingFile.sha;
        }
      } catch (e) {
      }
      
      await octokit.repos.createOrUpdateFileContents({
        owner: user.login,
        repo: REPO_NAME,
        path: relativePath,
        message: `Add ${relativePath}`,
        content: base64Content,
        sha: sha
      });
      
      uploaded++;
      if (uploaded % 10 === 0) {
        console.log(`Uploaded ${uploaded}/${files.length} files`);
      }
    } catch (err: any) {
      failed++;
      console.error(`Failed: ${relativePath} - ${err.message}`);
    }
  }

  console.log('\n========================================');
  console.log('Push complete!');
  console.log(`Uploaded: ${uploaded} files`);
  console.log(`Failed: ${failed} files`);
  console.log(`Repository URL: ${repo.html_url}`);
  console.log('========================================');
}

pushToGitHub().catch(console.error);
