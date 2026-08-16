import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';

const [sourcePath,outputPath]=process.argv.slice(2);
if(!sourcePath||!outputPath)throw new Error('Uso: node scripts/prepare-manual-study-content.mjs <fonte.txt> <destino.txt>');
const source=await readFile(resolve(sourcePath),'utf8');
const marker='Amém. Vamos abrir a palavra de Deus';
const start=source.indexOf(marker);
if(start<0)throw new Error('Início da transcrição não encontrado.');
const transcript=source.slice(start).trim();
await mkdir(dirname(resolve(outputPath)),{recursive:true});
await writeFile(resolve(outputPath),`${transcript}\n`);
console.log(`${transcript.length} caracteres preservados da fonte manual.`);
