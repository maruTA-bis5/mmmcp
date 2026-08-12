import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

type PackageInfo = {
    name: string;
    version: string;
};

const packageInfo: PackageInfo = {
    name: packageJson.name,
    version: packageJson.version,
};

fs.writeFileSync('src/generated/package-info.json', JSON.stringify(packageInfo, null, 2), 'utf-8');
