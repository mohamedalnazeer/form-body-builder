import { readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../public/unity/', import.meta.url));
const files = await readdir(root + 'Build');
const asset = (suffix) => {
  const name = files.find((n) => n.endsWith(suffix));
  if (!name) throw new Error(`Missing Unity asset: ${suffix}. Build the Unity project first.`);
  return '/unity/Build/' + name;
};
await writeFile(
  root + 'manifest.json',
  JSON.stringify(
    {
      loaderUrl: asset('.loader.js'),
      dataUrl: asset('.data'),
      frameworkUrl: asset('.framework.js'),
      codeUrl: asset('.wasm'),
      streamingAssetsUrl: '/unity/StreamingAssets',
    },
    null,
    2,
  ),
);
console.log('Unity viewer manifest ready. Rebuild the web app with npm run build.');
